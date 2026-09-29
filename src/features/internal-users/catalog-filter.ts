import type { InternalPermission, InternalRole } from "./types";

/**
 * Búsqueda sobre el catálogo COMPLETO de roles o de permisos.
 *
 * Aquí sí se filtra en el navegador, y es deliberado: `GET /internal/roles` y
 * `GET /internal/permissions` devuelven el catálogo entero —está versionado en el código del
 * servidor, son unos cientos de filas como mucho y no crece con los datos de nadie—, así que lo
 * que se filtra no es «la página cargada» sino todo lo que existe. Antes la pantalla mandaba
 * `limit` que el servidor ignoraba y el servidor cortaba en silencio a 1.000; ya no hay ni una
 * cosa ni la otra.
 */
function normalizar(texto: string | null | undefined): string {
  return (texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function contiene(campos: Array<string | null | undefined>, q: string) {
  const buscado = normalizar(q.trim());
  if (!buscado) return true;
  return campos.some((campo) => normalizar(campo).includes(buscado));
}

export function filterPermissions(
  items: readonly InternalPermission[],
  q: string,
  module: string,
): InternalPermission[] {
  return items.filter(
    (permiso) =>
      (!module || permiso.module === module) &&
      contiene(
        [permiso.key, permiso.module, permiso.action, permiso.description],
        q,
      ),
  );
}

export function filterRoles(
  items: readonly InternalRole[],
  q: string,
): InternalRole[] {
  return items.filter((rol) =>
    contiene([rol.code, rol.name, rol.description], q),
  );
}

/** Los módulos que existen en el catálogo completo, sin repetir y en orden alfabético. */
export function permissionModules(
  items: readonly InternalPermission[],
): string[] {
  return [...new Set(items.map((permiso) => permiso.module))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"));
}
