/**
 * Calificación de cartera y salud de la entrega de desenlaces.
 *
 * ## Lo que se quedó y lo que se fue
 *
 * La pantalla reunía seis botones de runbook: recalificar, recalcular mora (con opción de barrer
 * TODOS los inquilinos), entregar desenlaces al Motor, y la lista de desenlaces agotados. Tres de
 * ellos eran la ÚNICA forma de que esas cosas ocurrieran.
 *
 * - **La calificación** (categoría de riesgo y previsión) es contable y es de Atlas: se queda, y
 *   además corre sola (`sweep_debt_ratings`). El botón es para adelantarse a un cierre.
 * - **La mora** ya corría sola (`sweep_loan_delinquency`); el botón aquí sólo duplicaba al job.
 * - **Los desenlaces** son la medida del acierto del Motor. Entregarlos es integración y lo hace
 *   el job `dispatch_loan_outcomes`; medirlos es del Motor (`/decision-quality`). Aquí queda lo
 *   que un operador necesita: saber si la entrega va al día, y dónde mirar lo entregado.
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

/** Cómo va la entrega de desenlaces al Motor, tal y como la resume `GET /operations/loans/outcome-status`. */
export type OutcomeDeliveryStatus = {
  pending: number;
  retrying: number;
  exhausted: number;
  sent: number;
  oldestPendingObservedAt: string | null;
  lastSentAt: string | null;
  /** `false` si falta la credencial del plano de gestión: el job no puede entregar nada. */
  configured: boolean;
  maxAttempts: number;
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
