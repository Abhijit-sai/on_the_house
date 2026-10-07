-- Mafia: a social-deduction game run by a person playing God. A host sets up a
-- room (the crew, from the shared address book). Each game, one member narrates
-- as God and the rest are dealt roles; the game itself runs on God's phone, and
-- only finished games are recorded here — the full event log (every night and
-- vote), who held which role, and the points it earned them. The room's running
-- scoreboard is the sum of its game scores.

create type mafia_room_status as enum ('active', 'archived');
create type mafia_role as enum ('mafia', 'doctor', 'detective', 'villager');
create type mafia_winner as enum ('town', 'mafia');

create table mafia_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references hosts(id) on delete cascade,
  title text not null,
  status mafia_room_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table mafia_room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references mafia_rooms(id) on delete cascade,
  player_id uuid not null references players(id) on delete restrict,
  seat_order integer not null,
  is_host_player boolean not null default false,
  -- Sitting out keeps the seat (and its points) but skips it in new games.
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(room_id, player_id)
);

-- The id is minted on God's phone at the deal, so a retried save of the same
-- game can never record it twice.
create table mafia_games (
  id uuid primary key,
  room_id uuid not null references mafia_rooms(id) on delete cascade,
  god_room_player_id uuid not null references mafia_room_players(id) on delete cascade,
  mafia_count integer not null check (mafia_count >= 1),
  has_doctor boolean not null,
  has_detective boolean not null,
  reveal_on_death boolean not null,
  nights_played integer not null check (nights_played >= 0),
  days_played integer not null check (days_played >= 0),
  winner mafia_winner not null,
  events jsonb not null,
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table mafia_game_scores (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references mafia_games(id) on delete cascade,
  room_player_id uuid not null references mafia_room_players(id) on delete cascade,
  role mafia_role not null,
  won boolean not null,
  died_night integer,
  voted_out_day integer,
  left_game boolean not null default false,
  survived integer not null check (survived >= 0),
  bonus integer not null default 0,
  saves integer not null default 0,
  finds integer not null default 0,
  peeks integer not null default 0,
  points integer not null check (points >= 0),
  created_at timestamptz not null default now(),
  unique(game_id, room_player_id)
);

create index idx_mafia_rooms_host_id on mafia_rooms(host_id);
create index idx_mafia_room_players_room_id on mafia_room_players(room_id);
create index idx_mafia_room_players_player_id on mafia_room_players(player_id);
create index idx_mafia_games_room_id on mafia_games(room_id);
create index idx_mafia_game_scores_game_id on mafia_game_scores(game_id);
create index idx_mafia_game_scores_room_player_id on mafia_game_scores(room_player_id);

create trigger mafia_rooms_set_updated_at before update on mafia_rooms for each row execute function set_updated_at();
create trigger mafia_room_players_set_updated_at before update on mafia_room_players for each row execute function set_updated_at();

alter table mafia_rooms enable row level security;
alter table mafia_room_players enable row level security;
alter table mafia_games enable row level security;
alter table mafia_game_scores enable row level security;

create policy "hosts own mafia rooms"
on mafia_rooms for all
using (host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub'))
with check (host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub'));

create policy "hosts own mafia room players"
on mafia_room_players for all
using (room_id in (select id from mafia_rooms where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')))
with check (room_id in (select id from mafia_rooms where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')));

create policy "hosts own mafia games"
on mafia_games for all
using (room_id in (select id from mafia_rooms where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')))
with check (room_id in (select id from mafia_rooms where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')));

create policy "hosts own mafia game scores"
on mafia_game_scores for all
using (game_id in (select g.id from mafia_games g join mafia_rooms r on r.id = g.room_id where r.host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')))
with check (game_id in (select g.id from mafia_games g join mafia_rooms r on r.id = g.room_id where r.host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')));
