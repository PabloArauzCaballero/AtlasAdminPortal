"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMeta } from "@/shared/api/types";
import { Button } from "@/shared/components/ui/button";
import { Select } from "@/shared/components/ui/input";
import { PAGE_SIZE_OPTIONS, setPageSize } from "@/shared/lib/page-size";

/**
 * El pie de página de una tabla paginada: dónde estás, cuántas filas ves, adónde ir.
 *
 * Los tres controles que toda tabla del portal ofrece: «Anterior» / «Siguiente», ir directo a la
 * página N y cuántas filas por página. Cambiar las filas por página es una preferencia de la
 * persona (`setPageSize`) y vuelve a la página 1, porque la página 7 de 10 filas no es la 7 de 50.
 *
 * Los chevrones no son decoración: «Anterior» y «Siguiente» son las dos únicas etiquetas de la
 * tabla que nombran una dirección, y la palabra sola obliga a leerla para saber hacia dónde va.
 */
export function Pagination({
  meta,
  onPageChange,
}: Readonly<{
  meta: PaginationMeta;
  onPageChange?: (page: number) => void;
}>) {
  const totalPages = Math.max(meta.totalPages || 1, 1);
  const sizes = PAGE_SIZE_OPTIONS.includes(
    meta.limit as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? [...PAGE_SIZE_OPTIONS]
    : [...PAGE_SIZE_OPTIONS, meta.limit].sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-3 text-xs text-atlas-muted lg:flex-row lg:items-center lg:justify-between">
      <span>
        Página {meta.page} de {totalPages} · {meta.total} registros
      </span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span>Filas por página</span>
          <div className="w-24">
            <Select
              name="filas-por-pagina"
              compact
              ariaLabel="Filas por página"
              options={sizes.map((size) => ({
                value: String(size),
                label: String(size),
              }))}
              value={String(meta.limit)}
              onChange={(value) => {
                setPageSize(Number(value));
                onPageChange?.(1);
              }}
            />
          </div>
        </div>
        <IrAPagina
          key={meta.page}
          page={meta.page}
          totalPages={totalPages}
          onGo={(page) => onPageChange?.(page)}
        />
        <div className="flex gap-2">
          <Button
            disabled={meta.page <= 1}
            onClick={() => onPageChange?.(meta.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Anterior
          </Button>
          <Button
            disabled={totalPages <= meta.page}
            onClick={() => onPageChange?.(meta.page + 1)}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** «Ir a la página N»: se acota a 1…total en vez de rechazar el número. */
function IrAPagina({
  page,
  totalPages,
  onGo,
}: Readonly<{
  page: number;
  totalPages: number;
  onGo: (page: number) => void;
}>) {
  const [texto, setTexto] = useState(String(page));
  const ir = () => {
    const pedida = Math.trunc(Number(texto));
    if (!Number.isFinite(pedida)) return setTexto(String(page));
    const destino = Math.min(Math.max(pedida, 1), totalPages);
    setTexto(String(destino));
    if (destino !== page) onGo(destino);
  };
  return (
    <form
      noValidate
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        ir();
      }}
    >
      <span>Ir a la página</span>
      <input
        aria-label="Número de página"
        type="number"
        inputMode="numeric"
        min={1}
        max={totalPages}
        value={texto}
        onChange={(event) => setTexto(event.target.value)}
        disabled={totalPages <= 1}
        className="h-9 w-16 rounded-lg border border-slate-300 bg-white px-2 text-center text-sm text-atlas-text focus:border-atlas-accent focus:outline-none focus:ring-4 focus:ring-atlas-accent/10 disabled:bg-slate-100"
      />
      <Button type="submit" disabled={totalPages <= 1}>
        Ir
      </Button>
    </form>
  );
}
