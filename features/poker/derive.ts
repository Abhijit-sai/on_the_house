// Client-safe derived values for the poker screens. Display only — all
// persisted numbers are recomputed server-side in actions.ts.

import type { PokerBuyIn, PokerGameConfig } from "@/db/types/database";
import { coinsToMoney, roundMoney } from "@/features/settlement/calculations";

export function seatBuyIns(seatId: string, buyIns: PokerBuyIn[]) {
  return buyIns.filter((b) => b.game_player_id === seatId);
}

export function seatTotals(seatId: string, buyIns: PokerBuyIn[]) {
  const own = seatBuyIns(seatId, buyIns);

  return {
    count: own.length,
    money: roundMoney(own.reduce((sum, b) => sum + b.money_amount, 0)),
    coins: own.reduce((sum, b) => sum + b.coin_amount, 0),
  };
}

export function tableTotals(buyIns: PokerBuyIn[]) {
  return {
    count: buyIns.length,
    money: roundMoney(buyIns.reduce((sum, b) => sum + b.money_amount, 0)),
    coins: buyIns.reduce((sum, b) => sum + b.coin_amount, 0),
  };
}

export function minBuyInMoney(config: PokerGameConfig) {
  return roundMoney(coinsToMoney(config.min_buy_in_coins, config.ratio_money_amount, config.ratio_coin_amount));
}

export function buyInPresets(config: PokerGameConfig) {
  const base = minBuyInMoney(config);
  return [base, base * 2, base * 4].map(roundMoney);
}
