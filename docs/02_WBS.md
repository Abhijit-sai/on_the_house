# 02 — Work Breakdown Structure

## Build Philosophy

Build the ledger first, then the fun.

The product can have a vibrant, neon, gamified interface, but the core accounting must be deterministic, tested, and stored reliably in Supabase.

## Phase 0 — Product & Project Setup

### 0.1 Repository Setup

Tasks:

- Create Next.js App Router project with TypeScript.
- Configure Tailwind CSS.
- Configure shadcn/ui.
- Configure ESLint and Prettier.
- Configure app metadata.
- Set up `.env.example`.
- Set up deployment target on Vercel.

Deliverable:

```text
Empty but working Next.js app with design system foundation.
```

### 0.2 Supabase Setup

Tasks:

- Create Supabase project.
- Create initial database migration files.
- Add schema from `05_DATA_MODEL_AND_DB_SCHEMA.md`.
- Prepare RLS policies.
- Generate TypeScript database types.
- Add seed/demo data script.

Deliverable:

```text
Supabase project ready with initial schema and local types.
```

### 0.3 Clerk Setup

Tasks:

- Create Clerk project.
- Configure Google OAuth.
- Add Clerk provider to Next.js.
- Configure Clerk middleware.
- Build sign-in/sign-up pages.
- Create host mapping flow after first login.

Deliverable:

```text
Host can authenticate through Google.
```

## Phase 1 — Host & Player Foundation

### 1.1 Host Onboarding

Tasks:

- Build onboarding route.
- Ask for mandatory display name.
- Create host record linked to Clerk user.
- Redirect returning hosts to dashboard.
- Block app access until host profile exists.

Acceptance:

- First-time host completes profile setup.
- Returning host lands on dashboard.

### 1.2 App Shell

Tasks:

- Build authenticated app shell.
- Build mobile-first top header.
- Build bottom navigation.
- Add global loading and error states.
- Add responsive layout constraints.

Acceptance:

- App is usable on mobile viewport from first sprint.

### 1.3 Player Address Book

Tasks:

- Build players list.
- Add player modal/page.
- Edit player details.
- Optional UPI ID.
- Random avatar/icon assignment.
- Duplicate name prevention.
- Search/filter players.

Acceptance:

- Host can add, edit, search players.
- Duplicate names are blocked per host.

Deliverable for Phase 1:

```text
Authenticated host can manage profile and address book.
```

## Phase 2 — Poker Game Setup

### 2.1 Dashboard Game Sections

Tasks:

- Show Live games.
- Show Draft games.
- Show Pending Settlement games.
- Show recent closed games.
- Add Start Game Night CTA.

Acceptance:

- Host can see active and pending work from dashboard.

### 2.2 Create Game Night

Tasks:

- Create game night/session model.
- Generate default name.
- Add optional location.
- Create public token.

Acceptance:

- Game night is saved and owned by host.

### 2.3 Game Mode Picker

Tasks:

- Show Poker Night as available.
- Show future modes as Coming Soon.
- Route to Poker setup.

Acceptance:

- Product feels like a platform, not poker-only.

### 2.4 Poker Config

Tasks:

- Build config form.
- Add ratio money and ratio coin fields.
- Add min buy-in coins.
- Add optional max buy-in per player.
- Add starting coin amount.
- Add allow rebuys toggle.
- Validate using Zod.

Acceptance:

- Invalid config cannot be saved.
- Starting coins must be at least min buy-in.

### 2.5 Add Players to Game

Tasks:

- Search address book.
- Select existing players.
- Add new player inline.
- Enforce 2–9 players.
- Prevent duplicate players in game.

Acceptance:

- Host can create valid player list for game.

### 2.6 Seating Order

Tasks:

- Build mobile-first seating screen.
- Add long-press drag and drop reorder.
- Add shuffle button.
- Save seating order.
- Add confirmation to start game.

Acceptance:

- Seating is saved before game starts.

Deliverable for Phase 2:

```text
Host can create a fully configured Draft Poker Night game.
```

## Phase 3 — Live Game Ledger

### 3.1 Start Game

Tasks:

- Move Draft to Live.
- Record started_at.
- Lock seating by default.
- Log game event.

Acceptance:

- Game enters Live status correctly.

### 3.2 Live Game Table

Tasks:

- Build mobile-first live game table.
- Show player seats.
- Show player totals.
- Show central summary.
- Show timer.
- Show quick actions.

Acceptance:

- Host can manage the game comfortably on mobile.

### 3.3 Add Buy-in

Tasks:

- Add buy-in modal/bottom sheet.
- Show presets: ₹500, ₹1,000, ₹2,000.
- Add custom amount.
- Auto-calculate coins.
- Add payment status.
- Add optional note.
- Persist buy-in.
- Animate chip update.

Acceptance:

- Buy-ins save correctly and totals update.

### 3.4 Edit/Delete Buy-in

Tasks:

- Build buy-in history drawer.
- Edit amount/status/note.
- Soft delete/reverse buy-in.
- Require reason for reversal after game start.
- Log events.

Acceptance:

- Mistakes can be corrected before close.

### 3.5 Live Game Controls

Tasks:

- Pause/resume game.
- Add late player.
- Remove player with no buy-ins.
- Share read-only link.
- End game CTA.

Acceptance:

- Host can manage real-world game changes.

Deliverable for Phase 3:

```text
Host can run a live game and track buy-ins reliably.
```

## Phase 4 — End Game & Final Tally

### 4.1 End Game Confirmation

Tasks:

- Show total buy-ins.
- Show total coins issued.
- Show unpaid buy-ins.
- Ask confirmation.
- Move Live to Tally Pending.

Acceptance:

- Host confirms all buy-ins before tally.

### 4.2 Final Coin Entry

Tasks:

- Build player-wise final coin input.
- Allow whole coins only.
- Show live total entered.
- Show total issued.
- Show difference.
- Block continue if mismatch.

Acceptance:

- Settlement cannot be generated if tally mismatch exists.

### 4.3 Result Summary

Tasks:

- Calculate final value.
- Calculate total buy-in.
- Calculate net result.
- Show leaderboard.
- Show winners/losers.
- Allow edit final tally.
- Allow ratio edit with warning.

Acceptance:

- Result summary is accurate.

Deliverable for Phase 4:

```text
Host can end game and calculate final results.
```

## Phase 5 — Settlement

### 5.1 Direct Settlement

Tasks:

- Implement settlement simplification algorithm.
- Generate lines from debtors to creditors.
- Test edge cases.

Acceptance:

- Fewest practical settlement lines generated.

### 5.2 Host Settlement

Tasks:

- Implement host-routed settlement.
- Losers pay host.
- Host pays winners.
- Offset host's own net where applicable.

Acceptance:

- Host settlement works even when host is a player.

### 5.3 Settlement Management

Tasks:

- Toggle settlement mode.
- Edit settlement lines.
- Mark paid.
- Mark partial.
- Add note.
- Show pending total.
- Log manual edits.

Acceptance:

- Host can manage real-world settlement.

### 5.4 Close Game

Tasks:

- Block close until all settlement lines paid.
- Allow immediate close if no settlement needed.
- Record closed_at.
- Move to history.

Acceptance:

- Closed games have no pending payment lines.

Deliverable for Phase 5:

```text
Host can settle and close a game.
```

## Phase 6 — Public Player View

### 6.1 Public Game Token

Tasks:

- Generate unguessable public token.
- Build `/g/:public_game_token` route.
- Fetch safe read-only data server-side.

Acceptance:

- Public view does not expose private host dashboard data.

### 6.2 Player View States

Tasks:

- Live view.
- Tally pending view.
- Pending settlement view.
- Closed view.
- Cancelled view.

Acceptance:

- Players can understand the current state from the link.

Deliverable for Phase 6:

```text
Players can view game and settlement without login.
```

## Phase 7 — UPI Convenience Tools

### 7.1 UPI Actions

Tasks:

- Copy UPI ID.
- Copy amount.
- Generate UPI deep link.
- Open UPI link on mobile.
- Generate QR code on desktop.

Acceptance:

- Settlement rows support payment convenience.

### 7.2 Fallbacks

Tasks:

- Missing UPI ID state.
- Add/edit UPI during settlement.
- Copy-only fallback.

Acceptance:

- Missing UPI never blocks settlement.

Deliverable for Phase 7:

```text
UPI convenience actions are available but manual confirmation remains required.
```

## Phase 8 — Shareable Result Cards

### 8.1 Card Components

Tasks:

- Build final standings card.
- Build winner highlight card.
- Build settlement summary card.

Acceptance:

- Cards follow brand design and fit mobile sharing.

### 8.2 Image Export

Tasks:

- Use client-side DOM to image export.
- Support native share API where available.
- Support download fallback.

Acceptance:

- Host can export/share final result image.

Deliverable for Phase 8:

```text
Game results can be shared as image cards.
```

## Phase 9 — Gamified UI Polish

### 9.1 Visual Theme

Tasks:

- Apply black/red/gold theme.
- Add neon glows.
- Add premium surfaces.
- Add player avatars.

Acceptance:

- App feels like On the House, not a generic admin panel.

### 9.2 Motion

Tasks:

- Add Framer Motion transitions.
- Add chip pulse on buy-in.
- Add winner reveal.
- Add settlement completion celebration.

Acceptance:

- Animations are fun and lightweight.

### 9.3 3D / Physics

Tasks:

- Build lightweight 3D poker table.
- Add Matter.js chip drops.
- Add low-end fallback.
- Add reduced motion support.

Acceptance:

- Mobile performance remains good.

Deliverable for Phase 9:

```text
App has premium, playful, mobile-first game-night feel.
```

## Phase 10 — QA & Launch

### 10.1 Unit Tests

Must test:

- money to coins.
- coins to money.
- buy-in total.
- final tally validation.
- net result calculation.
- direct settlement.
- host settlement.
- duplicate players.
- status transitions.

### 10.2 E2E Tests

Must test:

- host onboarding.
- add player.
- create game.
- configure rules.
- add players.
- start game.
- add buy-ins.
- end game.
- enter final tally.
- generate settlement.
- mark paid.
- close game.
- public player view.

### 10.3 Mobile QA

Must test:

- iPhone viewport.
- Android viewport.
- small screens.
- browser refresh.
- slow network.
- public link sharing.
- UPI fallback behavior.
- reduced motion.

### 10.4 Launch Checklist

- Production env vars set.
- Supabase migrations applied.
- RLS checked.
- Clerk OAuth configured.
- Vercel deployed.
- Demo game available.
- Error monitoring enabled if available.
- Mobile testing complete.

Deliverable:

```text
MVP launch-ready.
```
