/**
 * Caché de progreso en `localStorage`. NO es la fuente de verdad (lo es el
 * backend vía `/api/qa-tutorials/progress`): sólo evita el parpadeo mientras
 * llega la respuesta del servidor y permite mostrar progreso offline.
 *
 * Fichero allowlisted en check-source-boundaries.mjs (uso de localStorage).
 */
import type { TutorialProgress } from "./types";

const PREFIX = "qa-tutorials-progress:";

function keyFor(userId: string): string {
  return `${PREFIX}${userId}`;
}

export function readProgressCache(userId: string): TutorialProgress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TutorialProgress[]) : [];
  } catch {
    return [];
  }
}

export function writeProgressCache(
  userId: string,
  items: TutorialProgress[],
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(items));
  } catch {
    // Cuota llena o storage deshabilitado: la caché es best-effort.
  }
}
