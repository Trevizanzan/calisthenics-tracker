# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-page calisthenics workout tracking app ("Muscle Up") built with vanilla JS + Vite. Data lives in
the **hub** — the shared Supabase project also used by the `ricettario` app — in its own schema
(`calisthenics`). Authentication is **email + password** (Supabase Auth), same account as `ricettario`:
one person, one login, shared across apps. Deployed on **Vercel**.

**Repo:** https://github.com/Trevizanzan/calisthenics-tracker

### History: migrated off its own Supabase project (27/07)

This app used to run on its own free-tier Supabase project (`qlpgamffiswavfmouhhk`, region `eu-west-1`).
That project went `INACTIVE` (auto-paused after 7 days without traffic) and was never revived — moving
into the hub was cheaper than reviving it, since the free tier caps active projects at 2 and the hub
already hosts `ricettario`. The old project is left paused as a historical backup; nothing points to it
anymore. `supabase/migrations/001_initial.sql` and `002_keepalive.sql` describe that old project's
schema — kept for reference, not applied anywhere live.

**Why the migration was low-effort:** the client only ever depended on two env vars
(`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) and a schema name — no edge functions, no storage
bucket, no RPC calls. Moving meant: recreate the two tables under a new schema, point the client at
the hub with `db: { schema: 'calisthenics' }`, and swap Google OAuth for email+password (the hub has
registrations disabled, so the account is created once from the dashboard, not through a sign-up flow).
Old `user_id` values weren't migrated — only one person used the app, so a fresh start cost nothing.

**Its own keep-alive is gone.** The hub is already kept alive by `ricettario`'s daily Supabase ping and
monthly GitHub-Actions-activity commit (see `ricettario/PROGETTO.md`, section "Keepalive"). This repo's
own `.github/workflows/keepalive.yml` and the `calisthenics-tracker-keepalive-commit` monthly routine
pinged the *old* standalone project — both should be removed/disabled once the app moves to the hub,
otherwise they run against a project nobody reads from anymore.

## Design System

The current visual style must be preserved exactly as-is:

- **Background:** `#0a0a0a`
- **Accent:** `#d4ff3a` (neon yellow)
- **Warm:** `#ff7a45` (orange), **Cool:** `#5dc4ff` (blue), **Danger:** `#ff5470` (red)
- **Fonts:** "Bricolage Grotesque" (body) + "JetBrains Mono" (monospace)
- Dark theme, mobile-first responsive layout

Do not alter colors, fonts, or overall visual identity when making changes.

## Running Locally

```bash
npm install
# .env.local already points to the hub (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY);
# .env.example mirrors it since both values are public by design (publishable key).
npm run dev   # Vite dev server
npm run build # production build → dist/
```

## Architecture

```
index.html        — HTML shell, loads src/main.js as ES module
src/
  main.js         — all app logic (auth, data, UI rendering)
  style.css       — all styles (imported by main.js)
supabase/
  migrations/      — historical: schema of the old standalone project, not applied anywhere live
```

### Data flow

1. Page loads → `supabase.auth.onAuthStateChange` fires `INITIAL_SESSION`
2. If session exists → load `logs` and `sessions_config` from Supabase → render UI
3. On save: insert one row into `logs` table; local `logs` array updated in memory
4. On pullup update: upsert one row in `logs` (type='pullups'), debounced 1500ms
5. On sessions config save: upsert one row in `sessions_config`

### Supabase schema (`calisthenics`, on the hub)

**`logs`** — workout sessions + daily pullup counts
```
id          uuid (PK)
user_id     uuid → auth.users
date        text  (YYYY-MM-DD)
type        text  (null = workout | 'pullups' = daily pullup count)
session     text  ('A' | 'B' | 'C', workouts only)
exercises   jsonb (workout data only)
count       int   (pullups only)
created_at  timestamptz
```

**`sessions_config`** — per-user custom A/B/C exercise definitions
```
user_id     uuid (PK → auth.users)
data        jsonb  (full SESSIONS object)
updated_at  timestamptz
```

Both tables have Row Level Security: users can only read/write their own rows
(`auth.uid() = user_id`). `auth.users` is shared across the whole hub project, not per-schema — the
same account that logs into `ricettario` logs in here too.

### Session structure

Each session (A/B/C) defines an array of exercise objects:
```js
{ id, name, desc, type: 'sets'|'single', fields: ['rip','kg','sec',...], target, mobility? }
```
`type: 'sets'` renders a row per set; `type: 'single'` renders one row of inputs.

### Important: inline onclick globals

`src/main.js` is an ES module. Functions called from `onclick`/`onsubmit` attributes in the HTML
(including dynamically generated HTML) must be explicitly exposed via `window.fnName = fnName` at the
bottom of `main.js`.

## Key Constraints

- **Env vars** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must be set — locally in `.env.local`,
  on Vercel in the project dashboard. Both are public by design (publishable key + RLS is what actually
  protects the data), so the same values live in `.env.example`.
- **Login is email + password**, matching `ricettario`'s `Login.tsx` pattern: generic error message on
  failure (doesn't reveal whether the email exists), no sign-up path — registrations are disabled on
  the hub, accounts are created from the Supabase dashboard.
- All UI text is in Italian.
- The app is functional on both desktop and mobile.
