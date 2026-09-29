import type { ColumnDef } from "@tanstack/react-table";

/**
 * Quita la ordenación de cabecera a las columnas de una tabla paginada EN EL SERVIDOR.
 *
 * `DataTable` ordena en el cliente (`getSortedRowModel`): con una página de 20 filas de un total de
 * 500, la flecha de la cabecera sólo reordenaba esas 20 y parecía ordenar la cola entera. Mientras
 * el servidor no ordene por columna, la tabla no lo promete.
 */
export function withoutClientSorting<T>(
  columns: ColumnDef<T>[],
): ColumnDef<T>[] {
  return columns.map((column) => ({ ...column, enableSorting: false }));
}
