# 06 — Calculation & Settlement Rules

## 1. Calculation Principles

All poker accounting must be deterministic, testable, and independent of UI.

Implement all core calculations as pure TypeScript functions.

Do not calculate critical settlement values only in the UI. Server-side validation must verify final tally and settlement correctness before saving state transitions.

## 2. Ratio Model

A game has a linear money-to-coin ratio.

Example:

```text
₹1,000 = 2,000 coins
```

Stored as:

```text
ratio_money_amount = 1000
ratio_coin_amount = 2000
```

## 3. Conversion Functions

### Money to Coins

```ts
export function moneyToCoins(
  moneyAmount: number,
  ratioMoneyAmount: number,
  ratioCoinAmount: number
): number {
  return Math.round((moneyAmount * ratioCoinAmount) / ratioMoneyAmount);
}
```

### Coins to Money

```ts
export function coinsToMoney(
  coinAmount: number,
  ratioMoneyAmount: number,
  ratioCoinAmount: number
): number {
  return (coinAmount * ratioMoneyAmount) / ratioCoinAmount;
}
```

## 4. Buy-in Rules

A buy-in records both:

- money amount,
- coin amount.

Example:

```text
₹500 at ₹1,000 = 2,000 coins gives 1,000 coins.
```

Formula:

```text
coins_issued = money_amount × ratio_coin_amount / ratio_money_amount
```

Buy-ins can be:

- preset: ₹500, ₹1,000, ₹2,000,
- custom in allowed multiples.

Each buy-in has payment status:

```text
paid
unpaid
settled_later
```

Important rule:

> Final result is based on total buy-in obligation, not only paid buy-ins.

Payment status helps operational tracking and settlement convenience. It should not break the core result calculation.

## 5. Total Coins Issued

For a game:

```text
total_coins_issued = sum(active buy_in.coin_amount)
```

Only include buy-ins where:

```text
deleted_at is null
```

## 6. Player Total Buy-in

For each player:

```text
player_total_buy_in_money = sum(active buy_in.money_amount for player)
player_total_coins_issued = sum(active buy_in.coin_amount for player)
```

## 7. Final Tally Validation

When host enters final chip counts:

```text
total_final_coins = sum(final_coin_count for all game players)
```

Validation rule:

```text
total_final_coins must equal total_coins_issued
```

If not equal:

- show difference,
- block settlement generation,
- block game closure.

Example error:

```text
Final chips do not tally. You are short by 200 coins.
```

or

```text
Final chips do not tally. You have 200 extra coins.
```

## 8. Final Value Calculation

For each player:

```text
final_value_money = final_coin_count × ratio_money_amount / ratio_coin_amount
```

## 9. Net Result Calculation

For each player:

```text
net_result_money = final_value_money - total_buy_in_money
```

Interpretation:

```text
net_result_money > 0 → player should receive money
net_result_money < 0 → player should pay money
net_result_money = 0 → no settlement needed
```

## 10. Example

Ratio:

```text
₹1,000 = 2,000 coins
```

| Player | Buy-in | Final Coins | Final Value | Net |
|---|---:|---:|---:|---:|
| A | ₹1,000 | 3,600 | ₹1,800 | +₹800 |
| B | ₹1,000 | 400 | ₹200 | -₹800 |

Settlement:

```text
B pays A ₹800
```

## 11. Direct Settlement Algorithm

Direct settlement simplifies payments from losers to winners.

### Input

```ts
type PlayerResult = {
  gamePlayerId: string;
  netResultMoney: number;
};
```

### Output

```ts
type SettlementLine = {
  fromGamePlayerId: string;
  toGamePlayerId: string;
  amount: number;
};
```

### Algorithm

1. Split players into creditors and debtors.
2. Creditors have positive net.
3. Debtors have negative net.
4. Convert debtor amounts to absolute values.
5. Sort creditors descending by amount.
6. Sort debtors descending by amount.
7. Match debtor to creditor until all balances are zero.
8. Generate one settlement line per match.

### TypeScript Reference

```ts
export type PlayerResult = {
  gamePlayerId: string;
  netResultMoney: number;
};

export type SettlementLineInput = {
  fromGamePlayerId: string;
  toGamePlayerId: string;
  amount: number;
};

export function generateDirectSettlement(
  results: PlayerResult[]
): SettlementLineInput[] {
  const creditors = results
    .filter((r) => r.netResultMoney > 0)
    .map((r) => ({ gamePlayerId: r.gamePlayerId, amount: roundMoney(r.netResultMoney) }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = results
    .filter((r) => r.netResultMoney < 0)
    .map((r) => ({ gamePlayerId: r.gamePlayerId, amount: roundMoney(Math.abs(r.netResultMoney)) }))
    .sort((a, b) => b.amount - a.amount);

  const lines: SettlementLineInput[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = roundMoney(Math.min(debtor.amount, creditor.amount));

    if (amount > 0) {
      lines.push({
        fromGamePlayerId: debtor.gamePlayerId,
        toGamePlayerId: creditor.gamePlayerId,
        amount,
      });
    }

    debtor.amount = roundMoney(debtor.amount - amount);
    creditor.amount = roundMoney(creditor.amount - amount);

    if (debtor.amount === 0) debtorIndex += 1;
    if (creditor.amount === 0) creditorIndex += 1;
  }

  return lines;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
```

## 12. Direct Settlement Example

Player results:

| Player | Net |
|---|---:|
| A | +₹1,000 |
| B | +₹500 |
| C | -₹700 |
| D | -₹800 |

Settlement:

| From | To | Amount |
|---|---|---:|
| D | A | ₹800 |
| C | A | ₹200 |
| C | B | ₹500 |

## 13. Host Settlement Algorithm

Host settlement routes payments through the host.

Rule:

```text
Every loser pays host.
Host pays every winner.
```

If host is also a player, host's own net should be naturally included and offset.

### Inputs

- `hostGamePlayerId`
- player result list

### Output

Settlement lines.

### TypeScript Reference

```ts
export function generateHostSettlement(
  results: PlayerResult[],
  hostGamePlayerId: string
): SettlementLineInput[] {
  const lines: SettlementLineInput[] = [];

  for (const result of results) {
    const amount = roundMoney(Math.abs(result.netResultMoney));

    if (amount === 0) continue;
    if (result.gamePlayerId === hostGamePlayerId) continue;

    if (result.netResultMoney < 0) {
      lines.push({
        fromGamePlayerId: result.gamePlayerId,
        toGamePlayerId: hostGamePlayerId,
        amount,
      });
    }

    if (result.netResultMoney > 0) {
      lines.push({
        fromGamePlayerId: hostGamePlayerId,
        toGamePlayerId: result.gamePlayerId,
        amount,
      });
    }
  }

  return lines;
}
```

## 14. Settlement Completion Rules

Settlement line status:

```text
pending
partially_paid
paid
```

Rules:

```text
paid_amount = 0 → pending
paid_amount > 0 and paid_amount < amount → partially_paid
paid_amount = amount → paid
```

Game can be closed only when:

```text
all settlement lines.status = paid
```

If there are no settlement lines, the game can be closed after confirmation.

## 15. Partial Settlement Example

Original line:

```text
Rahul pays Abhijit ₹1,000
```

Rahul pays ₹400.

Stored as:

```text
amount = 1000
paid_amount = 400
status = partially_paid
```

Remaining:

```text
amount - paid_amount = 600
```

## 16. Ratio Edit After Start

Host may edit ratio before settlement calculation.

If edited after game start:

- show strong warning,
- require confirmation,
- log old ratio and new ratio,
- recalculate all money/coin conversions,
- ensure final tally validation uses updated ratio only for monetary values, not chip counts.

Important:

- Buy-in `coin_amount` should not be silently changed if it was already recorded as chips issued.
- If ratio changes, the app should recalculate monetary values from existing coin amounts or clearly define whether money entries remain source of truth.

Recommended MVP rule:

> Once buy-ins exist, money amount and coin amount remain recorded as transaction facts. Ratio edit affects final coin-to-money conversion and result calculation, but existing buy-in transaction values remain as recorded.

## 17. Tolerance and Rounding

The product does not require special rounding rules now.

However, to avoid floating issues:

- store money as numeric in Postgres,
- round display to 2 decimals,
- avoid unnecessary decimals by using common whole rupee values,
- final chips are integers only.

## 18. Edge Cases

### Player has zero final chips

Allowed. Their final value is zero.

### Player bought in and left early

Allowed. Host enters whatever final chips they left with.

### No UPI ID

Allowed. Settlement still works. Hide UPI link and show copy/manual fallback.

### Settlement amount zero

No line needed.

### All players break even

No settlement lines needed. Host can close after confirmation.

### Host deletes buy-in after settlement calculation

Allowed only if game is not Closed. Settlement must be regenerated or marked stale.

### Closed game reopened

Allow with confirmation. Preserve historical payment status and log event.

## 19. Required Unit Tests

Test all of these:

1. `moneyToCoins(500, 1000, 2000) = 1000`
2. `coinsToMoney(1000, 1000, 2000) = 500`
3. Final tally matches.
4. Final tally mismatch blocks.
5. Net positive result.
6. Net negative result.
7. Net zero result.
8. Direct settlement with 1 debtor and 1 creditor.
9. Direct settlement with multiple debtors/creditors.
10. Direct settlement with break-even players.
11. Host settlement with host not playing.
12. Host settlement with host as winner.
13. Host settlement with host as loser.
14. Partial settlement status update.
15. Fully paid settlement allows close.
16. Pending settlement blocks close.
