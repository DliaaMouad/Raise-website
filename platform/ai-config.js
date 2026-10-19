/* AI Data Room config.
   The AI generation runs in Supabase Edge Functions (server-side), so the
   LLM key never reaches the browser. Fill the [FILL IN] values:
   - supabaseAnonKey: the Supabase project's anon (publishable) key.
   - stripePaymentLink: a Stripe Payment Link for the AI Data Room.
   - price: the price founders pay (shown on the page).
   The Edge Functions need these secrets set in Supabase (never in this file):
   OPENAI_API_KEY, STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY. */
var AI_DATA_ROOM_CONFIG = {
  supabaseUrl: "https://gppuoulloxykfefmgrsn.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcHVvdWxsb3h5a2ZlZm1ncnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNzUxMzksImV4cCI6MjEwNzg1MTEzOX0.9Ge9ogwpY1V8PmmKjLwERR_jg2IWFmGB-M5bkxkPATQ",
  stripePaymentLink: "[FILL IN: Stripe Payment Link for the AI Data Room]",
  price: "[FILL IN: price for the AI Data Room]",
  functions: {
    build: "/functions/v1/build-data-room",
    get: "/functions/v1/get-data-room",
    verify: "/functions/v1/verify-payment"
  }
};
