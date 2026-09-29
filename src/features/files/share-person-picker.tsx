"use client";

import { InternalUserSearchCombobox } from "@/features/internal-users/internal-user-search-combobox";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Field, Input } from "@/shared/components/ui/input";
import { useVisibilidad } from "./hooks";

/** El permiso que exige `GET /internal/users`. Sin él se cae al identificador escrito a mano. */
const PERMISO_DE_PERSONAS = "internal.users.read";

/**
 * Elegir a la persona interna que recibe el acceso.
 *
 * Con permiso para ver el personal, un buscador que pregunta al SERVIDOR por nombre o correo
 * (sólo cuentas activas: una cuenta suspendida o dada de baja no puede entrar, y darle acceso sólo
 * ensucia la lista); sin él, el campo de identificador de antes, pero diciendo de dónde sacarlo.
 * Nunca se inventa la lista: si no se puede pedir, no se finge que se eligió a alguien.
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
      <InternalUserSearchCombobox
        value={value}
        onChange={onChange}
        label="Persona"
        tooltip="Sólo esta persona recibe el acceso; el resto de su rol sigue como estaba. Búscala por nombre o correo."
        hint="Sólo cuentas activas."
        fallback={manual}
      />
    </PermissionGate>
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
