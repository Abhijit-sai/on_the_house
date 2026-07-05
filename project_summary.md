# On the House — Project Summary

## 1. Current Project State
The repo contains a working Next.js App Router app for On the House with all WBS phases 0–8 implemented (minus live-database verification): the complete host Poker Night flow, public read-only player view at `/g/[token]`, UPI conveniences (deep link, QR, copy, add-UPI-during-settlement), and shareable 1080×1920 canvas result cards. Phase 9 is partially done (theme, avatars, motion; no 3D/physics). The settlement engine has a 22-test vitest suite covering all required cases from docs/06.

The app typechecks, builds, and tests green. The repo is a git repository (main branch). Runtime use requires real Clerk and Supabase environment variables plus both migrations applied to Supabase — the user has explicitly deferred DB/login setup until the build is ready.

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

Second pass in the same session (phases 6–9):
- git init on `main`, repo-local identity, phased commits.
- Phase 6: `getPublicGameDetail` (token-gated, safe fields only) + `/g/[token]` public view with live/tally/settlement/closed/cancelled states; "share live link" button on the host game screen (Web Share API + clipboard fallback).
- Phase 7: UPI QR bottom sheet (`qrcode` dep) on host + public settlement rows, add/edit UPI during settlement via `updatePlayerUpi` action, copy-only fallbacks.
- Phase 8: canvas-rendered 1080×1920 share cards (`lib/share-card.ts`): Winner of the Night, Final Damage Report (standings), Who Pays Whom (settlement); native share with download fallback; no UPI IDs on cards.
- Tests: vitest + `features/settlement/calculations.test.ts` (22 tests, all 16 required cases from docs/06 §19 plus advance cases). `npm test`.
- Dashboard: volume tracked + biggest winner stats via `getHostStats`.
- Phase 9 partial: winner reveal spring animation, all-settled celebration, reduced-motion safe.

What was not completed:
- Migrations not applied to a live Supabase project; no real env vars (user deferred deliberately).
- Phase 9 leftovers: 3D poker table, Matter.js chip physics, haptics/sound.
- Seating drag-and-drop (up/down + shuffle instead), buy-in edit-in-place (reversal + re-add instead), Vercel deployment.

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
- [ ] Add real Clerk + Supabase env vars, apply both migrations, run the full flow end to end (THE gating step).
- [ ] Generate Supabase TypeScript types to replace hand-authored ones.
- [ ] Vercel deployment.
- [ ] Buy-in edit-in-place (currently reverse + re-add).
- [ ] Drag-and-drop seating; poker-table visual layout; 3D/physics polish.
- [ ] Review npm audit advisories (8 reported: 1 low, 3 moderate, 4 high); verify lint setup for Next 16.

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
