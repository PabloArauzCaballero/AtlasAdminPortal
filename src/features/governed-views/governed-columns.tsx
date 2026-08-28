import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/shared/components/ui/badges";
import { formatBoolean, formatDateTime, formatNumber } from "@/shared/lib/format";
import { FIELD_LABELS, type GovernedViewRow } from "./types";

/**
 * Las columnas se derivan de la RESPUESTA, no de una lista fija.
 *
 * El endpoint proyecta campos a la carta y devuelve en `meta.selectedFields` cuáles trae. Fijar la
 * lista en el frontend haría que un campo nuevo del backend no apareciera nunca, y que uno retirado
 * dejara una columna vacía sin que nada lo explicara.
 */
export function buildGovernedColumns(
  fields: string[],
): ColumnDef<GovernedViewRow>[] {
  return fields.map((field) => ({
    accessorKey: field,
    header: FIELD_LABELS[field] ?? humanizar(field),
    cell: ({ row }) => renderValue(field, row.original[field]),
  }));
}

/** Un nombre técnico sin traducción se enseña legible, no se esconde. */
function humanizar(field: string): string {
  const separado = field.replace(/([A-Z])/g, " $1").toLowerCase().trim();
  return separado.charAt(0).toUpperCase() + separado.slice(1);
}

function renderValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return formatBoolean(value);
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);

  const texto = String(value);
  /* Las fechas vienen en ISO; se muestran como fecha para no obligar a leer una marca de tiempo. */
  if (/(At|Date)$/.test(field) && /^\d{4}-\d{2}-\d{2}/.test(texto)) {
    return formatDateTime(texto);
  }
  if (/(Count|Ms|Score)$/.test(field) && typeof value === "number") {
    return formatNumber(value);
  }
  /* Estado, banda y decisión son los tres campos que se leen de un vistazo por su color. */
  if (/^(status|lifecycleStatus|healthStatus|providerStatus|decision|latestRiskDecision|riskBand|latestRiskBand|severity|priority|reviewStatus|riskLevel)$/.test(field)) {
    return <StatusBadge value={texto} />;
  }
  return texto;
}
