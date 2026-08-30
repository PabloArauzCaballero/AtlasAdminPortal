"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
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
    <section
      className="rounded-xl border border-slate-700 bg-slate-900/60 p-5"
      data-testid={`app-content-${entry.contentKey}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            {entry.title ?? entry.contentKey}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {entry.surface} · {entry.contentKey} · {entry.locale} · orden{" "}
            {entry.displayOrder}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              entry.isActive
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-slate-500/15 text-slate-300"
            }`}
          >
            {entry.isActive ? "visible" : "oculto"}
          </span>
          {!editing ? (
            <Button onClick={onEdit} data-testid={`edit-${entry.contentKey}`}>
              Editar
            </Button>
          ) : null}
        </div>
      </div>

      {!editing ? (
        <>
          {entry.subtitle ? (
            <p className="mt-3 text-sm text-slate-300">{entry.subtitle}</p>
          ) : null}
          {entry.bodyMd ? (
            <p className="mt-2 text-sm text-slate-400">{entry.bodyMd}</p>
          ) : null}
          {entry.bullets.length > 0 ? (
            <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-xs text-slate-400">
              {entry.bullets.map((bullet, index) => (
                <li key={`${index}-${bullet.text.slice(0, 10)}`}>
                  {bullet.text}
                  {bullet.emphasis ? " ·  destacado" : ""}
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
            <p className="mt-3 text-xs text-sky-300">
              {entry.resolvedAction.label} → {entry.resolvedAction.url}
            </p>
          ) : null}
        </>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Título / pregunta
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              data-testid={`title-${entry.contentKey}`}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Subtítulo
            <input
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              data-testid={`subtitle-${entry.contentKey}`}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Respuesta
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              data-testid={`body-${entry.contentKey}`}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </label>

          <BulletsEditor
            bullets={bullets}
            onChange={setBullets}
            contentKey={entry.contentKey}
          />

          {entry.actionKind ? (
            <fieldset className="flex flex-col gap-2 rounded-lg border border-slate-800 p-3">
              <legend className="px-1 text-xs text-slate-400">
                Botón ({entry.actionKind})
              </legend>
              <input
                value={actionLabel}
                onChange={(event) => setActionLabel(event.target.value)}
                placeholder="Texto del botón"
                data-testid={`action-label-${entry.contentKey}`}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
              <input
                value={actionValue}
                onChange={(event) => setActionValue(event.target.value)}
                placeholder={
                  entry.actionKind === "whatsapp"
                    ? "Número local, sin prefijo de país"
                    : "Destino"
                }
                data-testid={`action-value-${entry.contentKey}`}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
              {entry.actionKind === "whatsapp" ? (
                <p className="text-xs text-slate-500">
                  El prefijo de Bolivia lo añade el servidor. Escribe sólo el
                  número.
                </p>
              ) : null}
            </fieldset>
          ) : null}

          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              data-testid={`active-${entry.contentKey}`}
            />
            Visible en la app
          </label>

          <div className="flex items-center gap-2">
            <Button
              onClick={save}
              disabled={mutation.isPending}
              data-testid={`save-${entry.contentKey}`}
            >
              {mutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
            <Button onClick={onClose}>Cancelar</Button>
          </div>

          {mutation.error ? (
            <p className="text-xs text-rose-300">
              No pudimos guardar. Revisa el texto e intenta otra vez.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
