import { NextResponse } from "next/server";
import {
  loadProgress,
  saveProgress,
} from "@/features/qa-tutorials/server/progress-store";
import { saveProgressRequestSchema } from "@/features/qa-tutorials/progress-schema";

/**
 * Respaldo del progreso de tutoriales, portal-owned (Next Route Handler).
 *
 * NO es la fuente de verdad: guarda en el `/tmp` del contenedor, que se pierde en cada
 * despliegue, y no comprueba la sesión (no es dato sensible, pero cualquiera puede escribir el
 * progreso de cualquier `userId`). La fuente es el el almacenamiento local del navegador
 * (`use-tutorial-progress.ts`). Cuando AtlasBackend exponga estos endpoints, con sesión, el
 * cliente se reapunta ahí.
 */
export const dynamic = "force-dynamic";

/** GET /api/qa-tutorials/progress?userId=... → lista de progresos del usuario. */
export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  }
  const items = await loadProgress(userId);
  return NextResponse.json({ items });
}

/** PUT /api/qa-tutorials/progress → upsert de un progreso. */
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = saveProgressRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const items = await saveProgress(parsed.data.userId, parsed.data.progress);
  return NextResponse.json({ items });
}
