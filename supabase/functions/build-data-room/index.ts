// Supabase Edge Function: build-data-room
// POST { deckText, answers, email } -> { token, preview: { companySnapshot, checklist } }
// Calls OpenAI (key from OPENAI_API_KEY secret), validates the structured
// JSON, stores the full data room in public.data_rooms (paid=false), and
// returns ONLY the preview. Full docs are returned by get-data-room after
// payment is verified. The LLM key and service_role key never reach the browser.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CHECKLIST = [
  { id: "incorporation", title: "Certificate of incorporation + articles", minStage: "pre-seed" },
  { id: "cap-table", title: "Cap table", minStage: "pre-seed" },
  { id: "founder-agreements", title: "Founder agreements + vesting", minStage: "pre-seed" },
  { id: "company-number", title: "Company number + registered address", minStage: "pre-seed" },
  { id: "board-minutes", title: "Board minutes + consents", minStage: "seed" },
  { id: "shareholder-agreements", title: "Shareholder / investment agreements", minStage: "seed" },
  { id: "model", title: "Financial model", minStage: "pre-seed" },
  { id: "burn-plan", title: "Burn + runway plan", minStage: "pre-seed" },
  { id: "bank-statements", title: "Bank statements (6 months)", minStage: "seed" },
  { id: "management-accounts", title: "Management accounts", minStage: "seed" },
  { id: "tax-filings", title: "Tax filings", minStage: "series-a" },
  { id: "audited-accounts", title: "Audited accounts (if any)", minStage: "series-a" },
  { id: "ip-assignment", title: "IP assignment agreements", minStage: "pre-seed" },
  { id: "employment-contracts", title: "Employment + contractor contracts", minStage: "pre-seed" },
  { id: "trademarks", title: "Trademarks + patents", minStage: "seed" },
  { id: "material-contracts", title: "Material contracts", minStage: "seed" },
  { id: "gdpr", title: "Data protection + privacy", minStage: "seed" },
  { id: "licences", title: "Regulatory licences + permits", minStage: "series-a" },
  { id: "demo", title: "Product demo / walkthrough", minStage: "pre-seed" },
  { id: "roadmap", title: "Product roadmap", minStage: "pre-seed" },
  { id: "architecture", title: "Tech architecture overview", minStage: "seed" },
  { id: "security", title: "Security + penetration test", minStage: "series-a" },
  { id: "founder-bios", title: "Founder bios", minStage: "pre-seed" },
  { id: "org-chart", title: "Org chart + hiring plan", minStage: "seed" },
  { id: "advisor-agreements", title: "Advisor agreements", minStage: "seed" },
  { id: "key-hires", title: "Key hires + retention", minStage: "series-a" },
  { id: "customer-list", title: "Customer list + pipeline", minStage: "pre-seed" },
  { id: "gtm-plan", title: "Go-to-market plan", minStage: "pre-seed" },
  { id: "customer-contracts", title: "Customer contracts / LOIs", minStage: "seed" },
  { id: "pipeline-metrics", title: "Pipeline + conversion metrics", minStage: "seed" },
  { id: "references", title: "Customer references", minStage: "series-a" },
];
const KNOWN_IDS = new Set(CHECKLIST.map((i) => i.id));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function validPlan(plan: any): boolean {
  if (!plan || typeof plan.companySnapshot !== "string" || !plan.companySnapshot.trim()) return false;
  if (!Array.isArray(plan.checklist) || plan.checklist.length === 0) return false;
  for (const item of plan.checklist) {
    if (!KNOWN_IDS.has(item.id)) return false;
    if (item.status !== "have" && item.status !== "need") return false;
    if (!["high", "medium", "low"].includes(item.priority)) return false;
    if (typeof item.note !== "string") return false;
  }
  if (!Array.isArray(plan.docs) || plan.docs.length === 0) return false;
  for (const doc of plan.docs) {
    if (typeof doc.title !== "string" || typeof doc.content !== "string") return false;
  }
  return true;
}

async function callLLM(deckText: string, answers: Record<string, unknown>): Promise<any> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const system = [
    "You are a fundraising diligence expert helping a founder build a data room.",
    "Given the founder's deck text and answers, produce a JSON data room plan.",
    "Rules:",
    "1. Use ONLY the checklist item ids from the provided list. Do not invent items.",
    "2. For each item, set status 'have' if the deck or answers show it already exists, else 'need'.",
    "3. Set priority 'high' if an investor would ask for it first at this stage.",
    "4. Write a 1-sentence note per item: what is missing or what to fix.",
    "5. Write companySnapshot: 2-3 sentences on what the company does, its stage, and its raise.",
    "6. Write docs: 4 documents (Company overview, Cap table structure, Financial model outline, Key risks + mitigations) as markdown strings, personalized with the founder's actual numbers and names from the deck and answers.",
    "7. Do not invent numbers, names, or facts not in the deck or answers. If a fact is unknown, say so in the doc.",
    "Return ONLY JSON: { companySnapshot, checklist: [{ id, status, priority, note }], docs: [{ title, content }] }.",
  ].join("\n");
  const user = JSON.stringify({
    deckText: deckText.slice(0, 8000),
    answers,
    checklistItems: CHECKLIST,
  });
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return JSON.parse(text);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { deckText, answers, email } = await req.json();
    if (typeof deckText !== "string" || deckText.trim().split(/\s+/).length < 50) {
      return json({ error: "Deck text is too short." }, 400);
    }
    if (!answers || typeof answers !== "object") {
      return json({ error: "Answers are required." }, 400);
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "A valid email is required." }, 400);
    }
    let plan: any = null;
    for (let attempt = 0; attempt < 2 && !plan; attempt++) {
      try {
        const candidate = await callLLM(deckText, answers as Record<string, unknown>);
        if (validPlan(candidate)) plan = candidate;
      } catch {
        // retry once, then fall through to the 500 below
      }
    }
    if (!plan) return json({ error: "The AI could not build the data room. Please try again." }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const token = crypto.randomUUID();
    const stage = typeof answers.stage === "string" ? answers.stage : "pre-seed";
    const { error } = await supabase.from("data_rooms").insert({
      email,
      token,
      stage,
      answers,
      deck_summary: plan.companySnapshot.slice(0, 500),
      content: plan,
      paid: false,
    });
    if (error) return json({ error: "Could not save the data room." }, 500);

    return json({
      token,
      preview: { companySnapshot: plan.companySnapshot, checklist: plan.checklist },
    });
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
});
