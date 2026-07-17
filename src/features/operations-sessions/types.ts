/**
 * Contrato de `GET /operations/sessions/:sessionId/investigation-summary`
 * (OperationsSessionsController). Los tipos reflejan los modelos Sequelize del
 * backend: las columnas DECIMAL viajan como `string` (no `number`) y casi todo
 * campo de negocio es anulable porque la telemetría llega parcial.
 */

export type SessionInvestigationSession = {
  sessionId: string;
  customerId: string | null;
  deviceId: string | null;
  status: string | null;
  channel: string | null;
  authMethod: string | null;
  startedAt: string | null;
  endedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

export type SessionInvestigationCustomer = {
  customerId: string;
  customerCode: string | null;
  lifecycleStatus: string | null;
};

export type SessionInvestigationDevice = {
  deviceId: string;
  riskStatus: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
};

/**
 * El backend nunca devuelve `gpsLat`/`gpsLng`: solo informa si la observación
 * traía coordenadas. El portal no puede —ni debe— mostrar un mapa.
 */
export type SessionGpsObservation = {
  id: string;
  capturedAt: string | null;
  /** DECIMAL en el backend: llega serializado como string. */
  accuracyMeters: string | null;
  hasCoordinates: boolean;
};

export type SessionDeviceSnapshot = {
  id: string;
  capturedAt: string | null;
  appVersion: string | null;
  vpnDetected: boolean | null;
  isRooted: boolean | null;
  isEmulator: boolean | null;
};

export type SessionPermissionEvent = {
  id: string;
  permissionCode: string | null;
  granted: boolean | null;
  respondedAt: string | null;
};

export type SessionAuthEvent = {
  id: string;
  eventType: string | null;
  loginSuccessful: boolean | null;
  occurredAt: string | null;
};

export type SessionIpReputation = {
  id: string;
  isVpn: boolean | null;
  isProxy: boolean | null;
  isTor: boolean | null;
  countryCode: string | null;
  city: string | null;
  /** DECIMAL en el backend: llega serializado como string. */
  reputationScore: string | null;
  capturedAt: string | null;
};

export type SessionSimObservation = {
  id: string;
  carrierName: string | null;
  simType: string | null;
  simCount: number | null;
  phoneLast4: string | null;
  capturedAt: string | null;
};

export type SessionDeviceRiskEvent = {
  id: string;
  eventType: string | null;
  reasonCode: string | null;
  happenedAt: string | null;
};

export type SessionCustomerAction = {
  id: string;
  eventName: string | null;
  screenName: string | null;
  occurredAt: string | null;
};

export type SessionCustomerObservation = {
  id: string;
  observationCode: string | null;
  valueBoolean: boolean | null;
  capturedAt: string | null;
};

export type SessionAuditEntry = {
  id: string;
  actionCode: string | null;
  actorType: string | null;
  occurredAt: string | null;
};

export type SessionInvestigationSummary = {
  session: SessionInvestigationSession;
  customer: SessionInvestigationCustomer | null;
  device: SessionInvestigationDevice | null;
  gpsObservations: SessionGpsObservation[];
  deviceSnapshots: SessionDeviceSnapshot[];
  permissions: SessionPermissionEvent[];
  authEvents: SessionAuthEvent[];
  ipReputation: SessionIpReputation[];
  simObservations: SessionSimObservation[];
  /** `[]` cuando la sesión no tiene `deviceId`: los eventos cuelgan del dispositivo. */
  deviceRiskEvents: SessionDeviceRiskEvent[];
  customerActions: SessionCustomerAction[];
  customerObservations: SessionCustomerObservation[];
  auditTrail: SessionAuditEntry[];
};
