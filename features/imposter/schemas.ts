import { z } from "zod";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/features/imposter/engine";

export const createImposterRoomSchema = z
  .object({
    title: z.string().trim().max(60, "Keep the name under 60 characters").optional(),
    members: z
      .array(z.object({ playerId: z.string().uuid(), isHostPlayer: z.boolean().default(false) }))
      .min(MIN_PLAYERS, `Imposter needs at least ${MIN_PLAYERS} players`)
      .max(MAX_PLAYERS, `Imposter supports up to ${MAX_PLAYERS} players`),
  })
  .superRefine((data, ctx) => {
    if (data.members.filter((m) => m.isHostPlayer).length > 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["members"], message: "Only one player can be you." });
    }

    if (new Set(data.members.map((m) => m.playerId)).size !== data.members.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["members"], message: "A player can only sit once." });
    }
  });

export type CreateImposterRoomInput = z.infer<typeof createImposterRoomSchema>;

export const updateImposterSeatsSchema = z.object({
  roomId: z.string().uuid(),
  // The full lineup for the next deal, in seat order.
  playerIds: z
    .array(z.string().uuid())
    .min(MIN_PLAYERS, `Imposter needs at least ${MIN_PLAYERS} players`)
    .max(MAX_PLAYERS, `Imposter supports up to ${MAX_PLAYERS} players`)
    .refine((ids) => new Set(ids).size === ids.length, "A player can only sit once."),
});

const role = z.enum(["civilian", "imposter"]);

/** The finished game exactly as the phone played it. The server re-scores it with the engine. */
export const finishedGameSchema = z.object({
  version: z.literal(1),
  gameId: z.string().uuid(),
  roomId: z.string().uuid(),
  seats: z
    .array(z.object({ seatId: z.string().uuid(), name: z.string(), colorKey: z.string().nullable() }))
    .min(MIN_PLAYERS)
    .max(MAX_PLAYERS),
  categoryId: z.string().min(1).max(40),
  categoryLabel: z.string().max(60),
  civilianWord: z.string().min(1).max(60),
  imposterWord: z.string().min(1).max(60),
  imposterCount: z.number().int().min(1),
  cards: z.array(z.object({ role, word: z.string(), claimedBy: z.string().uuid().nullable() })),
  dealIndex: z.number().int(),
  phase: z.enum(["deal", "clues", "vote", "reveal", "over"]),
  round: z.number().int().min(1),
  starterSeatId: z.string().nullable(),
  clueIndex: z.number().int(),
  eliminations: z.array(z.object({ seatId: z.string().uuid(), round: z.number().int().min(1), role })),
  winner: z.enum(["civilians", "imposters"]).nullable(),
  peeks: z.record(z.string(), z.number().int().min(0)),
  startedAt: z.string(),
});
