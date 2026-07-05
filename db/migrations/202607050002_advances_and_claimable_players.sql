-- Advances: money a player hands the host up front, netted into settlement.
-- Claimable players: a host-created profile can later be linked to a real
-- authenticated On the House user without any schema rework.

alter table players
  add column linked_clerk_user_id text;

comment on column players.linked_clerk_user_id is
  'Set when a real authenticated user claims this host-created profile. Null for host-only "temporary" profiles.';

create index idx_players_linked_clerk_user_id on players(linked_clerk_user_id) where linked_clerk_user_id is not null;

alter table game_players
  add column advance_money numeric(12,2) not null default 0,
  add constraint game_players_advance_money_non_negative check (advance_money >= 0);

comment on column game_players.advance_money is
  'Cash the player paid the host at the start of the game. Netted into settlement: player effective net = net result + advance; host carries the offset.';

-- Discrepancy note kept for future "acknowledge & proceed" flow; unused while tally hard-blocks.
alter table games
  add column tally_discrepancy_note text;
