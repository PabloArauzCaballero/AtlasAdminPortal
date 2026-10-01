"use client";

import { Field, Input } from "@/shared/components/ui/input";
import { OptionSelect } from "@/shared/components/ui/option-select";
import type { Option } from "@/shared/lib/options";
import type { ContentActionKind } from "./types";

/** Qué hace el botón del final de la pieza. `""` es «sin botón»: la app no pinta nada. */
const TIPOS: Option[] = [
  { value: "", label: "Sin botón", description: "La pieza no lleva botón." },
  {
    value: "whatsapp",
    label: "Abrir WhatsApp",
    description:
      "Escribes solo el número; el prefijo de Bolivia lo pone el servidor.",
  },
  {
    value: "link",
    label: "Abrir un enlace",
    description: "Una dirección web completa, con https://.",
  },
  {
    value: "screen",
    label: "Ir a una pantalla de la app",
    description: "Lleva a quien lo toca a otra pantalla de la misma app.",
  },
  {
    value: "tour",
    label: "Repetir el recorrido guiado",
    description: "Vuelve a lanzar el recorrido de la pantalla de Inicio.",
  },
];

/** Pantallas de la app a las que un botón puede llevar (rutas de `app/` en `consumer-app`). */
const PANTALLAS: Array<[string, string]> = [
  ["/ayuda", "Ayuda y preguntas frecuentes"],
  ["/preferencias-avisos", "Preferencias de avisos"],
  ["/privacidad", "Privacidad y datos"],
  ["/politica-mora", "Política de mora"],
  ["/soporte", "Soporte (chat)"],
  ["/editar-perfil", "Editar perfil"],
  ["/cambiar-pin", "Cambiar PIN"],
  ["/extracto-bancario", "Extracto bancario"],
];

const AYUDA_DESTINO: Record<string, { placeholder: string; hint: string }> = {
  whatsapp: {
    placeholder: "77377232",
    hint: "Número local de 8 dígitos, sin +591. El enlace lo arma el servidor.",
  },
  link: {
    placeholder: "https://…",
    hint: "La dirección completa que se abre en el navegador.",
  },
  screen: {
    placeholder: "/privacidad",
    hint: "Elige una de la lista o escribe otra ruta de la app.",
  },
  tour: {
    placeholder: "inicio",
    hint: "Nombre del recorrido. Hoy solo existe «inicio».",
  },
};

export function ActionEditor({
  contentKey,
  kind,
  label,
  value,
  onChange,
}: Readonly<{
  contentKey: string;
  kind: ContentActionKind | null;
  label: string;
  value: string;
  onChange: (cambios: {
    actionKind?: ContentActionKind | null;
    actionLabel?: string;
    actionValue?: string;
  }) => void;
}>) {
  const ayuda = kind ? AYUDA_DESTINO[kind] : null;
  return (
    <section className="flex flex-col gap-3" aria-label="Botón de la pieza">
      <Field
        label="Tipo de botón"
        tooltip="Lo que pasa cuando la persona toca el botón al final de la pieza."
      >
        <OptionSelect
          name={`action-kind-${contentKey}`}
          testId={`action-kind-${contentKey}`}
          options={TIPOS}
          value={kind ?? ""}
          onChange={(next) => {
            const nuevo = (next || null) as ContentActionKind | null;
            // Al cambiar de tipo se vacía el destino: un número de WhatsApp no sirve de ruta.
            onChange({
              actionKind: nuevo,
              actionValue: nuevo === "tour" ? "inicio" : "",
              actionLabel: nuevo ? label : "",
            });
          }}
        />
      </Field>
      {kind ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Texto del botón"
            tooltip="Lo que dice el botón. Ejemplo: «Escribir por WhatsApp»."
          >
            <Input
              value={label}
              onChange={(event) =>
                onChange({ actionLabel: event.target.value })
              }
              placeholder="Escribir por WhatsApp"
              data-testid={`action-label-${contentKey}`}
            />
          </Field>
          <Field label="Destino" hint={ayuda?.hint}>
            <Input
              value={value}
              list={kind === "screen" ? `pantallas-${contentKey}` : undefined}
              onChange={(event) =>
                onChange({ actionValue: event.target.value })
              }
              placeholder={ayuda?.placeholder}
              data-testid={`action-value-${contentKey}`}
            />
            {kind === "screen" ? (
              <datalist id={`pantallas-${contentKey}`}>
                {PANTALLAS.map(([ruta, nombre]) => (
                  <option key={ruta} value={ruta}>
                    {nombre}
                  </option>
                ))}
              </datalist>
            ) : null}
          </Field>
        </div>
      ) : null}
    </section>
  );
}
