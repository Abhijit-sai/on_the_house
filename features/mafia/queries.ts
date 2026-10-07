import { requireCurrentHost } from "@/features/hosts/queries";
import { standings, type StandingRow } from "@/features/mafia/engine";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MafiaGame, MafiaGameScore, MafiaRoom } from "@/db/types/database";

export type MafiaRoomSummary = MafiaRoom & { gamesPlayed: number; playerCount: number };

export type MafiaSeatView = {
  seatId: string;
  playerId: string;
  name: string;
  colorKey: string | null;
  seatOrder: number;
  isHostPlayer: boolean;
  active: boolean;
};

export type MafiaRoomView = {
  room: MafiaRoom;
  seats: MafiaSeatView[];
  games: (Omit<MafiaGame, "events"> & { scores: MafiaGameScore[] })[];
  standings: StandingRow[];
};

/**
 * Rooms for the arcade, hub and history. Tolerates the tables not existing yet
 * (migration not applied) so the rest of the app keeps working.
 */
export async function listMafiaRoomsForCurrentHost(): Promise<MafiaRoomSummary[]> {
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const { data: rooms, error } = await supabase
    .from("mafia_rooms")
    .select("*")
    .eq("host_id", host.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.warn("mafia_rooms unavailable:", error.message);
    return [];
  }

  if (rooms.length === 0) return [];

  const roomIds = rooms.map((r) => r.id);
  const [gamesRes, seatsRes] = await Promise.all([
    supabase.from("mafia_games").select("room_id").in("room_id", roomIds),
    supabase.from("mafia_room_players").select("room_id, active").in("room_id", roomIds),
  ]);

  if (gamesRes.error) throw new Error(gamesRes.error.message);
  if (seatsRes.error) throw new Error(seatsRes.error.message);

  return rooms.map((room) => ({
    ...room,
    gamesPlayed: gamesRes.data.filter((g) => g.room_id === room.id).length,
    playerCount: seatsRes.data.filter((s) => s.room_id === room.id && s.active).length,
  }));
}

export async function getMafiaRoomForHost(roomId: string): Promise<MafiaRoomView | null> {
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const { data: room, error } = await supabase
    .from("mafia_rooms")
    .select("*")
    .eq("id", roomId)
    .eq("host_id", host.id)
    .maybeSingle();

  if (error) {
    console.warn("mafia_rooms unavailable:", error.message);
    return null;
  }

  if (!room) return null;

  const [seatsRes, gamesRes] = await Promise.all([
    supabase.from("mafia_room_players").select("*").eq("room_id", room.id).order("seat_order"),
    supabase
      .from("mafia_games")
      .select(
        "id, room_id, god_room_player_id, mafia_count, has_doctor, has_detective, reveal_on_death, nights_played, days_played, winner, started_at, finished_at, created_at",
      )
      .eq("room_id", room.id)
      .order("finished_at", { ascending: false }),
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
      ? supabase.from("mafia_game_scores").select("*").in("game_id", gameIds)
      : Promise.resolve({ data: [] as MafiaGameScore[], error: null }),
  ]);

  if (playersRes.error) throw new Error(playersRes.error.message);
  if (scoresRes.error) throw new Error(scoresRes.error.message);

  const seats: MafiaSeatView[] = seatsRes.data.map((seat) => {
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

  const rows = scores.map((s) => ({ seatId: s.room_player_id, points: s.points, role: s.role, won: s.won }));

  return {
    room,
    seats,
    games,
    standings: standings(
      rows,
      gamesRes.data.map((g) => g.god_room_player_id),
      seats.map((s) => s.seatId),
    ),
  };
}
