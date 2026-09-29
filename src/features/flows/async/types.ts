import type { PaginationMeta } from "@/shared/api/types";

/** `GET /systems/flows/pending-work`: lo que un flujo deja encargado al responder, y quién lo recoge. */
export type PendingWorkDiagnosis = "SIN_CONSUMIDOR" | "SALTADOS" | "AL_DIA";

export type PendingWorkFlow = {
  method: string;
  path: string;
  events: number;
  pending: number;
  processed: number;
  failed: number;
  other: number;
  pendingWithoutTenant: number;
  pendingSince: string | null;
  lastProcessedAt: string | null;
  skippedByConsumer: boolean;
  codes: string[];
};

export type DomainEventConsumer =
  | "AVISA"
  | "MENSAJE_SIN_SALIDA"
  | "SIN_PROCESAR"
  | "SIN_REGISTRO"
  | "REGISTRADO_SIN_AVISOS";

export type DomainEventRow = {
  eventCode: string;
  aggregateTypes: string[];
  events: number;
  processed: number;
  failed: number;
  eventsWithMessage: number;
  messages: number;
  messagesSent: number;
  registered: boolean;
  lastEventAt: string | null;
  consumer: DomainEventConsumer;
};

export type PendingWorkResponse = {
  windowDays: number;
  consumer: { lastRunAt: string | null; running: boolean };
  diagnosis: PendingWorkDiagnosis;
  flowsThatEnqueue: number;
  /**
   * El informe enseña como mucho `limit` rutas (las de pendiente más antiguo primero). Opcionales:
   * un servidor anterior al 2026-09-29 no los manda y no se puede afirmar ni negar el corte.
   */
  truncated?: boolean;
  limit?: number;
  pending: number;
  unattributedPending: number;
  pendingWithoutTenant: number;
  failed: number;
  oldestPending: string | null;
  skipped: string[];
  failing: string[];
  flows: PendingWorkFlow[];
  /** Con `limit`, la paginación de `flows` y las cuentas del conjunto sin filtrar (desde 2026-09-29). */
  meta?: PaginationMeta;
  summary?: {
    flows: number;
    withPending: number;
    withFailed: number;
    skipped: number;
  };
  /**
   * Opcional a propósito: un backend una versión por detrás no manda este bloque, y la pantalla lo
   * declaraba obligatorio. El resultado era una pantalla EN BLANCO —«Cannot read properties of
   * undefined (reading 'windowDays')»— en vez de una pantalla sin ese apartado. Medido el
   * 2026-09-17 contra un backend anterior; durante un despliegue ocurre lo mismo unos segundos.
   */
  domainEvents?: {
    windowDays: number;
    clampedByRetention: boolean;
    truncated: boolean;
    unregistered: string[];
    registeredWithoutMessages: string[];
    messagesNotSent: string[];
    rows: DomainEventRow[];
  };
};

/** `GET /systems/flows/rbac-drift`: pantallas cuyo menú pide algo que la API no aplica. */
export type RbacDriftSeverity = "SIN_GUARDA" | "SOLO_ROL" | "PUBLIC";

export type RbacDriftScreen = {
  clientCode: string;
  route: string;
  navPermissions: string[];
  navRoles: string[];
  calls: Array<{
    flowId: string;
    method: string;
    path: string;
    severity: RbacDriftSeverity;
    roles: string[];
  }>;
};

/** Una llamada de una pantalla, ya aplanada: la fila de la tabla de deriva. */
export type RbacDriftItem = {
  clientCode: string;
  route: string;
  navPermissions: string[];
  navRoles: string[];
  flowId: string;
  method: string;
  path: string;
  severity: RbacDriftSeverity;
  roles: string[];
};

export type RbacDriftSummary = {
  screensWithDrift: number;
  calls: number;
  bySeverity: Record<RbacDriftSeverity, number>;
  /** Clientes con deriva en el conjunto entero: las opciones del filtro «Cliente». */
  clients: string[];
};

export type RbacDriftQuery = {
  q?: string;
  severity?: string;
  clientCode?: string;
  page?: number;
  limit?: number;
};

export type RbacDriftResponse = {
  /** Paginado y filtrado en el servidor (desde 2026-09-29). Un Core anterior no lo manda. */
  items?: RbacDriftItem[];
  meta?: PaginationMeta;
  summary?: RbacDriftSummary;
  /** Clientes cuyas pantallas llaman a otro bloque: aquí no se mide su deriva. */
  notMeasured?: string[];
  screensWithObservedEdges: number;
  truncated: boolean;
  screens: RbacDriftScreen[];
};

export type PendingWorkQuery = {
  windowDays: number;
  q?: string;
  state?: string;
  page?: number;
  limit?: number;
};
