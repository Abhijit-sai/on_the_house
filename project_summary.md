# On the House — Project Summary

> **LAUNCHED TO PRODUCTION 2026-09-17** at **games.madsoul.in**. See §0 below for the current live state; the older sections (§2 onward) are retained as build history.

## 0. Live Production State (2026-09-17)
On the House is **live and public at https://games.madsoul.in** with production Clerk auth and the user's real game data reconnected.

- **Hosting:** Vercel, GitHub `Abhijit-sai/on_the_house` → auto-deploy on push to `main`. Functions pinned to **hnd1 (Tokyo)** via `vercel.json` to co-locate with the Supabase DB (perf fix — see §perf below).
- **Auth:** Clerk **production** instance on custom domain (FAPI `clerk.games.madsoul.in`, `pk_live` decodes to that host). Google OAuth connected & published (no 100-user cap, no `accounts.dev` branding). `ClerkProvider` pins `signInUrl="/sign-in" signUpUrl="/sign-up"`. Signed-in visitors to the marketing landing page are redirected into `/app/dashboard` (fixes the post-sign-in "lands on homepage" bug).
- **DB:** Supabase project `zmoswepllrzsxenrsbww` (ap-northeast-1 / Tokyo). All migrations applied. Host-based data model: `hosts.clerk_user_id` (unique) links the Clerk identity; games/players/rallies FK to `hosts.id`.
- **Branding / link previews:** `app/icon.svg` (house+spade favicon, gold #F5B942 on #070707), `app/apple-icon.tsx` (180×180 PNG via next/og), `app/opengraph-image.tsx` (1200×630 card), shared logo data-URI in `features/branding/logo.ts`. `metadataBase` pinned to `https://games.madsoul.in` in production.
- **Legal:** `app/(public)/privacy` and `app/(public)/terms` (contact madsoul1100@gmail.com), linked from the landing footer.
- **Data migration DONE & verified:** production Clerk minted new user IDs, orphaning the dev-account data. Reconnected via scratchpad scripts (NOT in repo): dev→prod reconnect by email, then consolidated `abhijit.siddabuthuni@gmail.com` **into** `abhijit.sai09@gmail.com` (prod id `user_3JPYve79g4UhAotzmD8j1ur7evF`). Final verified state on that account: **11 games (8 closed), 21 players, 3 rallies**, 0 orphaned seats, zero-sum intact across all closed games, consolidated 18-row lifetime leaderboard (Rahil +₹9,355 top, Abhijit −₹10,600 bottom). Duplicate players merged by name so leaderboard history combines.

**Perf fix (2026-09-16):** app was slow because Vercel functions ran in iad1 (Washington) while the DB is in Tokyo. Fixed with `vercel.json` `"regions": ["hnd1"]`, `getCurrentHost` in React `cache()`, poker audit logs via `after()`, optimistic UI (`useOptimistic`) for buy-ins and mark-paid.

**Open operational items (flagged, NOT yet approved by user):**
- Supabase free tier **pauses after ~7 days idle** — has crashed the app before; consider Supabase Pro (~$25/mo) or a graceful "waking up" screen before/around a traffic spike.
- Rally proof photos stored full-size (up to 5MB) — add client-side compression before upload.
- Neel's account: still only on dev, but it holds **no data**, so nothing to migrate unless/until he signs in on production.

## 0b. Imposter (game #3) — built 2026-09-29, NOT yet deployed
Pass-the-phone Undercover-style word game at `/app/imposter` (hub) → `/app/imposter/new` (pick crew from the shared address book, crown yourself) → `/app/imposter/[roomId]` (lobby: imposter count, word category, pass order, running scoreboard, past games; archive/reopen).
- **Rules:** everyone draws a face-down card; civilians share a word, imposters get a close cousin and are NOT told their role. Each round: clues from a random starter going round in seat order, then the table votes one out (role revealed, word not). Civilians win when all imposters are out; imposters win by surviving until one civilian is left. Max imposters = ⌊(n−1)/2⌋, 3–20 players.
- **Scoring:** +1 per vote survived (everyone); surviving imposters on an imposter win get +5, so they always top that game. Constants in `features/imposter/engine.ts`.
- **Architecture:** live play is client-only (`localStorage` key `oth-imposter-game:<roomId>`, CSPRNG shuffles) so taps are instant and refresh-safe; only finished games are saved. `recordImposterGame` re-validates the whole game and re-scores it with the engine server-side; the game id is minted at the deal so saves are idempotent. Word bank `features/imposter/words.ts` (~180 pairs, 12 categories, no repeat within a room until exhausted). Sounds synthesized with Web Audio in `features/imposter/sounds.ts` (distinct peek alarm + red screen flash; mute persisted). 24 engine tests.
- **Migration `db/migrations/202609290005_imposter_module.sql` must be applied in the Supabase SQL editor before deploying.** Queries tolerate the tables missing (arcade/history/pickers keep working), but rooms can't be created until it's applied.
- Arcade "Undercover" teaser is now the playable Imposter card (violet world accent); GameSwitcher, sidebar CTA, History and picker play-counts include it.

## 1. Current Project State (build history — superseded by §0)
The repo contains a working Next.js App Router app for On the House with all WBS phases 0–8 implemented (minus live-database verification): the complete host Poker Night flow, public read-only player view at `/g/[token]`, UPI conveniences (deep link, QR, copy, add-UPI-during-settlement), and shareable 1080×1920 canvas result cards. Phase 9 is partially done (theme, avatars, motion; no 3D/physics). The settlement engine has a 22-test vitest suite covering all required cases from docs/06.

The app typechecks, builds, and tests green. The repo is a git repository (main branch). Runtime use requires real Clerk and Supabase environment variables plus both migrations applied to Supabase — the user has explicitly deferred DB/login setup until the build is ready.

## 2a. Rally Session (2026-07-06)
Rally, the second module, is built and verified E2E against the live database. Adapted from the user's rally-habit-tracker repo: host creates a group challenge (title, rules, date range, members from the shared address book); members participate via public `/r/[token]` link with a pick-yourself identity stored in localStorage; daily check-ins (message-based — proof photos deferred until Supabase Storage is set up); peers approve/reject via majority vote (`features/rally/engine.ts`, 18 tests); host can override any decision; standings rank commitment % then streak. Also shipped: game-mode picker at `/app/games/new` (poker wizard → `/app/games/new/poker`), rallies on the dashboard, and a desktop pass (lg: sidebar shell, wider content, two-column rally room). Migration `202607060003_rally_module.sql` applied to Supabase. App deployed on Vercel via GitHub (Abhijit-sai/on_the_house, auto-deploy on push to main); Clerk runs in dev mode. Rally timezone is hardcoded Asia/Kolkata in `todayISO()`.

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
Env vars, migrations, deployment, and Vercel are all DONE (see §0 — launched 2026-09-17). Remaining:
- [ ] Supabase idle-pause mitigation: Supabase Pro or a "waking up" screen (flagged, awaiting user go-ahead).
- [ ] Rally proof-photo client-side compression before upload.
- [ ] Generate Supabase TypeScript types to replace hand-authored ones.
- [ ] Buy-in edit-in-place (currently reverse + re-add).
- [ ] Drag-and-drop seating; poker-table visual layout; 3D/physics polish.
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

## 11. Environment Variables
Configured in **Vercel** (production values live there, NOT in `.env.local`; never paste `sk_live`/Client Secret into chat, files, or `.env.example`; secret keys are Secret/Config type, never `NEXT_PUBLIC`).
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (`pk_live`, Config), `CLERK_SECRET_KEY` (`sk_live`, Secret)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (prod link-preview base is pinned to `https://games.madsoul.in` in code regardless)
