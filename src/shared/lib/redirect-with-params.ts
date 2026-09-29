import {
  redirectTarget,
  type RedirectSearchParams,
} from "@/shared/lib/redirect-target";

/**
 * Como `redirectTarget` (parámetros de la ruta vieja intactos), más la pestaña de destino: la
 * pantalla fusionada abre en la vista que sustituye a la ruta vieja. `forced` gana sobre lo que
 * trajera la URL (`/internal/lineage/impact?vista=x` sigue llevando a `?vista=impacto`).
 */
export function redirectWithParams(
  target: string,
  current: RedirectSearchParams,
  forced: Record<string, string> = {},
): string {
  const kept = Object.fromEntries(
    Object.entries(current).filter(([key]) => !(key in forced)),
  );
  return redirectTarget(target, { ...kept, ...forced });
}

export type RouteSearchParams = Promise<RedirectSearchParams>;
