import { z } from "zod";

const dateISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

export const createRallySchema = z
  .object({
    title: z.string().trim().min(1, "Give the rally a name").max(80, "Title is too long"),
    description: z.string().trim().max(400, "Keep the description under 400 characters").optional(),
    startDate: dateISO,
    endDate: dateISO,
    members: z
      .array(
        z.object({
          playerId: z.string().uuid(),
          isHostMember: z.boolean().default(false),
        }),
      )
      .min(1, "Add at least one member")
      .max(20, "Rallies support up to 20 members"),
  })
  .superRefine((data, ctx) => {
    if (data.endDate < data.startDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date cannot be before the start." });
    }

    if (data.members.filter((m) => m.isHostMember).length > 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["members"], message: "Only one member can be you." });
    }

    if (new Set(data.members.map((m) => m.playerId)).size !== data.members.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["members"], message: "A player can only join once." });
    }
  });

export type CreateRallyInput = z.infer<typeof createRallySchema>;

export const submitCheckInSchema = z.object({
  token: z.string().min(6).max(40),
  memberId: z.string().uuid(),
  message: z.string().trim().max(400, "Keep it under 400 characters").optional(),
});

export const castVoteSchema = z.object({
  token: z.string().min(6).max(40),
  voterMemberId: z.string().uuid(),
  checkInId: z.string().uuid(),
  vote: z.boolean(),
});

export const hostDecisionSchema = z.object({
  rallyId: z.string().uuid(),
  checkInId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});
