/**
 * Quién es la sesión que llama al respaldo de progreso, preguntado a AtlasBackend (ADM-04,
 * auditoría 2026-10-09).
 *
 * El Route Handler `/api/qa-tutorials/progress` no tenía sesión: cualquiera, sin entrar, podía leer
 * o escribir el progreso de cualquier `userId` y engordar un JSON en el disco del contenedor. Ahora
 * el usuario sale SIEMPRE de la sesión, nunca del cuerpo ni de la query: se reenvían al backend las
 * credenciales que trae la petición —la cookie `HttpOnly`, o el `Authorization` en los modos con
 * token— y el `x-tenant-id`, a `GET /api/v1/internal/auth/me`, y se toma `user.id` de lo que
 * responda. Nada más se reenvía: ni el resto de cabeceras ni el cuerpo.
 *
 * ## Por qué hay caché
 *
 * El backend limita `/internal/auth/me` a 100 peticiones por minuto POR IP, y estas llamadas salen
 * todas de la IP del servidor del portal: sin caché, unos pocos operadores avanzando tutoriales a la
 * vez gastarían el cupo de TODOS, y el menú del portal (que pide la misma ruta) empezaría a dar
 * 429. Se guarda la respuesta 30 s por credencial (por su huella SHA-256, nunca el valor), también
 * las negativas: un anónimo que insiste no llega al backend más de una vez cada 30 s por cookie.
 */
import { createHash } from "node:crypto";
import { extractData, parseJsonSafely } from "@/shared/api/response";
import { rawFetch } from "@/shared/api/transport";

/** Las únicas cabeceras que viajan al backend. */
const FORWARDED_HEADERS = ["cookie", "authorization", "x-tenant-id"] as const;

const CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 500;
const ME_TIMEOUT_MS = 5_000;

export type SessionResolution =
  | { kind: "user"; userId: string }
  | { kind: "anonymous" }
  | { kind: "unavailable" };

type CacheEntry = { expiresAt: number; resolution: SessionResolution };

const cache = new Map<string, CacheEntry>();

/** Para las pruebas: la caché vive en el módulo y sobreviviría entre casos. */
export function clearSessionCache(): void {
  cache.clear();
}

function internalApiOrigin(): string {
  const configured = process.env.INTERNAL_API_ORIGIN?.trim();
  return (
    configured && configured.length > 0 ? configured : "http://127.0.0.1:3005"
  ).replace(/\/$/, "");
}

function forwardedHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = { accept: "application/json" };
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  return headers;
}

function cacheKey(headers: Record<string, string>): string {
  const material = FORWARDED_HEADERS.map((name) => headers[name] ?? "").join(
    "\n",
  );
  return createHash("sha256").update(material).digest("hex");
}

function remember(key: string, resolution: SessionResolution): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    // La más antigua primero: `Map` conserva el orden de inserción.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, resolution });
}

function userIdOf(payload: unknown): string | null {
  const profile = extractData<{ user?: { id?: unknown } } | null>(payload);
  const id = profile?.user?.id;
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  if (typeof id === "string" && id.trim().length > 0) return id.trim();
  return null;
}

async function askBackend(
  headers: Record<string, string>,
): Promise<SessionResolution> {
  let response: Response;
  try {
    response = await rawFetch(
      `${internalApiOrigin()}/api/v1/internal/auth/me`,
      { method: "GET", headers, cache: "no-store", redirect: "manual" },
      ME_TIMEOUT_MS,
    );
  } catch {
    return { kind: "unavailable" };
  }
  if (response.status === 401 || response.status === 403) {
    return { kind: "anonymous" };
  }
  if (!response.ok) return { kind: "unavailable" };
  const userId = userIdOf(await parseJsonSafely(response));
  return userId ? { kind: "user", userId } : { kind: "anonymous" };
}

/**
 * El usuario de la sesión que hace la petición. `anonymous` si no hay sesión válida;
 * `unavailable` si el backend no contestó (eso no se cachea: no dice nada de la sesión).
 */
export async function resolveSessionUser(
  request: Request,
): Promise<SessionResolution> {
  const headers = forwardedHeaders(request);
  if (!headers.cookie && !headers.authorization) return { kind: "anonymous" };

  const key = cacheKey(headers);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.resolution;

  const resolution = await askBackend(headers);
  if (resolution.kind !== "unavailable") remember(key, resolution);
  else cache.delete(key);
  return resolution;
}
