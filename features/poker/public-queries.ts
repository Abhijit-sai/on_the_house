// Read-only game data for the public /g/[token] view. No auth — access is
// gated by the unguessable public token. Only expose what a player at the
// table already knows; never host account data.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Game, PokerBuyIn, PokerFinalTally, PokerGameConfig, SettlementLine } from "@/db/types/database";

export type PublicSeat = {
  id: string;
  seatingOrder: number;
  isHostPlayer: boolean;
  advanceMoney: number;
  name: string;
  avatarKey: string | null;
  colorKey: string | null;
  upiId: string | null;
};

export type PublicGameDetail = {
  game: Pick<Game, "id" | "name" | "status" | "location" | "started_at" | "ended_at" | "closed_at" | "created_at">;
  config: Pick<
    PokerGameConfig,
    "ratio_money_amount" | "ratio_coin_amount" | "min_buy_in_coins" | "max_buy_in_coins_per_player"
  >;
  seats: PublicSeat[];
  buyIns: Pick<PokerBuyIn, "id" | "game_player_id" | "money_amount" | "coin_amount" | "created_at">[];
  tallies: Pick<
    PokerFinalTally,
    "game_player_id" | "final_coin_count" | "final_value_money" | "total_buy_in_money" | "net_result_money"
  >[];
  lines: Pick<SettlementLine, "id" | "from_game_player_id" | "to_game_player_id" | "amount" | "paid_amount" | "status">[];
};

export async function getPublicGameDetail(token: string): Promise<PublicGameDetail | null> {
  if (!token || token.length > 40) return null;

  const supabase = createSupabaseAdminClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, status, location, started_at, ended_at, closed_at, created_at, host_id")
    .eq("public_token", token)
    .maybeSingle();

  if (gameError) throw new Error(gameError.message);
  if (!game) return null;

  const [configRes, seatsRes, buyInsRes, talliesRes, batchRes] = await Promise.all([
    supabase
      .from("poker_game_configs")
      .select("ratio_money_amount, ratio_coin_amount, min_buy_in_coins, max_buy_in_coins_per_player")
      .eq("game_id", game.id)
      .single(),
    supabase
      .from("game_players")
      .select("id, seating_order, is_host_player, advance_money, player_id")
      .eq("game_id", game.id)
      .eq("removed_before_start", false)
      .order("seating_order"),
    supabase
      .from("poker_buy_ins")
      .select("id, game_player_id, money_amount, coin_amount, created_at")
      .eq("game_id", game.id)
      .is("deleted_at", null)
      .order("created_at"),
    supabase
      .from("poker_final_tallies")
      .select("game_player_id, final_coin_count, final_value_money, total_buy_in_money, net_result_money")
      .eq("game_id", game.id),
    supabase.from("settlement_batches").select("id").eq("game_id", game.id).eq("is_active", true).maybeSingle(),
  ]);

  if (configRes.error) throw new Error(configRes.error.message);
  if (seatsRes.error) throw new Error(seatsRes.error.message);
  if (buyInsRes.error) throw new Error(buyInsRes.error.message);
  if (talliesRes.error) throw new Error(talliesRes.error.message);
  if (batchRes.error) throw new Error(batchRes.error.message);

  const playerIds = seatsRes.data.map((seat) => seat.player_id);
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, name, avatar_key, color_key, upi_id")
    .in("id", playerIds.length > 0 ? playerIds : ["00000000-0000-0000-0000-000000000000"]);

  if (playersError) throw new Error(playersError.message);

  const playersById = new Map(players.map((p) => [p.id, p]));

  const seats: PublicSeat[] = seatsRes.data.map((seat) => {
    const player = playersById.get(seat.player_id);

    return {
      id: seat.id,
      seatingOrder: seat.seating_order,
      isHostPlayer: seat.is_host_player,
      advanceMoney: seat.advance_money,
      name: player?.name ?? "Player",
      avatarKey: player?.avatar_key ?? null,
      colorKey: player?.color_key ?? null,
      upiId: player?.upi_id ?? null,
    };
  });

  let lines: PublicGameDetail["lines"] = [];

  if (batchRes.data) {
    const { data, error } = await supabase
      .from("settlement_lines")
      .select("id, from_game_player_id, to_game_player_id, amount, paid_amount, status")
      .eq("settlement_batch_id", batchRes.data.id)
      .order("amount", { ascending: false });

    if (error) throw new Error(error.message);

    lines = data;
  }

  return {
    game: {
      id: game.id,
      name: game.name,
      status: game.status,
      location: game.location,
      started_at: game.started_at,
      ended_at: game.ended_at,
      closed_at: game.closed_at,
      created_at: game.created_at,
    },
    config: configRes.data,
    seats,
    buyIns: buyInsRes.data,
    tallies: talliesRes.data,
    lines,
  };
}
