# 01 — Product Requirements Document

## 1. Product Overview

**Product name:** On the House  
**Tagline:** House party games  
**MVP module:** Poker Night  
**Platform:** Mobile-first web app  

On the House is a mobile-first house-party games app that helps hosts run offline games, track chips/scores/contributions, calculate outcomes, and settle the night cleanly.

Poker Night is the first game module. It is used for private offline poker games where the app tracks buy-ins, coins/chips, final chip balances, profit/loss, settlement obligations, payment status, and historical game records.

## 2. Product Positioning

This is not a poker-only product. It is a broader game-night platform.

Poker Night is module one. Future modules may include:

- Score Tracker
- Pot Splitter
- Tournament Mode
- Tambola
- Board Game Scoreboard
- FIFA/PS5 Tournament Tracker
- Custom Game Builder

The product should be built with an extensible game-mode architecture, while only Poker Night needs to be fully functional in MVP.

## 3. Core Promise

At the end of a house party game night, nobody should be confused about:

- who bought in how much,
- who has how many chips/coins left,
- who won or lost,
- who needs to pay whom,
- what settlements are still pending.

## 4. MVP Scope

### Included in MVP

- Clerk Google login for host.
- Host profile creation with mandatory display name.
- Supabase-backed persistence.
- Private host dashboard.
- Player address book per host.
- Optional UPI ID per player.
- Random quirky avatar/icon per player.
- Poker Night creation.
- Poker rules configuration.
- Add 2–9 players to a game.
- Shuffle/manual seating order.
- Live buy-in tracking.
- Buy-in edit/delete/reversal before close.
- Buy-in payment status: Paid, Unpaid, Settled Later.
- Final chip count entry.
- Chip tally validation.
- Profit/loss calculation.
- Direct settlement simplification.
- Host settlement mode.
- Partial and full settlement marking.
- Pending settlement state.
- Game closure only after all settlement lines are paid.
- Closed game history.
- Cancelled game history.
- Reopen game support.
- Player read-only game link.
- UPI convenience actions: copy UPI, copy amount, open UPI link, QR fallback.
- Shareable image result card.

### Excluded from MVP

- Online poker gameplay.
- Card dealing.
- Online multiplayer.
- Payment gateway.
- Automatic UPI payment confirmation.
- Real-money wallet.
- Rake/house cut.
- Multi-host games.
- Player login.
- PDF exports.
- Advanced analytics.
- Multiple game modes beyond Poker Night.

## 5. User Types

### 5.1 Host

The host logs in and controls the game.

The host can:

- create and manage profile,
- add/manage players,
- create game nights,
- create Poker Night games,
- configure rules,
- start/pause/end games,
- add/edit/delete buy-ins,
- enter final chip balances,
- generate settlements,
- mark settlement lines paid/partial,
- close/reopen/cancel games,
- view history and analytics,
- share final cards.

### 5.2 Player

Players do not need to log in in MVP.

Players can open a read-only game link and see:

- game status,
- players,
- buy-ins,
- final standings,
- settlement details,
- UPI/copy actions where relevant.

Players cannot:

- edit games,
- add buy-ins,
- close games,
- mark payments,
- modify UPI IDs unless later enabled.

## 6. Core Entities

### Host

Authenticated user who owns game data.

### Player

Reusable address book contact owned by a host.

### Game Night / Session

A house-party event container. For MVP, each game night can contain one Poker Night game, but the architecture should allow multiple games later.

### Game

A specific game instance. MVP game type: `poker_night`.

### Poker Game Config

Poker-specific game rules: ratio, min/max buy-in, starting chips, rebuys.

### Buy-in

A poker transaction where a player receives chips/coins against a money value.

### Final Tally

Final chip count and calculated result for each player.

### Settlement Batch

A generated settlement plan in either Direct or Host mode.

### Settlement Line

A specific payment obligation from one player to another.

## 7. Game Statuses

| Status | Meaning |
|---|---|
| Draft | Game is being configured |
| Live | Game is in progress; buy-ins can be added |
| Paused | Game is temporarily paused |
| Tally Pending | Game has ended; final chip counts are being entered |
| Pending Settlement | Results calculated; settlements not fully paid |
| Closed | All settlements are paid |
| Cancelled | Game abandoned |

## 8. Status Transitions

Allowed transitions:

```text
Draft → Live
Draft → Cancelled
Live → Paused
Paused → Live
Live → Tally Pending
Tally Pending → Live
Tally Pending → Pending Settlement
Pending Settlement → Live
Pending Settlement → Closed
Closed → Pending Settlement / Live through explicit reopen
Any non-closed status → Cancelled with confirmation
```

## 9. Key Product Rules

1. One game has only one host.
2. A host can have many games.
3. A host can have many saved players.
4. A player name must be unique within a host's address book.
5. Poker Night must support 2–9 players.
6. Buy-ins can be added while game is Live.
7. Buy-ins can be edited until the game is Closed.
8. Final chips must equal total chips issued before settlement can be generated.
9. Settlement must be fully paid before game can be Closed.
10. Closed games can be reopened with explicit confirmation.
11. Players can view public links but cannot edit.
12. UPI confirmation is manual only.
13. No in-app gameplay.
14. No money is held or processed by the app.

## 10. MVP User Journey — Host

```text
Landing Page
→ Sign in with Google
→ Create host profile
→ Dashboard
→ Start New Game Night
→ Choose Poker Night
→ Configure rules
→ Add/select players
→ Arrange seating
→ Start game
→ Add/edit/delete buy-ins during game
→ End game
→ Confirm buy-ins
→ Enter final chip counts
→ Validate tally
→ Review results
→ Generate settlement
→ Mark payments paid/partial
→ Close game
→ Share final result card
```

## 11. MVP User Journey — Player

```text
Open shared game link
→ View game status
→ View buy-ins while live
→ View final standings after end
→ View settlement line involving them
→ Copy UPI/amount or open UPI link
```

## 12. Poker Night Requirements

### Game setup fields

| Field | Required | Notes |
|---|---:|---|
| Game name | Yes | Auto-generated by default, editable |
| Date/time | Auto | Created automatically |
| Location | No | Optional |
| Ratio money amount | Yes | Example: ₹1,000 |
| Ratio coin amount | Yes | Example: 2,000 coins |
| Minimum buy-in | Yes | In coins |
| Maximum buy-in | No | Per player, optional |
| Starting coin amount | Yes | Must be at least minimum buy-in |
| Allow rebuys | Yes | Default true |
| Players | Yes | 2–9 |

### Default game name

```text
{Weekday}_{YYYYMMDD}
```

Example:

```text
Friday_20260501
```

If duplicate, append count:

```text
Friday_20260501_2
```

### Room rules shown on game screen

- Coin ratio.
- Minimum buy-in.
- Optional max buy-in if configured.

## 13. Player Rules

- Name mandatory.
- UPI ID optional.
- Duplicate names not allowed within same host.
- Past players appear as suggestions.
- Host can add players during live game.
- Host can remove player before game starts.
- Player can leave mid-game; final count is whatever they have in hand.
- If a player has any buy-in, they must remain part of final tally.
- If a player was added accidentally and has no buy-in, they may be removed.

## 14. Seating Rules

- Host can manually arrange order.
- Host can shuffle order.
- Long-press drag and drop on mobile.
- Seating locks after game starts.
- Host can deliberately change order mid-game after confirmation.
- Seating changes should be logged.

## 15. Buy-in Requirements

Host can:

- add buy-in,
- edit mistaken buy-in,
- delete/reverse buy-in,
- add notes,
- set payment status,
- see total buy-in per player,
- see total money collected,
- see total coins issued,
- see total table exposure.

Buy-in presets:

- ₹500
- ₹1,000
- ₹2,000

Also allow custom amount in multiples of configured minimum.

Buy-in status:

| Status | Meaning |
|---|---|
| Paid | Player paid this buy-in during game |
| Unpaid | Player received chips but has not paid |
| Settled Later | To be adjusted/handled during settlement |

## 16. Ending Game Requirements

When host clicks End Game:

1. Ask confirmation.
2. Show final buy-in review.
3. Ask host to confirm all buy-ins are recorded.
4. Stop normal live flow.
5. Move to Tally Pending.
6. Host enters final chip count for each player.
7. Only whole coins allowed.
8. Validate total final coins equals total coins issued.
9. If mismatch, block settlement.
10. If matched, show review summary.
11. Generate settlement.
12. Move to Pending Settlement.

## 17. Settlement Requirements

Settlement modes:

1. Direct Settlement — simplified player-to-player settlement.
2. Host Settlement — all losers pay host, host pays winners.

Each settlement row includes:

- payer,
- receiver,
- amount,
- status,
- paid amount if partial,
- copy UPI ID,
- copy amount,
- open UPI app,
- generate QR,
- mark paid,
- mark partial,
- note.

Game remains Pending Settlement until all lines are marked paid.

## 18. UPI Requirements

- UPI ID optional.
- UPI confirmation manual only.
- Mobile: try opening UPI app chooser.
- Desktop: show QR and copy fallback.
- Missing UPI: show add/edit UPI option.

UPI URI format:

```text
upi://pay?pa={upi_id}&pn={payee_name}&am={amount}&cu=INR&tn={note}
```

Default note:

```text
Game settlement - {game_name}
```

## 19. Share Requirements

No PDF export in MVP.

Generate shareable image cards:

- Final standings card.
- Winner highlight card.
- Settlement summary card.
- Night recap card later.

Recommended first format:

```text
1080 × 1920 vertical story card
```

## 20. Analytics Requirements

Dashboard analytics:

- total games hosted,
- total volume tracked,
- most frequent players,
- biggest winner,
- biggest loser,
- pending settlements.

Player-level analytics, scoped only to current host:

- games played,
- total buy-in,
- lifetime profit/loss,
- unsettled amount,
- average buy-in,
- biggest win,
- biggest loss.

Advanced analytics can be Phase 2/3.

## 21. Acceptance Criteria

MVP is complete when:

1. Host can log in with Google.
2. Host can create profile.
3. Host can add/edit players.
4. Host can create Poker Night game.
5. Host can configure ratio and buy-in rules.
6. Host can add 2–9 players.
7. Host can shuffle/reorder seating.
8. Host can start a game.
9. Host can add/edit/delete buy-ins.
10. Host can end game.
11. Host can enter final chip counts.
12. App blocks mismatched final tally.
13. App calculates profit/loss correctly.
14. App generates Direct Settlement.
15. App generates Host Settlement.
16. Host can mark settlement paid/partial.
17. Game closes only after full settlement.
18. Host can reopen games.
19. Host can see history.
20. Player can open read-only game link.
21. Host can export final result as image.
22. UPI convenience actions work with fallbacks.
