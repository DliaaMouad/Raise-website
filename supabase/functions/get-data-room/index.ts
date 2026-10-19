// Supabase Edge Function: get-data-room
// POST { token } -> { email, stage, paid, preview, docs }
// Returns the preview (snapshot + checklist) always. Returns the full docs
// only when the room is paid. Uses the service_role key (server-side).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { token } = await req.json();
    if (typeof token !== "string" || !token) return json({ error: "Token is required." }, 400);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data, error } = await supabase
      .from("data_rooms")
      .select("email, stage, paid, content")
      .eq("token", token)
      .maybeSingle();
    if (error || !data) return json({ error: "Data room not found." }, 404);
    const content = (data.content || {}) as any;
    return json({
      email: data.email,
      stage: data.stage,
      paid: data.paid,
      preview: {
        companySnapshot: content.companySnapshot || "",
        checklist: content.checklist || [],
      },
      docs: data.paid ? content.docs || [] : null,
      token,
    });
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
});
