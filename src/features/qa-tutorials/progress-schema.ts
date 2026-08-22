import { z } from "zod";

/** Esquema compartido cliente/servidor del progreso de un tutorial. */
export const tutorialProgressSchema = z.object({
  tutorialId: z.string().min(1),
  version: z.number().int().nonnegative(),
  status: z.enum([
    "not-started",
    "in-progress",
    "completed",
    "skipped",
    "needs-update",
  ]),
  lastStepIndex: z.number().int().nonnegative(),
  percent: z.number().int().min(0).max(100),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  skippedAt: z.string().optional(),
  timesStarted: z.number().int().nonnegative(),
  lastActivityAt: z.string().optional(),
});

export const saveProgressRequestSchema = z.object({
  userId: z.string().min(1),
  progress: tutorialProgressSchema,
});

export type SaveProgressRequest = z.infer<typeof saveProgressRequestSchema>;
