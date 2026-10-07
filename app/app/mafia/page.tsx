import { Drama, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentHost } from "@/features/hosts/queries";
import { HowToPlay } from "@/features/mafia/components/mafia-room";
import { MafiaRoomCard } from "@/features/mafia/components/room-card";
import { listMafiaRoomsForCurrentHost } from "@/features/mafia/queries";

export default async function MafiaHubPage() {
  const host = await getCurrentHost();

  if (!host) {
    redirect("/app/onboarding");
  }

  const rooms = await listMafiaRoomsForCurrentHost();
  const open = rooms.filter((r) => r.status === "active");
  const archived = rooms.filter((r) => r.status === "archived");

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-red-danger">Mafia</p>
          <h1 className="text-3xl font-black text-white">The town sleeps</h1>
        </div>
        <Card className="border-red-brand/30 shadow-red-glow">
          <CardHeader>
            <CardTitle className="text-2xl">One God. One phone. A family of liars.</CardTitle>
            <CardDescription>
              Someone plays God and runs the night from the phone. The mafia kill, the doctor saves, the detective digs
              — and by day the town votes someone out.
            </CardDescription>
          </CardHeader>
          <Button asChild size="lg" className="w-full bg-red-brand text-white hover:bg-red-brand/90">
            <Link href="/app/mafia/new">
              <Drama className="h-5 w-5" />
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
              <MafiaRoomCard key={room.id} room={room} />
            ))}
          </div>
        </section>
      ) : null}

      {archived.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-bold text-white">Past nights</h2>
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {archived.map((room) => (
              <MafiaRoomCard key={room.id} room={room} />
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
        <Button asChild className="h-14 w-full bg-red-brand text-base text-white shadow-red-glow hover:bg-red-brand/90">
          <Link href="/app/mafia/new">
            <Plus className="h-5 w-5" />
            Open a room
          </Link>
        </Button>
      </div>
    </div>
  );
}
