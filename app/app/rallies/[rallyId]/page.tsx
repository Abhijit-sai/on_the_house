import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { NudgeButton } from "@/features/rally/components/nudge-button";
import { RallyRoom } from "@/features/rally/components/rally-room";
import { RallyStatusBadge } from "@/features/rally/components/rally-status-badge";
import { ShareGameLink } from "@/features/poker/components/share-game-link";
import { getRallyViewForHost } from "@/features/rally/queries";

export default async function RallyPage({ params }: { params: Promise<{ rallyId: string }> }) {
  const { rallyId } = await params;
  const view = await getRallyViewForHost(rallyId);

  if (!view) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <AutoRefresh intervalMs={30000} />
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-black text-white">{view.rally.title}</h1>
          <RallyStatusBadge status={view.rally.status} />
        </div>
        {view.rally.description ? <p className="text-sm leading-6 text-muted">{view.rally.description}</p> : null}
        <p className="text-xs text-muted">
          {view.rally.start_date} → {view.rally.end_date} · {view.members.length} members
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ShareGameLink
          token={view.rally.public_token}
          gameName={view.rally.title}
          basePath="/r"
          label="Share rally link with the crew"
        />
      </div>
      <NudgeButton view={view} />
      <RallyRoom view={view} />
    </div>
  );
}
