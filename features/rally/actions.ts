"use server";

import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { requireCurrentHost } from "@/features/hosts/queries";
import { approvalState, todayISO } from "@/features/rally/engine";
import { castVoteSchema, createRallySchema, hostDecisionSchema, submitCheckInSchema } from "@/features/rally/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type RallyActionState = {
  ok: boolean;
  message?: string;
  rallyId?: string;
};

function fail(message: string): RallyActionState {
  return { ok: false, message };
}

function revalidateRally(rallyId: string, token?: string) {
  revalidatePath(`/app/rallies/${rallyId}`);
  revalidatePath("/app/dashboard");

  if (token) {
    revalidatePath(`/r/${token}`);
  }
}

export async function createRally(input: unknown): Promise<RallyActionState> {
  const parsed = createRallySchema.safeParse(input);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the rally details.");
  }

  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();
  const data = parsed.data;

  const { data: rally, error } = await supabase
    .from("rallies")
    .insert({
      host_id: host.id,
      title: data.title,
      description: data.description || null,
      start_date: data.startDate,
      end_date: data.endDate,
      status: "active",
      public_token: nanoid(12),
    })
    .select("*")
    .single();

  if (error) return fail(error.message);

  const joinedOn = todayISO() > data.startDate ? todayISO() : data.startDate;

  const { error: membersError } = await supabase.from("rally_members").insert(
    data.members.map((member) => ({
      rally_id: rally.id,
      player_id: member.playerId,
      is_host_member: member.isHostMember,
      joined_on: joinedOn,
    })),
  );

  if (membersError) {
    await supabase.from("rallies").delete().eq("id", rally.id);
    return fail(membersError.message);
  }

  revalidateRally(rally.id, rally.public_token);

  return { ok: true, rallyId: rally.id };
}

async function setRallyStatus(rallyId: string, status: "completed" | "cancelled" | "active"): Promise<RallyActionState> {
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const { data: rally, error } = await supabase
    .from("rallies")
    .update({ status })
    .eq("id", rallyId)
    .eq("host_id", host.id)
    .select("*")
    .maybeSingle();

  if (error) return fail(error.message);
  if (!rally) return fail("Rally not found.");

  revalidateRally(rally.id, rally.public_token);

  return { ok: true, rallyId };
}

export async function completeRally(rallyId: string) {
  return setRallyStatus(rallyId, "completed");
}

export async function cancelRally(rallyId: string) {
  return setRallyStatus(rallyId, "cancelled");
}

export async function reactivateRally(rallyId: string) {
  return setRallyStatus(rallyId, "active");
}

export async function hostDecideCheckIn(input: unknown): Promise<RallyActionState> {
  const parsed = hostDecisionSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Check the decision details.");
  }

  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const { data: rally, error: rallyError } = await supabase
    .from("rallies")
    .select("*")
    .eq("id", parsed.data.rallyId)
    .eq("host_id", host.id)
    .maybeSingle();

  if (rallyError) return fail(rallyError.message);
  if (!rally) return fail("Rally not found.");

  const { error } = await supabase
    .from("rally_check_ins")
    .update({ status: parsed.data.decision, decided_by_host: true })
    .eq("id", parsed.data.checkInId)
    .eq("rally_id", rally.id);

  if (error) return fail(error.message);

  revalidateRally(rally.id, rally.public_token);

  return { ok: true };
}

// --- Public, token-gated actions (no login; the unguessable link is the key) ---

async function requireRallyByToken(token: string) {
  const supabase = createSupabaseAdminClient();

  const { data: rally, error } = await supabase.from("rallies").select("*").eq("public_token", token).maybeSingle();

  if (error) throw new Error(error.message);
  if (!rally) throw new Error("Rally not found.");
  if (rally.status !== "active") throw new Error("This rally is not active.");

  return { supabase, rally };
}

async function recomputeCheckInStatus(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rallyId: string,
  checkInId: string,
) {
  const [{ data: checkIn }, { count: memberCount }, { data: votes }] = await Promise.all([
    supabase.from("rally_check_ins").select("*").eq("id", checkInId).single(),
    supabase.from("rally_members").select("*", { count: "exact", head: true }).eq("rally_id", rallyId),
    supabase.from("rally_votes").select("*").eq("check_in_id", checkInId),
  ]);

  if (!checkIn || checkIn.decided_by_host) return;

  const yes = (votes ?? []).filter((v) => v.vote).length;
  const no = (votes ?? []).filter((v) => !v.vote).length;
  const status = approvalState(yes, no, Math.max((memberCount ?? 1) - 1, 0));

  if (status !== checkIn.status) {
    await supabase.from("rally_check_ins").update({ status }).eq("id", checkInId);
  }
}

const PROOF_BUCKET = "rally-proofs";
const PROOF_MAX_BYTES = 5 * 1024 * 1024;

export async function submitCheckIn(formData: FormData): Promise<RallyActionState> {
  const parsed = submitCheckInSchema.safeParse({
    token: formData.get("token"),
    memberId: formData.get("memberId"),
    message: formData.get("message") || undefined,
  });

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check your check-in.");
  }

  try {
    const { supabase, rally } = await requireRallyByToken(parsed.data.token);
    const today = todayISO();

    if (today < rally.start_date) return fail(`This rally starts on ${rally.start_date}.`);
    if (today > rally.end_date) return fail("This rally has already ended.");

    const { data: member, error: memberError } = await supabase
      .from("rally_members")
      .select("*")
      .eq("id", parsed.data.memberId)
      .eq("rally_id", rally.id)
      .maybeSingle();

    if (memberError) return fail(memberError.message);
    if (!member) return fail("Pick who you are first.");

    let proofImageUrl: string | null = null;
    const proof = formData.get("proof");

    if (proof instanceof File && proof.size > 0) {
      if (proof.size > PROOF_MAX_BYTES) return fail("Photo is too big — keep it under 5MB.");
      if (!proof.type.startsWith("image/")) return fail("Proof must be an image.");

      const ext = proof.name.includes(".") ? proof.name.split(".").pop() : "jpg";
      const path = `${rally.id}/${member.id}/${today}-${nanoid(6)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(PROOF_BUCKET)
        .upload(path, proof, { contentType: proof.type });

      if (uploadError) return fail(`Could not upload the photo: ${uploadError.message}`);

      proofImageUrl = supabase.storage.from(PROOF_BUCKET).getPublicUrl(path).data.publicUrl;
    }

    const { count: memberCount } = await supabase
      .from("rally_members")
      .select("*", { count: "exact", head: true })
      .eq("rally_id", rally.id);

    const initialStatus = approvalState(0, 0, Math.max((memberCount ?? 1) - 1, 0));

    const { error } = await supabase.from("rally_check_ins").insert({
      rally_id: rally.id,
      rally_member_id: member.id,
      check_in_date: today,
      message: parsed.data.message || null,
      proof_image_url: proofImageUrl,
      status: initialStatus,
    });

    if (error) {
      return fail(error.code === "23505" ? "Already checked in today — see you tomorrow!" : error.message);
    }

    revalidateRally(rally.id, rally.public_token);

    return { ok: true };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Something went wrong.");
  }
}

export async function castVote(input: unknown): Promise<RallyActionState> {
  const parsed = castVoteSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Check the vote details.");
  }

  try {
    const { supabase, rally } = await requireRallyByToken(parsed.data.token);

    const [{ data: voter }, { data: checkIn }] = await Promise.all([
      supabase.from("rally_members").select("*").eq("id", parsed.data.voterMemberId).eq("rally_id", rally.id).maybeSingle(),
      supabase.from("rally_check_ins").select("*").eq("id", parsed.data.checkInId).eq("rally_id", rally.id).maybeSingle(),
    ]);

    if (!voter) return fail("Pick who you are first.");
    if (!checkIn) return fail("Check-in not found.");
    if (checkIn.rally_member_id === voter.id) return fail("You can't vote on your own check-in.");
    if (checkIn.decided_by_host) return fail("The host already settled this one.");

    const { error } = await supabase
      .from("rally_votes")
      .upsert(
        { check_in_id: checkIn.id, voter_member_id: voter.id, vote: parsed.data.vote },
        { onConflict: "check_in_id,voter_member_id" },
      );

    if (error) return fail(error.message);

    await recomputeCheckInStatus(supabase, rally.id, checkIn.id);
    revalidateRally(rally.id, rally.public_token);

    return { ok: true };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Something went wrong.");
  }
}
