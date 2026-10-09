import { NextResponse } from "next/server";
import {
  loadProgress,
  ProgressLimitError,
  saveProgress,
} from "@/features/qa-tutorials/server/progress-store";
import {
  resolveSessionUser,
  type SessionResolution,
} from "@/features/qa-tutorials/server/session-user";
import { saveProgressRequestSchema } from "@/features/qa-tutorials/progress-schema";

/**
 * Respaldo del progreso de tutoriales, portal-owned (Next Route Handler).
 *
 * NO es la fuente de verdad: guarda en el `/tmp` del contenedor, que se pierde en cada despliegue.
 * La fuente es el almacenamiento local del navegador (`use-tutorial-progress.ts`); si esto falla,
 * el progreso sigue allí.
 *
 * Con sesión (ADM-04, auditoría 2026-10-09): el usuario sale SIEMPRE de la sesión que valida
 * AtlasBackend (`session-user.ts`), nunca del cuerpo ni de la query, así que nadie lee ni escribe
 * el progreso de otro. Sin sesión, 401; si el backend no contesta, 503 (el cliente sigue con lo
 * del navegador). Cuando AtlasBackend exponga estos endpoints, el cliente se reapunta ahí.
 */
export const dynamic = "force-dynamic";

/** El cuerpo de un PUT es un progreso de ~300 bytes: 16 KB es holgado y corta abusos. */
const MAX_BODY_BYTES = 16 * 1024;

function rejectWithoutUser(
  session: Exclude<SessionResolution, { kind: "user" }>,
) {
  return session.kind === "unavailable"
    ? NextResponse.json(
        { error: "No se pudo comprobar la sesión. Intenta más tarde." },
        { status: 503 },
      )
    : NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
}

/** GET /api/qa-tutorials/progress → progresos de la sesión que llama. */
export async function GET(request: Request) {
  const session = await resolveSessionUser(request);
  if (session.kind !== "user") return rejectWithoutUser(session);
  const items = await loadProgress(session.userId);
  return NextResponse.json({ items });
}

async function readBody(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) throw new RangeError("too-large");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new RangeError("too-large");
  }
  return JSON.parse(text);
}

/** PUT /api/qa-tutorials/progress → upsert de un progreso de la sesión que llama. */
export async function PUT(request: Request) {
  // La sesión ANTES de leer el cuerpo: un anónimo no llega ni a mandar bytes al disco.
  const session = await resolveSessionUser(request);
  if (session.kind !== "user") return rejectWithoutUser(session);

  let body: unknown;
  try {
    body = await readBody(request);
  } catch (error) {
    return error instanceof RangeError
      ? NextResponse.json(
          { error: "Los datos enviados son demasiado grandes." },
          { status: 413 },
        )
      : NextResponse.json(
          { error: "Los datos enviados no se pudieron leer." },
          { status: 400 },
        );
  }
  const parsed = saveProgressRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Los datos del progreso no son válidos.",
        issues: parsed.error.issues,
      },
      { status: 422 },
    );
  }
  try {
    const items = await saveProgress(session.userId, parsed.data.progress);
    return NextResponse.json({ items });
  } catch (error) {
    if (!(error instanceof ProgressLimitError)) throw error;
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
}
