# 09 — Quick Mafia: Research & Build Plan

> Status: **BUILT 2026-10-07**, not yet deployed (see `project_summary.md` §0c). Deviations from this plan: the mafia emoji is 🔪 (🕴️ was invisible on dark), and someone leaving mid-day shows a notice and keeps the day going rather than jumping to the verdict. Game #4 in the arcade. The Mafia teaser card (`/games/mafia.png`, "The town sleeps. The mafia doesn't.") already sits in the arcade and on the landing page as *coming soon*.
>
> **Decisions so far (Abhijit, 2026-10-07):** God is a **person**, not the app. The app is God's companion. The scoring in §3.7 is confirmed.

---

## 1. What Mafia is (research summary)

Mafia (Dimitry Davidoff, Moscow, 1986; re-themed as **Werewolf** in 1997) is a social-deduction game. An **informed minority** (the mafia, who know each other) hides inside an **uninformed majority** (the town, who only know how many mafia there are). A non-playing **moderator ("God")** runs it.

**The loop**

| Phase | What happens |
|---|---|
| **Night** | Everyone closes their eyes. God wakes the mafia, who silently agree on one victim. God wakes the special roles one by one (doctor protects someone, detective investigates someone). |
| **Dawn** | God announces who died (or that nobody did). |
| **Day** | Everyone argues. Someone is nominated, the table votes, and a **majority of living players** eliminates them. |
| **Repeat** | until one side wins. |

**Win conditions**
- **Town wins** when every mafioso is gone.
- **Mafia wins** at **parity**: mafia alive ≥ town alive (they now control every vote).

**The standard roles**
- **Mafia**: one shared kill per night, agreed by pointing.
- **Doctor**: protects one player per night. Common rules are *no protecting the same person two nights in a row*, and self-protection is either allowed or limited.
- **Detective (Sheriff/Seer)**: checks one player per night. God answers with a silent thumbs up or down.
- **Villager**: no night power, a vote by day.
- Popular add-ons: **Godfather** (reads innocent to the detective), **Vigilante** (one town kill), **Jester** (wins if voted out), **Mayor** (double vote). mafia.gg has more than 200 roles. None of that belongs in a *quick* game.

**Balance**
- Davidoff's original rules used about ⅓ mafia. Plotkin recommends exactly 2. Mathematical analyses put balance near **√n mafia**.
- KQED's 13-player example is 3 mafia, 1 detective, 1 doctor, 8 villagers, plus the narrator.

**Rules variance that matters for an app**
- **Ties on the day vote**: resolved by lot, a revote, or "no elimination".
- **Role reveal on death**: open (revealed) is faster and helps deduction. Closed keeps the mystery but games run longer.
- **Dead players** keep watching. KQED notes spectating is almost as fun as playing.

**Why a human God, not the app.**
- Pass-the-phone apps (Wolvesville Classic, the F-Droid *Werewolves* app) make the app the narrator. Passing the phone at night leaks who the villagers are: they have nothing to do, so they decide instantly, and the detective's face changes when they read a result.
- Eyes closed with a narrator fixes that, and a person narrating is half the fun: the storytelling, the dramatic deaths, the bluff-reading.
- So the app does the bookkeeping a human God usually fumbles: remembering who's who, the doctor's last save, the detective's answers, the majority count, and who's dead.

---

## 2. What "Quick Mafia" means for us

**One phone, held by God. The app is God's script, memory and scorekeeper.**

1. **Choose God.** In the lobby, pick who narrates this game. The app suggests whoever has narrated least, so the role rotates and the host plays whenever someone else is God. God doesn't play and doesn't score.
2. **Deal.** The phone goes round the players, **not God**. Each player taps "I'm Priya", holds to see their role (the mafia also see their partners), hides it and passes it on. The phone goes back to God.
3. **Night.** God says "Everyone, close your eyes" and works through a **script on screen**, one step at a time:
   - "Say: *Mafia, open your eyes. Who do you want to kill?*" The mafia point, God taps the target, and God says "*Mafia, close your eyes.*"
   - "Say: *Doctor…*" God taps who the doctor protects. The app blocks a repeat save and tracks the one self-save.
   - "Say: *Detective…*" God taps the detective's pick, the app shows God **MAFIA / NOT MAFIA**, and God gives the thumbs up or down.
   - **Dead or unused roles still get called.** The app tells God, for example, "Doctor is dead. Call them anyway and wait a few seconds." Otherwise the table learns the doctor is gone.
4. **Dawn.** The app works out the night and gives God the result plus a flavour line to riff on ("Ravi didn't make it. Found face-down in the biryani."). Or: "The doctor got there first. Nobody died."
5. **Day.** God starts a discussion timer on the phone.
6. **Vote.** God enters the nominee and the number of hands raised. The app knows how many votes make a majority, settles ties, eliminates the player and shows God the role to announce.
7. The app checks for a winner after every night and every vote, then loops.
8. **The Story.** The phone goes back on the table for everyone to see the night-by-night timeline (who the mafia hit, who the doctor saved, what the detective found), with confetti, superlatives and the room scoreboard. "Narrated by Rahil" goes on the game card.

**Quick** means: four roles only, roles revealed on death by default, short days, and **one-tap night steps**. A typical game takes **15–25 minutes** for 8 players.

**God's screen is private.** The role sheet ("who's who") is **hold-to-view** and the screen stays dark at night, so players glancing over can't read it.

---

## 3. Rules spec (what the engine enforces)

### 3.1 Players & setup
- **5–16 players plus God** (6–17 people in the room). Fewer than 5 players isn't Mafia.
- **God** is any room member. God sits out this game, gets no score and keeps their seat for the next game.
- **Suggested mafia count**: 5–6 → 1 · 7–9 → 2 · 10–12 → 3 · 13–16 → 4. The host can adjust it, capped at `⌊(n−1)/3⌋` (at least 1) so the town always starts with a real majority.
- **Doctor** on by default. **Detective** on by default for 6+ players. Both can be toggled.
- **Reveal role on death**: on by default (quick). Can be switched off.
- **Day timer**: 2 / 3 / 5 min, or off. Default 3.

### 3.2 Roles
| Role | Night step (God enters it) | Constraints |
|---|---|---|
| Mafia | One target | Can't target a fellow mafioso. If the mafia can't agree, God can record **no kill**. |
| Doctor | One player to protect | Not the same player two nights running. Self-protect allowed **once per game**. |
| Detective | One player to check | Not themselves. The result is shown to God only. |
| Villager | none | none |

### 3.3 Night resolution (at dawn)
- If the doctor protected the mafia's target: **nobody dies**.
- Otherwise the target dies. Their role is shown if reveal-on-death is on.
- A detective killed that same night still got their answer. That's intended.
- **The script always calls every role in the setup, even dead ones.** The app shows a "pretend" step with a suggested wait of 6–10 seconds.

### 3.4 Day vote (God counts)
- **Majority needed = ⌊alive/2⌋ + 1.**
- God flow: *nominate → hands up → enter the count*. Several nominees are allowed, and the highest count with a majority goes out.
- **No majority or a tie: nobody is eliminated** (quick). Optional setting: one revote between the tied players.
- An explicit **"Town spares everyone"** option.

### 3.5 Win checks
Run after the dawn resolution **and** after every vote:
- Mafia alive = 0 → **Town wins**
- Mafia alive ≥ town alive → **Mafia wins**

### 3.6 Edge cases the engine must handle
- A player leaves mid-game: God can **remove** them. That counts as an elimination with a role reveal, and win checks run.
- Doctor saves the hit: no death, and the night log records the save for the recap.
- The game can't open with mafia already at parity (the setup cap prevents it).
- 1 mafia vs 1 town = parity, so the mafia wins at once.
- **A player forgets their role**: God can open "Show a player their role", a hold-to-view screen for one named player, counted in `peeks`.
- **Undo**: one level, for God's last entry. God makes mistakes too, and there's no secrecy problem because God already knows everything.
- God's phone locks or the page refreshes: the game resumes from `localStorage`.

### 3.7 Scoring (confirmed by Abhijit, 2026-10-07)
- **+1** per night you survive, and **+1** per day vote you survive.
- **Winning team: +3** each. Mafia who are still alive when the mafia win: **+2** more.
- **Doctor +2** per save. **Detective +1** per mafioso they found.
- **God scores nothing** but gets a "Narrated N games" count on the room scoreboard.
- Shown on the reveal but not scored: **Cold-Blooded** (the mafioso who survived longest), **Untouchable** (most times targeted and survived), **Bandwagon** (voted out first).

---

## 4. Product & UX

**World language (no bleed from Imposter or Poker).** The words are town, the family, God, night falls, dawn, the hit, the doctor got there first, the town votes, sleep with the fishes (on the reveal). The accent is noir crimson on black, with a near-black night screen.

**Screens**
1. `/app/mafia`: hub (rooms, like `/app/imposter`).
2. `/app/mafia/new`: pick the crew with the shared `player-picker`, then crown yourself.
3. `/app/mafia/[roomId]`: lobby. **Choose God** (with a "narrated least" suggestion), role setup (mafia count stepper, doctor/detective toggles, reveal on death, day timer), seat order, running scoreboard, past games, archive/reopen.
4. **Game table** (full-screen, phone-sized):
   - **Deal**: "Pass to **Priya**", then "I'm Priya", then hold to reveal the role (partners shown if mafia), then "Hide & pass". After the last player: "Hand the phone back to **God (Rahil)**".
   - **God's night script**: one step per screen. A big "Say:" line in quotes, a grid of living players to tap, and a "Next" button. A dark theme with low brightness. A pretend step for dead roles with a soft countdown. The detective's answer appears as a big 👍/👎 for God only.
   - **Dawn**: the result plus a rotating flavour line for God to read or improvise from.
   - **Day**: a big countdown ring and a living/dead roster.
   - **Vote**: nominee chips, a hands stepper, "majority is 4", then the verdict. God announces the role.
   - **Roles sheet** (God only, hold-to-view at any time).
   - **Over / The Story**: the winner banner and confetti (reuse `components/shared/confetti`), the night-by-night timeline, superlatives, points and "Narrated by …".
5. Integration: the arcade card goes from teaser to playable, plus GameSwitcher, sidebar CTA, History, player-picker play counts and the landing deck. These are the same touchpoints Imposter used.

**Optional extras (not in v1):** ambient night sound God can play, and a "God's tips" card for first-time narrators.

---

## 5. Architecture (mirror Imposter's proven shape)

Live play stays on God's phone in `localStorage`, so taps are instant and a refresh is safe. **Only finished games go to the server**, and the server **replays the whole game through the same pure engine** before saving anything. The game id is minted at the deal, so saves are idempotent.

**One change from Imposter:** the engine is an **event reducer**. The state is the setup plus an ordered `events[]` log. `replay(setup, events)` rebuilds everything. That makes server validation one call, gives "The Story" recap for free, and lets the night log be stored as JSONB.

```
features/mafia/
  engine.ts          pure: roles, deal, night script steps, resolveNight, tallyVote, winnerOf, scoreGame, replay
  engine.test.ts     vitest — see §7
  local-game.ts      localStorage (oth-mafia-game:<roomId>), secureRng, newGameId  (copy of Imposter's)
  schemas.ts         zod: room create, seats, finished game (setup + events)
  actions.ts         createMafiaRoom, updateMafiaSeats, archive/reopen, recordMafiaGame (replay-validate)
  queries.ts         rooms, room detail, standings, narrator counts; tolerate missing tables
  script.ts          God's lines: night calls, dawn/death flavour, verdicts, win announcements
  components/        mafia-room.tsx, new-room-form.tsx, room-card.tsx, game-table.tsx (+ phase parts)
app/app/mafia/       page.tsx, new/page.tsx, [roomId]/page.tsx
db/migrations/202610xx0006_mafia_module.sql
```

**Key engine types (sketch)**
```ts
type Role = "mafia" | "doctor" | "detective" | "villager";
type Setup = { gameId; roomId; godSeatId: string; seats: Seat[];   // seats = players only, God excluded
               mafiaCount; doctor: boolean; detective: boolean; revealOnDeath: boolean;
               roles: Record<seatId, Role> };
type Event =
  | { t: "dealt" }
  | { t: "night"; night: number; mafiaTarget: string | null; doctorTarget: string | null; detectiveTarget: string | null }
  | { t: "vote"; day: number; outSeatId: string | null; tallies: { seatId: string; hands: number }[] }
  | { t: "removed"; seatId: string }
  | { t: "peek"; seatId: string };
type Phase = "deal" | "handback" | "night" | "dawn" | "day" | "vote" | "verdict" | "over";
```
Night steps are the engine's ordered list `nightSteps(state)`, so the UI just walks it. A dead role's step is flagged `pretend: true` and records `null`.

**Migration 0006** (same RLS pattern as 0005):
- `mafia_rooms`, `mafia_room_players` (copy the Imposter shape: seat_order, is_host_player, active)
- `mafia_games`: id (client-minted), room_id, **god_room_player_id**, mafia_count, has_doctor, has_detective, reveal_on_death, nights_played, winner (`town|mafia`), **events jsonb**, started_at, finished_at
- `mafia_game_scores`: game_id, room_player_id, role, died_night, voted_out_day, survived_phases, bonus, points, peeks, saves, finds
- **Apply it in the Supabase SQL editor before deploying.** Queries should tolerate the tables being missing.

**Reuse vs. copy.** The room and seat-lineup code is about 80% of Imposter's `actions.ts`/`queries.ts`. **Recommendation: copy it for Mafia now.** Pull a shared "party room" primitive out only when game #5 needs it. Reuse as-is: `player-picker`, `BottomSheet`, `Confetti`, `PlayerAvatar`, `keyboard-aware`, `secureRng`.

---

## 6. Build plan (phased)

| # | Phase | Output | Est. |
|---|---|---|---|
| 1 | **Engine + tests** | `engine.ts`: setup and God selection, deal, `nightSteps` (including pretend steps), resolveNight, vote tally, win checks, scoring, `replay`. All §3 rules and edge cases. | 1 session |
| 2 | **Data layer** | Migration 0006, `db/types` update, schemas, actions (with replay validation), queries including narrator counts. **You apply the migration** in the SQL editor. | ½ session |
| 3 | **Rooms** | Hub, new room, lobby with Choose God, role setup and scoreboard (adapted from Imposter). | ½ session |
| 4 | **Game table** | Deal pass and hand-back, God's night script, dawn, day timer, vote counter, verdict, roles sheet, peek, undo, quit. | 1 session |
| 5 | **The Story + script** | End-of-game timeline, superlatives, confetti, the `script.ts` line bank, noir styling. | ½ session |
| 6 | **Arcade integration** | Mafia card goes live; GameSwitcher, nav, History, play counts, landing deck; `project_summary.md` §0c. | ½ session |
| 7 | **Verify** | vitest green, `tsc`, lint. Browser pane on a temporary `zz-dev-preview` route (deleted before commit). **A real 6–8 person playtest** before announcing it. | — |

About **4 working sessions** in total. Phases 1–2 can ship to `main` dark (no arcade entry) before the UI exists.

---

## 7. Test plan (engine)
- Setup: God is excluded from the deal and scoring; the role counts and cap; the CSPRNG-injected shuffle; 5–16 players.
- Night: the mafia kill; no kill; doctor save cancels it; doctor can't protect the same player twice running; self-save allowed once; detective result correct; can't target dead players or fellow mafia.
- `nightSteps` always lists every role in the setup and flags dead roles as pretend.
- Vote: the majority threshold at each alive count; a tie means no elimination; spare-all; removed players.
- Win checks after the night and after the vote; parity; the 1v1 edge.
- Scoring for every role and win path; God gets zero; superlatives are deterministic.
- `replay(setup, events)` reproduces the client state. Tampered logs are rejected (wrong role counts, God holding a role, a dead player acting, events out of order, a wrong winner).

---

## 8. Risks & open questions
1. **God has to be willing to narrate.** "Narrated least" rotation plus the on-screen script lowers the bar. Watch in the playtest whether first-time Gods cope.
2. **Peeking with eyes closed** is the same weakness real Mafia has. There's nothing to fix in the app.
3. **Strategic priority.** This is a fourth arcade game while growth is flat and the invite/claim-your-seat loop (option A) is still open. Mafia doesn't build the join-link primitive.
4. Keep the uncommitted settlement changes in the working tree out of the Mafia commits.

---

### Sources
- [Mafia (party game) — Wikipedia](https://en.wikipedia.org/wiki/Mafia_(party_game))
- [How to play Mafia — KQED](https://www.kqed.org/pop/10178/how-to-play-mafia-an-in-depth-guide-to-the-perfect-holiday-game)
- [mafia.gg](https://mafia.gg/) · [Critical Play: Mafia.gg](https://mechanicsofmagic.com/2022/04/07/critical-play-mafia-gg/)
- [Werewolves (pass-and-play, F-Droid)](https://f-droid.org/fr/packages/io.github.davidchilin.werewolves_game/) · [Wolvesville Classic](https://spark.mwm.ai/us/apps/wolvesville-classic/1322989325)
