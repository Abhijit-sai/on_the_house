import { requireCurrentHost } from "@/features/hosts/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
