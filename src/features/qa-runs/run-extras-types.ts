import type { QaRunSummary, QaVerdict } from "./types";

/**
 * Tipos de las tres lecturas de QA que el portal no usaba: campañas, eventos y manifiesto de
 * evidencia. Van aparte de `types.ts` porque ése ya roza el tope de tamaño del repo.
 */

/** Una campaña: agrupación de recorridos con su reparto (`share` = peso relativo). */
export type QaCampaign = {
  code: string;
  name: string;
  description: string;
  templates: Array<{ code: string; version: string; share: number }>;
};

/** Evento del diario de una corrida (`qa_run_events`), en orden de `sequence`. */
export type QaRunEvent = {
  sequence: number;
  type: string;
  payload: unknown;
  createdAt: string;
};

export type QaRunEventPage = { items: QaRunEvent[]; nextCursor: number };

/** Lo acumulado en el portal: todos los eventos vistos y el cursor para pedir los siguientes. */
export type QaRunEventLog = { items: QaRunEvent[]; cursor: number };

/** Manifiesto de evidencia: lo que hace reproducible y auditable una corrida. */
export type QaRunEvidence = {
  runId: string;
  planHash: string;
  recipeHash: string;
  generatorVersion: string;
  seed: string;
  namespace: string;
  referenceDate: string;
  plan: unknown;
  counters: QaRunSummary["counters"];
  verdict: QaVerdict;
  steps: unknown;
  evidence: Record<string, unknown> | null;
};
