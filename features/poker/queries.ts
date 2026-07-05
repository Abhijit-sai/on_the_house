import { requireCurrentHost } from "@/features/hosts/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Game,
  GamePlayer,
  Player,
  PokerBuyIn,
  PokerFinalTally,
  PokerGameConfig,
  SettlementBatch,
  SettlementLine,
} from "@/db/types/database";

export type SeatedPlayer = GamePlayer & { player: Player };

export type GameDetail = {
  game: Game;
  config: PokerGameConfig;
  seats: SeatedPlayer[];
  buyIns: PokerBuyIn[];
  tallies: PokerFinalTally[];
  batch: (SettlementBatch & { lines: SettlementLine[] }) | null;
};

export async function getGameDetail(gameId: string): Promise<GameDetail | null> {
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .eq("host_id", host.id)
    .maybeSingle();

  if (gameError) throw new Error(gameError.message);
  if (!game) return null;

  const [configRes, seatsRes, playersRes, buyInsRes, talliesRes, batchRes] = await Promise.all([
    supabase.from("poker_game_configs").select("*").eq("game_id", gameId).single(),
    supabase.from("game_players").select("*").eq("game_id", gameId).order("seating_order"),
    supabase.from("players").select("*").eq("host_id", host.id),
    supabase.from("poker_buy_ins").select("*").eq("game_id", gameId).is("deleted_at", null).order("created_at"),
    supabase.from("poker_final_tallies").select("*").eq("game_id", gameId),
    supabase.from("settlement_batches").select("*").eq("game_id", gameId).eq("is_active", true).maybeSingle(),
  ]);

  if (configRes.error) throw new Error(configRes.error.message);
  if (seatsRes.error) throw new Error(seatsRes.error.message);
  if (playersRes.error) throw new Error(playersRes.error.message);
  if (buyInsRes.error) throw new Error(buyInsRes.error.message);
  if (talliesRes.error) throw new Error(talliesRes.error.message);
  if (batchRes.error) throw new Error(batchRes.error.message);

  const playersById = new Map(playersRes.data.map((p) => [p.id, p]));

  const seats: SeatedPlayer[] = seatsRes.data
    .filter((seat) => !seat.removed_before_start)
    .map((seat) => {
      const player = playersById.get(seat.player_id);

      if (!player) throw new Error("A seated player is missing from the address book.");

      return { ...seat, player };
    });

  let batch: GameDetail["batch"] = null;

  if (batchRes.data) {
    const { data: lines, error: linesError } = await supabase
      .from("settlement_lines")
      .select("*")
      .eq("settlement_batch_id", batchRes.data.id)
      .order("amount", { ascending: false });

    if (linesError) throw new Error(linesError.message);

    batch = { ...batchRes.data, lines };
  }

  return {
    game,
    config: configRes.data,
    seats,
    buyIns: buyInsRes.data,
    tallies: talliesRes.data,
    batch,
  };
}

export async function listGamesForCurrentHost() {
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("host_id", host.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data;
}
