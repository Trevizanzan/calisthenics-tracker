-- Keep-alive table: pinged daily by an external GitHub Actions cron
-- to prevent Supabase free-tier auto-pause (7-day inactivity rule).
create table keepalive (
  id          uuid        default gen_random_uuid() primary key,
  created_at  timestamptz default now()
);

alter table keepalive enable row level security;
-- Intentionally no policies: only the service_role key (server-side, used
-- by the GitHub Actions workflow) can read/write. App users have no access.
