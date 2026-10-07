import { z } from "zod";
import { MAX_CREW, MAX_PLAYERS, MIN_CREW, MIN_PLAYERS } from "@/features/mafia/engine";

export const createMafiaRoomSchema = z
  .object({
    title: z.string().trim().max(60, "Keep the name under 60 characters").optional(),
    members: z
      .array(z.object({ playerId: z.string().uuid(), isHostPlayer: z.boolean().default(false) }))
      .min(MIN_CREW, `Mafia needs at least ${MIN_CREW} people — ${MIN_PLAYERS} players and a God`)
      .max(MAX_CREW, `Mafia supports up to ${MAX_CREW} people`),
  })
  .superRefine((data, ctx) => {
    if (data.members.filter((m) => m.isHostPlayer).length > 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["members"], message: "Only one player can be you." });
    }

    if (new Set(data.members.map((m) => m.playerId)).size !== data.members.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["members"], message: "A player can only sit once." });
    }
  });

export type CreateMafiaRoomInput = z.infer<typeof createMafiaRoomSchema>;

export const updateMafiaSeatsSchema = z.object({
  roomId: z.string().uuid(),
  // The full crew for the next game (God included), in seat order.
  playerIds: z
    .array(z.string().uuid())
    .min(MIN_CREW, `Mafia needs at least ${MIN_CREW} people — ${MIN_PLAYERS} players and a God`)
    .max(MAX_CREW, `Mafia supports up to ${MAX_CREW} people`)
    .refine((ids) => new Set(ids).size === ids.length, "A player can only sit once."),
});

const seat = z.object({ seatId: z.string().uuid(), name: z.string().max(80), colorKey: z.string().nullable() });
const seatRef = z.string().uuid();
const role = z.enum(["mafia", "doctor", "detective", "villager"]);

const event = z.discriminatedUnion("t", [
  z.object({
    t: z.literal("night"),
    night: z.number().int().min(1),
    mafia: seatRef.nullable(),
    doctor: seatRef.nullable(),
    detective: seatRef.nullable(),
  }),
  z.object({
    t: z.literal("vote"),
    day: z.number().int().min(1),
    tallies: z.array(z.object({ seatId: seatRef, hands: z.number().int().min(0) })).max(MAX_PLAYERS),
    out: seatRef.nullable(),
  }),
  z.object({ t: z.literal("left"), seatId: seatRef }),
  z.object({ t: z.literal("peek"), seatId: seatRef }),
]);

/** The finished game exactly as God's phone played it. The server replays and re-scores it with the engine. */
export const finishedGameSchema = z.object({
  version: z.literal(1),
  gameId: z.string().uuid(),
  roomId: z.string().uuid(),
  god: seat,
  seats: z.array(seat).min(MIN_PLAYERS).max(MAX_PLAYERS),
  roles: z.record(z.string(), role),
  settings: z.object({
    mafiaCount: z.number().int().min(1),
    doctor: z.boolean(),
    detective: z.boolean(),
    revealOnDeath: z.boolean(),
    dayTimerSec: z.number().int().min(0).max(1800),
    doctorSelfSave: z.enum(["never", "once", "always"]).optional(),
    voteRule: z.enum(["most", "majority"]).optional(),
  }),
  events: z.array(event).max(500),
  phase: z.literal("over"),
  dealIndex: z.number().int(),
  draft: z.null(),
  dayStartedAt: z.string().nullable(),
  dayBonusSec: z.number().int().min(0).optional(),
  startedAt: z.string(),
});
