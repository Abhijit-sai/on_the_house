# 04 — Site Map & Screen Specifications

## 1. Route Map

### Public Routes

```text
/
/about
/privacy
/terms
/sign-in
/sign-up
/g/[publicToken]
```

### Authenticated App Routes

```text
/app
/app/onboarding
/app/dashboard
/app/games/new
/app/games/[gameId]/setup
/app/games/[gameId]/players
/app/games/[gameId]/seating
/app/games/[gameId]/live
/app/games/[gameId]/end
/app/games/[gameId]/final-tally
/app/games/[gameId]/review
/app/games/[gameId]/settlement
/app/games/[gameId]/closed
/app/history
/app/players
/app/players/[playerId]
/app/settings
```

### Future Routes

```text
/app/game-modes
/app/sessions/[sessionId]
/app/sessions/[sessionId]/games
/app/game-modes/score-tracker/new
/app/game-modes/tournament/new
/app/game-modes/pot-splitter/new
```

## 2. Mobile-first Layout Rules

The entire app must be designed for mobile web first.

### Global mobile rules

- Primary width target: 360px–430px.
- Use bottom navigation for main app sections.
- Use sticky bottom CTAs for primary actions.
- Use bottom sheets for modals and quick actions.
- Avoid desktop-style dense tables on mobile.
- Use cards, accordions, and horizontal chips.
- All touch targets should be at least 44px high.
- Inputs should be large and easy to tap.
- Use numeric keyboard for money/coin inputs.
- Every critical action needs a confirmation.
- Do not hide ledger-critical data behind only animations.

## 3. Public Landing Page

### Route

```text
/
```

### Purpose

Explain product and drive sign-in.

### Content

Hero:

```text
Host the night. Settle the chaos.
```

Subtext:

```text
On the House helps you run house-party games, track chips and scores, and settle up without confusion.
```

Sections:

- What it does.
- Poker Night available now.
- More games coming soon.
- Mobile app preview.
- CTA: Start a Game Night.

### Mobile UX

- Full-screen hero.
- Strong CTA above fold.
- App mockup scroll section.
- Avoid long desktop marketing sections.

## 4. Sign In / Sign Up

### Routes

```text
/sign-in
/sign-up
```

### Requirements

- Clerk Google OAuth.
- After login, check if host profile exists.
- If no profile, redirect to onboarding.
- If profile exists, redirect to dashboard.

## 5. Host Onboarding

### Route

```text
/app/onboarding
```

### Fields

- Display name — mandatory.

### Actions

- Save profile.
- Continue to dashboard.

### Validation

- Name cannot be empty.
- Name should be trimmed.

## 6. Dashboard

### Route

```text
/app/dashboard
```

### Purpose

Default host home page.

### Sections

1. Header with greeting.
2. Start New Game Night CTA.
3. Live Games.
4. Draft Games.
5. Pending Settlements.
6. Quick Stats.
7. Recent Closed Games.

### Card data

Each game card should show:

- game name,
- status,
- player count,
- total pot/buy-in tracked,
- created date,
- game duration if live/closed,
- quick action.

### Empty state

```text
No game nights yet. Start your first Poker Night.
```

### Mobile UX

- Sticky Start Game button near bottom.
- Horizontal status filters.
- Large cards, not tables.

## 7. Create Game Night

### Route

```text
/app/games/new
```

### Steps

1. Game night name.
2. Optional location.
3. Game mode selection.

### Default game name

```text
{Weekday}_{YYYYMMDD}
```

### Game mode cards

Available:

- Poker Night

Coming soon:

- Score Tracker
- Tournament Mode
- Pot Splitter
- Custom Game

### Mobile UX

- One step per screen or compact wizard.
- Use large selectable game-mode cards.

## 8. Poker Setup

### Route

```text
/app/games/[gameId]/setup
```

### Fields

- Game name.
- Location optional.
- Ratio money amount.
- Ratio coin amount.
- Minimum buy-in in coins.
- Maximum buy-in per player optional.
- Starting coin amount.
- Allow rebuys toggle.

### Validation

- Ratio money amount > 0.
- Ratio coin amount > 0.
- Min buy-in > 0.
- Starting coin amount >= min buy-in.
- Max buy-in empty or >= min buy-in.

### Mobile UX

- Use numeric inputs.
- Show live ratio preview:

```text
₹1,000 = 2,000 coins
₹500 = 1,000 coins
```

## 9. Add Players

### Route

```text
/app/games/[gameId]/players
```

### Requirements

- Search address book.
- Select existing players.
- Add new players inline.
- Add optional UPI ID.
- Show selected players.
- Enforce 2–9 players.
- Prevent duplicate players.

### Mobile UX

- Search bar at top.
- Selected players as chips/cards.
- Add new player bottom sheet.
- Continue button disabled until at least 2 players selected.

## 10. Seating Screen

### Route

```text
/app/games/[gameId]/seating
```

### Requirements

- Show players around a table preview.
- Allow long-press drag and drop reorder.
- Shuffle seating button.
- Reset order.
- Start Game CTA.

### Confirmation

Before starting game:

```text
Start Poker Night? Seating will be locked once the game starts, but you can still change it later with confirmation.
```

## 11. Live Game Table

### Route

```text
/app/games/[gameId]/live
```

### Purpose

Main host control room during the game.

### Must show

- Game name.
- Game timer.
- Status badge.
- Poker table visual.
- Players around table.
- Player avatar/icon.
- Player total buy-in.
- Player total coins issued.
- Payment status summary.
- Central table summary.

### Central summary example

```text
Total Tracked: ₹8,000
Coins Issued: 16,000
Players: 6
Unpaid Buy-ins: ₹2,000
```

### Actions

- Add buy-in.
- View buy-in history.
- Pause/resume.
- Add late player.
- Share read-only link.
- End game.

### Mobile UX

- Tap player seat to open player action sheet.
- Sticky “Add Buy-in” CTA.
- Buy-in history as bottom drawer.
- End Game in overflow menu or clearly separated danger action.

## 12. Add Buy-in Modal

### Trigger

From player card/seat or global Add Buy-in CTA.

### Fields

- Player.
- Preset money amount: ₹500, ₹1,000, ₹2,000.
- Custom amount.
- Auto-calculated coins.
- Payment status.
- Note optional.

### Validation

- Amount > 0.
- Amount must match configured multiple rule.
- Player must be active in game.

### Mobile UX

- Bottom sheet.
- Large preset buttons.
- Numeric keyboard.
- Save button sticky.

## 13. Buy-in History Drawer

### Purpose

Audit and correction.

### Show

- Timestamp.
- Player.
- Money amount.
- Coin amount.
- Payment status.
- Note.
- Edit/delete actions.

### Delete behavior

- Soft delete.
- Ask confirmation.
- Ask reversal reason if required.

## 14. End Game Confirmation

### Route

```text
/app/games/[gameId]/end
```

### Show

- Total buy-ins.
- Total coins issued.
- Player-wise buy-in summary.
- Unpaid/settled later buy-ins.

### Confirmation copy

```text
Are all buy-ins recorded? After this, you will enter final chip counts.
```

### Actions

- Go back to Live.
- Confirm and enter final chips.

## 15. Final Tally

### Route

```text
/app/games/[gameId]/final-tally
```

### Fields per player

- Final chip count.

### Show per player

- Player name.
- Avatar.
- Total buy-in.
- Coins issued.
- Final chip input.

### Live validation

```text
Coins Issued: 16,000
Final Coins Entered: 15,800
Difference: -200
```

### Rules

- Whole coins only.
- No negative values.
- Continue blocked unless difference is zero.

## 16. Review Summary

### Route

```text
/app/games/[gameId]/review
```

### Show

- Player.
- Total buy-in.
- Final coins.
- Final value.
- Net result.
- Winner/loser ranking.
- Total check.

### Actions

- Edit final tally.
- Edit ratio with warning.
- Generate settlement.

## 17. Settlement Screen

### Route

```text
/app/games/[gameId]/settlement
```

### Show

- Direct / Host settlement toggle.
- Settlement lines.
- Payment status.
- Pending total.
- Mark paid.
- Mark partial.
- UPI actions.
- Edit settlement.
- Close game CTA.

### Close button behavior

Disabled until all lines are paid.

If no settlement lines:

```text
No settlement needed. Close game.
```

## 18. Closed Game Detail

### Route

```text
/app/games/[gameId]/closed
```

### Show

- Final standings.
- Game duration.
- Total tracked volume.
- Settlement summary.
- Buy-in history.
- Share result card.
- Reopen game action.

### Reopen confirmation

```text
Reopen this game? Settlement and game data will become editable again.
```

## 19. Game History

### Route

```text
/app/history
```

### Show

- Closed games.
- Cancelled games.
- Filters: date, player, status, total pot, profit/loss.

### Mobile UX

- Search and filter chips.
- Game cards.
- No dense tables.

## 20. Player Address Book

### Route

```text
/app/players
```

### Show

- Search.
- Add player.
- Player cards.
- UPI status indicator.
- Player stats preview.

## 21. Player Profile

### Route

```text
/app/players/[playerId]
```

### Show

- Name.
- UPI ID.
- Avatar/icon.
- Games played with this host.
- Total buy-in.
- Lifetime profit/loss with this host.
- Unsettled amount.
- Average buy-in.
- Recent games.

## 22. Public Player View

### Route

```text
/g/[publicToken]
```

### States

#### Draft

Show:

```text
This game has not started yet.
```

#### Live

Show:

- Game name.
- Status.
- Players.
- Buy-in summary.
- Total pot tracked.

#### Tally Pending

Show:

```text
Game has ended. Final tally is being entered.
```

#### Pending Settlement

Show:

- Final standings.
- Settlement lines.
- UPI actions.

#### Closed

Show:

- Final standings.
- Completed settlement.
- Share card if available.

#### Cancelled

Show:

```text
This game was cancelled.
```

## 23. Settings

### Route

```text
/app/settings
```

### MVP settings

- Host display name.
- Sound on/off.
- Haptics on/off.
- Reduced motion.
- Sign out.
