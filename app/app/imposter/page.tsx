import { Plus, VenetianMask } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentHost } from "@/features/hosts/queries";
import { HowToPlay } from "@/features/imposter/components/imposter-room";
import { ImposterRoomCard } from "@/features/imposter/components/room-card";
import { listImposterRoomsForCurrentHost } from "@/features/imposter/queries";

export default async function ImposterHubPage() {
  const host = await getCurrentHost();

  if (!host) {
    redirect("/app/onboarding");
  }

  const rooms = await listImposterRoomsForCurrentHost();
  const open = rooms.filter((r) => r.status === "active");
  const archived = rooms.filter((r) => r.status === "archived");

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-violet-300">Imposter</p>
          <h1 className="text-3xl font-black text-white">Someone&apos;s lying</h1>
        </div>
        <Card className="border-violet-400/30 shadow-[0_0_32px_rgba(139,92,246,0.18)]">
          <CardHeader>
            <CardTitle className="text-2xl">One phone. One word. One liar.</CardTitle>
            <CardDescription>
              Pass the phone, draw a secret word, give a clue, vote someone out. The imposter has a different word — and
              doesn&apos;t know it.
            </CardDescription>
          </CardHeader>
          <Button asChild size="lg" className="w-full bg-violet-500 text-white hover:bg-violet-500/90">
            <Link href="/app/imposter/new">
              <VenetianMask className="h-5 w-5" />
              Open a room
            </Link>
          </Button>
        </Card>
      </section>

      {open.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-bold text-white">Open rooms</h2>
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {open.map((room) => (
              <ImposterRoomCard key={room.id} room={room} />
            ))}
          </div>
        </section>
      ) : null}

      {archived.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-bold text-white">Past nights</h2>
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {archived.map((room) => (
              <ImposterRoomCard key={room.id} room={room} />
            ))}
          </div>
        </section>
      ) : null}

      {rooms.length === 0 ? (
        <>
          <EmptyState
            title="No rooms yet"
            description="Open a room for tonight's crew — one room holds as many games as you want, with a running scoreboard."
          />
          <HowToPlay defaultOpen />
        </>
      ) : null}

      <div className="sticky bottom-24 lg:hidden">
        <Button asChild className="h-14 w-full bg-violet-500 text-base text-white shadow-[0_0_28px_rgba(139,92,246,0.35)] hover:bg-violet-500/90">
          <Link href="/app/imposter/new">
            <Plus className="h-5 w-5" />
            Open a room
          </Link>
        </Button>
      </div>
    </div>
  );
}
