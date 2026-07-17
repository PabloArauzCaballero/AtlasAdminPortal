export type RuntimeJobCode =
  | "process-outbox"
  | "process-events"
  | "expire-stale-sessions"
  | "apply-retention-policies"
  | "recalculate-data-quality";

/**
 * Cuerpo aceptado por `POST /operations/jobs/*`.
 *
 * Cada job acepta `dryRun` más un subconjunto propio de estos campos; el
 * catálogo (`runtime-job-catalog.ts`) declara cuáles, y `buildRuntimeJobBody`
 * descarta el resto. No se manda un campo que el job no declara: los schemas
 * del backend validan por job y un campo de más es un 400.
 */
export type RuntimeJobBody = {
  dryRun: boolean;
  limit?: number;
  maxIdleMinutes?: number;
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

export type RuntimeJobField = {
  name: RuntimeJobFieldName;
  label: string;
  hint: string;
  placeholder: string;
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
  fields: readonly RuntimeJobField[];
};
