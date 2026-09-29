import type { Option } from "@/shared/lib/options";
import type { QaTemplateSummary } from "./types";

export const TEMPLATE_STATUS_OPTIONS: Option[] = [
  {
    value: "READY",
    label: "Lista",
    description: "Se puede previsualizar y ejecutar ahora mismo.",
  },
  {
    value: "BLOCKED",
    label: "Bloqueada",
    description: "Le falta algo del entorno; la fila dice qué.",
  },
  {
    value: "DRAFT",
    label: "Borrador",
    description: "Receta todavía en preparación: se ve, no se ejecuta.",
  },
];

/**
 * El catálogo de recetas vive en el código del servidor y llega ENTERO en una sola respuesta (son
 * unas pocas decenas y no crece con los datos), así que se filtra aquí sobre la lista completa.
 */
export function filterTemplates(
  templates: readonly QaTemplateSummary[],
  q: string,
  status: string,
): QaTemplateSummary[] {
  const needle = q.trim().toLowerCase();
  return templates.filter((template) => {
    if (status && template.status !== status) return false;
    if (!needle) return true;
    return [
      template.name,
      template.code,
      template.description,
      template.workflowCode,
      template.expectedTerminal,
    ].some((text) => text.toLowerCase().includes(needle));
  });
}
