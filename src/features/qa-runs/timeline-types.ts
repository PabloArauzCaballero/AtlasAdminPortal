/** Tramo de la línea de tiempo de una corrida: carga y latencia de los intentos que terminaron en él. */
export type QaRunTimelineBucket = {
  t: string;
  requests: number;
  errors: number;
  p50Ms: number | null;
  p95Ms: number | null;
  maxMs: number | null;
  personasActive: number;
};

export type QaRunTimeline = {
  runId: string;
  bucketSeconds: number;
  startedAt: string | null;
  buckets: QaRunTimelineBucket[];
  totals: {
    requests: number;
    errors: number;
    p50Ms: number | null;
    p95Ms: number | null;
    rps: number | null;
  };
};
