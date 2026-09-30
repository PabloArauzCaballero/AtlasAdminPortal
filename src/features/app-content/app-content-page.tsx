"use client";

import { useMemo, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { apiErrorText, isAtlasApiError } from "@/shared/api/errors";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { useAppContent, usePublishedAppContent } from "./hooks";
import { EntryEditor } from "./entry-editor";
import { buildEntryColumns } from "./entry-columns";
import { NewEntryForm } from "./new-entry-form";
import { PhonePreview, type PreviewDraft } from "./phone-preview";
import { APP_CONTENT_MANAGE, SURFACES, surfaceOption } from "./surfaces";
import type { AppContentEntry, ContentSurface } from "./types";

const POR_PAGINA = 20;

const VISIBILIDAD_OPTIONS = [
  {
    value: "true",
    label: "Visibles",
    description: "Las que la app enseña hoy.",
  },
  {
    value: "false",
    label: "Ocultas",
    description: "Guardadas, pero la app no las enseña.",
  },
];

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
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [visibilidad, setVisibilidad] = useState<"true" | "false" | "">("");
  const content = useAppContent(surface, {
    page,
    limit: POR_PAGINA,
    q,
    active: visibilidad,
  });
  const publishedContent = usePublishedAppContent(surface);
  const [editing, setEditing] = useState<AppContentEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<PreviewDraft | null>(null);
  const current = surfaceOption(surface);
  const columns = useMemo(() => buildEntryColumns(setEditing), []);
  // El celular enseña lo PUBLICADO de la pantalla, no la página ni el filtro de la tabla.
  const published = useMemo<PreviewDraft[]>(
    () =>
      (publishedContent.data?.items ?? [])
        .filter((entry) => entry.isActive)
        .map((entry) => ({
          title: entry.title ?? "",
          subtitle: entry.subtitle ?? "",
          body: entry.bodyMd ?? "",
          bullets: entry.bullets,
          actionKind: entry.actionKind,
          actionLabel: entry.actionLabel ?? "",
          isActive: true,
        })),
    [publishedContent.data],
  );
  const hayFiltros = q.trim() !== "" || visibilidad !== "";
  const summary = content.data?.summary;

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
              setEditing(null);
              setPage(1);
              setQ("");
              setVisibilidad("");
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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
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
                  onDraftChange={setDraft}
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

          {editing ? (
            <div className="mb-4">
              <EntryEditor
                key={editing.contentId}
                entry={editing}
                onClose={() => setEditing(null)}
                onDraftChange={setDraft}
              />
            </div>
          ) : null}

          {summary ? (
            <section className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard
                label={`Piezas en ${current.label}`}
                value={formatNumber(summary.total)}
              />
              <MetricCard
                label="Visibles en la app"
                value={formatNumber(summary.visible)}
              />
              <MetricCard
                label="Ocultas"
                value={formatNumber(summary.hidden)}
              />
            </section>
          ) : null}

          <div className="space-y-4">
            <FilterBar
              search={q}
              searchPlaceholder="Buscar por título, clave o texto…"
              searchTooltip="Busca en el servidor, en todas las piezas de esta pantalla: coincide con parte de la clave, del título, del subtítulo, del texto o de la etiqueta del botón."
              filters={[
                {
                  name: "active",
                  label: "Visibilidad",
                  tooltip:
                    "Si la app enseña la pieza hoy o la tiene guardada sin publicar.",
                  value: visibilidad,
                  options: VISIBILIDAD_OPTIONS,
                },
              ]}
              onSearchChange={(value) => {
                setQ(value);
                setPage(1);
              }}
              onFilterChange={(name, value) => {
                if (name === "active")
                  setVisibilidad(value as "true" | "false" | "");
                setPage(1);
              }}
              onClear={() => {
                setQ("");
                setVisibilidad("");
                setPage(1);
              }}
            />

            {content.isLoading ? <LoadingSkeleton rows={4} /> : null}

            {content.error ? (
              <ErrorState
                title="No pudimos cargar el contenido"
                description={apiErrorText(
                  content.error,
                  "Reintenta en unos segundos.",
                )}
                requestId={
                  isAtlasApiError(content.error)
                    ? content.error.requestId
                    : undefined
                }
                onRetry={() => void content.refetch()}
              />
            ) : null}

            {content.data ? (
              <div data-testid="app-content-list">
                <DataTable
                  data={content.data.items}
                  columns={columns}
                  meta={content.data.meta}
                  onPageChange={setPage}
                  emptyTitle={
                    hayFiltros
                      ? "Ninguna pieza coincide con la búsqueda."
                      : "Todavía no hay contenido para esta pantalla"
                  }
                  emptyDescription={
                    hayFiltros
                      ? "Prueba con otro texto o quita el filtro de visibilidad."
                      : current.whenEmpty
                  }
                />
              </div>
            ) : null}
          </div>
        </div>
        <div className="lg:sticky lg:top-4">
          <PhonePreview
            surface={surface}
            surfaceLabel={current.label}
            draft={draft}
            published={published}
          />
        </div>
      </div>
    </>
  );
}
