"use server";

import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import type { Game, GameStatus } from "@/db/types/database";
import { requireCurrentHost } from "@/features/hosts/queries";
import {
  addBuyInSchema,
  createPokerGameSchema,
  finalTallySchema,
  linePaymentSchema,
  removeBuyInSchema,
  setAdvanceSchema,
} from "@/features/poker/schemas";
import {
  computeNetResult,
  generateSettlement,
  moneyToCoins,
  roundMoney,
  settlementLineStatus,
  validateFinalTally,
} from "@/features/settlement/calculations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type GameActionState = {
  ok: boolean;
  message?: string;
  gameId?: string;
};

function fail(message: string): GameActionState {
  return { ok: false, message };
}

async function requireOwnedGame(gameId: string, allowedStatuses?: GameStatus[]) {
  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();

  const { data: game, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .eq("host_id", host.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!game) throw new Error("Game not found.");

  if (allowedStatuses && !allowedStatuses.includes(game.status)) {
    throw new Error(`This action is not available while the game is ${game.status.replace("_", " ")}.`);
  }

  return { host, supabase, game };
}

async function logEvent(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  gameId: string,
  hostId: string,
  eventType: string,
  payload?: Record<string, unknown>,
) {
  await supabase.from("game_events").insert({
    game_id: gameId,
    host_id: hostId,
    event_type: eventType,
    event_payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
  });
}

function revalidateGame(gameId: string) {
  revalidatePath(`/app/games/${gameId}`);
  revalidatePath("/app/dashboard");
  revalidatePath("/app/history");
}

export async function createPokerGame(input: unknown): Promise<GameActionState> {
  const parsed = createPokerGameSchema.safeParse(input);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the game details.");
  }

  const host = await requireCurrentHost();
  const supabase = createSupabaseAdminClient();
  const data = parsed.data;

  const { data: game, error: gameError } = await supabase
    .from("games")
    .insert({
      host_id: host.id,
      game_type: "poker_night",
      status: "draft",
      name: data.name,
      location: data.location || null,
      public_token: nanoid(12),
    })
    .select("*")
    .single();

  if (gameError) return fail(gameError.message);

  const { error: configError } = await supabase.from("poker_game_configs").insert({
    game_id: game.id,
    ratio_money_amount: data.ratioMoneyAmount,
    ratio_coin_amount: data.ratioCoinAmount,
    min_buy_in_coins: data.minBuyInCoins,
    max_buy_in_coins_per_player: data.maxBuyInCoinsPerPlayer ?? null,
    starting_coin_amount: data.startingCoinAmount,
    allow_rebuys: data.allowRebuys,
  });

  if (configError) {
    await supabase.from("games").delete().eq("id", game.id);
    return fail(configError.message);
  }

  const { error: seatsError } = await supabase.from("game_players").insert(
    data.players.map((player, index) => ({
      game_id: game.id,
      player_id: player.playerId,
      seating_order: index + 1,
      is_host_player: player.isHostPlayer,
      advance_money: roundMoney(player.advanceMoney),
    })),
  );

  if (seatsError) {
    await supabase.from("games").delete().eq("id", game.id);
    return fail(seatsError.message);
  }

  await logEvent(supabase, game.id, host.id, "game_created", { name: data.name });
  revalidateGame(game.id);

  return { ok: true, gameId: game.id };
}

async function transitionGame(
  gameId: string,
  from: GameStatus[],
  patch: Partial<Omit<Game, "id" | "host_id" | "created_at">> & { status: GameStatus },
  eventType: string,
): Promise<GameActionState> {
  try {
    const { host, supabase, game } = await requireOwnedGame(gameId, from);

    const { error } = await supabase.from("games").update(patch).eq("id", game.id);

    if (error) return fail(error.message);

    await logEvent(supabase, game.id, host.id, eventType, { from: game.status, to: patch.status });
    revalidateGame(game.id);

    return { ok: true, gameId: game.id };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Something went wrong.");
  }
}

export async function startGame(gameId: string): Promise<GameActionState> {
  return transitionGame(gameId, ["draft"], { status: "live", started_at: new Date().toISOString() }, "game_started");
}

export async function pauseGame(gameId: string): Promise<GameActionState> {
  return transitionGame(gameId, ["live"], { status: "paused" }, "game_paused");
}

export async function resumeGame(gameId: string): Promise<GameActionState> {
  return transitionGame(gameId, ["paused"], { status: "live" }, "game_resumed");
}

export async function endGame(gameId: string): Promise<GameActionState> {
  return transitionGame(
    gameId,
    ["live", "paused"],
    { status: "tally_pending", ended_at: new Date().toISOString() },
    "game_ended",
  );
}

export async function backToLive(gameId: string): Promise<GameActionState> {
  return transitionGame(gameId, ["tally_pending"], { status: "live", ended_at: null }, "game_resumed_from_tally");
}

export async function cancelGame(gameId: string): Promise<GameActionState> {
  return transitionGame(
    gameId,
    ["draft", "live", "paused", "tally_pending", "pending_settlement"],
    { status: "cancelled", cancelled_at: new Date().toISOString() },
    "game_cancelled",
  );
}

export async function reopenGame(gameId: string): Promise<GameActionState> {
  return transitionGame(gameId, ["closed"], { status: "pending_settlement", closed_at: null }, "game_reopened");
}

export async function addBuyIn(input: unknown): Promise<GameActionState> {
  const parsed = addBuyInSchema.safeParse(input);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the buy-in details.");
  }

  try {
    const { host, supabase, game } = await requireOwnedGame(parsed.data.gameId, ["live"]);

    const { data: config, error: configError } = await supabase
      .from("poker_game_configs")
      .select("*")
      .eq("game_id", game.id)
      .single();

    if (configError) return fail(configError.message);

    const moneyAmount = roundMoney(parsed.data.moneyAmount);
    const exactCoins = (moneyAmount * config.ratio_coin_amount) / config.ratio_money_amount;

    if (!Number.isInteger(exactCoins)) {
      return fail("This amount does not convert to whole coins. Adjust the buy-in.");
    }

    const coinAmount = moneyToCoins(moneyAmount, config.ratio_money_amount, config.ratio_coin_amount);

    if (coinAmount < config.min_buy_in_coins) {
      return fail(`Minimum buy-in is ${config.min_buy_in_coins} coins.`);
    }

    const { data: existing, error: existingError } = await supabase
      .from("poker_buy_ins")
      .select("coin_amount")
      .eq("game_player_id", parsed.data.gamePlayerId)
      .is("deleted_at", null);

    if (existingError) return fail(existingError.message);

    if (config.max_buy_in_coins_per_player !== null) {
      const totalCoins = existing.reduce((sum, b) => sum + b.coin_amount, 0) + coinAmount;

      if (totalCoins > config.max_buy_in_coins_per_player) {
        return fail(`This would exceed the max of ${config.max_buy_in_coins_per_player} coins for this player.`);
      }
    }

    if (!config.allow_rebuys && existing.length > 0) {
      return fail("Rebuys are disabled for this game.");
    }

    const { error } = await supabase.from("poker_buy_ins").insert({
      game_id: game.id,
      game_player_id: parsed.data.gamePlayerId,
      money_amount: moneyAmount,
      coin_amount: coinAmount,
      payment_status: parsed.data.paymentStatus,
      note: parsed.data.note || null,
      created_by_host_id: host.id,
    });

    if (error) return fail(error.message);

    await logEvent(supabase, game.id, host.id, "buy_in_added", {
      gamePlayerId: parsed.data.gamePlayerId,
      moneyAmount,
      coinAmount,
    });
    revalidateGame(game.id);

    return { ok: true };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Something went wrong.");
  }
}

export async function removeBuyIn(input: unknown): Promise<GameActionState> {
  const parsed = removeBuyInSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Check the buy-in reversal details.");
  }

  try {
    const { host, supabase, game } = await requireOwnedGame(parsed.data.gameId, [
      "live",
      "paused",
      "tally_pending",
      "pending_settlement",
    ]);

    const { error } = await supabase
      .from("poker_buy_ins")
      .update({ deleted_at: new Date().toISOString(), reversal_reason: parsed.data.reason || null })
      .eq("id", parsed.data.buyInId)
      .eq("game_id", game.id)
      .is("deleted_at", null);

    if (error) return fail(error.message);

    // Chip math changed, so any generated results are stale.
    await invalidateResults(supabase, game.id);
    await logEvent(supabase, game.id, host.id, "buy_in_reversed", { buyInId: parsed.data.buyInId });
    revalidateGame(game.id);

    return { ok: true };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Something went wrong.");
  }
}

export async function setAdvance(input: unknown): Promise<GameActionState> {
  const parsed = setAdvanceSchema.safeParse(input);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the advance amount.");
  }

  try {
    const { host, supabase, game } = await requireOwnedGame(parsed.data.gameId, [
      "draft",
      "live",
      "paused",
      "tally_pending",
    ]);

    const { error } = await supabase
      .from("game_players")
      .update({ advance_money: roundMoney(parsed.data.advanceMoney) })
      .eq("id", parsed.data.gamePlayerId)
      .eq("game_id", game.id);

    if (error) return fail(error.message);

    await logEvent(supabase, game.id, host.id, "advance_updated", {
      gamePlayerId: parsed.data.gamePlayerId,
      advanceMoney: parsed.data.advanceMoney,
    });
    revalidateGame(game.id);

    return { ok: true };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Something went wrong.");
  }
}

async function invalidateResults(supabase: ReturnType<typeof createSupabaseAdminClient>, gameId: string) {
  await supabase.from("settlement_batches").update({ is_active: false }).eq("game_id", gameId).eq("is_active", true);
  await supabase.from("poker_final_tallies").delete().eq("game_id", gameId);
}

export async function submitFinalTally(input: unknown): Promise<GameActionState> {
  const parsed = finalTallySchema.safeParse(input);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the final chip counts.");
  }

  try {
    const { host, supabase, game } = await requireOwnedGame(parsed.data.gameId, ["tally_pending"]);

    const [configRes, seatsRes, buyInsRes] = await Promise.all([
      supabase.from("poker_game_configs").select("*").eq("game_id", game.id).single(),
      supabase.from("game_players").select("*").eq("game_id", game.id).eq("removed_before_start", false),
      supabase.from("poker_buy_ins").select("*").eq("game_id", game.id).is("deleted_at", null),
    ]);

    if (configRes.error) return fail(configRes.error.message);
    if (seatsRes.error) return fail(seatsRes.error.message);
    if (buyInsRes.error) return fail(buyInsRes.error.message);

    const config = configRes.data;
    const seats = seatsRes.data;
    const countsBySeat = new Map(parsed.data.counts.map((c) => [c.gamePlayerId, c.finalCoinCount]));

    for (const seat of seats) {
      if (!countsBySeat.has(seat.id)) {
        return fail("Enter a final chip count for every player.");
      }
    }

    const totalCoinsIssued = buyInsRes.data.reduce((sum, b) => sum + b.coin_amount, 0);
    const validation = validateFinalTally(totalCoinsIssued, [...countsBySeat.values()]);

    if (!validation.matches) {
      const diff = Math.abs(validation.difference);
      return fail(
        validation.difference < 0
          ? `Final chips do not tally. You are short by ${diff} coins.`
          : `Final chips do not tally. You have ${diff} extra coins.`,
      );
    }

    const results = seats.map((seat) => {
      const totalBuyInMoney = roundMoney(
        buyInsRes.data.filter((b) => b.game_player_id === seat.id).reduce((sum, b) => sum + b.money_amount, 0),
      );
      const finalCoinCount = countsBySeat.get(seat.id) ?? 0;
      const { finalValueMoney, netResultMoney } = computeNetResult(
        finalCoinCount,
        totalBuyInMoney,
        config.ratio_money_amount,
        config.ratio_coin_amount,
      );

      return {
        seat,
        finalCoinCount,
        finalValueMoney,
        totalBuyInMoney,
        netResultMoney,
      };
    });

    const hostSeat = seats.find((seat) => seat.is_host_player) ?? null;

    let lines;

    try {
      lines = generateSettlement(
        parsed.data.settlementMode,
        results.map((r) => ({
          gamePlayerId: r.seat.id,
          netResultMoney: r.netResultMoney,
          advanceMoney: r.seat.advance_money,
        })),
        hostSeat?.id ?? null,
      );
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not generate the settlement.");
    }

    await invalidateResults(supabase, game.id);

    const { error: tallyError } = await supabase.from("poker_final_tallies").insert(
      results.map((r) => ({
        game_id: game.id,
        game_player_id: r.seat.id,
        final_coin_count: r.finalCoinCount,
        final_value_money: r.finalValueMoney,
        total_buy_in_money: r.totalBuyInMoney,
        net_result_money: r.netResultMoney,
      })),
    );

    if (tallyError) return fail(tallyError.message);

    const { data: batch, error: batchError } = await supabase
      .from("settlement_batches")
      .insert({ game_id: game.id, mode: parsed.data.settlementMode })
      .select("*")
      .single();

    if (batchError) return fail(batchError.message);

    if (lines.length > 0) {
      const { error: linesError } = await supabase.from("settlement_lines").insert(
        lines.map((line) => ({
          settlement_batch_id: batch.id,
          game_id: game.id,
          from_game_player_id: line.fromGamePlayerId,
          to_game_player_id: line.toGamePlayerId,
          amount: line.amount,
        })),
      );

      if (linesError) return fail(linesError.message);
    }

    const { error: statusError } = await supabase
      .from("games")
      .update({ status: "pending_settlement" })
      .eq("id", game.id);

    if (statusError) return fail(statusError.message);

    await logEvent(supabase, game.id, host.id, "settlement_generated", {
      mode: parsed.data.settlementMode,
      lineCount: lines.length,
    });
    revalidateGame(game.id);

    return { ok: true, gameId: game.id };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Something went wrong.");
  }
}

export async function reopenTally(gameId: string): Promise<GameActionState> {
  try {
    const { host, supabase, game } = await requireOwnedGame(gameId, ["pending_settlement"]);

    await invalidateResults(supabase, game.id);

    const { error } = await supabase.from("games").update({ status: "tally_pending" }).eq("id", game.id);

    if (error) return fail(error.message);

    await logEvent(supabase, game.id, host.id, "tally_reopened");
    revalidateGame(game.id);

    return { ok: true };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Something went wrong.");
  }
}

export async function recordLinePayment(input: unknown): Promise<GameActionState> {
  const parsed = linePaymentSchema.safeParse(input);

  if (!parsed.success) {
    return fail("Check the payment amount.");
  }

  try {
    const { host, supabase, game } = await requireOwnedGame(parsed.data.gameId, ["pending_settlement"]);

    const { data: line, error: lineError } = await supabase
      .from("settlement_lines")
      .select("*")
      .eq("id", parsed.data.lineId)
      .eq("game_id", game.id)
      .maybeSingle();

    if (lineError) return fail(lineError.message);
    if (!line) return fail("Settlement line not found.");

    const paidAmount = roundMoney(parsed.data.paidAmount);

    if (paidAmount > line.amount) {
      return fail("Paid amount cannot exceed the amount due.");
    }

    const status = settlementLineStatus(line.amount, paidAmount);

    const { error } = await supabase
      .from("settlement_lines")
      .update({
        paid_amount: paidAmount,
        status,
        checked_by_host_id: host.id,
        checked_at: new Date().toISOString(),
      })
      .eq("id", line.id);

    if (error) return fail(error.message);

    await logEvent(supabase, game.id, host.id, "settlement_payment_recorded", {
      lineId: line.id,
      paidAmount,
      status,
    });
    revalidateGame(game.id);

    return { ok: true };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Something went wrong.");
  }
}

export async function closeGame(gameId: string): Promise<GameActionState> {
  try {
    const { host, supabase, game } = await requireOwnedGame(gameId, ["pending_settlement"]);

    const { data: pending, error } = await supabase
      .from("settlement_lines")
      .select("id, status, settlement_batches!inner(is_active)")
      .eq("game_id", game.id)
      .eq("settlement_batches.is_active", true)
      .neq("status", "paid");

    if (error) return fail(error.message);

    if ((pending?.length ?? 0) > 0) {
      return fail("All settlement lines must be paid before closing the game.");
    }

    const { error: statusError } = await supabase
      .from("games")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", game.id);

    if (statusError) return fail(statusError.message);

    await logEvent(supabase, game.id, host.id, "game_closed");
    revalidateGame(game.id);

    return { ok: true };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Something went wrong.");
  }
}
