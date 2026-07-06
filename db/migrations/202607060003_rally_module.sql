-- Rally: community-driven challenge tracker (module two).
-- Host owns the rally; members are the host's address-book players and
-- participate through the public token link without logging in.

create type rally_status as enum ('draft', 'active', 'completed', 'cancelled');

create type rally_check_in_status as enum ('pending', 'approved', 'rejected');

create table rallies (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references hosts(id) on delete cascade,
  title text not null,
  description text,
  start_date date not null,
  end_date date not null,
  status rally_status not null default 'draft',
  public_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table rally_members (
  id uuid primary key default gen_random_uuid(),
  rally_id uuid not null references rallies(id) on delete cascade,
  player_id uuid not null references players(id) on delete restrict,
  is_host_member boolean not null default false,
  joined_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(rally_id, player_id)
);

create table rally_check_ins (
  id uuid primary key default gen_random_uuid(),
  rally_id uuid not null references rallies(id) on delete cascade,
  rally_member_id uuid not null references rally_members(id) on delete cascade,
  check_in_date date not null,
  message text,
  proof_image_url text,
  status rally_check_in_status not null default 'pending',
  decided_by_host boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(rally_member_id, check_in_date)
);

create table rally_votes (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid not null references rally_check_ins(id) on delete cascade,
  voter_member_id uuid not null references rally_members(id) on delete cascade,
  vote boolean not null,
  created_at timestamptz not null default now(),
  unique(check_in_id, voter_member_id)
);

create index idx_rallies_host_id on rallies(host_id);
create index idx_rallies_public_token on rallies(public_token);
create index idx_rally_members_rally_id on rally_members(rally_id);
create index idx_rally_check_ins_rally_id on rally_check_ins(rally_id);
create index idx_rally_check_ins_member_date on rally_check_ins(rally_member_id, check_in_date);
create index idx_rally_votes_check_in_id on rally_votes(check_in_id);

create trigger rallies_set_updated_at before update on rallies for each row execute function set_updated_at();
create trigger rally_members_set_updated_at before update on rally_members for each row execute function set_updated_at();
create trigger rally_check_ins_set_updated_at before update on rally_check_ins for each row execute function set_updated_at();

alter table rallies enable row level security;
alter table rally_members enable row level security;
alter table rally_check_ins enable row level security;
alter table rally_votes enable row level security;

create policy "hosts own rallies"
on rallies for all
using (host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub'))
with check (host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub'));

create policy "hosts own rally members"
on rally_members for all
using (rally_id in (select id from rallies where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')))
with check (rally_id in (select id from rallies where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')));

create policy "hosts own rally check ins"
on rally_check_ins for all
using (rally_id in (select id from rallies where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')))
with check (rally_id in (select id from rallies where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')));

create policy "hosts own rally votes"
on rally_votes for all
using (check_in_id in (select id from rally_check_ins where rally_id in (select id from rallies where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub'))))
with check (check_in_id in (select id from rally_check_ins where rally_id in (select id from rallies where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub'))));
