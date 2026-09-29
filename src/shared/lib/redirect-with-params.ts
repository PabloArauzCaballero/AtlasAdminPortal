/**
 * La URL de destino de una ruta retirada, con TODOS sus parámetros.
 *
 * Una pantalla fusionada deja su ruta vieja como redirección: un marcador o un enlace profundo
 * (`/internal/lineage/impact?q=loans`) tiene que llegar a la misma búsqueda en la pantalla nueva, no
 * a la pantalla vacía. `forced` fija la pestaña de destino y gana sobre lo que trajera la URL.
 */
export function redirectWithParams(
  target: string,
  current: Record<string, string | string[] | undefined>,
  forced: Record<string, string> = {},
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (key in forced || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value])
      params.append(key, item);
  }
  for (const [key, value] of Object.entries(forced)) params.set(key, value);
  const query = params.toString();
  return query ? `${target}?${query}` : target;
}

export type RouteSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;
