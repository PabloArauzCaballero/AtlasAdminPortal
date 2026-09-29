"use client";

import { InternalUserSearchCombobox } from "@/features/internal-users/internal-user-search-combobox";
import { Field, Input } from "@/shared/components/ui/input";

/**
 * A quién se suma a la mesa, buscado por nombre o correo en el servidor.
 *
 * Antes era un desplegable armado con las 100 primeras cuentas de `/internal/users`, filtradas por
 * «activa» en el navegador: quien no cabía en esas cien no se podía habilitar. Ahora la búsqueda
 * viaja con `q` y `status=active`. Si la lista no se puede leer (el rol de quien mira no alcanza),
 * se vuelve al campo numérico en vez de dejar la pantalla sin forma de habilitar a nadie.
 *
 * Quien ya tiene perfil activo queda fuera: habilitarlo otra vez no cambia nada. Un perfil dado
 * de baja sí aparece, porque volver a habilitarlo lo reactiva.
 */
export function SelectorUsuarioInterno({
  value,
  onChange,
  yaEnLaMesa,
}: Readonly<{
  value: string;
  onChange: (valor: string) => void;
  yaEnLaMesa: ReadonlySet<string>;
}>) {
  return (
    <InternalUserSearchCombobox
      value={value}
      onChange={onChange}
      excluir={yaEnLaMesa}
      label="Persona"
      tooltip="Usuario del equipo interno que va a atender casos y conversaciones de soporte; búscalo por nombre o correo."
      hint="Sólo cuentas activas que todavía no atienden en la mesa."
      fallback={
        <Field
          label="Número de usuario interno"
          tooltip="Número del usuario interno que va a atender; lo ves en la ficha de Usuarios internos."
          hint="No se pudo cargar la lista del equipo: escribe su número."
        >
          <Input
            value={value}
            inputMode="numeric"
            placeholder="Ej: 3"
            onChange={(event) => onChange(event.target.value)}
          />
        </Field>
      }
    />
  );
}
