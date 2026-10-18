# Raise Tools: Supabase setup (one time, about 10 minutes)

Founder accounts now run on Supabase Auth + a `profiles` table. The code is
already written and tested. It is NOT live yet: the live site still runs the
old browser-only gate until the keys below are in `tools/config.js`.

## 1. Create the project

1. Go to https://supabase.com and create a free account (or log in).
2. New project. Name: `Raise Tools`. Set a database password and keep it
   somewhere safe (it is NOT used in the website).
3. Region: pick the one closest to most founders, e.g. EU West (Frankfurt).

## 2. Create the profiles table

1. In the Supabase dashboard, open **SQL Editor** -> **New query**.
2. Paste the whole contents of `supabase-schema.sql` (repo root) and Run.
3. Check it worked: **Table Editor** -> `profiles` exists with columns
   id, email, full_name, country, company, stage, linkedin, twitter.

## 3. Email confirmation: pick one

**Authentication** -> **Sign-in / Providers** -> **Email** -> **Confirm email**:

- **OFF (recommended for now).** Founders sign up and go straight into the
  tools. Less friction, more signups.
- **ON.** Founders must click a confirmation link in their email before
  they can log in. The site already handles this: after sign-up it tells
  them to check their email and switch to the log-in form.

## 4. Copy the keys (anon key only)

**Settings** -> **API**. Copy:

- **Project URL** -> `SUPABASE_URL` in `tools/config.js`
- **anon public** key -> `SUPABASE_ANON_KEY` in `tools/config.js`

NEVER copy the **service_role** key into the website. It bypasses Row Level
Security and must stay server-side only. The anon key is designed to be
public; Row Level Security on `profiles` is what protects founder data
(each founder can only read/write their own row).

## 5. Test

1. Push the Supabase code (it is local until the keys are in).
2. On the live site, sign up with a test email. You should land inside the
   tool with no second login.
3. In Supabase: **Authentication** -> **Users** shows the new user, and
   **Table Editor** -> `profiles` shows their profile row.
4. Open a second tool or a new tab: you stay logged in. Sign out in one
   tab: the other tabs update.

## Forgot password

The gate has a "Forgot password?" link and the landing page links to
`/tools/reset-password`. For the reset email link to land there, add the
redirect URL in Supabase: **Authentication** -> **URL Configuration** ->
**Redirect URLs** -> add `https://www.raiseos.site/tools/reset-password`.
Also set **Site URL** to `https://www.raiseos.site`. Without the redirect
URL allowlisted, Supabase ignores it and the reset link goes to the Site
URL instead of the reset page.

## Earlier browser-only accounts

For about an hour the tools ran a browser-only gate (accounts in each
founder's own localStorage, no email). Those founders are not lost: when
they next open a tool, the gate shows a "move your account" block. They
add their email and confirm their earlier password, their profile (name,
country, company, stage, LinkedIn) carries over into Supabase, and the
old local account is deleted. If they already created a Supabase account
with that email, the gate tells them to log in instead and drops the stale
local account.

## Later (not needed for launch)

- **Google sign-in was removed by decision (2026-10-18).** No Google button
  on sign-up or log-in anywhere. Email + password only.
- **Privacy Policy + Terms pages** are live and linked in both footers.
  They are plain-language pages; have a lawyer review them before relying
  on them for compliance.
