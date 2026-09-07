"use client";

import { useState } from "react";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { BulletsEditor } from "./bullets-editor";
import { useSaveAppContent } from "./hooks";
import type { AppContentEntry, ContentBullet } from "./types";

/**
 * Una entrada de contenido, en lectura o en edición.
 *
 * Se separó de la página cuando el formulario creció: la página elige superficie y lista, la
 * tarjeta guarda. Mantenerlas juntas hacía que un cambio en un campo obligara a leer la pantalla
 * entera para saber qué se estaba tocando.
 */
export function EntryCard({
  entry,
  editing,
  onEdit,
  onClose,
}: Readonly<{
  entry: AppContentEntry;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
}>) {
  const mutation = useSaveAppContent();
  const [title, setTitle] = useState(entry.title ?? "");
  const [subtitle, setSubtitle] = useState(entry.subtitle ?? "");
  const [body, setBody] = useState(entry.bodyMd ?? "");
  const [bullets, setBullets] = useState<ContentBullet[]>(entry.bullets);
  const [actionLabel, setActionLabel] = useState(entry.actionLabel ?? "");
  const [actionValue, setActionValue] = useState(entry.actionValue ?? "");
  const [isActive, setIsActive] = useState(entry.isActive);

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-atlas-text">
              {entry.title ?? entry.contentKey}
            </h3>
            <p className="mt-1 font-mono text-xs text-atlas-muted">
              {entry.surface} · {entry.contentKey} · {entry.locale} · orden{" "}
              {entry.displayOrder}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={entry.isActive ? "success" : "muted"}>
              {entry.isActive ? "visible" : "oculto"}
            </Badge>
            {!editing ? (
              <Button
                variant="secondary"
                onClick={onEdit}
                data-testid={`edit-${entry.contentKey}`}
              >
                Editar
              </Button>
            ) : null}
          </div>
        </div>

        {!editing ? (
          <>
            {entry.subtitle ? (
              <p className="mt-3 text-sm leading-6 text-atlas-text">
                {entry.subtitle}
              </p>
            ) : null}
            {entry.bodyMd ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-atlas-muted">
                {entry.bodyMd}
              </p>
            ) : null}
            {entry.bullets.length > 0 ? (
              <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm leading-6 text-atlas-muted">
                {entry.bullets.map((bullet, index) => (
                  <li key={`${index}-${bullet.text.slice(0, 10)}`}>
                    <span
                      className={
                        bullet.emphasis
                          ? "font-medium text-atlas-text"
                          : undefined
                      }
                    >
                      {bullet.text}
                    </span>
                    {bullet.emphasis ? (
                      <span className="ml-2 text-xs text-atlas-accent">
                        destacado
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {/*
              Se enseña el enlace RESUELTO y no el número suelto: es lo que la app abre de verdad, y
              comprobar aquí que el prefijo del país quedó bien evita descubrirlo cuando un cliente
              escriba a un número que no existe.
            */}
            {entry.resolvedAction ? (
              <p className="mt-3 flex flex-wrap items-baseline gap-2 rounded-lg border border-atlas-border bg-atlas-soft px-3 py-2 text-xs text-atlas-muted">
                <span className="font-medium text-atlas-text">
                  {entry.resolvedAction.label}
                </span>
                <span aria-hidden>→</span>
                <span className="break-all font-mono">
                  {entry.resolvedAction.url}
                </span>
              </p>
            ) : null}
          </>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <Field label="Título / pregunta">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                data-testid={`title-${entry.contentKey}`}
              />
            </Field>

            <Field label="Subtítulo">
              <Input
                value={subtitle}
                onChange={(event) => setSubtitle(event.target.value)}
                data-testid={`subtitle-${entry.contentKey}`}
              />
            </Field>

            <Field label="Respuesta">
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
              <p className="text-xs font-medium text-red-600">
                No pudimos guardar. Revisa el texto e intenta otra vez.
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
