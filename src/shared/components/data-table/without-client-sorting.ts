import type { ColumnDef } from "@tanstack/react-table";

/**
 * `DataTable` ordena en el navegador (`getSortedRowModel`). Con paginación en el servidor, una
 * cabecera ordenable sólo reordena las 20 filas cargadas y parece un orden global que no es. Las
 * tablas paginadas en servidor pasan sus columnas por aquí: el orden lo decide AtlasBackend.
 */
export function withoutClientSorting<T>(
  columns: ColumnDef<T>[],
): ColumnDef<T>[] {
  return columns.map((column) => ({ ...column, enableSorting: false }));
}
