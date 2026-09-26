/**
 * Enlaces al Motor de Decisión.
 *
 * Existe como módulo y no como una constante repetida porque el portal empieza a tener varios
 * sitios desde los que hay que SALIR al Motor: la ficha de un artefacto, la evaluación de riesgo que
 * él resolvió, la política vigente. Cada copia de la URL base era una oportunidad de que una
 * quedara apuntando a `localhost` en producción.
 *
 * Sin `NEXT_PUBLIC_DECISION_ENGINE_URL` configurada no se pinta ningún enlace: un enlace que lleva a
 * una pantalla que no existe es peor que no ofrecerlo, porque hace dudar de si el dato está mal.
 */
const BASE = (process.env.NEXT_PUBLIC_DECISION_ENGINE_URL ?? "").replace(
  /\/+$/,
  "",
);

export function engineConfigurado(): boolean {
  return BASE.length > 0;
}

export function engineExecutionUrl(executionId: string | null): string | null {
  if (!engineConfigurado() || !executionId) return null;
  return `${BASE}/executions/${encodeURIComponent(executionId)}`;
}

export function engineUrl(path: string): string | null {
  if (!engineConfigurado()) return null;
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
