"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { isAtlasApiError } from "@/shared/api/errors";
import type { PaginationMeta } from "@/shared/api/types";
import { DataTable } from "@/shared/components/data-table/data-table";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";

/**
 * Una familia de la revisión del catálogo, con SU paginación. Carga, error con reintento y vacío
 * son de esta tabla: que falle una familia no tapa las otras cinco.
 */
export function ReviewTableCard<T>({
  title,
  data,
  meta,
  columns,
  onPageChange,
  isLoading,
  error,
  onRetry,
  filtered,
}: Readonly<{
  title: string;
  data: T[];
  meta: PaginationMeta;
  columns: ColumnDef<T>[];
  onPageChange: (page: number) => void;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  /** Hay texto o módulo en el buscador: el vacío se explica distinto. */
  filtered: boolean;
}>) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader title={`${title} (${meta.total})`} className="mb-0" />
      </CardHeader>
      <CardContent>
        {isLoading ? <LoadingSkeleton rows={4} /> : null}
        {error ? (
          <ErrorState
            description={
              isAtlasApiError(error)
                ? error.message
                : "No se pudo cargar esta parte de la revisión."
            }
            requestId={isAtlasApiError(error) ? error.requestId : undefined}
            onRetry={onRetry}
          />
        ) : null}
        {!isLoading && !error ? (
          <DataTable
            data={data}
            columns={columns}
            meta={meta}
            onPageChange={onPageChange}
            emptyTitle={
              filtered
                ? "Nada coincide con la búsqueda"
                : "Nada que revisar aquí"
            }
            emptyDescription={
              filtered
                ? "Cambia el texto o el estado de revisión."
                : "No hay detecciones con este estado de revisión en esta familia."
            }
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
