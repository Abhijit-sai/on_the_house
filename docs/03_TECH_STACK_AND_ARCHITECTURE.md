# 03 — Tech Stack & Architecture

## 1. Recommended Stack

### Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- React Three Fiber / Three.js
- Matter.js
- Zustand
- React Hook Form
- Zod

### Backend / Database

- Supabase Postgres
- Supabase Row Level Security
- Supabase Storage if share cards need storage
- Supabase Realtime optional later

### Auth

- Clerk
- Google OAuth

### Deployment

- Vercel for frontend
- Supabase hosted database
- Clerk hosted auth

### Utility Libraries

- `html-to-image` for share-card export
- `qrcode` for QR generation
- `date-fns` for dates
- `nanoid` or database-generated UUIDs/public tokens

## 2. Architecture Principles

1. Mobile-first from first commit.
2. Supabase is the source of truth.
3. Do not rely on local storage for critical game state.
4. Keep all poker-specific logic inside a Poker feature module.
5. Keep settlement logic reusable for future game modes.
6. Keep calculation functions pure and unit-tested.
7. Use soft delete for buy-ins.
8. Use game event logs for auditability.
9. Use server-side ownership checks.
10. Avoid exposing private host data in public routes.
11. Build a simple functional UI first, then gamify.

## 3. Suggested Folder Structure

```text
src/
  app/
    (public)/
      page.tsx
      about/
      privacy/
      terms/
      g/[publicToken]/
    (auth)/
      sign-in/
      sign-up/
    app/
      layout.tsx
      onboarding/
      dashboard/
      games/
        new/
        [gameId]/
          setup/
          players/
          seating/
          live/
          end/
          final-tally/
          review/
          settlement/
          closed/
      history/
      players/
        page.tsx
        [playerId]/
      settings/
  components/
    ui/
    layout/
    common/
  features/
    auth/
    hosts/
    players/
    game-nights/
    games/
    poker/
      components/
      actions/
      calculations/
      schemas/
      types/
    settlement/
      calculations/
      components/
      actions/
      types/
    share-cards/
    public-game/
  lib/
    supabase/
    clerk/
    utils/
    dates/
    tokens/
  server/
    actions/
    queries/
  db/
    migrations/
    generated-types.ts
  tests/
    unit/
    e2e/
```

## 4. Module Boundaries

### `features/poker`

Contains:

- poker config forms,
- live poker table,
- buy-in UI,
- final tally UI,
- poker calculation helpers,
- poker schemas and types.

Must not contain global auth or unrelated game-mode logic.

### `features/settlement`

Contains reusable settlement logic:

- direct settlement,
- host settlement,
- settlement line status,
- partial payment logic,
- settlement UI components.

Should be reusable by future game modes.

### `features/players`

Contains:

- address book,
- player forms,
- duplicate prevention,
- UPI fields,
- player stats.

### `features/share-cards`

Contains:

- final standings card,
- settlement summary card,
- image export utilities.

## 5. Data Access Pattern

Recommended approach:

- Use server actions or server-side query helpers for mutations.
- Validate all inputs with Zod.
- Check host ownership on every mutation.
- Use Supabase client server-side for private data.
- Public game view should fetch using public token and return only safe fields.

Do not query private host data directly from client unless protected with RLS and required for interaction.

## 6. Auth Flow

1. User lands on app.
2. User signs in through Clerk Google OAuth.
3. App checks if `hosts` row exists for `clerk_user_id`.
4. If no host profile exists, redirect to `/app/onboarding`.
5. Host enters display name.
6. App creates host profile.
7. Host enters dashboard.

## 7. Environment Variables

Use an `.env.example` like:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
```

Only use `SUPABASE_SERVICE_ROLE_KEY` server-side. Never expose it to the client.

## 8. Server Action Rules

Every mutation must:

1. Get current Clerk user.
2. Resolve host row.
3. Validate payload using Zod.
4. Check host owns the target resource.
5. Perform database mutation.
6. Log game event where applicable.
7. Return typed result.

Example action flow:

```text
addBuyIn(input)
→ getCurrentHost()
→ validate input
→ check game belongs to host
→ check game status allows buy-in
→ calculate coin amount
→ insert poker_buy_ins
→ log game_events
→ return updated summary
```

## 9. State Management

Use server state from Supabase as source of truth.

Use Zustand only for temporary UI state:

- open modal,
- selected player,
- local seating drag state,
- animation preferences,
- currently selected settlement mode before save.

Do not use Zustand as the long-term game ledger.

## 10. Forms & Validation

Use:

- React Hook Form for forms.
- Zod for schema validation.
- Shared schemas where possible between client and server.

Validation examples:

- game must have 2–9 players before start,
- ratio values must be positive,
- starting coins >= min buy-in,
- final coin count must be integer >= 0,
- total final coins must equal total issued coins,
- settlement paid amount <= amount.

## 11. Testing Strategy

### Unit tests required

- conversion functions,
- tally validation,
- net calculation,
- direct settlement algorithm,
- host settlement algorithm,
- duplicate player normalization,
- status transition guards.

### Integration tests useful

- create game,
- add buy-ins,
- end game,
- generate settlement,
- close game.

### E2E tests useful

- full host journey,
- public player view,
- mobile viewport game flow.

## 12. Performance Rules

Mobile-first performance is mandatory.

Rules:

- Keep first load small.
- Lazy-load 3D table and Matter.js effects.
- Provide non-3D fallback table.
- Do not block ledger actions behind animations.
- Use optimistic UI only when safe and easily reversible.
- Use loading skeletons for dashboard and game view.
- Avoid massive client-side bundles.

## 13. 3D / Animation Architecture

3D and physics are enhancement layers.

Recommended approach:

```text
PokerTableShell
 ├── PokerTableLite fallback
 └── PokerTable3D lazy-loaded enhancement
```

Only load React Three Fiber / Three.js when needed.

Matter.js chip effects should trigger on:

- buy-in added,
- settlement completed,
- winner reveal.

Respect reduced motion.

## 14. Public View Security

Public route:

```text
/g/[publicToken]
```

Must return only:

- game name,
- game status,
- players in game,
- safe buy-in summaries,
- final standings when available,
- settlement lines when available,
- UPI actions where relevant.

Must not return:

- host private dashboard data,
- other games,
- internal host IDs where avoidable,
- unrelated player history.

## 15. Error Handling

Use friendly mobile-first errors:

- “Final chips do not tally yet.”
- “This player already exists.”
- “This game has been closed. Reopen it to make changes.”
- “UPI ID not added for this player.”
- “You need at least 2 players to start.”

All critical server errors should be logged.

## 16. Future-proofing Without Overbuilding

Do now:

- Include `game_type` field.
- Keep poker module isolated.
- Keep settlement reusable.
- Use `game_nights` container.

Do not do now:

- Build multiple game modes.
- Build custom game builder.
- Build complex plugin engine.
- Build player accounts.
