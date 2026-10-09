import { NextResponse } from "next/server";
import {
  proxyFakerRequest,
  QA_FAKERS_MAX_BODY_BYTES,
} from "@/features/qa-lab/fakers/faker-proxy";
import { leerCuerpoConTope } from "@/shared/lib/cuerpo-con-tope";

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
  let body: string | undefined;
  if (request.method === "POST") {
    // Con tope al LEER, no después: `request.text()` cargaba el cuerpo entero (ADM-09).
    const leido = await leerCuerpoConTope(
      request.body,
      QA_FAKERS_MAX_BODY_BYTES,
    ).catch(() => ({ ok: true as const, bytes: new Uint8Array(0) }));
    if (!leido.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "QA_FAKERS_BODY_TOO_LARGE",
          detail: "La petición es demasiado grande.",
        },
        { status: 413, headers: { "cache-control": "no-store" } },
      );
    }
    body = new TextDecoder().decode(leido.bytes);
  }
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
