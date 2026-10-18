/* Raise Tools configuration.
 * Google OAuth client ID is a [FILL] placeholder until Mouad creates one in
 * Google Cloud. With the placeholder, Google Sheets connect shows a banner.
 * NEVER invent a client ID.
 * Supabase URL + anon (publishable) key are [FILL] placeholders until Mouad
 * creates the Supabase project and pastes them in. With the placeholders,
 * the sign-up / log-in forms show a "being set up" notice instead of
 * failing. NEVER put the service_role key here: it bypasses Row Level
 * Security and must stay server-side only. */
window.RAISE_TOOLS_CONFIG = {
  GOOGLE_OAUTH_CLIENT_ID: "[FILL: Google Cloud OAuth client ID]",
  SUPABASE_URL: "https://gppuoulloxykfefmgrsn.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcHVvdWxsb3h5a2ZlZm1ncnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNzUxMzksImV4cCI6MjEwNzg1MTEzOX0.9Ge9ogwpY1V8PmmKjLwERR_jg2IWFmGB-M5bkxkPATQ",
  SHEETS_TITLE: "Raise Tools"
};
