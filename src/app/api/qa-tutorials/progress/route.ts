import { NextResponse } from "next/server";
import {
  loadProgress,
  saveProgress,
} from "@/features/qa-tutorials/server/progress-store";
import { saveProgressRequestSchema } from "@/features/qa-tutorials/progress-schema";

/**
 * Persistencia del progreso de tutoriales, portal-owned (Next Route Handler).
 * Es la fuente de verdad del backend para el progreso: el cliente mantiene una
 * caché local sólo como aceleración. Cuando AtlasBackend exponga estos
 * endpoints, el cliente se reapunta ahí sin cambiar la UI.
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
