"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentHost } from "@/features/hosts/queries";
import { avatarKeys, colorKeys, playerSchema } from "@/features/players/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeName } from "@/lib/utils";

export type PlayerActionState = {
  ok: boolean;
  message?: string;
};

function randomItem<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

export async function savePlayer(input: unknown): Promise<PlayerActionState> {
  const parsed = playerSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the player details." };
  }

  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();
  const nameNormalized = normalizeName(parsed.data.name);
  const upiId = parsed.data.upiId ?? null;

  const duplicateQuery = supabase
    .from("players")
    .select("id")
    .eq("host_id", host.id)
    .eq("name_normalized", nameNormalized)
    .limit(1);

  const { data: duplicates, error: duplicateError } = parsed.data.id
    ? await duplicateQuery.neq("id", parsed.data.id)
    : await duplicateQuery;

  if (duplicateError) {
    return { ok: false, message: duplicateError.message };
  }

  if ((duplicates?.length ?? 0) > 0) {
    return { ok: false, message: "This player already exists." };
  }

  if (parsed.data.id) {
    const { error } = await supabase
      .from("players")
      .update({
        name: parsed.data.name.trim(),
        name_normalized: nameNormalized,
        upi_id: upiId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.id)
      .eq("host_id", host.id);

    if (error) {
      return { ok: false, message: error.message };
    }
  } else {
    const { error } = await supabase.from("players").insert({
      host_id: host.id,
      name: parsed.data.name.trim(),
      name_normalized: nameNormalized,
      upi_id: upiId,
      avatar_key: randomItem(avatarKeys),
      color_key: randomItem(colorKeys),
    });

    if (error) {
      return { ok: false, message: error.code === "23505" ? "This player already exists." : error.message };
    }
  }

  revalidatePath("/app/players");
  return { ok: true };
}

const upiUpdateSchema = z.object({
  playerId: z.string().uuid(),
  upiId: z.string().trim().max(120, "UPI ID is too long"),
});

export async function updatePlayerUpi(input: unknown): Promise<PlayerActionState> {
  const parsed = upiUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the UPI ID." };
  }

  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("players")
    .update({ upi_id: parsed.data.upiId || null })
    .eq("id", parsed.data.playerId)
    .eq("host_id", host.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/app/players");
  return { ok: true };
}
