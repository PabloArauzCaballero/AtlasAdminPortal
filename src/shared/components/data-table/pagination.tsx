import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMeta } from "@/shared/api/types";
import { Button } from "@/shared/components/ui/button";

/**
 * El pie de página de una tabla paginada.
 *
 * Vive fuera de `data-table.tsx` sólo por tamaño: el archivo de la tabla llegó al tope de líneas
 * del proyecto y este bloque es el que se lee entero sin mirar el resto.
 *
 * Los chevrones no son decoración: «Anterior» y «Siguiente» son las dos únicas etiquetas de la
 * tabla que nombran una dirección, y la palabra sola obliga a leerla para saber hacia dónde va.
 * El icono va antes en el retroceso y después en el avance, que es el orden en que se lee la
 * dirección.
 */
export function Pagination({
  meta,
  onPageChange,
}: Readonly<{
  meta: PaginationMeta;
  onPageChange?: (page: number) => void;
}>) {
  return (
    <div className="flex flex-col gap-2 text-xs text-atlas-muted sm:flex-row sm:items-center sm:justify-between">
      <span>
        Página {meta.page} de {meta.totalPages || 1} · {meta.total} registros
      </span>
      <div className="flex gap-2">
        <Button
          disabled={meta.page <= 1}
          onClick={() => onPageChange?.(meta.page - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Anterior
        </Button>
        <Button
          disabled={meta.totalPages <= meta.page}
          onClick={() => onPageChange?.(meta.page + 1)}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
