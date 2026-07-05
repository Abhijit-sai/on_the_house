import { z } from "zod";

export const avatarKeys = ["ace", "chip", "crown", "dice", "flame", "star"] as const;
export const colorKeys = ["red", "gold", "green", "amber", "cream", "deep"] as const;

export const playerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Player name is required").max(80, "Player name is too long"),
  upiId: z.string().trim().max(120, "UPI ID is too long").optional(),
});

export type PlayerInput = z.infer<typeof playerSchema>;
