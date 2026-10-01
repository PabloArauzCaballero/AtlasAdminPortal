"use client";

import { useEffect, useState } from "react";
import { apiErrorText } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Field, Input } from "@/shared/components/ui/input";
import { EntryFormFields, type EntryFormState } from "./entry-form";
import { useSaveAppContent } from "./hooks";
import type { PreviewDraft } from "./phone-preview";
import type { ContentSurface } from "./types";

/** Lo que acepta el servidor como clave: la app busca por ella, así que sin espacios ni tildes. */
const KEY_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

const VACIO: EntryFormState = {
  title: "",
  subtitle: "",
  body: "",
  bullets: [],
  actionKind: null,
  actionLabel: "",
  actionValue: "",
  displayOrder: 100,
  isActive: true,
};

/**
 * Publicar una pieza NUEVA en una superficie.
 *
 * Ofrece lo mismo que editar (puntos con icono, botón, orden): antes crear solo admitía texto y la
 * pieza había que reabrirla para completarla. El servidor ya aceptaba todo: el PUT es crear o
 * reemplazar por superficie + clave + idioma. Si la clave ya existe, se reemplaza: se avisa en la ayuda.
 */
export function NewEntryForm({
  surface,
  onClose,
  onDraftChange,
}: Readonly<{
  surface: ContentSurface;
  onClose: () => void;
  onDraftChange: (draft: PreviewDraft | null) => void;
}>) {
  const mutation = useSaveAppContent();
  const [contentKey, setContentKey] = useState("");
  const [state, setState] = useState<EntryFormState>(VACIO);
  const cambiar = (cambios: Partial<EntryFormState>) =>
    setState((actual) => ({ ...actual, ...cambios }));
  const key = contentKey.trim();

  // El celular enseña lo que se escribe, sin esperar a guardar.
  useEffect(() => {
    onDraftChange({
      contentKey: key || undefined,
      title: state.title,
      subtitle: state.subtitle,
      body: state.body,
      bullets: state.bullets,
      actionKind: state.actionKind,
      actionLabel: state.actionLabel,
      isActive: state.isActive,
    });
  }, [state, key, onDraftChange]);
  useEffect(() => () => onDraftChange(null), [onDraftChange]);

  const keyError =
    key.length > 0 && !KEY_PATTERN.test(key)
      ? "Usa minúsculas, números, punto, guion o guion bajo, sin espacios."
      : null;
  const canSave = key.length > 0 && !keyError && state.title.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    mutation.mutate(
      {
        surface,
        contentKey: key,
        title: state.title.trim(),
        subtitle: state.subtitle.trim() || null,
        bodyMd: state.body.trim() || null,
        bullets: state.bullets.filter(
          (bullet) => bullet.text.trim().length > 0,
        ),
        actionKind: state.actionKind,
        actionLabel: state.actionKind ? state.actionLabel : null,
        actionValue: state.actionKind ? state.actionValue : null,
        displayOrder: state.displayOrder,
        isActive: state.isActive,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Card testId="app-content-new">
      <CardContent>
        <h3 className="text-lg font-semibold text-atlas-text">Nueva pieza</h3>
        <div className="mb-4 mt-3">
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
        </div>

        <EntryFormFields
          contentKey={key || "nueva"}
          state={state}
          onChange={cambiar}
          bodyLabel={surface === "faq" ? "Respuesta" : "Texto"}
          titleLabel={surface === "faq" ? "Pregunta" : "Título"}
          ids={{
            title: "new-content-title",
            body: "new-content-body",
          }}
        />

        {mutation.error ? (
          <p role="alert" className="mt-3 text-xs font-medium text-red-600">
            {apiErrorText(
              mutation.error,
              "No pudimos publicar. Revisa el texto e intenta otra vez.",
            )}
          </p>
        ) : null}

        <div className="sticky bottom-0 -mx-6 -mb-6 mt-4 flex items-center gap-3 rounded-b-2xl border-t border-atlas-border bg-white/95 px-6 py-3 backdrop-blur">
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
          {!canSave ? (
            <span className="ml-auto text-xs text-atlas-muted">
              Falta la clave y el título para publicar
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
