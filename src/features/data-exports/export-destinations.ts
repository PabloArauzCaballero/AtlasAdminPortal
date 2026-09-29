/**
 * A dónde lleva cada catálogo exportable ahora que no hay pantalla «Exportaciones»: a la pantalla
 * que tiene su botón «Descargar JSON». Lo usa la redirección de `/internal/exports/[exportId]`.
 */
export const EXPORT_DESTINATIONS: Record<string, string> = {
  "export-endpoint-catalog": "/internal/systems/endpoints",
  "export-data-catalog": "/internal/data-catalog/tables",
  "export-data-quality": "/internal/data-quality/rules",
};

export const EXPORTS_FALLBACK = "/internal/data-catalog/tables";

export function exportDestination(exportId: string): string {
  return EXPORT_DESTINATIONS[decodeURIComponent(exportId)] ?? EXPORTS_FALLBACK;
}
