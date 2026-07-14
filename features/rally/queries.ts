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

export type RallyViewerContext = {
  /** Member seat whose player profile is linked to the signed-in account. */
  linkedMemberId: string | null;
  /** The signed-in visitor's join-request state for this rally. */
  requestStatus: "pending" | "approved" | "declined" | null;
  /** True when the signed-in visitor is the rally's host. */
  isHost: boolean;
};

export async function getRallyViewerContext(token: string, clerkUserId: string | null): Promise<RallyViewerContext> {
  const none: RallyViewerContext = { linkedMemberId: null, requestStatus: null, isHost: false };

  if (!clerkUserId || !token || token.length > 40) return none;

  const supabase = createSupabaseAdminClient();

  const { data: rally } = await supabase.from("rallies").select("id, host_id").eq("public_token", token).maybeSingle();

  if (!rally) return none;

  const [{ data: host }, { data: linkedPlayers }, { data: request }] = await Promise.all([
    supabase.from("hosts").select("id").eq("id", rally.host_id).eq("clerk_user_id", clerkUserId).maybeSingle(),
    supabase.from("players").select("id").eq("linked_clerk_user_id", clerkUserId),
    supabase
      .from("rally_join_requests")
      .select("status")
      .eq("rally_id", rally.id)
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle(),
  ]);

  let linkedMemberId: string | null = null;

  if (linkedPlayers && linkedPlayers.length > 0) {
    const { data: seat } = await supabase
      .from("rally_members")
      .select("id")
      .eq("rally_id", rally.id)
      .in("player_id", linkedPlayers.map((p) => p.id))
      .maybeSingle();

    linkedMemberId = seat?.id ?? null;
  }

  return {
    linkedMemberId,
    requestStatus: request?.status ?? null,
    isHost: Boolean(host),
  };
}

export async function listPendingJoinRequests(rallyId: string) {
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const { data: rally } = await supabase.from("rallies").select("id").eq("id", rallyId).eq("host_id", host.id).maybeSingle();

  if (!rally) return [];

  const { data, error } = await supabase
    .from("rally_join_requests")
    .select("*")
    .eq("rally_id", rally.id)
    .eq("status", "pending")
    .order("created_at");

  if (error) {
    // Tolerate the table not existing yet (migration not applied) — the
    // host room simply shows no requests instead of crashing.
    console.warn("rally_join_requests unavailable:", error.message);
    return [];
  }

  return data;
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
