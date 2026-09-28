"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { useVisibilidad } from "./hooks";
import { listarPersonasInternas } from "./services";

/** El permiso que exige `GET /internal/users`. Sin él se cae al identificador escrito a mano. */
const PERMISO_DE_PERSONAS = "internal.users.read";

/**
 * Elegir a la persona interna que recibe el acceso.
 *
 * Con permiso para ver el personal, un desplegable con nombre y correo; sin él, el campo de
 * identificador de antes, pero diciendo de dónde sacarlo. Nunca se inventa la lista: si no se
 * puede pedir, no se finge que se eligió a alguien.
 */
export function SelectorDePersona({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (valor: string) => void }>) {
  const manual = (
    <Field
      label="Identificador de la persona"
      tooltip="El número de usuario interno. Lo ve quien administra el personal, en la ficha de cada persona."
    >
      <Input
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        placeholder="Por ejemplo, 128"
      />
    </Field>
  );
  return (
    <PermissionGate permissions={[PERMISO_DE_PERSONAS]} fallback={manual}>
      <ListaDePersonas value={value} onChange={onChange} manual={manual} />
    </PermissionGate>
  );
}

function ListaDePersonas({
  value,
  onChange,
  manual,
}: Readonly<{
  value: string;
  onChange: (valor: string) => void;
  manual: React.ReactNode;
}>) {
  const personas = useQuery({
    queryKey: queryKeys.internalUsers({ limit: 100 }),
    queryFn: listarPersonasInternas,
  });

  if (personas.isLoading)
    return <p className="text-sm text-slate-500">Cargando personas…</p>;
  const elegibles = (personas.data?.items ?? []).filter(
    // Una cuenta dada de baja no puede entrar: darle acceso sólo ensucia la lista.
    (persona) => persona.status !== "disabled",
  );
  if (personas.error || elegibles.length === 0) return <>{manual}</>;

  return (
    <Field
      label="Persona"
      tooltip="Sólo esta persona recibe el acceso; el resto de su rol sigue como estaba."
    >
      <Select
        name="principalId"
        value={value}
        onChange={onChange}
        placeholder="Elige a una persona"
        options={elegibles.map((persona) => ({
          value: persona.id,
          label: persona.fullName,
          description: persona.email, // sin-ayuda: el correo identifica a la persona, no es una definición
        }))}
      />
    </Field>
  );
}

/**
 * El nombre de quien recibió una concesión, para no enseñar un identificador suelto.
 *
 * Sale de «quién lo ve» (`listarVisibilidad`), que ya trae el nombre de toda persona con acceso
 * —incluidas las que lo tienen por concesión directa— y no exige permiso sobre el personal.
 */
export function useNombresDePersonas(
  expedienteId: string,
  nodoId: string | null,
): (principalId: string) => string | null {
  const visibilidad = useVisibilidad(expedienteId, nodoId);
  const nombres = new Map(
    (visibilidad.data ?? []).map((espectador) => [
      espectador.internalUserId,
      espectador.nombre,
    ]),
  );
  return (principalId) => nombres.get(principalId) ?? null;
}
