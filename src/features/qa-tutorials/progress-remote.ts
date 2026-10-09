/**
 * Cliente del endpoint portal-owned de progreso. Usa `fetch` a same-origin
 * (Next Route Handler), no el cliente API de AtlasBackend: por eso está
 * allowlisted en check-source-boundaries.mjs.
 *
 * No manda el usuario: el servidor lo saca de la sesión (ADM-04). Manda lo que el servidor
 * necesita para preguntarle al backend quién es la sesión: la cookie `HttpOnly` va sola (mismo
 * origen); el `Authorization` sólo existe en los modos con token, y el tenant, siempre.
 */
import { getStoredInternalSession } from "@/shared/auth/session-storage";
import type { TutorialProgress } from "./types";

const ENDPOINT = "/api/qa-tutorials/progress";

function sessionHeaders(): Record<string, string> {
  const session = getStoredInternalSession();
  const tenantId =
    session?.user.tenantId ?? process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;
  return {
    ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    ...(session?.accessToken
      ? { authorization: `Bearer ${session.accessToken}` }
      : {}),
  };
}

export async function fetchRemoteProgress(): Promise<TutorialProgress[]> {
  const response = await fetch(ENDPOINT, {
    headers: { accept: "application/json", ...sessionHeaders() },
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error(`No se pudo cargar el progreso (${response.status})`);
  }
  const data = (await response.json()) as { items?: TutorialProgress[] };
  return data.items ?? [];
}

export async function saveRemoteProgress(
  progress: TutorialProgress,
): Promise<TutorialProgress[]> {
  const response = await fetch(ENDPOINT, {
    method: "PUT",
    headers: { "content-type": "application/json", ...sessionHeaders() },
    credentials: "same-origin",
    body: JSON.stringify({ progress }),
  });
  if (!response.ok) {
    throw new Error(`No se pudo guardar el progreso (${response.status})`);
  }
  const data = (await response.json()) as { items?: TutorialProgress[] };
  return data.items ?? [];
}
