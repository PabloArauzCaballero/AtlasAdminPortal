"use client";

import { useEffect, useMemo, useState } from "react";
import { apiErrorText } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { EntryFormFields, type EntryFormState } from "./entry-form";
import { useSaveAppContent } from "./hooks";
import type { PreviewDraft } from "./phone-preview";
import type { AppContentEntry } from "./types";

/** `metadata` con el icono de la pieza puesto o quitado, sin tocar el resto de sus claves. */
function conIcono(metadata: Record<string, unknown>, icono: string) {
  const { icon: _anterior, ...resto } = metadata ?? {};
  void _anterior;
  return icono ? { ...resto, icon: icono } : resto;
}

function estadoInicial(entry: AppContentEntry): EntryFormState {
  return {
    icon: typeof entry.metadata?.icon === "string" ? entry.metadata.icon : "",
    title: entry.title ?? "",
    subtitle: entry.subtitle ?? "",
    body: entry.bodyMd ?? "",
    bullets: entry.bullets,
    actionKind: entry.actionKind,
    actionLabel: entry.actionLabel ?? "",
    actionValue: entry.actionValue ?? "",
    displayOrder: entry.displayOrder,
    isActive: entry.isActive,
  };
}

/**
 * El formulario para editar UNA pieza de contenido.
 *
 * La lista es una tabla (`entry-columns.tsx`); el formulario se abre encima de ella al pulsar
 * «Editar» en una fila. El celular enseña la PANTALLA completa con esta pieza sustituida por lo que
 * se escribe, y al cerrar la pieza vuelve a lo publicado. La barra de abajo queda fija: con una lista
 * de puntos larga, «Guardar» se perdía al final del formulario.
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
  const inicial = useMemo(() => estadoInicial(entry), [entry]);
  const [state, setState] = useState<EntryFormState>(inicial);
  const cambiar = (cambios: Partial<EntryFormState>) =>
    setState((actual) => ({ ...actual, ...cambios }));
  const sucio = JSON.stringify(state) !== JSON.stringify(inicial);

  useEffect(() => {
    onDraftChange({
      contentKey: entry.contentKey,
      icon: state.icon || undefined,
      title: state.title,
      subtitle: state.subtitle,
      body: state.body,
      bullets: state.bullets,
      actionKind: state.actionKind,
      actionLabel: state.actionLabel,
      isActive: state.isActive,
    });
  }, [state, entry.contentKey, onDraftChange]);
  useEffect(() => () => onDraftChange(null), [onDraftChange]);

  const save = () => {
    mutation.mutate(
      {
        surface: entry.surface,
        contentKey: entry.contentKey,
        locale: entry.locale,
        title: state.title || null,
        subtitle: state.subtitle || null,
        bodyMd: state.body || null,
        // Los puntos vacíos se descartan al guardar: una línea en blanco en la app se ve como un
        // bullet roto, y quien edita casi siempre la deja sin querer al añadir uno de más.
        bullets: state.bullets.filter(
          (bullet) => bullet.text.trim().length > 0,
        ),
        // El icono de la pieza vive en `metadata.icon`; el resto de la metadata se conserva tal cual.
        metadata: conIcono(entry.metadata, state.icon),
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
    <Card testId={`app-content-${entry.contentKey}`}>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-atlas-text">
              {entry.title ?? entry.contentKey}
            </h3>
            <p className="mt-1 text-xs text-atlas-muted">
              Editando una pieza de «{entry.surface}»
            </p>
          </div>
          <code className="rounded-lg bg-atlas-soft px-2 py-1 font-mono text-xs text-atlas-muted">
            {entry.contentKey} · {entry.locale}
          </code>
        </div>

        <EntryFormFields
          contentKey={entry.contentKey}
          state={state}
          onChange={cambiar}
          bodyLabel={entry.surface === "faq" ? "Respuesta" : "Texto"}
          titleLabel={entry.surface === "faq" ? "Pregunta" : "Título"}
          pieceIcon={entry.surface === "tour" || entry.surface === "signup"}
          ids={{
            title: `title-${entry.contentKey}`,
            subtitle: `subtitle-${entry.contentKey}`,
            body: `body-${entry.contentKey}`,
          }}
        />

        {mutation.error ? (
          <p role="alert" className="mt-3 text-xs font-medium text-red-600">
            {apiErrorText(
              mutation.error,
              "No pudimos guardar. Revisa el texto e intenta otra vez.",
            )}
          </p>
        ) : null}

        <div className="sticky bottom-0 -mx-6 -mb-6 mt-4 flex items-center gap-3 rounded-b-2xl border-t border-atlas-border bg-white/95 px-6 py-3 backdrop-blur">
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
          {sucio ? (
            <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
              Cambios sin guardar
            </span>
          ) : (
            <span className="ml-auto text-xs text-atlas-muted">
              Sin cambios
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
