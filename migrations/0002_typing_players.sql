create table if not exists public.typing_players (
  id uuid primary key default gen_random_uuid(),
  username text not null check (char_length(username) between 2 and 24),
  created_at timestamptz not null default now()
);
alter table public.typing_players enable row level security;
create policy "players are publicly readable" on public.typing_players for select using (true);
create policy "players can be created" on public.typing_players for insert with check (true);
alter table public.typing_scores add column if not exists player_id uuid references public.typing_players(id);
create index if not exists typing_scores_player_idx on public.typing_scores(player_id);
