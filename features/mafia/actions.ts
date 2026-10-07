"use server";

import { revalidatePath } from "next/cache";
import type { Json } from "@/db/types/database";
import { requireCurrentHost } from "@/features/hosts/queries";
import { scoreGame, validateSetup, walk, type GameState } from "@/features/mafia/engine";
import { createMafiaRoomSchema, finishedGameSchema, updateMafiaSeatsSchema } from "@/features/mafia/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type MafiaActionState = {
  ok: boolean;
  message?: string;
  roomId?: string;
};

function fail(message: string): MafiaActionState {
  return { ok: false, message };
}

function revalidateRoom(roomId: string) {
  revalidatePath(`/app/mafia/${roomId}`);
  revalidatePath("/app/mafia");
  revalidatePath("/app/arcade");
  revalidatePath("/app/history");
}

function defaultTitle() {
  const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
  return `Mafia night · ${day}`;
}

type Supabase = ReturnType<typeof createSupabaseAdminClient>;

async function assertOwnPlayers(supabase: Supabase, hostId: string, playerIds: string[]) {
  const { data, error } = await supabase.from("players").select("id").eq("host_id", hostId).in("id", playerIds);

  if (error) return error.message;
  if (data.length !== playerIds.length) return "Some of those players aren't in your address book.";
  return null;
}

async function requireOwnRoom(supabase: Supabase, hostId: string, roomId: string) {
  const { data, error } = await supabase
    .from("mafia_rooms")
    .select("*")
    .eq("id", roomId)
    .eq("host_id", hostId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function createMafiaRoom(input: unknown): Promise<MafiaActionState> {
  const parsed = createMafiaRoomSchema.safeParse(input);

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the room details.");

  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();
  const data = parsed.data;

  const ownership = await assertOwnPlayers(
    supabase,
    host.id,
    data.members.map((m) => m.playerId),
  );
  if (ownership) return fail(ownership);

  const { data: room, error } = await supabase
    .from("mafia_rooms")
    .insert({ host_id: host.id, title: data.title || defaultTitle(), status: "active" })
    .select("*")
    .single();

  if (error) return fail(error.message);

  const { error: seatsError } = await supabase.from("mafia_room_players").insert(
    data.members.map((member, index) => ({
      room_id: room.id,
      player_id: member.playerId,
      seat_order: index,
      is_host_player: member.isHostPlayer,
    })),
  );

  if (seatsError) {
    await supabase.from("mafia_rooms").delete().eq("id", room.id);
    return fail(seatsError.message);
  }

  revalidateRoom(room.id);

  return { ok: true, roomId: room.id };
}

/** Sets who's in the next game and in what order. Anyone left out sits out but keeps their points. */
export async function updateMafiaSeats(input: unknown): Promise<MafiaActionState> {
  const parsed = updateMafiaSeatsSchema.safeParse(input);

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the lineup.");

  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();
  const { roomId, playerIds } = parsed.data;

  const room = await requireOwnRoom(supabase, host.id, roomId);
  if (!room) return fail("Room not found.");

  const ownership = await assertOwnPlayers(supabase, host.id, playerIds);
  if (ownership) return fail(ownership);

  const { data: seats, error } = await supabase.from("mafia_room_players").select("*").eq("room_id", room.id);
  if (error) return fail(error.message);

  const byPlayer = new Map(seats.map((s) => [s.player_id, s]));
  const benchOrder = playerIds.length;

  const updates = [
    ...playerIds.flatMap((playerId, index) => {
      const seat = byPlayer.get(playerId);
      return seat
        ? [supabase.from("mafia_room_players").update({ seat_order: index, active: true }).eq("id", seat.id)]
        : [];
    }),
    ...seats
      .filter((s) => !playerIds.includes(s.player_id) && s.active)
      .map((s) => supabase.from("mafia_room_players").update({ active: false, seat_order: benchOrder }).eq("id", s.id)),
  ];

  const newcomers = playerIds
    .map((playerId, index) => ({ playerId, index }))
    .filter(({ playerId }) => !byPlayer.has(playerId));

  const results = await Promise.all([
    ...updates,
    ...(newcomers.length > 0
      ? [
          supabase
            .from("mafia_room_players")
            .insert(
              newcomers.map(({ playerId, index }) => ({ room_id: room.id, player_id: playerId, seat_order: index })),
            ),
        ]
      : []),
  ]);

  const failed = results.find((r) => r.error);
  if (failed?.error) return fail(failed.error.message);

  revalidateRoom(room.id);

  return { ok: true, roomId: room.id };
}

async function setRoomStatus(roomId: string, status: "active" | "archived"): Promise<MafiaActionState> {
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("mafia_rooms")
    .update({ status })
    .eq("id", roomId)
    .eq("host_id", host.id)
    .select("id")
    .maybeSingle();

  if (error) return fail(error.message);
  if (!data) return fail("Room not found.");

  revalidateRoom(roomId);

  return { ok: true, roomId };
}

export async function archiveMafiaRoom(roomId: string) {
  return setRoomStatus(roomId, "archived");
}

export async function reopenMafiaRoom(roomId: string) {
  return setRoomStatus(roomId, "active");
}

/**
 * Records a finished game. God's phone sends the setup and the whole event
 * log; the server replays every night and vote with the same engine, so a
 * game that breaks a rule never lands and the scoreboard never trusts client
 * arithmetic. Saving the same game twice is a no-op (the id is minted at the deal).
 */
export async function recordMafiaGame(input: unknown): Promise<MafiaActionState> {
  const parsed = finishedGameSchema.safeParse(input);

  if (!parsed.success) return fail("That game didn't come through cleanly — try saving again.");

  const state = parsed.data as GameState;
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const room = await requireOwnRoom(supabase, host.id, state.roomId);
  if (!room) return fail("Room not found.");

  let ledger: ReturnType<typeof walk>;
  try {
    validateSetup(state);
    ledger = walk(state);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "That game breaks the rules.");
  }

  if (!ledger.winner) return fail("This game doesn't have a winner yet.");

  const roomSeatIds = [state.god.seatId, ...state.seats.map((s) => s.seatId)];
  const { data: roomSeats, error: seatsError } = await supabase
    .from("mafia_room_players")
    .select("id")
    .eq("room_id", room.id)
    .in("id", roomSeatIds);

  if (seatsError) return fail(seatsError.message);
  if (roomSeats.length !== roomSeatIds.length) return fail("Someone in this game isn't seated in the room.");

  const scores = scoreGame(state);

  const { error: gameError } = await supabase.from("mafia_games").insert({
    id: state.gameId,
    room_id: room.id,
    god_room_player_id: state.god.seatId,
    mafia_count: state.settings.mafiaCount,
    has_doctor: state.settings.doctor,
    has_detective: state.settings.detective,
    reveal_on_death: state.settings.revealOnDeath,
    nights_played: ledger.nights,
    days_played: ledger.days,
    winner: ledger.winner,
    events: state.events as unknown as Json,
    started_at: state.startedAt,
  });

  if (gameError) {
    // Already recorded (a retry after a flaky connection) — that's a success.
    if (gameError.code === "23505") return { ok: true, roomId: room.id };
    return fail(gameError.message);
  }

  const { error: scoresError } = await supabase.from("mafia_game_scores").insert(
    scores.map((s) => ({
      game_id: state.gameId,
      room_player_id: s.seatId,
      role: s.role,
      won: s.won,
      died_night: s.diedNight,
      voted_out_day: s.votedOutDay,
      left_game: s.leftGame,
      survived: s.survived,
      bonus: s.bonus,
      saves: s.saves,
      finds: s.finds,
      peeks: s.peeks,
      points: s.points,
    })),
  );

  if (scoresError) {
    await supabase.from("mafia_games").delete().eq("id", state.gameId);
    return fail(scoresError.message);
  }

  // Bump the room so it floats to the top of the hub.
  await supabase.from("mafia_rooms").update({ status: room.status }).eq("id", room.id);

  revalidateRoom(room.id);

  return { ok: true, roomId: room.id };
}
