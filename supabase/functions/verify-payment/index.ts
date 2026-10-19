// Supabase Edge Function: verify-payment
// POST { token, transactionId } -> { paid, token }
// Checks the Paddle transaction via the Paddle API (PADDLE_API_KEY). The
// payment only counts if the transaction status is "paid" or "completed" AND
// its custom_data.room_token matches this room's token. Never trust the
// front-end's claim. Uses the service_role key (server-side).
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
    const { token, transactionId } = await req.json();
    if (typeof token !== "string" || !token) {
      return json({ error: "Token is required." }, 400);
    }
    if (typeof transactionId !== "string" || !transactionId) {
      return json({ error: "Transaction id is required." }, 400);
    }
    const paddleKey = Deno.env.get("PADDLE_API_KEY");
    if (!paddleKey) return json({ error: "PADDLE_API_KEY is not set." }, 500);
    const paddleRes = await fetch(
      `https://api.paddle.com/transactions/${encodeURIComponent(transactionId)}`,
      { headers: { Authorization: `Bearer ${paddleKey}` } },
    );
    if (!paddleRes.ok) return json({ error: "Could not verify the payment." }, 502);
    const txn = (await paddleRes.json())?.data;
    const statusOk = txn?.status === "paid" || txn?.status === "completed";
    const tokenOk = txn?.custom_data?.room_token === token;
    if (!statusOk || !tokenOk) return json({ paid: false });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data } = await supabase
      .from("data_rooms")
      .select("id, token")
      .eq("token", token)
      .eq("paid", false)
      .maybeSingle();
    if (!data) return json({ paid: false });
    await supabase
      .from("data_rooms")
      .update({ paid: true, paddle_transaction_id: transactionId })
      .eq("id", data.id);
    return json({ paid: true, token: data.token });
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
});
