// Supabase Edge Function: create-checkout
// POST { token } -> { checkoutUrl, transactionId }
// Creates a Paddle transaction for the data room (one-time price) and returns
// the Paddle Checkout URL. The room token is stored in Paddle custom_data so
// verify-payment can bind the payment to this room. Uses PADDLE_API_KEY and
// PADDLE_PRICE_ID secrets (server-side). The Paddle API key never reaches
// the browser.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUCCESS_URL = "https://www.raiseos.site/platform/ai-data-room.html?paid=1";

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
    const paddleKey = Deno.env.get("PADDLE_API_KEY");
    const priceId = Deno.env.get("PADDLE_PRICE_ID");
    if (!paddleKey || !priceId) return json({ error: "Payment is not connected yet." }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: room, error } = await supabase
      .from("data_rooms")
      .select("email, paid")
      .eq("token", token)
      .maybeSingle();
    if (error || !room) return json({ error: "Data room not found." }, 404);
    if (room.paid) return json({ error: "This data room is already unlocked." }, 400);

    const res = await fetch("https://api.paddle.com/transactions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paddleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        customer: { email: room.email },
        custom_data: { room_token: token },
        checkout: { url: SUCCESS_URL },
      }),
    });
    if (!res.ok) return json({ error: "Could not start checkout." }, 502);
    const body = await res.json();
    const txn = body?.data;
    if (!txn?.id || !txn?.checkout?.url) return json({ error: "Could not start checkout." }, 502);
    return json({ checkoutUrl: txn.checkout.url, transactionId: txn.id });
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
});
