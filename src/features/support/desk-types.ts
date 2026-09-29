import type { PaginationMeta } from "@/shared/api/types";
import type { SupportChannel } from "./types";

/** De TODA la cola de espera, no de la página ni del filtro. */
export type DeskQueueSummary = {
  total: number;
  withoutCase: number;
  oldestRequestedAt: string | null;
};

/** De TODAS mis conversaciones vivas, no de la página ni del filtro. */
export type DeskMineSummary = {
  total: number;
  waitingAgent: number;
  withoutCase: number;
};

/**
 * `meta` y `summary` llegan desde que el servidor pagina la mesa. Un Core anterior los omite y
 * devuelve sólo `channels` (cortadas a 50): por eso son opcionales y la tabla no se rompe.
 */
export type DeskQueueResponse = {
  channels: SupportChannel[];
  meta?: PaginationMeta;
  summary?: DeskQueueSummary;
};

export type DeskMineResponse = {
  agentProfileId: string;
  presenceState: string;
  channels: SupportChannel[];
  meta?: PaginationMeta;
  summary?: DeskMineSummary;
};
