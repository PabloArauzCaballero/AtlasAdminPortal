/**
 * Store del progreso de tutoriales, lado servidor: un fichero JSON en el tmp del contenedor,
 * indexado por usuario.
 *
 * NO es la fuente de verdad. La fuente es el NAVEGADOR (`use-tutorial-progress.ts` escribe primero
 * allí); esto es un RESPALDO que se pierde en cada despliegue y que puede fallar sin deshacer nada.
 * (Hasta el 2026-10-09 este comentario decía lo contrario, «fuente de verdad del backend», y la ruta
 * decía «NO es la fuente de verdad»: ADM-15.)
 *
 * Con topes (ADM-04): como mucho `MAX_TUTORIALS_PER_USER` tutoriales por usuario y
 * `MAX_USERS` usuarios; al pasarse de usuarios se olvida al de actividad más vieja, que sigue
 * teniendo su progreso en su navegador.
 *
 * La lógica de fusión (`upsertProgress`) es pura y testeable; el acceso a disco está aislado en
 * funciones finas para poder sustituirlo por AtlasBackend cuando exponga estos endpoints.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TutorialProgress } from "../types";

export type UserProgressStore = Record<
  string,
  Record<string, TutorialProgress>
>;

const STORE_DIR = path.join(tmpdir(), "atlas-qa-tutorials");
const STORE_FILE = path.join(STORE_DIR, "progress.json");

export const MAX_TUTORIALS_PER_USER = 300;
export const MAX_USERS = 500;

/** Un tutorial NUEVO para un usuario que ya tiene el máximo: se rechaza, no se pisa otro. */
export class ProgressLimitError extends Error {
  constructor() {
    super("Se alcanzó el máximo de tutoriales guardados para este usuario.");
    this.name = "ProgressLimitError";
  }
}

function lastActivity(entries: Record<string, TutorialProgress>): string {
  return Object.values(entries).reduce(
    (latest, item) =>
      (item.lastActivityAt ?? "") > latest
        ? (item.lastActivityAt ?? "")
        : latest,
    "",
  );
}

/** Si el store tiene `MAX_USERS` o más, quita a los de actividad más vieja hasta dejar sitio. */
function withRoomForUser(
  store: UserProgressStore,
  userId: string,
): UserProgressStore {
  const others = Object.keys(store).filter((id) => id !== userId);
  if (others.length < MAX_USERS) return store;
  const byAge = others.sort((a, b) =>
    lastActivity(store[a] ?? {}).localeCompare(lastActivity(store[b] ?? {})),
  );
  const toDrop = new Set(byAge.slice(0, others.length - MAX_USERS + 1));
  return Object.fromEntries(
    Object.entries(store).filter(([id]) => !toDrop.has(id)),
  );
}

/** Las entradas propias del usuario; `hasOwn` para que `constructor` o similares no hereden nada. */
function entriesOf(
  store: UserProgressStore,
  userId: string,
): Record<string, TutorialProgress> {
  return Object.hasOwn(store, userId) ? (store[userId] ?? {}) : {};
}

/** Fusión pura: aplica el progreso entrante sobre el store existente. */
export function upsertProgress(
  store: UserProgressStore,
  userId: string,
  progress: TutorialProgress,
): UserProgressStore {
  const forUser = entriesOf(store, userId);
  const isNew = !Object.hasOwn(forUser, progress.tutorialId);
  if (isNew && Object.keys(forUser).length >= MAX_TUTORIALS_PER_USER) {
    throw new ProgressLimitError();
  }
  const base = Object.hasOwn(store, userId)
    ? store
    : withRoomForUser(store, userId);
  return {
    ...base,
    [userId]: { ...forUser, [progress.tutorialId]: progress },
  };
}

export function progressForUser(
  store: UserProgressStore,
  userId: string,
): TutorialProgress[] {
  return Object.values(entriesOf(store, userId));
}

async function readStore(): Promise<UserProgressStore> {
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as UserProgressStore)
      : {};
  } catch {
    // Sin fichero todavía (primer uso) o JSON corrupto: arrancamos vacíos.
    return {};
  }
}

async function writeStore(store: UserProgressStore): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(store), "utf8");
}

/** Lee el progreso persistido de un usuario. */
export async function loadProgress(
  userId: string,
): Promise<TutorialProgress[]> {
  const store = await readStore();
  return progressForUser(store, userId);
}

/** Persiste (upsert) un progreso y devuelve el estado resultante del usuario. */
export async function saveProgress(
  userId: string,
  progress: TutorialProgress,
): Promise<TutorialProgress[]> {
  const store = await readStore();
  const next = upsertProgress(store, userId, progress);
  await writeStore(next);
  return progressForUser(next, userId);
}
