"use server";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { hostOnboardingSchema } from "@/features/hosts/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type HostActionState = {
  ok: boolean;
  message?: string;
};

export async function createHostProfile(input: unknown): Promise<HostActionState> {
  const parsed = hostOnboardingSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your profile details." };
  }

  const user = await currentUser();

  if (!user) {
    return { ok: false, message: "You need to sign in first." };
  }

  const email = user.primaryEmailAddress?.emailAddress;

  if (!email) {
    return { ok: false, message: "Your Google account needs an email address." };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("hosts").upsert(
    {
      clerk_user_id: user.id,
      email,
      display_name: parsed.data.displayName,
      avatar_url: user.imageUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clerk_user_id" },
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  redirect("/app/dashboard");
}
