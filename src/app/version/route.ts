import { join } from "node:path";
import { NextResponse } from "next/server";
import { servedCommit } from "@/shared/lib/build-identity";

export const dynamic = "force-dynamic";

/**
 * Identidad del proceso público, independiente de la punta actual de GitHub.
 *
 * El commit sale de `build-info.json`, sellado en la imagen al construir; `APP_COMMIT_SHA` sólo
 * cuenta si el archivo falta. Ver `src/shared/lib/build-identity.ts`.
 */
export function GET() {
  return NextResponse.json(
    {
      service: "atlas-admin-portal",
      version: process.env.APP_VERSION ?? "unknown",
      commit: servedCommit(
        join(process.cwd(), "build-info.json"),
        process.env.APP_COMMIT_SHA,
      ),
      environment: process.env.NODE_ENV ?? "unknown",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
