"use client";

import { Field, Input, Select } from "@/shared/components/ui/input";
import type { Option } from "@/shared/lib/options";
import { useInternalUsersForDesk } from "./hooks";

/**
 * A quién se suma a la mesa, elegido por nombre.
 *
 * Antes era un campo para teclear el número interno del usuario, que nadie sabe de memoria. Si la
 * lista de usuarios no se puede leer (el rol de quien mira no alcanza), se vuelve al campo numérico
 * en vez de dejar la pantalla sin forma de habilitar a nadie.
 *
 * Sólo salen usuarios activos, y quien ya tiene perfil activo queda fuera: habilitarlo otra vez no
 * cambia nada. Un perfil dado de baja sí aparece, porque volver a habilitarlo lo reactiva.
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
  const usuarios = useInternalUsersForDesk();

  if (usuarios.data) {
    const opciones: Option[] = usuarios.data.items
      .filter(
        (usuario) => usuario.status === "active" && !yaEnLaMesa.has(usuario.id),
      )
      .map((usuario) => ({
        value: usuario.id,
        label: usuario.fullName || usuario.email,
        description: `Correo ${usuario.email}`,
      }));
    return (
      <Field
        label="Persona"
        tooltip="Usuario del equipo interno que va a atender casos y conversaciones de soporte."
        hint="Sólo usuarios activos que todavía no atienden en la mesa."
      >
        <Select
          name="usuario-interno"
          placeholder="Elegir…"
          options={opciones}
          value={value}
          onChange={onChange}
        />
      </Field>
    );
  }

  return (
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
  );
}
