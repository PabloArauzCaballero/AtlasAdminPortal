/**
 * Las versiones de ayuda en curso, guardadas en `localStorage` por persona.
 *
 * NO es la fuente de verdad: el servidor no ofrece lista de borradores ni de revisiones pendientes,
 * así que esto sólo evita que quien redacta pierda el número de versión al recargar. El estado real
 * lo decide el servidor en cada acción. La clave lleva el usuario para que dos personas que
 * comparten navegador no vean la lista de la otra.
 *
 * Fichero en la lista permitida de check-source-boundaries.mjs (uso de localStorage).
 */
import type { TrackedVersion } from "./knowledge-types";

const PREFIJO = "atlas.soporte.conocimiento.versiones:";
export const TOPE_VERSIONES = 20;

export function readTrackedVersions(userId: string): TrackedVersion[] {
  if (typeof window === "undefined") return [];
  try {
    const crudo = window.localStorage.getItem(`${PREFIJO}${userId}`);
    const valor: unknown = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(valor) ? (valor as TrackedVersion[]) : [];
  } catch {
    return [];
  }
}

export function writeTrackedVersions(
  userId: string,
  versiones: TrackedVersion[],
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${PREFIJO}${userId}`,
      JSON.stringify(versiones.slice(0, TOPE_VERSIONES)),
    );
  } catch {
    // Ventana privada o cuota llena: la lista vive sólo mientras la pantalla esté abierta.
  }
}
