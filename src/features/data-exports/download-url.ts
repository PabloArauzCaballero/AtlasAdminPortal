/**
 * El backend entrega `downloadUrl` **relativo al API** (p. ej.
 * `/api/v1/systems/endpoints`), no al portal. Si se abre tal cual, el navegador
 * lo resuelve contra el origen del portal (`:5273`), que no sirve `/api/*`, y el
 * operador termina en la página 404 en vez de en su exportación.
 *
 * Cuando el backend pase a devolver URLs firmadas absolutas (S3 o equivalente),
 * esas se respetan sin tocar.
 */
export function resolveExportDownloadUrl(
  downloadUrl: string | null | undefined,
  apiBaseUrl: string,
): string | null {
  const raw = downloadUrl?.trim();
  if (!raw) return null;

  // Protocol-relative (`//host/x`) hereda el esquema y apunta a otro host: es un
  // destino externo disfrazado de ruta interna. Se rechaza antes de resolver.
  if (raw.startsWith("//")) return null;

  // Ya es absoluta (URL firmada o endpoint propio): se usa tal cual.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw;

  try {
    const base = new URL(apiBaseUrl);
    if (raw.startsWith("/")) return new URL(raw, base.origin).toString();
    // Relativa sin barra inicial: cuelga del path base del API.
    const basePath = base.pathname.replace(/\/?$/, "/");
    return new URL(raw, `${base.origin}${basePath}`).toString();
  } catch {
    return null;
  }
}
