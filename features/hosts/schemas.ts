import { z } from "zod";

export const hostOnboardingSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(80, "Display name is too long"),
});

export type HostOnboardingInput = z.infer<typeof hostOnboardingSchema>;
