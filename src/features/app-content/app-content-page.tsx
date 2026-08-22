"use client";

import { useState } from "react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { useAppContent, useSaveAppContent } from "./hooks";
import type { AppContentEntry, ContentBullet, ContentSurface } from "./types";

/**
 * Lo que el cliente lee en la app, editable sin desplegar.
 *
 * ## Por qué existe esta pantalla
 *
 * Porque el eslogan, los pasos de bienvenida, las preguntas frecuentes y el teléfono de soporte
 * estaban ESCRITOS EN EL CÓDIGO DE LA APP. Corregir una respuesta que confunde a la gente costaba
 * compilar, firmar y publicar en dos tiendas, y hasta que cada persona actualizara convivían dos
 * versiones distintas de lo que Atlas dice ser. Cuando el texto alcanza a las condiciones del
 * crédito, eso deja de ser un detalle de producto.
 *
 * ## Por qué los bullets se editan como lista y no como texto
 *
 * Porque en la app se pintan como lista: un icono por punto, una línea por idea y el punto
 * importante destacado. Si aquí se escribieran como párrafo con guiones, la app tendría que
 * interpretar texto libre para maquetar — y acabaría maquetando mal en cuanto alguien usara un
 * guion para otra cosa.
 */
const SURFACES: Array<{ value: ContentSurface; label: string; hint: string }> = [
  { value: "onboarding", label: "Bienvenida", hint: "Eslogan y pasos que se ven antes de registrarse" },
  { value: "faq", label: "Preguntas frecuentes", hint: "Las respuestas largas de la pantalla de ayuda" },
  { value: "help", label: "Ayuda y contacto", hint: "WhatsApp de soporte y acceso al recorrido guiado" },
  { value: "home", label: "Inicio", hint: "Avisos y mensajes de la pantalla principal" },
  { value: "legal", label: "Legal", hint: "Enlaces a términos y política de privacidad" },
  { value: "profile", label: "Perfil", hint: "Textos de la pantalla de perfil" },
  { value: "credit", label: "Crédito", hint: "Explicaciones de la línea y el puntaje" },
];

export function AppContentPage() {
  const [surface, setSurface] = useState<ContentSurface>("faq");
  const content = useAppContent(surface);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="Configuración"
        title="Contenido de la app"
        description="Todo lo que el cliente lee y no es un dato suyo. Se edita aquí y llega a la app sin publicar una versión."
      />

      <div className="mb-5 flex flex-wrap gap-2" data-testid="app-content-surfaces">
        {SURFACES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSurface(option.value)}
            title={option.hint}
            data-testid={`surface-${option.value}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              surface === option.value
                ? "bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/40"
                : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {content.isLoading ? <LoadingSkeleton rows={4} /> : null}

      {content.error ? (
        <ErrorState
          title="No pudimos cargar el contenido"
          description="Reintenta en unos segundos."
        />
      ) : null}

      {content.data ? (
        <div className="flex flex-col gap-4" data-testid="app-content-list">
          {content.data.items.map((entry) => (
            <EntryCard
              key={entry.contentId}
              entry={entry}
              editing={editing === entry.contentId}
              onEdit={() => setEditing(entry.contentId)}
              onClose={() => setEditing(null)}
            />
          ))}
          {content.data.items.length === 0 ? (
            <p className="text-sm text-slate-400">
              Todavía no hay contenido para esta pantalla. La app usará sus textos por defecto.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function EntryCard({
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
            {entry.surface} · {entry.contentKey} · {entry.locale} · orden {entry.displayOrder}
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

          <fieldset className="flex flex-col gap-2 rounded-lg border border-slate-800 p-3">
            <legend className="px-1 text-xs text-slate-400">
              Puntos de la lista
            </legend>
            {bullets.map((bullet, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={bullet.text}
                  onChange={(event) =>
                    setBullets((current) =>
                      current.map((item, position) =>
                        position === index ? { ...item, text: event.target.value } : item,
                      ),
                    )
                  }
                  data-testid={`bullet-${entry.contentKey}-${index}`}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  value={bullet.icon ?? ""}
                  placeholder="icono"
                  onChange={(event) =>
                    setBullets((current) =>
                      current.map((item, position) =>
                        position === index ? { ...item, icon: event.target.value || null } : item,
                      ),
                    )
                  }
                  className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                />
                <label className="flex items-center gap-1 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={Boolean(bullet.emphasis)}
                    onChange={(event) =>
                      setBullets((current) =>
                        current.map((item, position) =>
                          position === index ? { ...item, emphasis: event.target.checked } : item,
                        ),
                      )
                    }
                  />
                  destacar
                </label>
                <button
                  type="button"
                  onClick={() => setBullets((current) => current.filter((_, position) => position !== index))}
                  className="text-xs text-rose-300"
                >
                  quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setBullets((current) => [...current, { text: "", icon: null }])}
              data-testid={`add-bullet-${entry.contentKey}`}
              className="self-start text-xs text-sky-300"
            >
              + añadir punto
            </button>
          </fieldset>

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
                  El prefijo de Bolivia lo añade el servidor. Escribe sólo el número.
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
