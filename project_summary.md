# On the House — Project Summary

## 1. Current Project State
The repo contains a working Next.js App Router app for On the House with the complete Poker Night flow implemented end to end for the host: game setup wizard, live buy-in ledger, final chip tally with hard-block validation, settlement generation (direct + host modes, advance-aware), payment tracking, game closure, reopen, and history. Dashboard and history pages query real game data.

The app typechecks and builds successfully. Runtime use requires real Clerk and Supabase environment variables plus both migrations applied to Supabase.

## 2. Latest Session Summary
Date: 2026-07-05
Session goal: Build the full Poker Night slice (Phase 2–4) on top of the Phase 0/1 foundation.
What was completed:
- Confirmed three product decisions with the user: host-only MVP first (players are host-created profiles, claimable later), advances as a first-class field, tally mismatch hard-blocks settlement.
- Migration `202607050002_advances_and_claimable_players.sql`: `players.linked_clerk_user_id` (future profile claiming), `game_players.advance_money`, `games.tally_discrepancy_note` (reserved, unused).
- Full hand-authored Supabase types for all poker/settlement tables in `db/types/database.ts`.
- Pure settlement engine in `features/settlement/calculations.ts`: conversions, tally validation, net results, direct + host settlement, advance netting (`applyAdvances`: player effective net = net + advance; host seat carries the offset, zero-sum preserved; advances require a host seat).
- `features/poker/`: zod schemas, queries (`getGameDetail`, `listGamesForCurrentHost`), server actions for the whole lifecycle (create, start, pause/resume, buy-ins add/reverse, advances, end game, tally+settlement generation, line payments, close, reopen, cancel, back-to-live, reopen-tally). All actions verify host ownership and legal status transitions; events logged to `game_events`.
- UI: 3-step new-game wizard (rules → table/advances/host seat → seating+review, quick-add players), status-driven game screen (`/app/games/[gameId]`) with DraftView, LiveView (buy-in bottom sheet with presets + whole-coin validation, per-player sheet with buy-in history/reversal/advance edit, pause, protected end-game), TallyView (live tally meter, mode picker, hard-block), SettlementView (standings, who-pays-whom cards, mark paid/partial, UPI deep link + copy, close), ClosedView (winner card, recap, reopen).
- Shared UI: BottomSheet, PlayerAvatar, StatusBadge, GameCard, GameHeader; sheet/pulse/chip-pop animations with reduced-motion support.
- Dashboard + history wired to real games.
- Verified: `npm run typecheck`, `npm run build`, and a node script exercising the settlement engine against the docs examples plus advance edge cases (all passing).

What was not completed:
- Migrations not applied to a live Supabase project; no real env vars.
- Public read-only player view (`public_token` exists but no route).
- Share/image cards, seating drag-and-drop (up/down buttons + shuffle instead), buy-in edit (reversal + re-add instead), poker table visual (list cards instead), analytics.

## 3. Important Product Decisions
- App is mobile-first web; house-party games platform, not only poker.
- Offline game tracker + settlement helper; no online gameplay, no payment processing.
- Clerk Google login for host only. Players are host-owned profiles; `linked_clerk_user_id` reserves future claiming by real users (join links, self-serve pay/receive are Phase 2+).
- Advances: cash paid to the host up front, first-class on `game_players.advance_money`, netted into settlement; require the host to be seated.
- Tally mismatch hard-blocks settlement (revisit "acknowledge & proceed" later; `tally_discrepancy_note` column reserved).
- Settlement modes: direct (Splitwise-style) and host (losers pay host, host pays winners). Host mode requires a host seat.
- UPI is convenience-only; payment confirmation is manual by the host.

## 4. Architecture Decisions
- All critical math lives in pure functions in `features/settlement/calculations.ts`; server actions recompute and validate before persisting (UI derivations in `features/poker/derive.ts` are display-only).
- Server actions use the service-role Supabase client with explicit host ownership + status-transition checks; RLS policies exist as defense-in-depth.
- Buy-ins are soft-deleted (`deleted_at`); reversing a buy-in invalidates tallies and deactivates settlement batches.
- Settlement regeneration deactivates the previous batch (`is_active = false`), never deletes it.
- Game detail page is a server component that routes to a status-specific client view.
- Buy-in amounts must convert to whole coins; enforced client- and server-side.

## 5. Database State
- migrations:
  - `db/migrations/202605060001_initial_schema.sql`
  - `db/migrations/202607050002_advances_and_claimable_players.sql`
- Neither migration applied to a live Supabase project yet.
- Hand-authored types in `db/types/database.ts` now cover all tables; replace with generated types after connecting Supabase.
- No seed data.

## 6. Implemented Features
- Auth, host onboarding, player address book (from previous session).
- Game setup: 3-step wizard, 2–9 players, host seat marking, advances, seating order + shuffle, quick-add players.
- Live game: buy-in presets/custom with coin preview, payment status, per-player ledger with reversal, advance editing, pause/resume, protected end game, running table totals.
- Tally: per-player chip entry, live match meter, hard-block, settlement mode choice with availability rules.
- Settlement: standings with net results, generated lines, mark paid/partial, UPI deep link/copy actions, pending total, close only when all paid, re-count chips, reopen closed games.
- Dashboard: live/draft/pending/recent sections, real counts. History: in-progress + finished lists.

## 7. Pending Tasks
- [ ] Add real Clerk + Supabase env vars and apply both migrations.
- [ ] Generate Supabase TypeScript types to replace hand-authored ones.
- [ ] Public read-only game view via `public_token` + share link.
- [ ] Shareable image result cards.
- [ ] Wire a real test runner (the settlement engine checks currently live in a throwaway script; port to vitest).
- [ ] Buy-in edit-in-place (currently reverse + re-add).
- [ ] Drag-and-drop seating; poker-table visual layout; dashboard analytics.
- [ ] git init + first commit (repo is still not a git repository).
- [ ] Review npm audit advisories; verify lint setup for Next 16.

## 8. Known Issues / Bugs
- End-to-end flows unverified against a live database (no env vars).
- `games.public_token` is generated but unused (no public route yet).
- Draft games cannot edit rules/seats — cancel and recreate.
- History/dashboard cards do not show money totals (would need per-game aggregate query).

## 9. Future Scope
- Player login + profile claiming via `linked_clerk_user_id`, shareable join links, self-serve pay/receive.
- Other game modes (imposter/undercover, score tracker, pot splitter...).
- Payment gateway / UPI verification, advanced analytics, 3D table, chip physics, PWA.

## 10. Next Recommended Step
Configure Clerk + Supabase env vars, apply both migrations, then run the full flow against the live database: onboarding → add players → create game with advances → buy-ins → end → tally → settle → close.

## 11. Environment Variables Needed
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
