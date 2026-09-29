"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  type AtlasColumnMeta,
} from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime } from "@/shared/lib/format";
import type { Option } from "@/shared/lib/options";
import { useKnowledgeArticles } from "./knowledge-hooks";
import { knowledgeErrorMessage } from "./knowledge-services";
import {
  AUDIENCIA_OPTIONS,
  EQUIPO_OPTIONS,
  ESTADO_VERSION,
  type KnowledgeArticleRow,
} from "./knowledge-types";

const POR_PAGINA = 20;

const AUDIENCIA = Object.fromEntries(
  AUDIENCIA_OPTIONS.map((opcion) => [opcion.value, opcion.label]),
);
const EQUIPO = Object.fromEntries(
  EQUIPO_OPTIONS.map((opcion) => [opcion.value, opcion.label]),
);

export const ESTADO_ARTICULO_OPTIONS: Option[] = [
  {
    value: "PUBLISHED",
    label: "Publicados",
    description: "Tienen una versión vigente que la gente ya puede leer.",
  },
  {
    value: "DRAFT",
    label: "En redacción",
    description: "Todavía no tienen ninguna versión enviada a revisión.",
  },
  {
    value: "IN_REVIEW",
    label: "En revisión",
    description: "Su última versión espera la aprobación de otra persona.",
  },
  {
    value: "APPROVED",
    label: "Aprobados sin publicar",
    description: "Su última versión está aprobada y falta publicarla.",
  },
  {
    value: "RETIRED",
    label: "Retirados",
    description: "Ya no se muestran a nadie; quedan por su historia.",
  },
];

/**
 * Todos los artículos, en cualquier estado y para cualquier audiencia, con la acción de redactar su
 * siguiente versión. La búsqueda viaja al servidor y coincide con la clave del artículo o con el
 * título de su versión vigente.
 */
export function KnowledgeArticlesSection({
  onNuevaVersion,
}: Readonly<{
  onNuevaVersion: (article: { articleId: string; articleKey: string }) => void;
}>) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [audience, setAudience] = useState("");
  const [page, setPage] = useState(1);
  const articulos = useKnowledgeArticles({
    status,
    audience,
    search: search.trim(),
    page,
    pageSize: POR_PAGINA,
  });

  const columnas = useMemo<ColumnDef<KnowledgeArticleRow>[]>(
    () => [
      {
        header: "Artículo",
        enableSorting: false,
        accessorKey: "articleKey",
        cell: ({ row }) => (
          <div className="min-w-0">
            {row.original.currentTitle ? (
              <p className="max-w-[36ch] truncate text-sm font-medium text-atlas-text">
                {row.original.currentTitle}
              </p>
            ) : null}
            <p className="max-w-[36ch] truncate font-mono text-xs text-atlas-text">
              {row.original.articleKey}
            </p>
            <p className="text-[0.6875rem] text-atlas-muted">
              #{row.original.articleId} ·{" "}
              {EQUIPO[row.original.ownerTeam] ?? row.original.ownerTeam}
              {row.original.isFaq ? " · pregunta frecuente" : ""}
            </p>
          </div>
        ),
      },
      {
        header: "Quién lo lee",
        enableSorting: false,
        accessorKey: "audience",
        cell: ({ row }) => (
          <Badge tone="muted">
            {AUDIENCIA[row.original.audience] ?? row.original.audience}
          </Badge>
        ),
      },
      {
        header: "Estado",
        enableSorting: false,
        accessorKey: "status",
        cell: ({ row }) => {
          const estado = ESTADO_VERSION[row.original.status];
          return estado ? (
            <Badge tone={estado.tone}>{estado.label}</Badge>
          ) : (
            <Badge tone="muted">{row.original.status}</Badge>
          );
        },
      },
      {
        header: "Útil / no útil",
        enableSorting: false,
        id: "utilidad",
        cell: ({ row }) =>
          `${row.original.helpfulCount} / ${row.original.notHelpfulCount}`,
      },
      {
        header: "Próxima revisión",
        enableSorting: false,
        accessorKey: "nextReviewAt",
        cell: ({ row }) => formatDateTime(row.original.nextReviewAt),
      },
      {
        header: "Acción",
        enableSorting: false,
        id: "accion",
        meta: { pinRight: true } satisfies AtlasColumnMeta,
        cell: ({ row }) => (
          <Button
            variant="secondary"
            className="h-8 px-2 text-xs"
            onClick={() =>
              onNuevaVersion({
                articleId: row.original.articleId,
                articleKey: row.original.articleKey,
              })
            }
          >
            Nueva versión
          </Button>
        ),
      },
    ],
    [onNuevaVersion],
  );

  const datos = articulos.data;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-atlas-text">Artículos</h2>
      <FilterBar
        search={search}
        searchPlaceholder="Buscar por clave o título…"
        searchTooltip="Busca en el servidor: coincide con parte de la clave del artículo (p. ej. «codigo» encuentra «no-me-llega-el-codigo») o del título de su versión vigente."
        filters={[
          {
            name: "status",
            label: "Estado",
            value: status,
            options: ESTADO_ARTICULO_OPTIONS,
            tooltip:
              "En qué punto está el artículo: publicado, en revisión, retirado u otro.",
          },
          {
            name: "audience",
            label: "Quién lo lee",
            value: audience,
            options: AUDIENCIA_OPTIONS,
            tooltip:
              "Filtra por la audiencia del artículo: público, clientes, comercios o equipo interno.",
          },
        ]}
        onSearchChange={(valor) => {
          setSearch(valor);
          setPage(1);
        }}
        onFilterChange={(nombre, valor) => {
          if (nombre === "status") setStatus(valor);
          if (nombre === "audience") setAudience(valor);
          setPage(1);
        }}
        onClear={() => {
          setSearch("");
          setStatus("");
          setAudience("");
          setPage(1);
        }}
      />

      {articulos.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {articulos.error ? (
        <ErrorState
          title="No se pudieron cargar los artículos."
          description={knowledgeErrorMessage(articulos.error)}
          onRetry={() => void articulos.refetch()}
        />
      ) : null}
      {datos ? (
        <DataTable
          data={datos.items}
          columns={columnas}
          meta={{
            page: datos.page,
            limit: datos.pageSize,
            total: datos.total,
            totalPages: Math.max(1, Math.ceil(datos.total / datos.pageSize)),
          }}
          onPageChange={setPage}
          emptyTitle="Ningún artículo coincide con estos filtros."
          emptyDescription="Cambia los filtros o crea un artículo nuevo con el botón de arriba."
        />
      ) : null}
    </section>
  );
}
