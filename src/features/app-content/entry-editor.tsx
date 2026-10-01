"use client";

import { useEffect, useState } from "react";
import { apiErrorText } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { BulletsEditor } from "./bullets-editor";
import { useSaveAppContent } from "./hooks";
import type { PreviewDraft } from "./phone-preview";
import type { AppContentEntry, ContentBullet } from "./types";

/**
 * El formulario para editar UNA pieza de contenido.
 *
 * La lista es una tabla (`entry-columns.tsx`); el formulario se abre encima de ella al pulsar
 * «Editar» en una fila. Sólo la pieza que se edita alimenta el celular, y al cerrarla lo suelta.
 */
export function EntryEditor({
  entry,
  onClose,
  onDraftChange,
}: Readonly<{
  entry: AppContentEntry;
  onClose: () => void;
  onDraftChange: (draft: PreviewDraft | null) => void;
}>) {
  const mutation = useSaveAppContent();
  const [title, setTitle] = useState(entry.title ?? "");
  const [subtitle, setSubtitle] = useState(entry.subtitle ?? "");
  const [body, setBody] = useState(entry.bodyMd ?? "");
  const [bullets, setBullets] = useState<ContentBullet[]>(entry.bullets);
  const [actionLabel, setActionLabel] = useState(entry.actionLabel ?? "");
  const [actionValue, setActionValue] = useState(entry.actionValue ?? "");
  const [isActive, setIsActive] = useState(entry.isActive);

  useEffect(() => {
    onDraftChange({
      contentKey: entry.contentKey,
      title,
      subtitle,
      body,
      bullets,
      actionKind: entry.actionKind,
      actionLabel,
      isActive,
    });
  }, [
    title,
    subtitle,
    body,
    bullets,
    actionLabel,
    isActive,
    entry.actionKind,
    entry.contentKey,
    onDraftChange,
  ]);
  useEffect(() => () => onDraftChange(null), [onDraftChange]);

  const save = () => {
    mutation.mutate(
      {
        surface: entry.surface,
        contentKey: entry.contentKey,
        locale: entry.locale,
        title: title || null,
        subtitle: subtitle || null,
        bodyMd: body || null,
        // Los puntos vacíos se descartan al guardar: una línea en blanco en la app se ve como un
        // bullet roto, y quien edita casi siempre la deja sin querer al añadir uno de más.
        bullets: bullets.filter((bullet) => bullet.text.trim().length > 0),
        metadata: entry.metadata,
        actionKind: entry.actionKind,
        actionLabel: entry.actionKind ? actionLabel : null,
        actionValue: entry.actionKind ? actionValue : null,
        displayOrder: entry.displayOrder,
        isActive,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Card testId={`app-content-${entry.contentKey}`}>
      <CardContent>
        <div>
          <h3 className="text-base font-semibold text-atlas-text">
            Editando: {entry.title ?? entry.contentKey}
          </h3>
          <p className="mt-1 font-mono text-xs text-atlas-muted">
            {entry.surface} · {entry.contentKey} · {entry.locale} · orden{" "}
            {entry.displayOrder}
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <Field
            tooltip="Encabezado que ve el cliente en la app; en preguntas frecuentes, la pregunta tal cual."
            label="Título / pregunta"
          >
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              data-testid={`title-${entry.contentKey}`}
            />
          </Field>

          <Field
            tooltip="Línea corta bajo el título que resume el contenido en la app."
            label="Subtítulo"
          >
            <Input
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              data-testid={`subtitle-${entry.contentKey}`}
            />
          </Field>

          <Field
            tooltip="Texto completo que la app muestra al abrir la entrada."
            label="Respuesta"
          >
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              data-testid={`body-${entry.contentKey}`}
            />
          </Field>

          <BulletsEditor
            bullets={bullets}
            onChange={setBullets}
            contentKey={entry.contentKey}
          />

          {entry.actionKind ? (
            <fieldset className="flex flex-col gap-2 rounded-xl border border-atlas-border bg-atlas-soft/60 p-3">
              <legend className="px-1 text-sm font-medium text-atlas-text">
                Botón ({entry.actionKind})
              </legend>
              <Input
                value={actionLabel}
                onChange={(event) => setActionLabel(event.target.value)}
                placeholder="Texto del botón"
                data-testid={`action-label-${entry.contentKey}`}
              />
              <Input
                value={actionValue}
                onChange={(event) => setActionValue(event.target.value)}
                placeholder={
                  entry.actionKind === "whatsapp"
                    ? "Número local, sin prefijo de país"
                    : "Destino"
                }
                data-testid={`action-value-${entry.contentKey}`}
              />
              {entry.actionKind === "whatsapp" ? (
                <p className="text-xs text-atlas-muted">
                  El prefijo de Bolivia lo añade el servidor. Escribe sólo el
                  número.
                </p>
              ) : null}
            </fieldset>
          ) : null}

          <label className="flex items-center gap-2 text-sm text-atlas-text">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              data-testid={`active-${entry.contentKey}`}
              className="h-4 w-4 rounded border-slate-300 accent-atlas-accent"
            />
            Visible en la app
          </label>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={save}
              isLoading={mutation.isPending}
              loadingText="Guardando…"
              data-testid={`save-${entry.contentKey}`}
            >
              Guardar
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>

          {mutation.error ? (
            <p role="alert" className="text-xs font-medium text-red-600">
              {apiErrorText(
                mutation.error,
                "No pudimos guardar. Revisa el texto e intenta otra vez.",
              )}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
