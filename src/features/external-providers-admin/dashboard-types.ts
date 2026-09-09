// --- Tablero de actividad y listado de solicitudes --------------------------

/**
 * Los reportes de esta pantalla se tipaban como `Record<string, unknown>` y se pintaban como un
 * bloque de JSON, con el argumento de que son «diagnósticos sin DTO estable». En la práctica el
 * backend los construye con una forma FIJA en `external-data-governance.service.ts`, así que lo
 * único que faltaba era escribirla. Con la forma escrita se pueden pintar como tablas.
 */

export type HealthPoint = {
  status: string;
  latencyMs: number;
  checkedAt: string;
};

export type ProviderActivity = {
  total: number;
  success: number;
  failed: number;
  blocked: number;
  cached: number;
  /** `null` = no hubo llamadas. NO es 0 %: «nadie le llamó» y «todo falló» no se pintan igual. */
  successRate: number | null;
  p95LatencyMs: number | null;
  avgLatencyMs: number | null;
  estimatedCost: number;
  actualCost: number;
  lastRequestAt: string | null;
  lastErrorStatus: string | null;
  lastErrorMessage: string | null;
};

export type DashboardProvider = {
  providerCode: string;
  name: string | null;
  category: string | null;
  status: string;
  mode: string;
  isCostly: boolean;
  requiresManualApproval: boolean;
  health:
    | (HealthPoint & {
        modeChecked: string;
        errorCode: string | null;
        errorMessageSafe: string | null;
      })
    | null;
  healthSeries: HealthPoint[];
  activity: ProviderActivity;
};

export type ProviderRequestRow = {
  requestId: string;
  providerCode: string | null;
  customerId: string | null;
  requestType: string | null;
  purposeCode: string | null;
  decisionStage: string | null;
  modeUsed: string | null;
  responseStatus: string | null;
  responseCode: string | null;
  approvalStatus: string | null;
  latencyMs: number | null;
  estimatedCostAmount: number | null;
  actualCostAmount: number | null;
  currency: string | null;
  errorMessageSafe: string | null;
  requestedAt: string | null;
  respondedAt: string | null;
};

export type ProvidersDashboard = {
  generatedAt: string;
  days: number;
  windowFrom: string;
  totals: {
    providers: number;
    respondingProviders: number;
    unmeasuredProviders: number;
    totalCalls: number;
    successCalls: number;
    failedCalls: number;
    blockedCalls: number;
    successRate: number | null;
    worstP95LatencyMs: number | null;
    estimatedCost: number;
    actualCost: number;
  };
  providers: DashboardProvider[];
  recentRequests: ProviderRequestRow[];
};

export type ProviderRequestsPage = {
  generatedAt: string;
  total: number;
  limit: number;
  offset: number;
  requests: ProviderRequestRow[];
};
