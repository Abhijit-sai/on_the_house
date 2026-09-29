import { requireCurrentHost } from "@/features/hosts/queries";
import { standings, type StandingRow } from "@/features/imposter/engine";
import { pairKey } from "@/features/imposter/words";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ImposterGame, ImposterGameScore, ImposterRoom } from "@/db/types/database";

export type ImposterRoomSummary = ImposterRoom & { gamesPlayed: number; playerCount: number };

export type ImposterSeatView = {
  seatId: string;
  playerId: string;
  name: string;
  colorKey: string | null;
  seatOrder: number;
  isHostPlayer: boolean;
  active: boolean;
};

export type ImposterRoomView = {
  room: ImposterRoom;
  seats: ImposterSeatView[];
  games: (ImposterGame & { scores: ImposterGameScore[] })[];
  standings: StandingRow[];
  usedPairKeys: string[];
};

/**
 * Rooms for the arcade, hub and history. Tolerates the tables not existing yet
 * (migration not applied) so the rest of the app keeps working.
 */
export async function listImposterRoomsForCurrentHost(): Promise<ImposterRoomSummary[]> {
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const { data: rooms, error } = await supabase
    .from("imposter_rooms")
    .select("*")
    .eq("host_id", host.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.warn("imposter_rooms unavailable:", error.message);
    return [];
  }

  if (rooms.length === 0) return [];

  const roomIds = rooms.map((r) => r.id);
  const [gamesRes, seatsRes] = await Promise.all([
    supabase.from("imposter_games").select("room_id").in("room_id", roomIds),
    supabase.from("imposter_room_players").select("room_id, active").in("room_id", roomIds),
  ]);

  if (gamesRes.error) throw new Error(gamesRes.error.message);
  if (seatsRes.error) throw new Error(seatsRes.error.message);

  return rooms.map((room) => ({
    ...room,
    gamesPlayed: gamesRes.data.filter((g) => g.room_id === room.id).length,
    playerCount: seatsRes.data.filter((s) => s.room_id === room.id && s.active).length,
  }));
}

export async function getImposterRoomForHost(roomId: string): Promise<ImposterRoomView | null> {
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const { data: room, error } = await supabase
    .from("imposter_rooms")
    .select("*")
    .eq("id", roomId)
    .eq("host_id", host.id)
    .maybeSingle();

  if (error) {
    console.warn("imposter_rooms unavailable:", error.message);
    return null;
  }

  if (!room) return null;

  const [seatsRes, gamesRes] = await Promise.all([
    supabase.from("imposter_room_players").select("*").eq("room_id", room.id).order("seat_order"),
    supabase.from("imposter_games").select("*").eq("room_id", room.id).order("finished_at", { ascending: false }),
  ]);

  if (seatsRes.error) throw new Error(seatsRes.error.message);
  if (gamesRes.error) throw new Error(gamesRes.error.message);

  const playerIds = seatsRes.data.map((s) => s.player_id);
  const gameIds = gamesRes.data.map((g) => g.id);

  const [playersRes, scoresRes] = await Promise.all([
    supabase
      .from("players")
      .select("id, name, color_key")
      .in("id", playerIds.length > 0 ? playerIds : ["00000000-0000-0000-0000-000000000000"]),
    gameIds.length > 0
      ? supabase.from("imposter_game_scores").select("*").in("game_id", gameIds)
      : Promise.resolve({ data: [] as ImposterGameScore[], error: null }),
  ]);

  if (playersRes.error) throw new Error(playersRes.error.message);
  if (scoresRes.error) throw new Error(scoresRes.error.message);

  const seats: ImposterSeatView[] = seatsRes.data.map((seat) => {
    const player = playersRes.data.find((p) => p.id === seat.player_id);

    return {
      seatId: seat.id,
      playerId: seat.player_id,
      name: player?.name ?? "Player",
      colorKey: player?.color_key ?? null,
      seatOrder: seat.seat_order,
      isHostPlayer: seat.is_host_player,
      active: seat.active,
    };
  });

  const scores = scoresRes.data ?? [];
  const games = gamesRes.data.map((game) => ({ ...game, scores: scores.filter((s) => s.game_id === game.id) }));
  const winnerOf = new Map(gamesRes.data.map((g) => [g.id, g.winner]));

  const rows = scores.map((s) => ({
    seatId: s.room_player_id,
    points: s.points,
    role: s.role,
    won: (s.role === "imposter") === (winnerOf.get(s.game_id) === "imposters"),
  }));

  return {
    room,
    seats,
    games,
    standings: standings(rows, seats.map((s) => s.seatId)),
    usedPairKeys: gamesRes.data.map((g) => pairKey(g.civilian_word, g.imposter_word)),
  };
}
