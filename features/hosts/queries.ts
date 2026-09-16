import { auth } from "@clerk/nextjs/server";
import { cache } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// The app shell, the page and the data queries all ask for the host on the
// same request. cache() makes that one database round trip instead of three.
export const getCurrentHost = cache(async () => {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("hosts").select("*").eq("clerk_user_id", userId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
});

export async function requireCurrentHost() {
  const host = await getCurrentHost();

  if (!host) {
    throw new Error("Host profile is required.");
  }

  return host;
}
