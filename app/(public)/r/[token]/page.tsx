import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { PublicRallyView } from "@/features/rally/components/public-rally-view";
import { getRallyViewByToken, getRallyViewerContext } from "@/features/rally/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const view = await getRallyViewByToken(token).catch(() => null);

  if (!view) return { title: "Rally not found · On the House" };

  const where = view.hasEnded
    ? `Finished after ${view.totalDays} days`
    : view.hasStarted
      ? `Day ${view.dayNumber} of ${view.totalDays}`
      : `Starts ${view.rally.start_date}`;

  return {
    title: `${view.rally.title} · Rally`,
    description:
      view.rally.description ??
      `${where} · ${view.members.length} people checking in daily with proof. Join the rally and start your streak.`,
    openGraph: { type: "website", siteName: "On the House" },
    twitter: { card: "summary_large_image" },
  };
}

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
