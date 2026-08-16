"use client";

import { FilterX } from "lucide-react";
import type { ActionLogFilterField } from "@/features/systems/types";
import { Button } from "@/shared/components/ui/button";
import { Input, Select } from "@/shared/components/ui/input";
import { aplicarFiltro, type AuditFilterState } from "./audit-filters";

/**
 * La barra de filtros de la auditoría, construida desde el CATÁLOGO.
 *
 * **Qué arregla.** La versión anterior tenía sus opciones escritas a mano —cinco
 * métodos y cuatro niveles de riesgo, en un array de React— mientras el endpoint
 * aceptaba once filtros. Ocho de ellos no existían para quien usaba el portal, y
 * las opciones copiadas podían separarse del esquema sin que nada fallara hasta
 * que alguien filtrara y recibiera un 400.
 *
 * **Y el control lo decide el dato, no el gusto.** Cada campo llega diciendo qué
 * necesita: conjunto cerrado → `select`; conjunto abierto → lista de sugerencias
 * que además admite escribir un valor todavía no visto; fecha → selector de
 * fecha. Es la regla que impide volver a poner un cuadro de texto libre donde
 * conceptualmente hay un catálogo.
 */
export function AuditFilterBar({
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
  const activos = Object.keys(estado).length;
  const set = (nombre: string, valor: string) =>
    onChange(aplicarFiltro(estado, nombre, valor));

  return (
    <div className="mb-4 rounded-xl border border-atlas-border bg-white p-3 shadow-subtle">
      {/*
       * Rejilla que envuelve, no una fila. Once filtros no caben en línea ni en
       * 1440 px; con `flex-nowrap` los últimos quedaban fuera de la vista sin
       * nada que insinuara que estaban ahí.
       */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {campos.map((campo) => (
          <CampoDeFiltro
            key={campo.name}
            campo={campo}
            valor={estado[campo.name] ?? ""}
            onChange={(valor) => set(campo.name, valor)}
          />
        ))}
      </div>

      {activos > 0 ? (
        <div className="mt-3 flex items-center gap-3 border-t border-atlas-border pt-3">
          <p className="text-xs text-atlas-muted" aria-live="polite">
            {activos} filtro{activos === 1 ? "" : "s"} aplicado
            {activos === 1 ? "" : "s"}
          </p>
          <Button variant="ghost" onClick={onClear}>
            <FilterX className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Limpiar filtros
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function CampoDeFiltro({
  campo,
  valor,
  onChange,
}: Readonly<{
  campo: ActionLogFilterField;
  valor: string;
  onChange: (valor: string) => void;
}>) {
  const id = `audit-filtro-${campo.name}`;
  const ayudaId = campo.help ? `${id}-ayuda` : undefined;

  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium text-atlas-text"
      >
        {campo.label}
      </label>
      <Control
        id={id}
        campo={campo}
        valor={valor}
        ayudaId={ayudaId}
        onChange={onChange}
      />
      {campo.help ? (
        <p id={ayudaId} className="mt-1 text-[0.6875rem] leading-4 text-atlas-muted">
          {campo.help}
        </p>
      ) : null}
    </div>
  );
}

function Control({
  id,
  campo,
  valor,
  ayudaId,
  onChange,
}: Readonly<{
  id: string;
  campo: ActionLogFilterField;
  valor: string;
  ayudaId?: string;
  onChange: (valor: string) => void;
}>) {
  const comun = {
    id,
    value: valor,
    "aria-describedby": ayudaId,
    className: "w-full",
  };

  if (campo.control === "select" || campo.control === "boolean") {
    return (
      <Select {...comun} onChange={(event) => onChange(event.target.value)}>
        <option value="">Cualquiera</option>
        {campo.options.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>
            {opcion.label}
          </option>
        ))}
      </Select>
    );
  }

  if (campo.control === "combobox") {
    /*
     * Lista de sugerencias y no un `select` cerrado: estos valores salen de lo
     * que HAY en la bitácora, y lo que todavía no ha ocurrido no aparece. Con un
     * select estricto, filtrar por un módulo recién desplegado sería imposible
     * hasta que alguien lo usara — y quien lo intentara no tendría forma de
     * saber por qué no está.
     */
    return (
      <>
        <Input
          {...comun}
          list={`${id}-opciones`}
          placeholder={
            campo.options.length > 0 ? "Cualquiera" : "Sin valores registrados"
          }
          onChange={(event) => onChange(event.target.value)}
        />
        <datalist id={`${id}-opciones`}>
          {campo.options.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </datalist>
      </>
    );
  }

  if (campo.control === "date-range") {
    return (
      <Input
        {...comun}
        type="date"
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (campo.control === "number") {
    return (
      <Input
        {...comun}
        type="number"
        inputMode="numeric"
        min={100}
        max={599}
        placeholder="p. ej. 500"
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <Input
      {...comun}
      placeholder="Cualquiera"
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
