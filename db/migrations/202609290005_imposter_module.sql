-- Imposter: a pass-the-phone word game. A host sets up a room (the crew, from
-- the shared address book); the round itself runs on the phone being passed
-- around, and only finished games are recorded here — who held which word,
-- when they were voted out, and the points it earned them. The room's running
-- scoreboard is the sum of its game scores.

create type imposter_room_status as enum ('active', 'archived');
create type imposter_role as enum ('civilian', 'imposter');
create type imposter_winner as enum ('civilians', 'imposters');

create table imposter_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references hosts(id) on delete cascade,
  title text not null,
  status imposter_room_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table imposter_room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references imposter_rooms(id) on delete cascade,
  player_id uuid not null references players(id) on delete restrict,
  seat_order integer not null,
  is_host_player boolean not null default false,
  -- Sitting out keeps the seat (and its points) but skips it in new deals.
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(room_id, player_id)
);

-- The id is minted on the phone when the cards are dealt, so a retried save
-- of the same game can never record it twice.
create table imposter_games (
  id uuid primary key,
  room_id uuid not null references imposter_rooms(id) on delete cascade,
  category_id text not null,
  civilian_word text not null,
  imposter_word text not null,
  imposter_count integer not null check (imposter_count >= 1),
  rounds_played integer not null check (rounds_played >= 1),
  winner imposter_winner not null,
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table imposter_game_scores (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references imposter_games(id) on delete cascade,
  room_player_id uuid not null references imposter_room_players(id) on delete cascade,
  role imposter_role not null,
  word text not null,
  eliminated_round integer,
  rounds_survived integer not null check (rounds_survived >= 0),
  bonus integer not null default 0,
  points integer not null check (points >= 0),
  peeks integer not null default 0,
  created_at timestamptz not null default now(),
  unique(game_id, room_player_id)
);

create index idx_imposter_rooms_host_id on imposter_rooms(host_id);
create index idx_imposter_room_players_room_id on imposter_room_players(room_id);
create index idx_imposter_room_players_player_id on imposter_room_players(player_id);
create index idx_imposter_games_room_id on imposter_games(room_id);
create index idx_imposter_game_scores_game_id on imposter_game_scores(game_id);
create index idx_imposter_game_scores_room_player_id on imposter_game_scores(room_player_id);

create trigger imposter_rooms_set_updated_at before update on imposter_rooms for each row execute function set_updated_at();
create trigger imposter_room_players_set_updated_at before update on imposter_room_players for each row execute function set_updated_at();

alter table imposter_rooms enable row level security;
alter table imposter_room_players enable row level security;
alter table imposter_games enable row level security;
alter table imposter_game_scores enable row level security;

create policy "hosts own imposter rooms"
on imposter_rooms for all
using (host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub'))
with check (host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub'));

create policy "hosts own imposter room players"
on imposter_room_players for all
using (room_id in (select id from imposter_rooms where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')))
with check (room_id in (select id from imposter_rooms where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')));

create policy "hosts own imposter games"
on imposter_games for all
using (room_id in (select id from imposter_rooms where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')))
with check (room_id in (select id from imposter_rooms where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')));

create policy "hosts own imposter game scores"
on imposter_game_scores for all
using (game_id in (select g.id from imposter_games g join imposter_rooms r on r.id = g.room_id where r.host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')))
with check (game_id in (select g.id from imposter_games g join imposter_rooms r on r.id = g.room_id where r.host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')));
