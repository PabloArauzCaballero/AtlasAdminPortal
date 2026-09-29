"use client";

import type { ActionLogFilterField } from "@/features/systems/types";
import {
  FilterBar,
  type FilterOption,
} from "@/shared/components/data-table/filter-bar";
import { Field, Input } from "@/shared/components/ui/input";
import { aplicarFiltro, type AuditFilterState } from "./audit-filters";

/** Controles que caben en la barra: un desplegable por campo. */
const DESPLEGABLES = new Set(["select", "boolean", "combobox"]);

/** Ayuda por defecto de los campos que el catálogo publica sin `help`. */
const AYUDA_POR_CONTROL: Record<string, string> = {
  "date-range": "Fecha del día que quieres ver; se toma el día completo.",
  number: "Código de respuesta exacto, por ejemplo 500 o 403.",
  text: "Valor exacto tal como aparece en el detalle de un evento.",
};

/** Los campos de desplegable, listos para `FilterBar`. */
export function filtrosDeBarra(
  campos: ActionLogFilterField[],
  estado: AuditFilterState,
): FilterOption[] {
  return campos
    .filter((campo) => DESPLEGABLES.has(campo.control))
    .map((campo) => ({
      name: campo.name,
      label: campo.label,
      value: estado[campo.name] ?? "",
      tooltip: campo.help,
      options: campo.options.map((opcion) => ({
        value: opcion.value,
        label: opcion.label,
      })),
    }));
}

/**
 * Qué campo va en el buscador de la barra. Con un servidor que publica `q` (búsqueda libre por ruta y
 * rol, desde el 2026-09-29) es ése, y el Request ID pasa a los campos de abajo; con uno anterior, el
 * buscador sigue siendo el Request ID exacto.
 */
export function campoBuscador(
  campos: ActionLogFilterField[],
): "q" | "requestId" {
  return campos.some((campo) => campo.name === "q") ? "q" : "requestId";
}

/** Los campos que se escriben (fechas, código, identificadores), salvo el del buscador. */
export function camposLibres(
  campos: ActionLogFilterField[],
): ActionLogFilterField[] {
  const buscador = campoBuscador(campos);
  return campos.filter(
    (campo) => !DESPLEGABLES.has(campo.control) && campo.name !== buscador,
  );
}

/**
 * La barra de filtros de la auditoría, construida desde el catálogo que publica el servidor.
 *
 * Los conjuntos (método, riesgo, módulo, tipo de actor, datos personales) van como desplegables en
 * la barra; fechas, código de respuesta e identificadores, como campos debajo. El buscador busca en
 * la ruta y en el rol del actor (`q`), o en el Request ID si el servidor todavía no publica `q`.
 */
export function AuditFilterPanel({
  campos,
  estado,
  onChange,
  onClear,
}: Readonly<{
  campos: ActionLogFilterField[];
  estado: AuditFilterState;
  onChange: (siguiente: AuditFilterState) => void;
  onClear: () => void;
}>) {
  const set = (nombre: string, valor: string) =>
    onChange(aplicarFiltro(estado, nombre, valor));
  const libres = camposLibres(campos);
  const buscador = campoBuscador(campos);

  return (
    <div className="mb-4 space-y-3">
      <FilterBar
        search={estado[buscador] ?? ""}
        searchPlaceholder={
          buscador === "q"
            ? "Buscar por ruta o rol de quien la hizo…"
            : "Filtrar por código de referencia…"
        }
        searchTooltip={
          buscador === "q"
            ? "Busca, sin distinguir mayúsculas, en la dirección de la operación (sin datos sensibles) y en el rol de quien la hizo."
            : "Código de una solicitud concreta; aparece en cualquier mensaje de error del portal."
        }
        filters={filtrosDeBarra(campos, estado)}
        onSearchChange={(valor) => set(buscador, valor)}
        onFilterChange={set}
        onClear={onClear}
      />
      {libres.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-atlas-border bg-white p-3 sm:grid-cols-2 xl:grid-cols-4">
          {libres.map((campo) => (
            <Field
              key={campo.name}
              label={campo.label}
              tooltip={
                campo.help ??
                AYUDA_POR_CONTROL[campo.control] ??
                AYUDA_POR_CONTROL.text
              }
            >
              <Input
                name={campo.name}
                value={estado[campo.name] ?? ""}
                type={
                  campo.control === "date-range"
                    ? "date"
                    : campo.control === "number"
                      ? "number"
                      : "text"
                }
                inputMode={campo.control === "number" ? "numeric" : undefined}
                min={campo.control === "number" ? 100 : undefined}
                max={campo.control === "number" ? 599 : undefined}
                placeholder={
                  campo.control === "text" ? "Cualquiera" : undefined
                }
                onChange={(event) => set(campo.name, event.target.value)}
              />
            </Field>
          ))}
        </div>
      ) : null}
    </div>
  );
}
