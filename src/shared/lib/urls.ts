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
 * redirección abierta a otro host. Un resultado de búsqueda interno no tiene por
 * qué navegar fuera del portal, así que aquí no hay validador de URL externas:
 * el que existía (`isSafeExternalUrl`) no lo usaba nadie y aceptaba cualquier
 * origen https; se borró (ADM-15, auditoría 2026-10-09) para que nadie lo
 * reutilizara creyéndolo una lista de destinos permitidos.
 *
 * No usa `window`: se llama al normalizar la respuesta, también fuera del DOM.
 */
export function isSafeInternalPath(value: string): boolean {
  if (typeof value !== "string" || !value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  return !hasControlCharacters(value);
}
