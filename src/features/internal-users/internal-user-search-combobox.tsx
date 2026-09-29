"use client";

import { useId, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { Field, Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/cn";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { listInternalUsers } from "./services";
import type { InternalUserListItem } from "./types";

/** Cuántas personas se piden por búsqueda. Si hay más, se pide que se acote en vez de cortar. */
export const PERSONAS_POR_BUSQUEDA = 20;

type Persona = Pick<InternalUserListItem, "id" | "fullName" | "email">;

/**
 * Elegir a una persona del equipo interno buscándola en el SERVIDOR.
 *
 * Los dos selectores de persona (la mesa de soporte y el acceso a un archivo) pedían
 * `/internal/users?limit=100` una vez y filtraban en el navegador: con más de cien personas, la que
 * no cabía en esa página no aparecía nunca, y el filtro de «activa» se aplicaba sólo a lo traído.
 * Aquí cada búsqueda viaja con `q` y `status=active`, y si hay más coincidencias de las que se
 * enseñan, se dice.
 *
 * Si la lista no se puede leer (el rol de quien mira no alcanza, el servidor falla) se pinta
 * `fallback`: el campo manual de antes. Nunca se finge que se eligió a alguien.
 */
export function InternalUserSearchCombobox({
  value,
  onChange,
  label,
  tooltip,
  hint,
  excluir,
  fallback,
}: Readonly<{
  value: string;
  onChange: (id: string) => void;
  label: string;
  tooltip: string;
  hint?: string;
  /** Ids que no se ofrecen (p. ej. quien ya atiende en la mesa). */
  excluir?: ReadonlySet<string>;
  fallback: React.ReactNode;
}>) {
  const listId = useId();
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [elegida, setElegida] = useState<Persona | null>(null);
  const q = useDebouncedValue(texto.trim());
  const consulta = {
    q,
    status: "active",
    page: 1,
    limit: PERSONAS_POR_BUSQUEDA,
  };
  const personas = useQuery({
    queryKey: queryKeys.internalUsers(consulta),
    queryFn: () => listInternalUsers(consulta),
    placeholderData: keepPreviousData,
    retry: false,
  });

  if (personas.error) return <>{fallback}</>;

  const opciones = (personas.data?.items ?? []).filter(
    (persona) => !excluir?.has(persona.id),
  );
  const total = personas.data?.meta?.total ?? personas.data?.pagination?.total;
  const hayMas =
    total !== undefined && total > (personas.data?.items.length ?? 0);
  // Si el padre vació el valor (p. ej. tras habilitar), se olvida la elegida.
  const seleccion = value && elegida?.id === value ? elegida : null;

  const elegir = (persona: Persona) => {
    setElegida(persona);
    setTexto("");
    setAbierto(false);
    onChange(persona.id);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setAbierto(true);
      setActivo((i) => Math.min(i + 1, Math.max(opciones.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && abierto && opciones[activo]) {
      event.preventDefault();
      elegir(opciones[activo]);
    } else if (event.key === "Escape") {
      setAbierto(false);
    }
  };

  return (
    <Field
      label={label}
      tooltip={tooltip}
      hint={
        seleccion
          ? `Elegida: ${seleccion.fullName || seleccion.email} (${seleccion.email}).`
          : hint
      }
    >
      <span className="relative block">
        <Input
          role="combobox"
          aria-expanded={abierto}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            abierto && opciones[activo] ? `${listId}-${activo}` : undefined
          }
          autoComplete="off"
          value={texto}
          placeholder={
            seleccion
              ? seleccion.fullName || seleccion.email
              : "Escribe nombre o correo…"
          }
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 120)}
          onKeyDown={onKeyDown}
          onChange={(event) => {
            setTexto(event.target.value);
            setActivo(0);
            setAbierto(true);
          }}
        />
        {abierto ? (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-atlas-border bg-white shadow-card">
            <div
              id={listId}
              role="listbox"
              aria-label={label}
              className="max-h-64 overflow-auto py-1"
            >
              {opciones.map((persona, indice) => (
                <div
                  key={persona.id}
                  tabIndex={-1}
                  id={`${listId}-${indice}`}
                  role="option"
                  aria-selected={persona.id === value}
                  className={cn(
                    "cursor-pointer px-3 py-2 text-sm",
                    indice === activo && "bg-atlas-soft",
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    elegir(persona);
                  }}
                >
                  <span className="block font-medium text-atlas-text">
                    {persona.fullName || persona.email}
                  </span>
                  <span className="block text-xs text-atlas-muted">
                    {persona.email}
                  </span>
                </div>
              ))}
            </div>
            <p className="border-t border-atlas-border px-3 py-1.5 text-xs text-atlas-muted">
              {personas.isLoading
                ? "Buscando…"
                : opciones.length === 0
                  ? "Nadie activo coincide con lo escrito."
                  : hayMas
                    ? `Hay ${total} coincidencias; se muestran ${PERSONAS_POR_BUSQUEDA}. Escribe más para acotar.`
                    : "Sólo cuentas activas."}
            </p>
          </div>
        ) : null}
      </span>
    </Field>
  );
}
