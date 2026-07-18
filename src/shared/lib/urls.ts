const SAFE_EXTERNAL_PROTOCOLS = new Set(["https:"]);
const LOCALHOST_NAMES = new Set(["localhost", "127.0.0.1", "::1"]);

const SPACE_CODE_POINT = 0x20;
const DELETE_CODE_POINT = 0x7f;

/**
 * Caracteres de control (C0 y DEL). Se comprueban por code point y no con una
 * clase de regex para que el rango quede explícito y legible en el fuente.
 */
function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint < SPACE_CODE_POINT || codePoint === DELETE_CODE_POINT) {
      return true;
    }
  }
  return false;
}

/**
 * Ruta interna navegable sin salir del portal.
 *
 * No basta con `startsWith("/")`: `//evil.com` y `/\evil.com` empiezan por `/`
 * y los navegadores los resuelven como URL protocol-relative, es decir, una
 * redirección abierta a otro host. Tampoco se delega en `isSafeExternalUrl`,
 * que aceptaría cualquier origen https: un resultado de búsqueda interno no
 * tiene por qué navegar fuera del portal.
 *
 * No usa `window`: se llama al normalizar la respuesta, también fuera del DOM.
 */
export function isSafeInternalPath(value: string): boolean {
  if (typeof value !== "string" || !value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  return !hasControlCharacters(value);
}

/**
 * `URL.hostname` devuelve las direcciones IPv6 entre corchetes (`[::1]`), así
 * que la entrada `::1` de la allowlist nunca casaría contra el valor crudo. Se
 * quitan aquí para que el set siga escrito con nombres de host legibles.
 */
function bareHostname(parsed: URL): string {
  return parsed.hostname.replace(/^\[(.*)\]$/, "$1");
}

export function isSafeExternalUrl(value: string): boolean {
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin === window.location.origin) return true;
    if (SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol)) return true;
    return (
      parsed.protocol === "http:" && LOCALHOST_NAMES.has(bareHostname(parsed))
    );
  } catch {
    return false;
  }
}
