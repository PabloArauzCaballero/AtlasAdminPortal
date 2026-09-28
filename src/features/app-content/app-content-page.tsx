"use client";

import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { apiErrorText } from "@/shared/api/errors";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { useAppContent } from "./hooks";
import { EntryCard } from "./entry-card";
import { NewEntryForm } from "./new-entry-form";
import { APP_CONTENT_MANAGE, SURFACES, surfaceOption } from "./surfaces";
import type { ContentSurface } from "./types";

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
export function AppContentPage() {
  const [surface, setSurface] = useState<ContentSurface>("faq");
  const content = useAppContent(surface);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const current = surfaceOption(surface);

  return (
    <>
      <PageHeader
        icon={FileText}
        eyebrow="Gobierno y calidad"
        title="Contenido de la app"
        description="Todo lo que el cliente lee y no es un dato suyo. Se edita aquí y llega a la app sin publicar una versión."
      />

      <div
        className="mb-5 flex flex-wrap gap-2"
        data-testid="app-content-surfaces"
      >
        {SURFACES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setSurface(option.value);
              setCreating(false);
            }}
            title={option.hint}
            data-testid={`surface-${option.value}`}
            aria-pressed={surface === option.value}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/50 focus-visible:ring-offset-1 ${
              surface === option.value
                ? "border-atlas-accent/30 bg-atlas-accentSoft text-atlas-accent shadow-subtle"
                : "border-atlas-border bg-white text-atlas-muted hover:border-slate-300 hover:bg-atlas-soft hover:text-atlas-text"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {!current.readByApp ? (
        <p
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          data-testid="surface-not-read"
        >
          {current.whenEmpty}
        </p>
      ) : null}

      <PermissionGate permissions={APP_CONTENT_MANAGE} fallback={null}>
        {creating ? (
          <div className="mb-4">
            <NewEntryForm
              key={surface}
              surface={surface}
              onClose={() => setCreating(false)}
            />
          </div>
        ) : (
          <div className="mb-4">
            <Button
              variant="secondary"
              onClick={() => setCreating(true)}
              data-testid="app-content-new-button"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Nueva pieza en {current.label}
            </Button>
          </div>
        )}
      </PermissionGate>

      {content.isLoading ? <LoadingSkeleton rows={4} /> : null}

      {content.error ? (
        <ErrorState
          title="No pudimos cargar el contenido"
          description={apiErrorText(
            content.error,
            "Reintenta en unos segundos.",
          )}
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
          {content.data.items.length === 0 && current.readByApp ? (
            <EmptyState
              title="Todavía no hay contenido para esta pantalla"
              description={current.whenEmpty}
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
