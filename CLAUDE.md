# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-page calisthenics workout tracking app ("Muscle Up") built with vanilla JS + Vite. Data is persisted to **Supabase** (PostgreSQL). Authentication uses **Supabase Auth with Google OAuth**. Deployed on **Vercel**.

**Repo:** https://github.com/Trevizanzan/calisthenics-tracker

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
# copy .env.example to .env.local and fill in Supabase credentials
npm run dev   # Vite dev server at http://localhost:5173
npm run build # production build → dist/
```

## Architecture

```
index.html        — HTML shell, loads src/main.js as ES module
src/
  main.js         — all app logic (auth, data, UI rendering)
  style.css       — all styles (imported by main.js)
supabase/
  migrations/
    001_initial.sql   — DB schema (run once in Supabase SQL editor)
    002_keepalive.sql — keep-alive table (see below)
.github/
  workflows/
    keepalive.yml   — GitHub Actions cron preventing Supabase auto-pause
```

### Data flow

1. Page loads → `supabase.auth.onAuthStateChange` fires `INITIAL_SESSION`
2. If session exists → load `logs` and `sessions_config` from Supabase → render UI
3. On save: insert one row into `logs` table; local `logs` array updated in memory
4. On pullup update: upsert one row in `logs` (type='pullups'), debounced 1500ms
5. On sessions config save: upsert one row in `sessions_config`

### Supabase schema

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

Both tables have Row Level Security: users can only read/write their own rows.

### Session structure

Each session (A/B/C) defines an array of exercise objects:
```js
{ id, name, desc, type: 'sets'|'single', fields: ['rip','kg','sec',...], target, mobility? }
```
`type: 'sets'` renders a row per set; `type: 'single'` renders one row of inputs.

### Important: inline onclick globals

`src/main.js` is an ES module. Functions called from `onclick` attributes in the HTML (including dynamically generated HTML) must be explicitly exposed via `window.fnName = fnName` at the bottom of `main.js`.

## Key Constraints

- **Env vars** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must be set — locally in `.env.local`, on Vercel in the project dashboard.
- **Google OAuth** is configured in Supabase Auth (not in the client code). The authorized redirect URI in Google Cloud Console points to `https://[project].supabase.co/auth/v1/callback`. The app's own URL(s) are whitelisted in Supabase → Auth → URL Configuration → Redirect URLs.
- All UI text is in Italian.
- The app is functional on both desktop and mobile.

## Keep-alive (Supabase free tier)

The free Supabase tier auto-pauses projects after 7 days without API requests. To prevent this:

- A `keepalive` table (migration `002_keepalive.sql`) holds throwaway rows.
- A GitHub Actions workflow (`.github/workflows/keepalive.yml`) runs daily and inserts a row; weekly it deletes all rows.
- The workflow uses the **service_role** key via the `SUPABASE_SERVICE_ROLE_KEY` GitHub secret (alongside `SUPABASE_URL`). The service_role key bypasses RLS and **must NEVER** be added to `.env.local`, Vercel env vars, or any client-facing code.
