"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  DataTable,
  type AtlasColumnMeta,
} from "@/shared/components/data-table/data-table";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Field, Input } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { useKnowledgeFaq, useKnowledgeSearch } from "./knowledge-hooks";
import { AUDIENCIA_OPTIONS } from "./knowledge-types";

type FilaPublicada = {
  articleId: string;
  articleKey: string;
  versionId: string;
  title: string;
  audience: string | null;
};

const AUDIENCIA = Object.fromEntries(
  AUDIENCIA_OPTIONS.map((opcion) => [opcion.value, opcion.label]),
);

/**
 * Lo que ya está publicado, con la acción de redactar su siguiente versión.
 *
 * Sin nada escrito se enseñan las preguntas frecuentes; con dos letras o más, la búsqueda. Las dos
 * van por las rutas de ayuda de la app porque el servidor no ofrece otra lectura para el personal, y
 * sólo devuelven lo PUBLICADO: un artículo recién creado, sin versión aprobada, no sale aquí.
 */
export function KnowledgePublishedSection({
  onNuevaVersion,
}: Readonly<{
  onNuevaVersion: (article: { articleId: string; articleKey: string }) => void;
}>) {
  const [texto, setTexto] = useState("");
  const termino = useDeferredValue(texto.trim());
  const buscando = termino.length >= 2;
  const busqueda = useKnowledgeSearch(termino);
  const faq = useKnowledgeFaq();
  const consulta = buscando ? busqueda : faq;

  const filas = useMemo<FilaPublicada[]>(() => {
    if (buscando)
      return (busqueda.data?.results ?? []).map((hit) => ({
        articleId: hit.articleId,
        articleKey: hit.articleKey,
        versionId: hit.versionId,
        title: hit.title,
        audience: hit.audience,
      }));
    return (faq.data?.faq ?? []).map((version) => ({
      articleId: version.articleId,
      articleKey: version.articleKey,
      versionId: version.versionId,
      title: version.title,
      audience: null,
    }));
  }, [buscando, busqueda.data, faq.data]);

  const columnas = useMemo<ColumnDef<FilaPublicada>[]>(
    () => [
      {
        header: "Artículo",
        accessorKey: "title",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="max-w-[40ch] truncate text-sm text-atlas-text">
              {row.original.title}
            </p>
            <p className="font-mono text-[0.6875rem] text-atlas-muted">
              {row.original.articleKey} · artículo #{row.original.articleId}
            </p>
          </div>
        ),
      },
      {
        header: "Quién lo lee",
        accessorKey: "audience",
        cell: ({ row }) =>
          row.original.audience ? (
            <Badge tone="muted">
              {AUDIENCIA[row.original.audience] ?? row.original.audience}
            </Badge>
          ) : (
            <span className="text-atlas-muted">Pregunta frecuente</span>
          ),
      },
      {
        header: "Versión vigente",
        accessorKey: "versionId",
        cell: ({ row }) => (
          <span className="font-mono text-xs">#{row.original.versionId}</span>
        ),
      },
      {
        header: "Acción",
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

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-sm font-semibold text-atlas-text">
          Artículos publicados
        </h2>
        <div className="w-full sm:w-80">
          <Field
            label="Buscar en la ayuda"
            tooltip="Escribe como lo haría un cliente; busca en títulos, respuestas y palabras clave de lo publicado."
          >
            <Input
              type="search"
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
            />
          </Field>
        </div>
      </div>

      {consulta.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {consulta.error ? (
        <ErrorState
          title={
            isAtlasApiError(consulta.error) && consulta.error.status === 403
              ? "Tu rol puede aprobar, pero no leer la ayuda publicada."
              : "No se pudo cargar la ayuda publicada."
          }
          description={
            isAtlasApiError(consulta.error) && consulta.error.status === 403
              ? "La lectura de la ayuda admite a operaciones y administración. Puedes aprobar versiones por su número desde la sección de arriba."
              : isAtlasApiError(consulta.error)
                ? consulta.error.message
                : undefined
          }
          onRetry={() => void consulta.refetch()}
        />
      ) : null}
      {consulta.data ? (
        <DataTable
          data={filas}
          columns={columnas}
          emptyTitle={
            buscando
              ? "Nada publicado coincide con esa búsqueda."
              : "Todavía no hay preguntas frecuentes publicadas."
          }
          emptyDescription={
            buscando
              ? "Prueba con otras palabras. Si el artículo existe pero aún no se publicó, síguelo en «Versiones en curso»."
              : "Busca por palabras para ver el resto de artículos publicados, o crea uno nuevo."
          }
        />
      ) : null}
    </section>
  );
}
