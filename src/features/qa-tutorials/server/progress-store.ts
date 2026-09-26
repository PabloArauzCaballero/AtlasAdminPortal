/**
 * Store del progreso de tutoriales, lado servidor. Fuente de verdad del
 * backend (portal-owned): un fichero JSON en el tmp del sistema, keyeado por
 * usuario. La caché del navegador en el cliente es sólo lectura rápida.
 *
 * La lógica de fusión (`upsertProgress`) es pura y testeable; el acceso a disco
 * está aislado en funciones finas para poder mockearlo o sustituirlo por el
 * backend real (AtlasBackend) cuando exponga estos endpoints.
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

/** Fusión pura: aplica el progreso entrante sobre el store existente. */
export function upsertProgress(
  store: UserProgressStore,
  userId: string,
  progress: TutorialProgress,
): UserProgressStore {
  const forUser = store[userId] ?? {};
  return {
    ...store,
    [userId]: { ...forUser, [progress.tutorialId]: progress },
  };
}

export function progressForUser(
  store: UserProgressStore,
  userId: string,
): TutorialProgress[] {
  return Object.values(store[userId] ?? {});
}

async function readStore(): Promise<UserProgressStore> {
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    return JSON.parse(raw) as UserProgressStore;
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
