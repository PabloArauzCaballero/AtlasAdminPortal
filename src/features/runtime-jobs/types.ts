export type RuntimeJobCode =
  | "process-outbox"
  | "process-events"
  | "expire-stale-sessions"
  | "apply-retention-policies"
  | "recalculate-data-quality"
  | "retry-stuck-notifications"
  | "deliver-pending-notifications"
  | "reclaim-stuck-events"
  | "purge-idempotency-keys"
  | "purge-processed-outbox"
  | "mark-abandoned-onboardings";

/**
 * Cuerpo aceptado por `POST /operations/jobs/*`.
 *
 * Cada job acepta `dryRun` más un subconjunto propio de estos campos; el
 * catálogo (`runtime-job-catalog.ts`) declara cuáles, y `buildRuntimeJobBody`
 * descarta el resto. No se manda un campo que el job no declara: los schemas
 * del backend validan por job y un campo de más es un 400.
 */
export type RuntimeJobBody = {
  /**
   * Opcional porque no todos los jobs lo aceptan: el cierre de onboardings
   * abandonados valida su cuerpo en modo estricto y un `dryRun` de más es un
   * 400. El catálogo lo declara con `supportsDryRun`.
   */
  dryRun?: boolean;
  limit?: number;
  maxIdleMinutes?: number;
  olderThanMinutes?: number;
  olderThanDays?: number;
  retentionDays?: number;
  policyCode?: string;
  customerId?: string;
};

/**
 * Envoltorio común de `runJob` en el backend. `result` cambia por job, así que
 * queda `unknown` y se muestra con `JsonViewer` en vez de inventar un tipo por
 * job que el backend no garantiza.
 */
export type RuntimeJobRun = {
  jobRunId: string;
  status: string;
  result: unknown;
};

export type RuntimeJobFieldName = Exclude<keyof RuntimeJobBody, "dryRun">;

/** Campos numéricos: su rango lo fija el schema del backend, job por job. */
export type RuntimeJobNumericField = Extract<
  RuntimeJobFieldName,
  | "limit"
  | "maxIdleMinutes"
  | "olderThanMinutes"
  | "olderThanDays"
  | "retentionDays"
>;

export type RuntimeJobField = {
  name: RuntimeJobFieldName;
  label: string;
  hint: string;
  placeholder: string;
  /**
   * Rango aceptado por ESTE job. No es global: el backend admite 500 mensajes
   * de outbox pero 10 000 claves de idempotencia, y validar todo con el tope
   * más estricto bloquea en el formulario una ejecución que el backend acepta.
   */
  min?: number;
  max?: number;
  options?: readonly string[];
};

export type RuntimeJobDefinition = {
  code: RuntimeJobCode;
  title: string;
  /** Qué hace a nivel técnico. */
  systems: string;
  /** Qué problema de negocio resuelve. */
  business: string;
  /**
   * `true` cuando ejecutar en real (`dryRun: false`) borra o anonimiza datos.
   * Obliga a la doble confirmación tecleada.
   */
  destructive: boolean;
  /**
   * Ruta completa cuando el job NO cuelga de `/operations/jobs`. El cierre de
   * onboardings abandonados vive en el módulo de onboarding porque su regla de
   * negocio es de ahí, no del planificador.
   */
  path?: string;
  /** `false` cuando el backend rechaza `dryRun` en el cuerpo. Por defecto, `true`. */
  supportsDryRun?: boolean;
  fields: readonly RuntimeJobField[];
};
