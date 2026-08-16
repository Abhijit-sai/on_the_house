import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { PublicGameView } from "@/features/poker/components/public-game-view";
import { getPublicGameDetail } from "@/features/poker/public-queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const detail = await getPublicGameDetail(token).catch(() => null);

  if (!detail) return { title: "Game not found · On the House" };

  const tracked = detail.buyIns.reduce((sum, b) => sum + b.money_amount, 0);
  const live = detail.game.status === "live";

  return {
    title: `${detail.game.name} · Poker Night`,
    description: live
      ? `Live now — ${detail.seats.length} players, ₹${tracked.toLocaleString("en-IN")} on the table. Follow the buy-ins and see who pays whom.`
      : `${detail.seats.length} players · ₹${tracked.toLocaleString("en-IN")} tracked. See the final standings and settlement.`,
    openGraph: { type: "website", siteName: "On the House" },
    twitter: { card: "summary_large_image" },
  };
}

export default async function PublicGamePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const detail = await getPublicGameDetail(token);

  if (!detail) {
    notFound();
  }

  return (
    <>
      <AutoRefresh intervalMs={15000} />
      <PublicGameView detail={detail} />
    </>
  );
}
