"use client";

import { Minus, Plus } from "lucide-react";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { ActionEditor } from "./action-editor";
import { BulletsEditor } from "./bullets-editor";
import type { ContentActionKind, ContentBullet } from "./types";

/** Todo lo que se puede configurar de una pieza. Es el mismo para crear y para editar. */
export type EntryFormState = {
  title: string;
  subtitle: string;
  body: string;
  bullets: ContentBullet[];
  actionKind: ContentActionKind | null;
  actionLabel: string;
  actionValue: string;
  displayOrder: number;
  isActive: boolean;
};

export type EntryFormIds = { title: string; subtitle?: string; body: string };

function Seccion({
  titulo,
  ayuda,
  children,
}: Readonly<{ titulo: string; ayuda?: string; children: React.ReactNode }>) {
  return (
    <section className="rounded-2xl border border-atlas-border bg-atlas-soft/40 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-atlas-text">{titulo}</h3>
        {ayuda ? (
          <p className="mt-0.5 text-xs text-atlas-muted">{ayuda}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

/**
 * Los campos de una pieza, en secciones: Texto, Lista, Botón y Publicación.
 *
 * Crear y editar comparten ESTE bloque (antes eran dos formularios que se parecían y no ofrecían lo
 * mismo: crear no permitía puntos, ni botón, ni orden). El estado vive en quien lo usa para que el
 * celular pueda enseñar lo que se escribe sin esperar a guardar.
 */
export function EntryFormFields({
  contentKey,
  state,
  onChange,
  bodyLabel,
  titleLabel,
  ids,
}: Readonly<{
  contentKey: string;
  state: EntryFormState;
  onChange: (cambios: Partial<EntryFormState>) => void;
  bodyLabel: string;
  titleLabel: string;
  ids: EntryFormIds;
}>) {
  const orden = (valor: number) =>
    onChange({
      displayOrder: Math.max(0, Math.min(10_000, Math.round(valor) || 0)),
    });

  return (
    <div className="flex flex-col gap-4">
      <Seccion titulo="Texto" ayuda="Lo primero que lee la persona en la app.">
        <Field
          label={titleLabel}
          tooltip="Encabezado que ve el cliente en la app; en preguntas frecuentes, la pregunta tal cual."
        >
          <Input
            value={state.title}
            onChange={(event) => onChange({ title: event.target.value })}
            data-testid={ids.title}
          />
        </Field>
        <Field
          label="Subtítulo"
          tooltip="Línea corta bajo el título que resume el contenido en la app."
        >
          <Input
            value={state.subtitle}
            onChange={(event) => onChange({ subtitle: event.target.value })}
            data-testid={ids.subtitle}
          />
        </Field>
        <Field
          label={bodyLabel}
          tooltip="Texto completo que la app muestra al abrir la pieza."
        >
          <Textarea
            value={state.body}
            onChange={(event) => onChange({ body: event.target.value })}
            rows={4}
            data-testid={ids.body}
          />
        </Field>
      </Seccion>

      <Seccion titulo="Lista de puntos">
        <BulletsEditor
          bullets={state.bullets}
          contentKey={contentKey}
          onChange={(actualizar) =>
            onChange({ bullets: actualizar(state.bullets) })
          }
        />
      </Seccion>

      <Seccion titulo="Botón">
        <ActionEditor
          contentKey={contentKey}
          kind={state.actionKind}
          label={state.actionLabel}
          value={state.actionValue}
          onChange={onChange}
        />
      </Seccion>

      <Seccion titulo="Publicación">
        <div className="flex flex-wrap items-end gap-6">
          <Field
            label="Orden"
            tooltip="Posición dentro de la pantalla: la más baja sale primero."
          >
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => orden(state.displayOrder - 10)}
                aria-label="Subir la pieza (restar 10 al orden)"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-atlas-border bg-white text-atlas-muted transition hover:text-atlas-text"
              >
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <Input
                type="number"
                min={0}
                max={10000}
                value={state.displayOrder}
                onChange={(event) => orden(Number(event.target.value))}
                className="w-24 text-center"
                data-testid={`order-${contentKey}`}
              />
              <button
                type="button"
                onClick={() => orden(state.displayOrder + 10)}
                aria-label="Bajar la pieza (sumar 10 al orden)"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-atlas-border bg-white text-atlas-muted transition hover:text-atlas-text"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </Field>
          <label className="flex cursor-pointer items-center gap-3 pb-2 text-sm font-medium text-atlas-text">
            <input
              type="checkbox"
              role="switch"
              checked={state.isActive}
              onChange={(event) => onChange({ isActive: event.target.checked })}
              data-testid={`active-${contentKey}`}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="relative h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-atlas-accent peer-focus-visible:ring-2 peer-focus-visible:ring-atlas-accent/50 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
            />
            Visible en la app
          </label>
        </div>
      </Seccion>
    </div>
  );
}
