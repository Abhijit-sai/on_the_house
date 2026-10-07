import { requireCurrentHost } from "@/features/hosts/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Which games each player has appeared in, for the address-book filter. */
export async function getPlayerParticipation() {
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const [gamesRes, ralliesRes] = await Promise.all([
    supabase.from("games").select("id").eq("host_id", host.id),
    supabase.from("rallies").select("id").eq("host_id", host.id),
  ]);

  if (gamesRes.error) throw new Error(gamesRes.error.message);
  if (ralliesRes.error) throw new Error(ralliesRes.error.message);

  const gameIds = gamesRes.data.map((g) => g.id);
  const rallyIds = ralliesRes.data.map((r) => r.id);

  const [seatsRes, membersRes] = await Promise.all([
    gameIds.length > 0
      ? supabase.from("game_players").select("player_id").in("game_id", gameIds)
      : Promise.resolve({ data: [], error: null }),
    rallyIds.length > 0
      ? supabase.from("rally_members").select("player_id").in("rally_id", rallyIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (seatsRes.error) throw new Error(seatsRes.error.message);
  if (membersRes.error) throw new Error(membersRes.error.message);

  return {
    pokerPlayerIds: [...new Set((seatsRes.data ?? []).map((s) => s.player_id))],
    rallyPlayerIds: [...new Set((membersRes.data ?? []).map((m) => m.player_id))],
  };
}

export async function listPlayersForCurrentHost() {
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("host_id", host.id)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * The address book ordered by how often each person turns up (poker seats,
 * rally memberships, Imposter and Mafia rooms), so pickers can offer the regulars first.
 */
export async function listPlayersByPlayCount() {
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const [playersRes, gamesRes, ralliesRes, roomsRes, mafiaRoomsRes] = await Promise.all([
    supabase.from("players").select("*").eq("host_id", host.id),
    supabase.from("games").select("id").eq("host_id", host.id),
    supabase.from("rallies").select("id").eq("host_id", host.id),
    supabase.from("imposter_rooms").select("id").eq("host_id", host.id),
    supabase.from("mafia_rooms").select("id").eq("host_id", host.id),
  ]);

  if (playersRes.error) throw new Error(playersRes.error.message);
  if (gamesRes.error) throw new Error(gamesRes.error.message);
  if (ralliesRes.error) throw new Error(ralliesRes.error.message);

  const gameIds = gamesRes.data.map((g) => g.id);
  const rallyIds = ralliesRes.data.map((r) => r.id);

  const [seatsRes, membersRes] = await Promise.all([
    gameIds.length > 0
      ? supabase.from("game_players").select("player_id").in("game_id", gameIds)
      : Promise.resolve({ data: [] as { player_id: string }[], error: null }),
    rallyIds.length > 0
      ? supabase.from("rally_members").select("player_id").in("rally_id", rallyIds)
      : Promise.resolve({ data: [] as { player_id: string }[], error: null }),
  ]);

  if (seatsRes.error) throw new Error(seatsRes.error.message);
  if (membersRes.error) throw new Error(membersRes.error.message);

  // Imposter and Mafia seats count too — but only once their tables exist, so
  // a missing migration never breaks the pickers.
  const roomIds = roomsRes.error ? [] : roomsRes.data.map((r) => r.id);
  const mafiaRoomIds = mafiaRoomsRes.error ? [] : mafiaRoomsRes.data.map((r) => r.id);
  const [imposterSeats, mafiaSeats] = await Promise.all([
    roomIds.length > 0
      ? supabase.from("imposter_room_players").select("player_id").in("room_id", roomIds).then((r) => r.data ?? [])
      : [],
    mafiaRoomIds.length > 0
      ? supabase.from("mafia_room_players").select("player_id").in("room_id", mafiaRoomIds).then((r) => r.data ?? [])
      : [],
  ]);

  const counts = new Map<string, number>();

  for (const row of [...(seatsRes.data ?? []), ...(membersRes.data ?? []), ...imposterSeats, ...mafiaSeats]) {
    counts.set(row.player_id, (counts.get(row.player_id) ?? 0) + 1);
  }

  return [...playersRes.data].sort(
    (a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name),
  );
}
