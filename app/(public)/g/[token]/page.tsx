import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { PublicGameView } from "@/features/poker/components/public-game-view";
import { getPublicGameDetail } from "@/features/poker/public-queries";

export const dynamic = "force-dynamic";

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
