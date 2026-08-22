/**
 * Cliente del endpoint portal-owned de progreso. Usa `fetch` a same-origin
 * (Next Route Handler), no el cliente API de AtlasBackend: por eso está
 * allowlisted en check-source-boundaries.mjs.
 */
import type { TutorialProgress } from "./types";

const ENDPOINT = "/api/qa-tutorials/progress";

export async function fetchRemoteProgress(
  userId: string,
): Promise<TutorialProgress[]> {
  const response = await fetch(
    `${ENDPOINT}?userId=${encodeURIComponent(userId)}`,
    { headers: { accept: "application/json" } },
  );
  if (!response.ok) {
    throw new Error(`No se pudo cargar el progreso (${response.status})`);
  }
  const data = (await response.json()) as { items?: TutorialProgress[] };
  return data.items ?? [];
}

export async function saveRemoteProgress(
  userId: string,
  progress: TutorialProgress,
): Promise<TutorialProgress[]> {
  const response = await fetch(ENDPOINT, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, progress }),
  });
  if (!response.ok) {
    throw new Error(`No se pudo guardar el progreso (${response.status})`);
  }
  const data = (await response.json()) as { items?: TutorialProgress[] };
  return data.items ?? [];
}
