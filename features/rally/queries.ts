import { requireCurrentHost } from "@/features/hosts/queries";
import { buildRallyView, type RallyView } from "@/features/rally/view";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Rally, RallyMember } from "@/db/types/database";

type Supabase = ReturnType<typeof createSupabaseAdminClient>;

export async function assembleRallyView(supabase: Supabase, rally: Rally): Promise<RallyView> {
  const [membersRes, checkInsRes] = await Promise.all([
    supabase.from("rally_members").select("*").eq("rally_id", rally.id).order("created_at"),
    supabase.from("rally_check_ins").select("*").eq("rally_id", rally.id),
  ]);

  if (membersRes.error) throw new Error(membersRes.error.message);
  if (checkInsRes.error) throw new Error(checkInsRes.error.message);

  const playerIds = membersRes.data.map((m: RallyMember) => m.player_id);
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, name, avatar_key, color_key")
    .in("id", playerIds.length > 0 ? playerIds : ["00000000-0000-0000-0000-000000000000"]);

  if (playersError) throw new Error(playersError.message);

  const checkInIds = checkInsRes.data.map((c) => c.id);
  let votes: { id: string; check_in_id: string; voter_member_id: string; vote: boolean; created_at: string }[] = [];

  if (checkInIds.length > 0) {
    const { data, error } = await supabase.from("rally_votes").select("*").in("check_in_id", checkInIds);

    if (error) throw new Error(error.message);

    votes = data;
  }

  const members = membersRes.data.map((member: RallyMember) => {
    const player = players.find((p) => p.id === member.player_id);

    return {
      ...member,
      name: player?.name ?? "Member",
      avatar_key: player?.avatar_key ?? null,
      color_key: player?.color_key ?? null,
    };
  });

  return buildRallyView(rally, members, checkInsRes.data, votes);
}

export async function getRallyViewForHost(rallyId: string): Promise<RallyView | null> {
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const { data: rally, error } = await supabase
    .from("rallies")
    .select("*")
    .eq("id", rallyId)
    .eq("host_id", host.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!rally) return null;

  return assembleRallyView(supabase, rally);
}

export async function getRallyViewByToken(token: string): Promise<RallyView | null> {
  if (!token || token.length > 40) return null;

  const supabase = createSupabaseAdminClient();

  const { data: rally, error } = await supabase.from("rallies").select("*").eq("public_token", token).maybeSingle();

  if (error) throw new Error(error.message);
  if (!rally) return null;

  return assembleRallyView(supabase, rally);
}

export async function listRalliesForCurrentHost() {
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("rallies")
    .select("*")
    .eq("host_id", host.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data;
}
