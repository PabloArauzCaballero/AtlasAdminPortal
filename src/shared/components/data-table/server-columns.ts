import type { ColumnDef } from "@tanstack/react-table";

/**
 * Columnas de una tabla PAGINADA EN EL SERVIDOR, sin ordenación en cliente.
 *
 * `DataTable` ordena con `getSortedRowModel`, es decir, sólo las filas de la página cargada. En una
 * lista paginada en el servidor eso promete un orden global que no existe: pulsar «Tabla» ordenaba
 * 20 filas de 186 y parecía el catálogo entero. El orden lo decide el servidor; la cabecera no se
 * ofrece como ordenable.
 */
export function serverPagedColumns<T>(columns: ColumnDef<T>[]): ColumnDef<T>[] {
  return columns.map((column) => ({ ...column, enableSorting: false }));
}
