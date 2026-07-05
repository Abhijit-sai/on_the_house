# 05 — Data Model & Database Schema

## 1. Database Principles

- Supabase Postgres is the source of truth.
- Do not store critical game data only in local storage.
- Use UUID primary keys.
- Use soft deletes for buy-ins.
- Use public tokens for read-only game links.
- Keep poker-specific data separate from generic game data.
- Prepare RLS from the beginning.
- Every host must only access their own data.

## 2. Entity Relationship Overview

```text
hosts
 ├── players
 ├── game_nights
 │    └── games
 │         ├── poker_game_configs
 │         ├── game_players
 │         │    ├── poker_buy_ins
 │         │    └── poker_final_tallies
 │         ├── settlement_batches
 │         │    └── settlement_lines
 │         ├── game_events
 │         └── share_cards
```

## 3. SQL Schema

### 3.1 Extensions

```sql
create extension if not exists pgcrypto;
```

### 3.2 hosts

```sql
create table hosts (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  email text not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 3.3 players

```sql
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
```

### 3.4 game_nights

```sql
create table game_nights (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references hosts(id) on delete cascade,
  name text not null,
  location text,
  public_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 3.5 enums

```sql
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
```

### 3.6 games

```sql
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
```

### 3.7 poker_game_configs

```sql
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
```

### 3.8 game_players

```sql
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
```

### 3.9 poker_buy_ins

```sql
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
```

### 3.10 poker_final_tallies

```sql
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
```

### 3.11 settlement_batches

```sql
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
```

### 3.12 settlement_lines

```sql
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
```

### 3.13 game_events

```sql
create table game_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  host_id uuid not null references hosts(id),
  event_type text not null,
  event_payload jsonb,
  created_at timestamptz not null default now()
);
```

### 3.14 share_cards

```sql
create table share_cards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  card_type text not null,
  image_url text,
  created_at timestamptz not null default now()
);
```

## 4. Recommended Indexes

```sql
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
```

## 5. RLS Expectations

Enable RLS for all host-owned tables.

```sql
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
```

Because Clerk auth is used, implement access either by:

1. Server-side Supabase service-role queries with explicit host ownership checks, or
2. JWT claims mapping Clerk user ID into Supabase RLS.

Recommended for MVP:

- Use server-side queries/actions.
- Always resolve host from Clerk user ID.
- Check ownership in application layer.
- Add RLS as defense-in-depth before public launch.

## 6. Public Token Access

Public view should be server-side fetched by `public_token`.

Public view must only expose:

- game name,
- game status,
- players in the game,
- buy-in summaries,
- final standings,
- settlement lines,
- receiver UPI only when relevant.

Do not expose:

- other host games,
- private host settings,
- internal game events,
- unrelated player stats.

## 7. Event Types

Recommended `game_events.event_type` values:

```text
game_created
config_updated
players_added
player_removed
seating_shuffled
seating_updated
game_started
game_paused
game_resumed
buy_in_added
buy_in_updated
buy_in_deleted
game_ended
final_tally_saved
ratio_updated_after_start
settlement_generated
settlement_mode_changed
settlement_line_updated
settlement_line_paid
settlement_line_partially_paid
game_closed
game_reopened
game_cancelled
share_card_generated
```

## 8. Soft Delete Rules

`poker_buy_ins.deleted_at` indicates reversal/deletion.

When calculating totals, include only:

```sql
deleted_at is null
```

Do not hard-delete buy-ins unless it is a non-production cleanup action.

## 9. Host Data Isolation Rules

- Every player belongs to one host.
- Every game belongs to one host.
- Every game night belongs to one host.
- Game players must reference players owned by the same host as the game.
- Server-side actions must check ownership before writing.

## 10. Useful Views Later

Optional views for analytics later:

- `game_player_buy_in_summary`
- `game_final_results_summary`
- `host_dashboard_stats`
- `player_lifetime_stats_by_host`

Do not build these before the MVP core is working unless helpful.
