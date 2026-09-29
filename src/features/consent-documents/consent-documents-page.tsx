"use client";

import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { useConsentDocuments } from "./hooks";
import { ConsentDocumentEditor } from "./consent-document-editor";
import { buildConsentDocumentColumns } from "./consent-document-columns";
import type { ConsentDocument } from "./types";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { useAuth } from "@/shared/auth/auth-context";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";

const POR_PAGINA = 20;

const ESTADO_OPTIONS = [
  {
    value: "published",
    label: "Vigentes",
    description: "Lo que el cliente acepta hoy.",
  },
  {
    value: "draft",
    label: "Borradores",
    description: "Texto escrito que todavía no rige.",
  },
  {
    value: "retired",
    label: "Retirados",
    description: "Versiones que ya no se ofrecen y se conservan como prueba.",
  },
];

/**
 * El texto que el cliente acepta, editable sin desplegar.
 *
 * ## Por qué existe esta pantalla
 *
 * Hasta ahora el consentimiento vivía a medias: la base guardaba el código, la versión y una URL,
 * y el título lo adivinaba la app móvil a partir del código. Cambiar una palabra de la política de
 * privacidad exigía tocar el teléfono, así que en la práctica nadie la corregía nunca.
 *
 * ## La regla que gobierna la edición
 *
 * Se corrige el TEXTO, nunca el código ni la versión. Quien aceptó bajo la v1 tiene derecho a que
 * la v1 siga diciendo lo que leyó; un cambio de fondo se publica como versión nueva y vuelve a
 * pedirse la aceptación. El backend lo impone, y aquí ni siquiera se ofrecen esos campos.
 */
export function ConsentDocumentsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const documents = useConsentDocuments({ page, limit: POR_PAGINA, q, status });
  const [editing, setEditing] = useState<ConsentDocument | null>(null);
  // Corregir un texto legal es `governance.policies.manage`; el backend lo exige. Sin él, el botón
  // sólo llevaba a un «No pudimos guardar» sin explicación.
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("governance.policies.manage");
  const columns = useMemo(
    () => buildConsentDocumentColumns(canEdit, setEditing),
    [canEdit],
  );
  const hayFiltros = q.trim() !== "" || status !== "";
  const summary = documents.data?.summary;

  return (
    <>
      <PageHeader
        icon={FileText}
        eyebrow="Gobierno y calidad"
        title="Documentos de consentimiento"
        description="Lo que el cliente acepta al registrarse. El texto se edita aquí y llega a la app sin desplegar nada."
      />

      {editing ? (
        <div className="mb-4">
          <ConsentDocumentEditor
            key={editing.id}
            document={editing}
            onClose={() => setEditing(null)}
          />
        </div>
      ) : null}

      {summary ? (
        <section className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <MetricCard label="Documentos" value={formatNumber(summary.total)} />
          <MetricCard
            label="Vigentes"
            value={formatNumber(summary.published)}
          />
          <MetricCard label="Borradores" value={formatNumber(summary.draft)} />
          <MetricCard label="Retirados" value={formatNumber(summary.retired)} />
        </section>
      ) : null}

      <div className="space-y-4">
        <FilterBar
          search={q}
          searchPlaceholder="Buscar por código, título o resumen…"
          searchTooltip="Busca en el servidor, en todos los documentos: coincide con parte del código, del título o del resumen."
          filters={[
            {
              name: "status",
              label: "Estado",
              tooltip:
                "Vigente es lo que el cliente acepta hoy; retirado es una versión anterior que se conserva como prueba.",
              value: status,
              options: ESTADO_OPTIONS,
            },
          ]}
          onSearchChange={(value) => {
            setQ(value);
            setPage(1);
          }}
          onFilterChange={(name, value) => {
            if (name === "status") setStatus(value);
            setPage(1);
          }}
          onClear={() => {
            setQ("");
            setStatus("");
            setPage(1);
          }}
        />

        {documents.isLoading ? <LoadingSkeleton rows={5} /> : null}

        {documents.error ? (
          <ErrorState
            title="No pudimos cargar los documentos"
            description={
              isAtlasApiError(documents.error)
                ? documents.error.message
                : "Reintenta en unos segundos."
            }
            requestId={
              isAtlasApiError(documents.error)
                ? documents.error.requestId
                : undefined
            }
            // Sin esto, el error decía «reintenta» y no había con qué: había que recargar la página.
            onRetry={() => void documents.refetch()}
          />
        ) : null}

        {documents.data ? (
          <div data-testid="consent-documents-list">
            <DataTable
              data={documents.data.items}
              columns={columns}
              meta={documents.data.meta}
              onPageChange={setPage}
              emptyTitle={
                hayFiltros
                  ? "Ningún documento coincide con la búsqueda."
                  : "Todavía no hay documentos publicados"
              }
              emptyDescription={
                hayFiltros
                  ? "Prueba con otro texto o quita el filtro de estado."
                  : "Cuando se publique un consentimiento aparecerá aquí para poder corregir su texto."
              }
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
