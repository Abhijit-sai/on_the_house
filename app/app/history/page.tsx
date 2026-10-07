import { redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentHost } from "@/features/hosts/queries";
import { ImposterRoomCard } from "@/features/imposter/components/room-card";
import { listImposterRoomsForCurrentHost } from "@/features/imposter/queries";
import { MafiaRoomCard } from "@/features/mafia/components/room-card";
import { listMafiaRoomsForCurrentHost } from "@/features/mafia/queries";
import { GameCard } from "@/features/poker/components/game-card";
import { listGamesForCurrentHost } from "@/features/poker/queries";
import { RallyCard } from "@/features/rally/components/rally-card";
import { listRalliesForCurrentHost } from "@/features/rally/queries";

export default async function HistoryPage() {
  const host = await getCurrentHost();

  if (!host) {
    redirect("/app/onboarding");
  }

  const [games, rallies, imposterRooms, mafiaRooms] = await Promise.all([
    listGamesForCurrentHost(),
    listRalliesForCurrentHost(),
    listImposterRoomsForCurrentHost(),
    listMafiaRoomsForCurrentHost(),
  ]);
  const finishedGames = games.filter((g) => g.status === "closed" || g.status === "cancelled");
  const inFlightGames = games.filter((g) => g.status !== "closed" && g.status !== "cancelled");
  const activeRallies = rallies.filter((r) => r.status === "active");
  const finishedRallies = rallies.filter((r) => r.status !== "active");

  const openRooms = imposterRooms.filter((r) => r.status === "active");
  const archivedRooms = imposterRooms.filter((r) => r.status === "archived");

  const openMafia = mafiaRooms.filter((r) => r.status === "active");
  const archivedMafia = mafiaRooms.filter((r) => r.status === "archived");

  const empty = games.length === 0 && rallies.length === 0 && imposterRooms.length === 0 && mafiaRooms.length === 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-white">History</h1>

      {inFlightGames.length > 0 || activeRallies.length > 0 || openRooms.length > 0 || openMafia.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-bold text-white">In progress</h2>
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {inFlightGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
            {activeRallies.map((rally) => (
              <RallyCard key={rally.id} rally={rally} />
            ))}
            {openRooms.map((room) => (
              <ImposterRoomCard key={room.id} room={room} />
            ))}
            {openMafia.map((room) => (
              <MafiaRoomCard key={room.id} room={room} />
            ))}
          </div>
        </section>
      ) : null}

      {finishedGames.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-bold text-white">Poker nights</h2>
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {finishedGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      ) : null}

      {finishedRallies.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-bold text-white">Rallies</h2>
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {finishedRallies.map((rally) => (
              <RallyCard key={rally.id} rally={rally} />
            ))}
          </div>
        </section>
      ) : null}

      {archivedRooms.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-bold text-white">Imposter nights</h2>
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {archivedRooms.map((room) => (
              <ImposterRoomCard key={room.id} room={room} />
            ))}
          </div>
        </section>
      ) : null}

      {archivedMafia.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-bold text-white">Mafia nights</h2>
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {archivedMafia.map((room) => (
              <MafiaRoomCard key={room.id} room={room} />
            ))}
          </div>
        </section>
      ) : null}

      {empty ? (
        <EmptyState title="Nothing here yet" description="Every game night, rally, Imposter and Mafia room you run will live here." />
      ) : null}
    </div>
  );
}
