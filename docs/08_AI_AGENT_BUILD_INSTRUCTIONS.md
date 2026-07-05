# 08 — AI Agent Build Instructions

## 1. Role

You are an expert full-stack engineer building **On the House**, a mobile-first house-party games web app.

The MVP game module is **Poker Night**.

The product helps a host run an offline poker game, track buy-ins, enter final chip counts, calculate profit/loss, simplify settlement, and close the night cleanly.

## 2. Source of Truth

These markdown files are the source of truth:

1. `README.md`
2. `01_PRD.md`
3. `02_WBS.md`
4. `03_TECH_STACK_AND_ARCHITECTURE.md`
5. `04_SITE_MAP_AND_SCREEN_SPECS.md`
6. `05_DATA_MODEL_AND_DB_SCHEMA.md`
7. `06_CALCULATION_AND_SETTLEMENT_RULES.md`
8. `07_MOBILE_WEB_UI_AND_DESIGN_SYSTEM.md`
9. `08_AI_AGENT_BUILD_INSTRUCTIONS.md`

If there is ambiguity:

1. Prefer calculation correctness.
2. Prefer mobile-first UX.
3. Prefer simple, deterministic implementation.
4. Do not overbuild future game modes.
5. Keep architecture extensible.

## 3. Non-negotiable Rules

- This is a mobile-first web app.
- Use TypeScript strictly.
- Use Supabase as source of truth.
- Use Clerk for Google OAuth.
- Keep Poker Night as first module.
- Do not build online poker gameplay.
- Do not build payment gateway.
- Do not attempt automatic UPI verification.
- Do not store critical ledger data only in local storage.
- Use server-side ownership checks.
- Use soft deletes for buy-ins.
- Write pure calculation functions.
- Write unit tests for all calculation functions.
- Keep gamified UI lightweight and progressive.

## 4. Build Order

Follow this order:

1. Project setup.
2. Auth setup.
3. Supabase schema.
4. Host profile.
5. Player address book.
6. Dashboard.
7. Poker game setup.
8. Add players and seating.
9. Live buy-in ledger.
10. Final tally.
11. Settlement.
12. Public read-only view.
13. UPI tools.
14. Share cards.
15. Gamified UI polish.

Do not jump to 3D/physics before the ledger is functional.

## 5. Required Project Summary File

At the end of every coding session, update:

```text
project_summary.md
```

It must include:

- date/time,
- what was built,
- files changed,
- database changes,
- current working state,
- known bugs,
- key decisions,
- blockers/questions,
- next recommended steps.

## 6. First Build Prompt

Use this as the starting prompt for Codex:

```text
You are an expert full-stack engineer. We are building “On the House”, a mobile-first house-party games web app. The first game module is Poker Night, which helps a host track offline poker buy-ins, final chip counts, profit/loss, and simplified settlement.

Read all markdown files in this project pack and treat them as the source of truth.

Start with Phase 0 and Phase 1 only:

1. Set up a Next.js App Router project with TypeScript.
2. Configure Tailwind CSS and shadcn/ui.
3. Integrate Clerk Google OAuth.
4. Set up Supabase client and database migration files.
5. Create the initial database schema for hosts, players, game_nights, games, poker_game_configs, game_players, poker_buy_ins, poker_final_tallies, settlement_batches, settlement_lines, game_events, and share_cards.
6. Build host onboarding after first login.
7. Build the player address book with add/edit player, UPI ID optional, random avatar key, and duplicate name prevention.
8. Create a basic authenticated dashboard shell.

Important rules:

- Use strict TypeScript.
- Keep poker-specific logic inside a poker feature folder.
- Implement database ownership checks and prepare for RLS.
- Do not build live game logic yet.
- Keep the UI mobile-first from the beginning.
- At the end of the session, update project_summary.md with progress, files changed, current state, bugs, decisions, and next steps.
```

## 7. Phase-by-phase Agent Prompts

### Phase 2 Prompt — Poker Game Setup

```text
Continue building On the House. Implement Phase 2: Poker Game Setup.

Build:
1. Dashboard sections for Live, Draft, Pending Settlement, and Recent Closed games.
2. Create Game Night flow.
3. Game mode picker with Poker Night available and future modes marked Coming Soon.
4. Poker config form with ratio, min buy-in, max buy-in optional, starting coins, and allow rebuys.
5. Add players to game from address book, with inline new player creation.
6. Enforce 2–9 players.
7. Seating order screen with shuffle and mobile-friendly reorder.

Do not build live buy-in tracking yet.

Update project_summary.md at the end.
```

### Phase 3 Prompt — Live Game Ledger

```text
Continue building On the House. Implement Phase 3: Live Game Ledger.

Build:
1. Start game action from Draft to Live.
2. Live Game Table screen optimized for mobile.
3. Player seats/cards showing buy-in totals and coins issued.
4. Add Buy-in bottom sheet with preset amounts, custom amount, auto coin calculation, payment status, and note.
5. Buy-in history drawer.
6. Edit buy-in.
7. Soft delete/reverse buy-in with reason where required.
8. Pause/resume game.
9. Add late player and remove player with no buy-ins.
10. End game CTA with confirmation.

Ensure all totals persist in Supabase and survive refresh.

Update project_summary.md at the end.
```

### Phase 4 Prompt — Final Tally

```text
Continue building On the House. Implement Phase 4: End Game and Final Tally.

Build:
1. End Game confirmation screen with buy-in review.
2. Transition Live to Tally Pending.
3. Final chip count entry screen.
4. Whole-number validation.
5. Total final chips vs total issued validation.
6. Block continuation if final chips do not tally.
7. Review summary with total buy-in, final coins, final value, and net result for each player.
8. Allow return to edit tally.

Write unit tests for conversion, tally validation, and net result calculation.

Update project_summary.md at the end.
```

### Phase 5 Prompt — Settlement

```text
Continue building On the House. Implement Phase 5: Settlement.

Build:
1. Direct settlement algorithm.
2. Host settlement algorithm.
3. Settlement screen with Direct/Host toggle.
4. Settlement line cards.
5. Mark paid.
6. Mark partial.
7. Edit settlement line.
8. Add notes.
9. Game close action blocked until all lines paid.
10. Closed game detail screen.
11. Reopen game with confirmation.

Write unit tests for settlement algorithms and close rules.

Update project_summary.md at the end.
```

### Phase 6 Prompt — Public View

```text
Continue building On the House. Implement Phase 6: Public Player View.

Build:
1. Public route /g/[publicToken].
2. Server-side safe fetch by public token.
3. Live public view.
4. Tally pending public view.
5. Pending settlement public view.
6. Closed game public view.
7. Cancelled state.

Players should not be able to edit anything.
Do not expose private host data.

Update project_summary.md at the end.
```

### Phase 7 Prompt — UPI Tools

```text
Continue building On the House. Implement Phase 7: UPI Convenience Tools.

Build:
1. Copy UPI ID.
2. Copy amount.
3. Generate UPI deep link.
4. Open UPI app on mobile where supported.
5. QR code fallback for desktop.
6. Missing UPI ID state.
7. Allow host to edit/add UPI during settlement.

Do not build payment verification.
All payment confirmation remains manual.

Update project_summary.md at the end.
```

### Phase 8 Prompt — Share Cards

```text
Continue building On the House. Implement Phase 8: Shareable Result Cards.

Build:
1. Final standings share card.
2. Winner highlight share card.
3. Settlement summary share card.
4. Export share card as image.
5. Native share API where supported.
6. Download fallback.

Use mobile/social-first vertical format.
Do not include UPI IDs on social result cards.

Update project_summary.md at the end.
```

### Phase 9 Prompt — Mobile UI Polish

```text
Continue building On the House. Implement Phase 9: Premium mobile UI polish.

Build:
1. Apply black/red/gold visual theme.
2. Improve dashboard cards.
3. Improve live poker table screen.
4. Add lightweight chip animation on buy-in.
5. Add winner reveal animation.
6. Add settlement completion celebration.
7. Add reduced motion support.
8. Add optional haptics/sound setting.
9. Add lazy-loaded 3D poker table only if performance remains good.
10. Add Matter.js chip drop only as progressive enhancement.

Do not compromise mobile performance.

Update project_summary.md at the end.
```

## 8. Definition of Done

A phase is done only when:

- core flow works on mobile viewport,
- server-side validation exists,
- data persists in Supabase,
- obvious error states are handled,
- project_summary.md is updated,
- no critical TypeScript errors remain,
- calculation logic has tests where applicable.

## 9. Important Product Safety Boundaries

Do not describe or implement the product as:

- online gambling,
- betting platform,
- casino,
- real-money gaming product,
- wallet,
- payment processor.

Describe and implement it as:

```text
A private offline game-night tracker and settlement helper.
```

## 10. Final Reminder

The first working version can be visually simple, but it must be structurally correct.

Build this right:

1. Correct data model.
2. Correct state transitions.
3. Correct calculations.
4. Correct settlement.
5. Mobile-first UX.
6. Premium design polish.
