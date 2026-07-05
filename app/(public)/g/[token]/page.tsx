import { notFound } from "next/navigation";
import { PublicGameView } from "@/features/poker/components/public-game-view";
import { getPublicGameDetail } from "@/features/poker/public-queries";

export const dynamic = "force-dynamic";

export default async function PublicGamePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const detail = await getPublicGameDetail(token);

  if (!detail) {
    notFound();
  }

  return <PublicGameView detail={detail} />;
}
