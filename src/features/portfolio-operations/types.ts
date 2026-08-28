/**
 * Operación de cartera: calificación de riesgo y cierre del bucle de mora.
 *
 * Diez rutas —cuatro de `operations/credit-rating` y tres de `operations/loans`, más las de
 * partners y workflows que viven en sus propias pantallas— que el backend expone precisamente para
 * que la operación pueda forzarlas «tras una incidencia, antes de un cierre», y que ninguna
 * pantalla llamaba: el runbook seguía siendo un `curl` o un acceso a la base.
 */

export type PortfolioGrade = {
  grade: string;
  gradeLabel: string;
  severityRank: number;
  loanCount: number;
  exposureAmount: string;
  provisionAmount: string;
};

export type PortfolioSummary = {
  policy: {
    id: string;
    policyCode: string;
    versionCode: string;
    scaleCode: string;
    contaminationEnabled: boolean;
  };
  grades: PortfolioGrade[];
  totals: {
    loanCount: number;
    exposureAmount: string;
    provisionAmount: string;
  };
};

export type RatingSweepResult = {
  customers?: number;
  rated?: number;
  failed?: number;
  failedCustomerIds?: string[];
  [key: string]: unknown;
};

export type DelinquencySweepResult = {
  evaluated?: number;
  queued?: number;
  [key: string]: unknown;
};

export type OutcomeDispatchResult = {
  dispatched?: number;
  requeued?: number;
  [key: string]: unknown;
};

/** Un desenlace que agotó sus reintentos: el motor nunca supo si acertó al decidir. */
export type ExhaustedOutcome = {
  loanId: string;
  decisionExecutionId: string;
  windowDays: number;
  label: string | null;
  attempts: number;
  lastError: string | null;
  observedAt: string | null;
};

export type ExhaustedOutcomeList = { items: ExhaustedOutcome[] };
