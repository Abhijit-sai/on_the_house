import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { PublicRallyView } from "@/features/rally/components/public-rally-view";
import { getRallyViewByToken } from "@/features/rally/queries";

export const dynamic = "force-dynamic";

export default async function PublicRallyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await getRallyViewByToken(token);

  if (!view) {
    notFound();
  }

  return (
    <>
      <AutoRefresh intervalMs={15000} />
      <PublicRallyView view={view} />
    </>
  );
}
