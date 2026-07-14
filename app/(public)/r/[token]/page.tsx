import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { PublicRallyView } from "@/features/rally/components/public-rally-view";
import { getRallyViewByToken, getRallyViewerContext } from "@/features/rally/queries";

export const dynamic = "force-dynamic";

export default async function PublicRallyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [{ userId }, view] = await Promise.all([auth(), getRallyViewByToken(token)]);

  if (!view) {
    notFound();
  }

  const viewer = await getRallyViewerContext(token, userId);

  if (viewer.isHost) {
    redirect(`/app/rallies/${view.rally.id}`);
  }

  return (
    <>
      <AutoRefresh intervalMs={15000} />
      <PublicRallyView
        view={view}
        linkedMemberId={viewer.linkedMemberId}
        signedIn={Boolean(userId)}
        requestStatus={viewer.requestStatus}
      />
    </>
  );
}
