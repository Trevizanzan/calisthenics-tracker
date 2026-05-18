-- Logs: workout sessions + pullup daily entries
create table logs (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users not null,
  date        text        not null,
  type        text,               -- null = workout, 'pullups' = daily pullup count
  session     text,               -- 'A' | 'B' | 'C'  (only for workouts)
  exercises   jsonb,              -- exercise data     (only for workouts)
  count       integer,            -- pullup count      (only for pullups)
  created_at  timestamptz default now()
);

alter table logs enable row level security;

create policy "users manage own logs"
  on logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Sessions config: custom A/B/C exercise definitions per user
create table sessions_config (
  user_id     uuid        references auth.users primary key,
  data        jsonb       not null,
  updated_at  timestamptz default now()
);

alter table sessions_config enable row level security;

create policy "users manage own sessions config"
  on sessions_config for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
