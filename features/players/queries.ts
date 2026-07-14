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
