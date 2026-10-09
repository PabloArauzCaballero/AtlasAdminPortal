import { z } from "zod";

/**
 * Esquema compartido cliente/servidor del progreso de un tutorial.
 *
 * Con topes (ADM-04, auditoría 2026-10-09): el servidor guarda lo que llega en un JSON en disco, y
 * sin `max()` una sola petición podía meter una cadena de megas. Los límites son holgados frente a
 * lo real —los ids del catálogo miden menos de 40 caracteres y las fechas son ISO-8601—.
 */
export const TUTORIAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

const isoDate = z.string().max(40);

export const tutorialProgressSchema = z.object({
  tutorialId: z.string().regex(TUTORIAL_ID_PATTERN),
  version: z.number().int().nonnegative().max(1_000_000),
  status: z.enum([
    "not-started",
    "in-progress",
    "completed",
    "skipped",
    "needs-update",
  ]),
  lastStepIndex: z.number().int().nonnegative().max(10_000),
  percent: z.number().int().min(0).max(100),
  startedAt: isoDate.optional(),
  completedAt: isoDate.optional(),
  skippedAt: isoDate.optional(),
  timesStarted: z.number().int().nonnegative().max(1_000_000),
  lastActivityAt: isoDate.optional(),
});

/**
 * El cuerpo del PUT. No lleva `userId`: el usuario sale de la sesión, en el servidor. Si un
 * cliente viejo lo sigue mandando, `z.object` lo descarta sin mirarlo.
 */
export const saveProgressRequestSchema = z.object({
  progress: tutorialProgressSchema,
});

export type SaveProgressRequest = z.infer<typeof saveProgressRequestSchema>;
