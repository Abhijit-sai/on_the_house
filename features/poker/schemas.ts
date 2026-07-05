import { z } from "zod";

export const gamePlayerSetupSchema = z.object({
  playerId: z.string().uuid(),
  isHostPlayer: z.boolean().default(false),
  advanceMoney: z.coerce.number().min(0, "Advance cannot be negative").default(0),
});

export const createPokerGameSchema = z
  .object({
    name: z.string().trim().min(1, "Game name is required").max(80, "Game name is too long"),
    location: z.string().trim().max(120, "Location is too long").optional(),
    ratioMoneyAmount: z.coerce.number().positive("Money side of the ratio must be positive"),
    ratioCoinAmount: z.coerce.number().int("Coins must be whole").positive("Coin side of the ratio must be positive"),
    minBuyInCoins: z.coerce.number().int("Coins must be whole").positive("Minimum buy-in must be positive"),
    maxBuyInCoinsPerPlayer: z.coerce.number().int().positive().optional(),
    startingCoinAmount: z.coerce.number().int("Coins must be whole").positive("Starting stack must be positive"),
    allowRebuys: z.boolean().default(true),
    players: z.array(gamePlayerSetupSchema).min(2, "Add at least 2 players").max(9, "Poker Night supports up to 9 players"),
  })
  .superRefine((data, ctx) => {
    if (data.startingCoinAmount < data.minBuyInCoins) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startingCoinAmount"],
        message: "Starting stack must be at least the minimum buy-in.",
      });
    }

    if (data.maxBuyInCoinsPerPlayer !== undefined && data.maxBuyInCoinsPerPlayer < data.minBuyInCoins) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxBuyInCoinsPerPlayer"],
        message: "Max buy-in cannot be below the minimum buy-in.",
      });
    }

    const hostSeats = data.players.filter((p) => p.isHostPlayer).length;

    if (hostSeats > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["players"],
        message: "Only one player can be marked as you (the host).",
      });
    }

    const hasAdvances = data.players.some((p) => p.advanceMoney > 0);

    if (hasAdvances && hostSeats === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["players"],
        message: "Advances are paid to you, so mark which seat is you before recording advances.",
      });
    }

    const uniquePlayerIds = new Set(data.players.map((p) => p.playerId));

    if (uniquePlayerIds.size !== data.players.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["players"],
        message: "A player can only be seated once.",
      });
    }
  });

export type CreatePokerGameInput = z.infer<typeof createPokerGameSchema>;

export const addBuyInSchema = z.object({
  gameId: z.string().uuid(),
  gamePlayerId: z.string().uuid(),
  moneyAmount: z.coerce.number().positive("Buy-in must be positive"),
  paymentStatus: z.enum(["paid", "unpaid", "settled_later"]).default("paid"),
  note: z.string().trim().max(200).optional(),
});

export type AddBuyInInput = z.infer<typeof addBuyInSchema>;

export const removeBuyInSchema = z.object({
  gameId: z.string().uuid(),
  buyInId: z.string().uuid(),
  reason: z.string().trim().max(200).optional(),
});

export const setAdvanceSchema = z.object({
  gameId: z.string().uuid(),
  gamePlayerId: z.string().uuid(),
  advanceMoney: z.coerce.number().min(0, "Advance cannot be negative"),
});

export const finalTallySchema = z.object({
  gameId: z.string().uuid(),
  settlementMode: z.enum(["direct", "host"]),
  counts: z
    .array(
      z.object({
        gamePlayerId: z.string().uuid(),
        finalCoinCount: z.coerce.number().int("Whole coins only").min(0, "Chips cannot be negative"),
      }),
    )
    .min(2),
});

export type FinalTallyInput = z.infer<typeof finalTallySchema>;

export const linePaymentSchema = z.object({
  gameId: z.string().uuid(),
  lineId: z.string().uuid(),
  paidAmount: z.coerce.number().min(0),
});
