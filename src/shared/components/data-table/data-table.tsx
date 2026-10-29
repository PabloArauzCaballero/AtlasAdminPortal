"use client";

import {
  ColumnDef,
  Header,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { EmptyState } from "@/shared/components/ui/states";
import { cn } from "@/shared/lib/cn";
import type { PaginationMeta } from "@/shared/api/types";
import { BotonCopiarTabla } from "./copy-table-button";
import { Pagination } from "./pagination";
import { useLocalPagination } from "./use-local-pagination";

/**
 * Metadatos por columna que esta tabla entiende.
 *
 * `pinRight` clava una columna contra el borde derecho mientras el resto se desplaza. Existe por
 * un fallo concreto: la tabla de proveedores externos tiene once columnas y la última es el botón
 * que abre el panel de gestión. A 1.440 px la fila se salía por la derecha y ESE botón —la única
 * acción de la fila— quedaba fuera de la pantalla, sin nada que delatara que había más a la
 * derecha. Se podía llegar arrastrando en horizontal; nadie arrastra lo que no sabe que existe.
 */
export type AtlasColumnMeta = {
  pinRight?: boolean;
};

function pinClasses(column: { columnDef: { meta?: unknown } }): string | false {
  const meta = column.columnDef.meta as AtlasColumnMeta | undefined;
  return (
    meta?.pinRight === true &&
    "sticky right-0 z-[2] shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.15)]"
  );
}

/** Hasta cuántas columnas una tarjeta móvil sigue siendo más corta que desplazar la tabla. */
const MAX_COLUMNAS_APILADAS = 8;

export function DataTable<T>({
  data,
  columns,
  meta,
  onPageChange,
  emptyTitle = "No hay registros para mostrar.",
  emptyDescription = "Cuando haya registros en esta vista, aparecerán aquí.",
  fit = false,
  stack,
}: Readonly<{
  data: T[];
  columns: ColumnDef<T>[];
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /**
   * La tabla se ajusta al ancho disponible y el texto de las celdas se parte, en lugar de desbordar y
   * desplazarse. Por defecto NO: la mayoría de tablas tienen columnas que no deben partirse (ids, cifras)
   * y se desplazan. Lo pide una pantalla que comparte fila con otra cosa —el celular de «Contenido de la
   * app»— y a la que sólo quedan ~500 px: ahí el texto salía cortado a media palabra tras una barra.
   */
  fit?: boolean;
  /**
   * En pantallas de menos de 768 px cada fila se pinta como tarjeta «etiqueta / valor» en vez de
   * desplazarse en horizontal. Por defecto se activa con hasta 8 columnas: con más, la tarjeta sería
   * más larga que el desplazamiento. `stack={false}` lo apaga (cifras que sólo se leen en columna);
   * `stack` a secas lo fuerza.
   */
  stack?: boolean;
}>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const tablaRef = useRef<HTMLTableElement>(null);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Sin `meta` del servidor la tabla llegó entera: se parte aquí, con los mismos controles.
  const local = useLocalPagination(data.length, !meta);
  const filas = table.getRowModel().rows;
  const filasVisibles = local.meta
    ? filas.slice((local.page - 1) * local.limit, local.page * local.limit)
    : filas;
  const apilar =
    stack ?? table.getVisibleLeafColumns().length <= MAX_COLUMNAS_APILADAS;
  const pie = meta ?? local.meta;
  const cambiarPagina = meta ? onPageChange : local.setPage;

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-atlas-border bg-white shadow-subtle">
        <div className="flex items-center justify-between border-b border-atlas-border bg-white px-4 py-2.5">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-atlas-muted">
            Registros
          </p>
          <div className="flex items-center gap-2">
            <BotonCopiarTabla tablaRef={tablaRef} />
            <span className="rounded-md bg-atlas-soft px-2 py-0.5 font-mono text-xs font-medium text-atlas-text">
              {meta?.total ?? data.length}
            </span>
          </div>
        </div>
        {/*
         * Enfocable con el teclado: la región se desplaza (`overflow-auto`) y, en una tabla cuyas
         * celdas no traen enlaces ni botones —las cifras de Inicio, por ejemplo—, no había nada
         * enfocable dentro, así que quien no usa ratón no podía leer las columnas que se salen.
         * axe lo marca como `scrollable-region-focusable`.
         */}
        <div
          role="region"
          aria-label="Tabla de registros"
          tabIndex={0}
          className={cn(
            "atlas-scrollbar atlas-table-scroll max-h-[560px] overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/40",
            apilar && "atlas-stack-region",
          )}
        >
          {/*
           * `select-text` explícito: los botones que hay dentro de muchas celdas —el nombre que
           * abre el detalle, el ordenador de la cabecera— heredan el `user-select: none` que el
           * navegador da a los controles de formulario, y con eso arrastrar sobre la tabla no
           * seleccionaba nada. Una tabla de la que no se puede sacar un identificador para
           * pegarlo en otro sitio obliga a transcribirlo a mano, que es como se cuelan los
           * errores de dígito.
           */}
          <table
            ref={tablaRef}
            // Los roles se repiten sólo al apilar: `display: block` quita la semántica de tabla.
            role={apilar ? "table" : undefined}
            className={cn(
              "w-full select-text border-collapse text-sm",
              fit ? "min-w-0 [&_td]:break-words" : "min-w-max",
              apilar && "atlas-stack",
            )}
          >
            <thead
              role={apilar ? "rowgroup" : undefined}
              className="sticky top-0 z-10 bg-[#F7F7F8] text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-atlas-muted shadow-[0_1px_0_0_theme(colors.atlas.border)]"
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} role={apilar ? "row" : undefined}>
                  {headerGroup.headers.map((header) => (
                    <HeaderCell key={header.id} header={header} />
                  ))}
                </tr>
              ))}
            </thead>
            <tbody
              role={apilar ? "rowgroup" : undefined}
              className="divide-y divide-slate-100"
            >
              {filasVisibles.map((row) => (
                <tr
                  key={row.id}
                  role={apilar ? "row" : undefined}
                  className="group transition-colors duration-100 hover:bg-atlas-soft/70"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      role={apilar ? "cell" : undefined}
                      data-label={etiquetaDe(cell.column.columnDef.header)}
                      className={cn(
                        "select-text px-4 py-3 align-middle text-sm text-atlas-text",
                        // La celda clavada necesita fondo propio —si no, el contenido que pasa
                        // por debajo se le transparenta— y ha de seguir el tinte de la fila al
                        // pasar el ratón, o al hacerlo se recorta un rectángulo blanco.
                        pinClasses(cell.column) &&
                          "bg-white group-hover:bg-[#F4F6F5]",
                        pinClasses(cell.column),
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {pie ? <Pagination meta={pie} onPageChange={cambiarPagina} /> : null}
    </div>
  );
}

/** La etiqueta de una celda apilada: el texto de su cabecera si es texto; las acciones no llevan. */
function etiquetaDe(header: unknown): string {
  return typeof header === "string" ? header : "";
}

function HeaderCell<T>({ header }: Readonly<{ header: Header<T, unknown> }>) {
  const canSort = header.column.getCanSort();
  const sorted = header.column.getIsSorted();
  const label = header.isPlaceholder
    ? null
    : flexRender(header.column.columnDef.header, header.getContext());

  return (
    <th
      // aria-sort le dice al lector de pantalla el estado de ordenación de esta
      // columna; solo se declara donde realmente se puede ordenar.
      aria-sort={
        canSort
          ? sorted === "asc"
            ? "ascending"
            : sorted === "desc"
              ? "descending"
              : "none"
          : undefined
      }
      className={cn(
        "border-b border-atlas-border px-4 py-3 text-left align-middle",
        // El z-30 gana al z-10 de la cabecera pegajosa: la esquina donde se cruzan la fila
        // clavada y la cabecera clavada tiene que pintar una sola vez.
        pinClasses(header.column) && "z-30 bg-[#F7F7F8]",
        pinClasses(header.column),
      )}
    >
      {canSort ? (
        <button
          type="button"
          /*
           * `uppercase` y `tracking` repetidos aquí, y no heredados del `<thead>`.
           *
           * Los navegadores fuerzan `text-transform: none` sobre los controles de formulario, así
           * que la cabecera de una columna ORDENABLE —que es un `<button>`— se salía del estilo:
           * salía «Proveedor» junto a «DETALLE», la única no ordenable de la tabla. Se veía en
           * todas las tablas del portal, pero sólo saltaba a la vista donde conviven los dos
           * tipos de columna.
           */
          className="inline-flex items-center gap-1 text-left uppercase tracking-[0.08em] hover:text-atlas-text"
          onClick={header.column.getToggleSortingHandler()}
        >
          {label}
          {sorted === "asc" ? (
            <ChevronUp className="h-3 w-3" aria-hidden="true" />
          ) : null}
          {sorted === "desc" ? (
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          ) : null}
        </button>
      ) : (
        // Columna no ordenable: texto plano, no un <button> sin acción que el
        // lector de pantalla anunciaría como interactivo en falso.
        <span className="inline-flex items-center gap-1">{label}</span>
      )}
    </th>
  );
}
