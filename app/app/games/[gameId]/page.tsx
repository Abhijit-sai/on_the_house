import { notFound } from "next/navigation";
import { GameHeader } from "@/features/poker/components/game-header";
import { ShareGameLink } from "@/features/poker/components/share-game-link";
import { DraftView } from "@/features/poker/components/draft-view";
import { LiveView } from "@/features/poker/components/live-view";
import { TallyView } from "@/features/poker/components/tally-view";
import { SettlementView } from "@/features/poker/components/settlement-view";
import { ClosedView } from "@/features/poker/components/closed-view";
import { getGameDetail } from "@/features/poker/queries";

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const detail = await getGameDetail(gameId);

  if (!detail) {
    notFound();
  }

  const status = detail.game.status;

  return (
    <div className="space-y-5">
      <GameHeader game={detail.game} config={detail.config} />
      {status !== "cancelled" ? <ShareGameLink token={detail.game.public_token} gameName={detail.game.name} /> : null}
      {status === "draft" ? <DraftView detail={detail} /> : null}
      {status === "live" || status === "paused" ? <LiveView detail={detail} /> : null}
      {status === "tally_pending" ? <TallyView detail={detail} /> : null}
      {status === "pending_settlement" ? <SettlementView detail={detail} /> : null}
      {status === "closed" || status === "cancelled" ? <ClosedView detail={detail} /> : null}
    </div>
  );
}
