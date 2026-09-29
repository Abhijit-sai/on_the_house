"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentHost } from "@/features/hosts/queries";
import { dealComplete, scoreGame, winnerOf, type GameState } from "@/features/imposter/engine";
import { createImposterRoomSchema, finishedGameSchema, updateImposterSeatsSchema } from "@/features/imposter/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ImposterActionState = {
  ok: boolean;
  message?: string;
  roomId?: string;
};

function fail(message: string): ImposterActionState {
  return { ok: false, message };
}

function revalidateRoom(roomId: string) {
  revalidatePath(`/app/imposter/${roomId}`);
  revalidatePath("/app/imposter");
  revalidatePath("/app/arcade");
  revalidatePath("/app/history");
}

function defaultTitle() {
  const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
  return `Imposter night · ${day}`;
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
    .from("imposter_rooms")
    .select("*")
    .eq("id", roomId)
    .eq("host_id", hostId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function createImposterRoom(input: unknown): Promise<ImposterActionState> {
  const parsed = createImposterRoomSchema.safeParse(input);

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the room details.");

  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();
  const data = parsed.data;

  const ownership = await assertOwnPlayers(supabase, host.id, data.members.map((m) => m.playerId));
  if (ownership) return fail(ownership);

  const { data: room, error } = await supabase
    .from("imposter_rooms")
    .insert({ host_id: host.id, title: data.title || defaultTitle(), status: "active" })
    .select("*")
    .single();

  if (error) return fail(error.message);

  const { error: seatsError } = await supabase.from("imposter_room_players").insert(
    data.members.map((member, index) => ({
      room_id: room.id,
      player_id: member.playerId,
      seat_order: index,
      is_host_player: member.isHostPlayer,
    })),
  );

  if (seatsError) {
    await supabase.from("imposter_rooms").delete().eq("id", room.id);
    return fail(seatsError.message);
  }

  revalidateRoom(room.id);

  return { ok: true, roomId: room.id };
}

/** Sets who's playing the next deal and in what order. Anyone left out sits out but keeps their points. */
export async function updateImposterSeats(input: unknown): Promise<ImposterActionState> {
  const parsed = updateImposterSeatsSchema.safeParse(input);

  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the lineup.");

  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();
  const { roomId, playerIds } = parsed.data;

  const room = await requireOwnRoom(supabase, host.id, roomId);
  if (!room) return fail("Room not found.");

  const ownership = await assertOwnPlayers(supabase, host.id, playerIds);
  if (ownership) return fail(ownership);

  const { data: seats, error } = await supabase.from("imposter_room_players").select("*").eq("room_id", room.id);
  if (error) return fail(error.message);

  const byPlayer = new Map(seats.map((s) => [s.player_id, s]));
  const benchOrder = playerIds.length;

  const updates = [
    ...playerIds.flatMap((playerId, index) => {
      const seat = byPlayer.get(playerId);
      return seat ? [supabase.from("imposter_room_players").update({ seat_order: index, active: true }).eq("id", seat.id)] : [];
    }),
    ...seats
      .filter((s) => !playerIds.includes(s.player_id) && s.active)
      .map((s) => supabase.from("imposter_room_players").update({ active: false, seat_order: benchOrder }).eq("id", s.id)),
  ];

  const newcomers = playerIds
    .map((playerId, index) => ({ playerId, index }))
    .filter(({ playerId }) => !byPlayer.has(playerId));

  const results = await Promise.all([
    ...updates,
    ...(newcomers.length > 0
      ? [
          supabase.from("imposter_room_players").insert(
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

async function setRoomStatus(roomId: string, status: "active" | "archived"): Promise<ImposterActionState> {
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("imposter_rooms")
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

export async function archiveImposterRoom(roomId: string) {
  return setRoomStatus(roomId, "archived");
}

export async function reopenImposterRoom(roomId: string) {
  return setRoomStatus(roomId, "active");
}

/**
 * Records a finished game. The phone sends the whole game as it was played;
 * the server re-derives the winner and every score with the same engine, so
 * the scoreboard never trusts client arithmetic. Saving the same game twice is
 * a no-op (the game id is minted at the deal).
 */
export async function recordImposterGame(input: unknown): Promise<ImposterActionState> {
  const parsed = finishedGameSchema.safeParse(input);

  if (!parsed.success) return fail("That game didn't come through cleanly — try saving again.");

  const state = parsed.data as GameState;
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const room = await requireOwnRoom(supabase, host.id, state.roomId);
  if (!room) return fail("Room not found.");

  // The game must be internally consistent before anything is written.
  const seatIds = state.seats.map((s) => s.seatId);
  const imposterCards = state.cards.filter((c) => c.role === "imposter");

  if (state.cards.length !== seatIds.length || !dealComplete(state)) return fail("Not every player drew a card.");
  if (new Set(state.cards.map((c) => c.claimedBy)).size !== seatIds.length) return fail("Cards and players don't match.");
  if (state.cards.some((c) => !seatIds.includes(c.claimedBy!))) return fail("Cards and players don't match.");
  if (imposterCards.length !== state.imposterCount) return fail("Imposter count doesn't match the deal.");
  if (state.cards.some((c) => c.word !== (c.role === "imposter" ? state.imposterWord : state.civilianWord))) {
    return fail("Words don't match the deal.");
  }
  if (state.eliminations.some((e, i) => e.round !== i + 1)) return fail("Votes are out of order.");

  const winner = winnerOf(state);
  if (!winner || winner !== state.winner) return fail("This game doesn't have a winner yet.");
  if (state.round !== state.eliminations.length) return fail("Rounds and votes don't line up.");

  const { data: roomSeats, error: seatsError } = await supabase
    .from("imposter_room_players")
    .select("id")
    .eq("room_id", room.id)
    .in("id", seatIds);

  if (seatsError) return fail(seatsError.message);
  if (roomSeats.length !== seatIds.length) return fail("Someone in this game isn't seated in the room.");

  const scores = scoreGame(state);

  const { error: gameError } = await supabase.from("imposter_games").insert({
    id: state.gameId,
    room_id: room.id,
    category_id: state.categoryId,
    civilian_word: state.civilianWord,
    imposter_word: state.imposterWord,
    imposter_count: state.imposterCount,
    rounds_played: state.round,
    winner,
    started_at: state.startedAt,
  });

  if (gameError) {
    // Already recorded (a retry after a flaky connection) — that's a success.
    if (gameError.code === "23505") return { ok: true, roomId: room.id };
    return fail(gameError.message);
  }

  const { error: scoresError } = await supabase.from("imposter_game_scores").insert(
    scores.map((s) => ({
      game_id: state.gameId,
      room_player_id: s.seatId,
      role: s.role,
      word: s.word,
      eliminated_round: s.eliminatedRound,
      rounds_survived: s.roundsSurvived,
      bonus: s.bonus,
      points: s.points,
      peeks: state.peeks[s.seatId] ?? 0,
    })),
  );

  if (scoresError) {
    await supabase.from("imposter_games").delete().eq("id", state.gameId);
    return fail(scoresError.message);
  }

  // Bump the room so it floats to the top of the hub.
  await supabase.from("imposter_rooms").update({ status: room.status }).eq("id", room.id);

  revalidateRoom(room.id);

  return { ok: true, roomId: room.id };
}
