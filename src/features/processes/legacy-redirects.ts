/**
 * Adónde llevan las rutas que la fusión de «Procesos ×3» retiró (2026-09-29). Funciones puras para
 * poder probarlas sin montar el App Router: las páginas viejas sólo llaman a `redirect()` con esto.
 */
type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * `/internal/flows/business` era «Procesos de negocio»: el mismo catálogo que Procesos, leído del
 * volcado. Con `?flow=X` abría la ficha técnica de ese flujo, que sigue existiendo en el mapa de
 * rutas; sin él, la lista de procesos.
 */
export function businessFlowsRedirect(params: SearchParams): string {
  const flow = first(params.flow);
  return flow
    ? `/internal/flows?flow=${encodeURIComponent(flow)}`
    : "/internal/procesos";
}

/** `/internal/procesos/[code]/instancias` es ahora la pestaña «Casos en curso» de la ficha. */
export function processInstancesRedirect(
  code: string,
  params: SearchParams,
): string {
  const next = new URLSearchParams({ tab: "casos" });
  const caso = first(params.caso);
  if (caso) next.set("caso", caso);
  return `/internal/procesos/${encodeURIComponent(code)}?${next.toString()}`;
}
