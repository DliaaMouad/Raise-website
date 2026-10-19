// Supabase Edge Function: verify-payment
// POST { token, sessionId } or { email, sessionId } -> { paid, token }
// Checks the Stripe checkout session via the Stripe API (STRIPE_SECRET_KEY).
// If the session is paid, marks the data room paid and returns paid=true.
// Uses the service_role key (server-side). Never trust the front-end's claim.
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
    const { token, email, sessionId } = await req.json();
    if (typeof sessionId !== "string" || !sessionId) {
      return json({ error: "Session id is required." }, 400);
    }
    if ((typeof token !== "string" || !token) && (typeof email !== "string" || !email)) {
      return json({ error: "Token or email is required." }, 400);
    }
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "STRIPE_SECRET_KEY is not set." }, 500);
    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } },
    );
    if (!stripeRes.ok) return json({ error: "Could not verify the payment." }, 502);
    const session = await stripeRes.json();
    const isPaid = session.status === "complete" && session.payment_status === "paid";
    if (!isPaid) return json({ paid: false });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    let query = supabase.from("data_rooms").select("id, token").eq("paid", false);
    if (typeof token === "string" && token) {
      query = query.eq("token", token);
    } else {
      query = query.eq("email", email).order("created_at", { ascending: false }).limit(1);
    }
    const { data } = await query.maybeSingle();
    if (!data) return json({ paid: false });
    await supabase
      .from("data_rooms")
      .update({ paid: true, stripe_session_id: sessionId })
      .eq("id", data.id);
    return json({ paid: true, token: data.token });
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
});
