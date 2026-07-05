# On the House — Codex Build Pack

**Product:** On the House  
**Tagline:** House party games  
**First game module:** Poker Night  
**Platform:** Mobile-first web app  
**Primary user:** Host  
**Secondary user:** Player with read-only game link  

## What we are building

On the House is a mobile-first house-party games app. It helps a host run offline games, track chips/scores/contributions, calculate outcomes, and settle the night cleanly.

The MVP launches with **Poker Night**, a private offline poker ledger that tracks buy-ins, final chip counts, profit/loss, settlement, game history, and shareable result cards.

This is **not** an online poker app. It does not deal cards, process payments, hold money, verify UPI transactions, or enable online gambling.

## Build priority

The backend and calculation engine must be accurate and deterministic. The UI must be premium, playful, and mobile-first.

The app should feel like:

> A stylish game-night control room in your pocket.

## Files in this pack

1. `01_PRD.md` — Product requirements and user journeys.
2. `02_WBS.md` — Work breakdown structure and phased build plan.
3. `03_TECH_STACK_AND_ARCHITECTURE.md` — Recommended stack, architecture, folders, and engineering rules.
4. `04_SITE_MAP_AND_SCREEN_SPECS.md` — Routes, screens, and mobile-first UX requirements.
5. `05_DATA_MODEL_AND_DB_SCHEMA.md` — Supabase/Postgres schema, RLS expectations, and core entities.
6. `06_CALCULATION_AND_SETTLEMENT_RULES.md` — Poker calculations, tally validation, and settlement algorithms.
7. `07_MOBILE_WEB_UI_AND_DESIGN_SYSTEM.md` — Mobile web optimization, design system, gamified UI, animations.
8. `08_AI_AGENT_BUILD_INSTRUCTIONS.md` — Codex/AI-agent build instructions, build order, and first prompt.

## Recommended build order

1. Read all markdown files.
2. Build the database schema and auth foundation first.
3. Build host onboarding and player address book.
4. Build Poker Night setup flow.
5. Build live game buy-in ledger.
6. Build final tally and settlement engine.
7. Build public read-only game view.
8. Build UPI convenience actions.
9. Build shareable result image cards.
10. Add premium mobile UI polish, 3D/physics effects, haptics, and sounds.

## Key product constraints

- Mobile-first web experience.
- Host uses Clerk Google login.
- Host data persists in Supabase.
- One host cannot see another host's games or players.
- Players do not log in in MVP.
- Players can view via read-only public game link.
- Poker Night is the first module only; architecture should allow future game modes.
- Do not build online poker gameplay.
- Do not process money in-app.
- Do not attempt automatic UPI confirmation.

## Golden rule

Do not sacrifice ledger correctness for visual polish. The app can be playful, but the calculations must be boring, reliable, and testable.
