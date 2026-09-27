/**
 * Progreso en `localStorage`: es la FUENTE del progreso. La copia de
 * `/api/qa-tutorials/progress` vive en el `/tmp` del contenedor y se pierde en
 * cada despliegue, así que sólo es un respaldo que se fusiona al leer.
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

/**
 * Corrida ACTIVA (qué tutorial y qué paso está abierto ahora mismo), en
 * `sessionStorage`: sobrevive a un F5 y a cualquier remontaje del árbol de
 * React, y muere al cerrar la pestaña. Sin esto, el usuario que recarga a
 * mitad de un recorrido lo pierde sin aviso.
 */
const ACTIVE_KEY = "qa-tutorials-active-run";

export type ActiveRun = Readonly<{ tutorialId: string; stepIndex: number }>;

export function readActiveRun(): ActiveRun | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveRun>;
    if (typeof parsed.tutorialId !== "string") return null;
    return {
      tutorialId: parsed.tutorialId,
      stepIndex: Number.isInteger(parsed.stepIndex)
        ? Number(parsed.stepIndex)
        : 0,
    };
  } catch {
    return null;
  }
}

export function writeActiveRun(run: ActiveRun | null): void {
  if (typeof window === "undefined") return;
  try {
    if (run) window.sessionStorage.setItem(ACTIVE_KEY, JSON.stringify(run));
    else window.sessionStorage.removeItem(ACTIVE_KEY);
  } catch {
    // best-effort
  }
}

/**
 * Recorrido en curso (Centro de aprendizaje → «Empezar recorrido»): qué tutoriales quedan por
 * delante. En `sessionStorage` por la misma razón que la corrida activa: sobrevive a un F5.
 */
const PATH_KEY = "qa-tutorials-path-queue";

export type PathQueue = Readonly<{
  pathId: string;
  title: string;
  remaining: readonly string[];
}>;

export function readPathQueue(): PathQueue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PATH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PathQueue>;
    if (typeof parsed.pathId !== "string" || !Array.isArray(parsed.remaining)) {
      return null;
    }
    return {
      pathId: parsed.pathId,
      title: typeof parsed.title === "string" ? parsed.title : "",
      remaining: parsed.remaining.filter(
        (id): id is string => typeof id === "string",
      ),
    };
  } catch {
    return null;
  }
}

export function writePathQueue(queue: PathQueue | null): void {
  if (typeof window === "undefined") return;
  try {
    if (queue) window.sessionStorage.setItem(PATH_KEY, JSON.stringify(queue));
    else window.sessionStorage.removeItem(PATH_KEY);
  } catch {
    // best-effort
  }
}
