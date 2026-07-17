"use client";

import { Button } from "@/shared/components/ui/button";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { eventTypeOptions } from "./source-table-labels";
import type { CustomerAuditEventType } from "./types";

export type CustomerAuditFiltersValue = {
  eventType: CustomerAuditEventType;
  /** Valores de `datetime-local` ("2026-07-17T10:30"), no ISO. */
  from: string;
  to: string;
};

/**
 * No se usa `FilterBar` acá: este endpoint no acepta búsqueda libre (su caja de
 * texto quedaría muerta) y sí necesita dos campos de fecha-hora, que `FilterBar`
 * no soporta. Se arma con las mismas primitivas del kit que usa `FilterBar`.
 */
export function CustomerAuditFilters({
  value,
  onChange,
  onClear,
}: Readonly<{
  value: CustomerAuditFiltersValue;
  onChange: (next: CustomerAuditFiltersValue) => void;
  onClear: () => void;
}>) {
  return (
    <div className="mb-4 grid gap-3 rounded-lg border border-atlas-border bg-white p-3 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
      <Field label="Tipo de evento">
        <Select
          value={value.eventType}
          onChange={(event) =>
            onChange({
              ...value,
              eventType: event.target.value as CustomerAuditEventType,
            })
          }
        >
          <option value="all">Todos</option>
          {eventTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Desde">
        <Input
          type="datetime-local"
          value={value.from}
          onChange={(event) => onChange({ ...value, from: event.target.value })}
        />
      </Field>
      <Field label="Hasta">
        <Input
          type="datetime-local"
          value={value.to}
          onChange={(event) => onChange({ ...value, to: event.target.value })}
        />
      </Field>
      <Button variant="secondary" className="lg:mb-0" onClick={onClear}>
        Limpiar
      </Button>
    </div>
  );
}

/**
 * `datetime-local` entrega hora local sin zona; el backend exige ISO 8601 con
 * offset (`z.string().datetime()`). Un valor inválido se descarta en vez de
 * mandar basura que el backend rechazaría con 400.
 */
export function toIsoDateTime(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}
