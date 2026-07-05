create extension if not exists pgcrypto;

create type game_status as enum (
  'draft',
  'live',
  'paused',
  'tally_pending',
  'pending_settlement',
  'closed',
  'cancelled'
);

create type game_type as enum (
  'poker_night',
  'score_tracker',
  'pot_splitter',
  'tournament',
  'custom_game'
);

create type buy_in_payment_status as enum (
  'paid',
  'unpaid',
  'settled_later'
);

create type settlement_mode as enum (
  'direct',
  'host'
);

create type settlement_line_status as enum (
  'pending',
  'partially_paid',
  'paid'
);

create table hosts (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  email text not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references hosts(id) on delete cascade,
  name text not null,
  name_normalized text not null,
  upi_id text,
  avatar_key text,
  color_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(host_id, name_normalized)
);

create table game_nights (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references hosts(id) on delete cascade,
  name text not null,
  location text,
  public_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table games (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references hosts(id) on delete cascade,
  game_night_id uuid references game_nights(id) on delete cascade,
  game_type game_type not null default 'poker_night',
  status game_status not null default 'draft',
  name text not null,
  location text,
  public_token text not null unique,
  started_at timestamptz,
  ended_at timestamptz,
  closed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table poker_game_configs (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null unique references games(id) on delete cascade,
  ratio_money_amount numeric(12,2) not null,
  ratio_coin_amount integer not null,
  min_buy_in_coins integer not null,
  max_buy_in_coins_per_player integer,
  starting_coin_amount integer not null,
  allow_rebuys boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ratio_money_amount > 0),
  check (ratio_coin_amount > 0),
  check (min_buy_in_coins > 0),
  check (starting_coin_amount >= min_buy_in_coins),
  check (max_buy_in_coins_per_player is null or max_buy_in_coins_per_player >= min_buy_in_coins)
);

create table game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete restrict,
  seating_order integer not null,
  is_host_player boolean not null default false,
  joined_late boolean not null default false,
  left_early boolean not null default false,
  removed_before_start boolean not null default false,
  active_in_game boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(game_id, player_id),
  unique(game_id, seating_order)
);

create table poker_buy_ins (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  game_player_id uuid not null references game_players(id) on delete cascade,
  money_amount numeric(12,2) not null,
  coin_amount integer not null,
  payment_status buy_in_payment_status not null default 'paid',
  note text,
  created_by_host_id uuid not null references hosts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  reversal_reason text,
  check (money_amount > 0),
  check (coin_amount > 0)
);

create table poker_final_tallies (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  game_player_id uuid not null references game_players(id) on delete cascade,
  final_coin_count integer not null,
  final_value_money numeric(12,2) not null,
  total_buy_in_money numeric(12,2) not null,
  net_result_money numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(game_id, game_player_id),
  check (final_coin_count >= 0)
);

create table settlement_batches (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  mode settlement_mode not null,
  is_active boolean not null default true,
  generated_at timestamptz not null default now(),
  manually_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table settlement_lines (
  id uuid primary key default gen_random_uuid(),
  settlement_batch_id uuid not null references settlement_batches(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  from_game_player_id uuid not null references game_players(id),
  to_game_player_id uuid not null references game_players(id),
  amount numeric(12,2) not null,
  paid_amount numeric(12,2) not null default 0,
  status settlement_line_status not null default 'pending',
  note text,
  manually_edited boolean not null default false,
  checked_by_host_id uuid references hosts(id),
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount >= 0),
  check (paid_amount >= 0),
  check (paid_amount <= amount),
  check (from_game_player_id <> to_game_player_id)
);

create table game_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  host_id uuid not null references hosts(id),
  event_type text not null,
  event_payload jsonb,
  created_at timestamptz not null default now()
);

create table share_cards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  card_type text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create index idx_players_host_id on players(host_id);
create index idx_games_host_id on games(host_id);
create index idx_games_status on games(status);
create index idx_games_public_token on games(public_token);
create index idx_game_nights_host_id on game_nights(host_id);
create index idx_game_players_game_id on game_players(game_id);
create index idx_poker_buy_ins_game_id on poker_buy_ins(game_id);
create index idx_poker_buy_ins_game_player_id on poker_buy_ins(game_player_id);
create index idx_poker_final_tallies_game_id on poker_final_tallies(game_id);
create index idx_settlement_batches_game_id on settlement_batches(game_id);
create index idx_settlement_lines_game_id on settlement_lines(game_id);
create index idx_game_events_game_id on game_events(game_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger hosts_set_updated_at before update on hosts for each row execute function set_updated_at();
create trigger players_set_updated_at before update on players for each row execute function set_updated_at();
create trigger game_nights_set_updated_at before update on game_nights for each row execute function set_updated_at();
create trigger games_set_updated_at before update on games for each row execute function set_updated_at();
create trigger poker_game_configs_set_updated_at before update on poker_game_configs for each row execute function set_updated_at();
create trigger game_players_set_updated_at before update on game_players for each row execute function set_updated_at();
create trigger poker_buy_ins_set_updated_at before update on poker_buy_ins for each row execute function set_updated_at();
create trigger poker_final_tallies_set_updated_at before update on poker_final_tallies for each row execute function set_updated_at();
create trigger settlement_batches_set_updated_at before update on settlement_batches for each row execute function set_updated_at();
create trigger settlement_lines_set_updated_at before update on settlement_lines for each row execute function set_updated_at();

alter table hosts enable row level security;
alter table players enable row level security;
alter table game_nights enable row level security;
alter table games enable row level security;
alter table poker_game_configs enable row level security;
alter table game_players enable row level security;
alter table poker_buy_ins enable row level security;
alter table poker_final_tallies enable row level security;
alter table settlement_batches enable row level security;
alter table settlement_lines enable row level security;
alter table game_events enable row level security;
alter table share_cards enable row level security;

create policy "hosts own profile"
on hosts for all
using (clerk_user_id = auth.jwt() ->> 'sub')
with check (clerk_user_id = auth.jwt() ->> 'sub');

create policy "hosts own players"
on players for all
using (host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub'))
with check (host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub'));

create policy "hosts own game nights"
on game_nights for all
using (host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub'))
with check (host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub'));

create policy "hosts own games"
on games for all
using (host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub'))
with check (host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub'));

create policy "hosts own poker configs"
on poker_game_configs for all
using (game_id in (select id from games where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')))
with check (game_id in (select id from games where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')));

create policy "hosts own game players"
on game_players for all
using (game_id in (select id from games where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')))
with check (game_id in (select id from games where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')));

create policy "hosts own buy ins"
on poker_buy_ins for all
using (game_id in (select id from games where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')))
with check (game_id in (select id from games where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')));

create policy "hosts own tallies"
on poker_final_tallies for all
using (game_id in (select id from games where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')))
with check (game_id in (select id from games where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')));

create policy "hosts own settlement batches"
on settlement_batches for all
using (game_id in (select id from games where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')))
with check (game_id in (select id from games where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')));

create policy "hosts own settlement lines"
on settlement_lines for all
using (game_id in (select id from games where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')))
with check (game_id in (select id from games where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')));

create policy "hosts own events"
on game_events for all
using (host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub'))
with check (host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub'));

create policy "hosts own share cards"
on share_cards for all
using (game_id in (select id from games where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')))
with check (game_id in (select id from games where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')));
