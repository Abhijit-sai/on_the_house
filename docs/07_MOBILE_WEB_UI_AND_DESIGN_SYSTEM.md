# 07 — Mobile Web UI & Design System

## 1. Design Direction

**Brand:** On the House  
**Tagline:** House party games  
**Visual direction:** Premium neon poker club  
**Palette:** Black, red, gold  
**Feeling:** playful, premium, social, loud, but not childish  

The UI should feel like a stylish party control room, not an admin dashboard.

## 2. Mobile-first Mandate

The MVP must be optimized for mobile web from day one.

Primary target viewports:

```text
360 × 800
390 × 844
414 × 896
430 × 932
```

Desktop can be supported, but it should not drive design decisions.

## 3. Mobile UX Rules

1. Use bottom navigation for core app sections.
2. Use sticky bottom CTA for primary action.
3. Use bottom sheets instead of desktop modals.
4. Use large cards instead of dense tables.
5. Use numeric keyboard for money/coin inputs.
6. Use one clear primary action per screen.
7. Use confirm dialogs for irreversible or high-risk actions.
8. Avoid tiny text and tiny icons.
9. Touch targets must be at least 44px.
10. Do not require horizontal scrolling for core ledger data.
11. All critical data must be readable without relying on 3D visuals.
12. Public player view must be very lightweight.

## 4. Visual Design Tokens

### Colors

```text
Background: #070707
Surface: #121212
Surface Elevated: #1B1B1B
Surface Gold Tint: #211707
Primary Red: #D72638
Deep Red: #7A101C
Gold: #F5B942
Deep Gold: #B8872B
Cream Text: #FFF4D6
Primary Text: #FFFFFF
Muted Text: #9C9587
Success Green: #00D17A
Warning Amber: #FFB020
Danger Red: #FF4D5A
Border Subtle: rgba(255, 244, 214, 0.12)
Glow Gold: rgba(245, 185, 66, 0.35)
Glow Red: rgba(215, 38, 56, 0.35)
```

### Typography

Use clean, modern sans-serif for body.

Recommended style:

- Large expressive headings.
- Compact body text.
- Tabular numbers for money and coins.
- Strong weight contrast for totals.

### Spacing

Mobile spacing:

```text
Screen horizontal padding: 16px
Card padding: 16px
Section gap: 20px
Bottom CTA safe area: 88px minimum
```

### Radius

```text
Small: 8px
Medium: 14px
Large: 20px
XL: 28px
```

Use soft rounded cards, not sharp admin panels.

## 5. Navigation

### Bottom Nav Items

MVP bottom nav:

1. Home
2. Games
3. Players
4. History
5. Settings

Alternative compact MVP:

1. Home
2. Players
3. History
4. Settings

## 6. App Shell

Mobile shell requirements:

- Safe-area aware.
- Sticky top mini-header.
- Bottom nav fixed.
- Pull-to-refresh optional later.
- Loading skeletons.
- Status badges.
- Clear back navigation.

## 7. Component Style

### Cards

Use dark elevated cards with subtle glow.

Card example:

```text
background: Surface Elevated
border: 1px solid Border Subtle
shadow: soft gold/red glow on important cards
radius: 20px
```

### Buttons

Primary button:

- Gold or red gradient feel.
- Large touch target.
- Strong text.

Secondary button:

- Transparent/dark surface.
- Subtle border.

Danger button:

- Red.
- Requires confirmation for critical actions.

### Status Badges

Use both color and label.

Examples:

- Draft — muted gold.
- Live — glowing green/red pulse.
- Paused — amber.
- Tally Pending — amber.
- Pending Settlement — gold.
- Closed — green.
- Cancelled — muted gray/red.

## 8. Poker Table UI

### Required Data

The poker table must show:

- players around table,
- avatar/icon,
- buy-in amount,
- coins issued,
- status indicators,
- center summary.

### Visual Layout

Mobile-first table can be a stylized oval/rounded table.

For 2–9 players:

- position seats around the table using predefined layouts.
- Avoid labels overlapping.
- Tap a player to open bottom sheet.

### Fallback Requirement

If 3D is disabled or device is low-end:

- show `PokerTableLite`.
- It must still show all critical information.

## 9. Animation Guidelines

Use animations to increase delight, not confusion.

### Good animations

- chip pulse when buy-in is added,
- table glow when game goes live,
- winner reveal,
- settlement completion celebration,
- subtle card entrance transitions.

### Avoid

- long blocking animations,
- animations before showing important totals,
- heavy 3D on initial load,
- particle effects during input-heavy screens.

## 10. Three.js / React Three Fiber Usage

3D table should be an enhancement, not the core interface.

Recommended:

- Lazy-load 3D component.
- Use simple geometry.
- Keep textures minimal.
- Avoid expensive lighting.
- Degrade to static CSS table.

Use only on:

- dashboard hero preview,
- live game table,
- share/winner reveal if performant.

## 11. Matter.js Usage

Matter.js can be used for lightweight chip physics.

Use cases:

- chips drop into pot when buy-in added,
- chips scatter on winner reveal,
- chips settle when game closes.

Rules:

- Load only when animation is needed.
- Keep number of bodies low.
- Disable if reduced motion is on.
- Do not run physics continuously in background.

## 12. Haptics & Sound

MVP can include optional haptics/sound.

Suggested events:

- Buy-in added: light haptic.
- Game started: medium haptic.
- Settlement complete: success haptic.
- Error/mismatch: warning haptic.

Sound should be off by default or controlled via setting.

## 13. Key Screen UI Notes

### Dashboard

Should feel energetic.

- Big Start Game Night CTA.
- Active game cards.
- Pending settlement warning cards.
- Quick stats with neon chips.

### Create Game

Use wizard-style flow.

- Fewer fields per screen.
- Clear progress.
- Game mode cards.

### Live Game

Most important screen.

- Must be usable with one hand.
- Add buy-in action must be very easy.
- End game must be protected from accidental tap.
- Totals must update immediately.

### Final Tally

Accuracy-first.

- Reduce visual noise.
- Large number inputs.
- Clear mismatch warning.
- Sticky continue button disabled until tally matches.

### Settlement

Clarity-first.

- Show who pays whom in cards.
- Large amount text.
- Easy UPI/copy action.
- Mark paid checkbox.
- Show remaining pending total.

### Share Card

Make it social.

Potential copy:

- “Final Damage Report”
- “Winner of the Night”
- “Settled on the House”
- “Poker Night Recap”

## 14. Share Card Design

Recommended first export format:

```text
1080 × 1920
```

Include:

- On the House branding.
- Game name.
- Date.
- Total tracked amount.
- Top winner.
- Player standings.
- Optional settlement summary.

Avoid:

- too much private detail,
- UPI IDs on public/social share cards,
- tiny text.

## 15. Accessibility

Requirements:

- Sufficient contrast.
- All buttons labeled.
- Do not use color alone for status.
- Support reduced motion.
- Use semantic HTML where possible.
- Numeric inputs should have labels.

## 16. Performance Checklist

Before considering UI complete:

- Initial dashboard loads fast on mobile.
- Live game buy-in action feels instant.
- No layout jumps during input.
- 3D table does not freeze screen.
- Reduced motion works.
- Public game link loads quickly.
- Share image export works on mobile.

## 17. Design Quality Bar

The app should not look like:

- a spreadsheet,
- a finance dashboard,
- an admin CRM,
- a dull ledger.

It should look like:

- a private game room,
- a premium party utility,
- a fun social tracker,
- a trustworthy settlement tool.
