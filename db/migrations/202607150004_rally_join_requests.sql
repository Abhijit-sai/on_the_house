-- Rally invitations: outsiders open the rally link, sign in with email
-- (Clerk), and request a spot. The host approves; approval creates a
-- host-owned player linked to the requester's account (claimable identity)
-- and seats them from that day onward.

create type rally_join_request_status as enum ('pending', 'approved', 'declined');

create table rally_join_requests (
  id uuid primary key default gen_random_uuid(),
  rally_id uuid not null references rallies(id) on delete cascade,
  clerk_user_id text not null,
  email text not null,
  display_name text not null,
  status rally_join_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(rally_id, clerk_user_id)
);

create index idx_rally_join_requests_rally_id on rally_join_requests(rally_id);
create index idx_rally_join_requests_clerk_user_id on rally_join_requests(clerk_user_id);

create trigger rally_join_requests_set_updated_at before update on rally_join_requests for each row execute function set_updated_at();

alter table rally_join_requests enable row level security;

create policy "hosts own rally join requests"
on rally_join_requests for all
using (rally_id in (select id from rallies where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')))
with check (rally_id in (select id from rallies where host_id in (select id from hosts where clerk_user_id = auth.jwt() ->> 'sub')));
