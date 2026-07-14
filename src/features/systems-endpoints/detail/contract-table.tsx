"use client";

import type { JsonRecord } from "@/shared/api/types";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { safeText } from "@/shared/lib/format";

export function ContractTable({
  title,
  value,
}: Readonly<{ title: string; value: unknown }>) {
  const rows = toRows(value);
  return (
    <Card className="overflow-hidden shadow-subtle">
      <CardHeader className="bg-slate-50/70">
        <h3 className="text-sm font-semibold text-atlas-text">{title}</h3>
        <p className="mt-1 text-xs text-atlas-muted">
          Contrato interpretado desde la metadata registrada en el catálogo.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length > 0 ? <RowsTable rows={rows} /> : <EmptyContract />}
      </CardContent>
    </Card>
  );
}

function RowsTable({ rows }: Readonly<{ rows: ContractRow[] }>) {
  return (
    <div className="atlas-table-scroll">
      <table className="min-w-full text-sm">
        <thead className="bg-white text-xs uppercase tracking-wide text-atlas-muted">
          <tr>
            <th className="border-b border-atlas-border px-4 py-3 text-left">
              Campo
            </th>
            <th className="border-b border-atlas-border px-4 py-3 text-left">
              Tipo / valor
            </th>
            <th className="border-b border-atlas-border px-4 py-3 text-left">
              Descripción
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.name} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-xs text-atlas-text">
                {safeText(row.name)}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-atlas-text">
                  {safeText(row.type)}
                </span>
              </td>
              <td className="max-w-xl px-4 py-3 text-sm text-atlas-muted">
                {safeText(row.description)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyContract() {
  return (
    <div className="p-5">
      <div className="rounded-xl border border-dashed border-atlas-border bg-slate-50 p-4 text-sm text-atlas-muted">
        Contrato pendiente. Revisa la seed de payloads, respuestas esperadas o
        el proceso de descubrimiento de endpoints.
      </div>
    </div>
  );
}

type ContractRow = { name: string; type: string; description: string };

function toRows(value: unknown): ContractRow[] {
  const resolved =
    typeof value === "string" ? tryParseJsonString(value) : value;
  if (!resolved) return [];
  if (Array.isArray(resolved)) return resolved.map(rowFromUnknown);
  if (isRecord(resolved)) return rowsFromRecord(resolved);
  return [
    { name: "valor", type: typeof resolved, description: String(resolved) },
  ];
}

/**
 * Some backend responses serialize JSONB schema columns as a JSON-encoded
 * string instead of a parsed object depending on the query path. Without
 * this, contract tables silently render as empty even with real data.
 */
function tryParseJsonString(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function rowsFromRecord(record: JsonRecord): ContractRow[] {
  const properties = isRecord(record.properties) ? record.properties : record;
  return Object.entries(properties).map(([name, value]) => ({
    name,
    type: resolveType(value),
    description: resolveDescription(value),
  }));
}

function rowFromUnknown(value: unknown, index: number): ContractRow {
  if (!isRecord(value)) {
    return {
      name: String(index + 1),
      type: typeof value,
      description: String(value),
    };
  }
  return {
    name: String(value.name ?? value.field ?? value.key ?? index + 1),
    type: resolveType(value),
    description: resolveDescription(value),
  };
}

function resolveType(value: unknown): string {
  if (!isRecord(value)) return typeof value;
  const type = value.type ?? value.dataType ?? value.format ?? value.statusCode;
  if (Array.isArray(type)) return type.join(" | ");
  return typeof type === "string" || typeof type === "number"
    ? String(type)
    : "object";
}

function resolveDescription(value: unknown): string {
  if (!isRecord(value)) return String(value);
  const description =
    value.description ?? value.businessDescription ?? value.summary;
  return typeof description === "string" ? description : "—";
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
