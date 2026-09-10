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
  pending: number;
  unattributedPending: number;
  pendingWithoutTenant: number;
  failed: number;
  oldestPending: string | null;
  skipped: string[];
  failing: string[];
  flows: PendingWorkFlow[];
  domainEvents: {
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

export type RbacDriftResponse = {
  /** Clientes cuyas pantallas llaman a otro bloque: aquí no se mide su deriva. */
  notMeasured?: string[];
  screensWithObservedEdges: number;
  truncated: boolean;
  screens: RbacDriftScreen[];
};
