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
import { Check, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { EmptyState } from "@/shared/components/ui/states";
import { cn } from "@/shared/lib/cn";
import type { PaginationMeta } from "@/shared/api/types";
import { Pagination } from "./pagination";

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

export function DataTable<T>({
  data,
  columns,
  meta,
  onPageChange,
  emptyTitle = "No hay registros para mostrar.",
  emptyDescription = "Aún no hay configuración registrada para este apartado.",
}: Readonly<{
  data: T[];
  columns: ColumnDef<T>[];
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
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
        <div className="atlas-scrollbar atlas-table-scroll max-h-[560px] overflow-auto">
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
            className="w-full min-w-max select-text border-collapse text-sm"
          >
            <thead className="sticky top-0 z-10 bg-[#F7F7F8] text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-atlas-muted shadow-[0_1px_0_0_theme(colors.atlas.border)]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <HeaderCell key={header.id} header={header} />
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="group transition-colors duration-100 hover:bg-atlas-soft/70"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
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
      {meta ? <Pagination meta={meta} onPageChange={onPageChange} /> : null}
    </div>
  );
}

/**
 * Copiar la tabla entera al portapapeles, tal y como se ve.
 *
 * Se lee del DOM y no de `data` a propósito: lo que interesa pegar en una hoja de cálculo o en un
 * ticket es lo que la pantalla muestra —la fecha ya formateada, la etiqueta del estado en
 * castellano—, no el JSON crudo del que salió. Va separado por tabuladores porque es el formato
 * que Excel, Sheets y Numbers pegan en columnas sin preguntar nada.
 *
 * Se saltan las columnas sin cabecera: son las de acciones, y su texto («Renombrar», «A la
 * papelera») no es un dato de la fila.
 */
function BotonCopiarTabla({
  tablaRef,
}: Readonly<{ tablaRef: React.RefObject<HTMLTableElement | null> }>) {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    const tabla = tablaRef.current;
    if (!tabla) return;

    const cabeceras = [...tabla.querySelectorAll("thead th")].map(textoDe);
    const columnas = cabeceras
      .map((texto, indice) => (texto.length > 0 ? indice : -1))
      .filter((indice) => indice >= 0);
    if (columnas.length === 0) return;

    const filas = [...tabla.querySelectorAll("tbody tr")].map((fila) => {
      const celdas = [...fila.querySelectorAll("td")];
      return columnas.map((indice) => textoDe(celdas[indice])).join("\t");
    });

    const tsv = [columnas.map((i) => cabeceras[i]).join("\t"), ...filas].join(
      "\n",
    );
    void navigator.clipboard.writeText(tsv).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    });
  }

  return (
    <button
      type="button"
      onClick={copiar}
      title="Copiar la tabla al portapapeles"
      className="inline-flex items-center gap-1.5 rounded-md border border-atlas-border px-2 py-1 text-xs text-atlas-muted transition-colors hover:border-slate-300 hover:text-atlas-text"
    >
      {copiado ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}

/** El texto visible de una celda, en una sola línea y sin los espacios del marcado. */
function textoDe(elemento: Element | undefined): string {
  return (elemento?.textContent ?? "").replace(/\s+/g, " ").trim();
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
