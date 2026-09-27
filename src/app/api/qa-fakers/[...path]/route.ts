import { NextResponse } from "next/server";
import { proxyFakerRequest } from "@/features/qa-lab/fakers/faker-proxy";

/**
 * Reenvío acotado al generador de datos de prueba (ver `faker-proxy.ts`): sólo el catálogo y los
 * lotes de `/mock/fakers`. Los datos que devuelve son sintéticos y no cambian estado, así que no
 * pide sesión; lo que protege es la ESTRECHEZ de las rutas, no un token.
 */
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path?: string[] }> };

async function handle(request: Request, context: RouteContext) {
  const { path = [] } = await context.params;
  const url = new URL(request.url);
  const body =
    request.method === "POST"
      ? await request.text().catch(() => "")
      : undefined;
  const result = await proxyFakerRequest({
    method: request.method,
    segments: path,
    search: url.search,
    body,
  });
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { "cache-control": "no-store" },
  });
}

export const GET = handle;
export const POST = handle;
