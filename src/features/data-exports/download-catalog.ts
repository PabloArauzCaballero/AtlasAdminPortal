import { apiRequest } from "@/shared/api/client";
import { fetchAllPages } from "@/shared/api/fetch-all-pages";
import { normalizePaginatedResponse } from "@/features/systems/normalizers";

/**
 * La ruta que el backend publica como `downloadUrl` lleva el prefijo de la API (`/api/v1/...`);
 * `apiRequest` ya lo pone. Sólo se aceptan rutas relativas de la propia API: una URL absoluta o de
 * otro origen no se sigue.
 */
export function catalogPath(
  downloadUrl: string | null | undefined,
): string | null {
  const raw = downloadUrl?.trim();
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw.replace(/^\/api\/v1(?=\/)/, "");
}

/**
 * Descarga el catálogo ENTERO como JSON, página a página, con la sesión de quien pulsa.
 *
 * Antes el botón abría la ruta en una pestaña nueva: salía la primera página (20 filas de 809) en
 * crudo, sin la cabecera del inquilino. Esto trae todas las filas y las guarda como archivo.
 */
export async function downloadCatalog(
  downloadUrl: string | null | undefined,
  fileName: string,
): Promise<number> {
  const path = catalogPath(downloadUrl);
  if (!path)
    throw new Error("Este catálogo no tiene una ruta de descarga válida.");

  const all = await fetchAllPages(async (page, limit) =>
    normalizePaginatedResponse<unknown>(
      await apiRequest<unknown>(path, { query: { page, limit } }),
      ["items", "records", "results"],
    ),
  );

  const blob = new Blob([JSON.stringify(all.items, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return all.items.length;
}
