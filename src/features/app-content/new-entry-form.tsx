"use client";

import { useState } from "react";
import { apiErrorText } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { useSaveAppContent } from "./hooks";
import type { ContentSurface } from "./types";

/** Lo que acepta el servidor como clave: la app busca por ella, así que sin espacios ni tildes. */
const KEY_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

/**
 * Publicar la PRIMERA pieza de una superficie.
 *
 * La pantalla sólo sabía editar lo que ya existía, y en TEST las preguntas frecuentes, la ayuda y la
 * bienvenida estaban vacías: el estado vacío invitaba a «escribir aquí el primero» y no había dónde.
 * El servidor ya lo aceptaba (el PUT es crear o reemplazar por superficie + clave + idioma); faltaba
 * el formulario. Si la clave ya existe, el servidor la reemplaza: se avisa en el texto de ayuda.
 */
export function NewEntryForm({
  surface,
  onClose,
}: Readonly<{ surface: ContentSurface; onClose: () => void }>) {
  const mutation = useSaveAppContent();
  const [contentKey, setContentKey] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [isActive, setIsActive] = useState(true);

  const key = contentKey.trim();
  const keyError =
    key.length > 0 && !KEY_PATTERN.test(key)
      ? "Usa minúsculas, números, punto, guion o guion bajo, sin espacios."
      : null;
  const canSave = key.length > 0 && !keyError && title.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    mutation.mutate(
      {
        surface,
        contentKey: key,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        bodyMd: body.trim() || null,
        bullets: [],
        isActive,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Card testId="app-content-new">
      <CardContent>
        <h3 className="text-base font-semibold text-atlas-text">Nueva pieza</h3>
        <div className="mt-4 flex flex-col gap-3">
          <Field
            label="Clave"
            tooltip="Nombre interno con el que la app encuentra la pieza. Si ya existe una con esta clave, se reemplaza."
            hint="Por ejemplo: faq.como-se-calcula-mi-linea"
            error={keyError ?? undefined}
          >
            <Input
              value={contentKey}
              onChange={(event) => setContentKey(event.target.value)}
              data-testid="new-content-key"
            />
          </Field>
          <Field
            label="Título / pregunta"
            tooltip="Encabezado que ve el cliente en la app; en preguntas frecuentes, la pregunta tal cual."
          >
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              data-testid="new-content-title"
            />
          </Field>
          <Field
            label="Subtítulo"
            tooltip="Línea corta bajo el título que resume el contenido en la app."
          >
            <Input
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
            />
          </Field>
          <Field
            label="Respuesta"
            tooltip="Texto completo que la app muestra al abrir la entrada."
          >
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              data-testid="new-content-body"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-atlas-text">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-atlas-accent"
            />
            Visible en la app
          </label>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={save}
              disabled={!canSave}
              isLoading={mutation.isPending}
              loadingText="Publicando…"
              data-testid="new-content-save"
            >
              Publicar
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
          {mutation.error ? (
            <p role="alert" className="text-xs font-medium text-red-600">
              {apiErrorText(
                mutation.error,
                "No pudimos publicar. Revisa el texto e intenta otra vez.",
              )}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
