/**
 * Reenvío del portal hacia el generador de datos de prueba del mock de proveedores externos.
 *
 * Por qué existe: el navegador del operador no puede hablar con el mock —en un portal desplegado
 * vive en la red interna de Docker (`external-providers-mock:4010`) y la CSP sólo deja `connect-src
 * 'self'`—. El portal lo alcanza desde el servidor y el navegador sólo ve su propio origen.
 *
 * Por qué es tan estrecho: un reenvío genérico sería un proxy abierto hacia la red interna. Aquí
 * sólo pasan tres formas, y todo lo demás responde 404 sin tocar la red:
 *
 *   GET  /api/qa-fakers/fakers          → GET  <origen>/mock/fakers
 *   GET  /api/qa-fakers/fakers/<tipo>   → GET  <origen>/mock/fakers/<tipo>?<query>
 *   POST /api/qa-fakers/fakers/<tipo>   → POST <origen>/mock/fakers/<tipo>  (cuerpo JSON)
 */
export const QA_FAKERS_DEFAULT_ORIGIN = "http://127.0.0.1:4010";
export const QA_FAKERS_TIMEOUT_MS = 8_000;
export const QA_FAKERS_MAX_BODY_BYTES = 16_384;

const TYPE_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,39}$/;

export const QA_FAKERS_UNAVAILABLE_MESSAGE =
  "El generador de datos de prueba no responde. Sin él no se inventan datos: vuelve a intentarlo en un momento o avisa al equipo técnico.";

export type FakerProxyInput = {
  method: string;
  segments: readonly string[];
  search?: string;
  body?: string;
};

export type FakerProxyDeps = {
  origin?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export type FakerProxyResult = {
  status: number;
  body: unknown;
};

export function qaFakersOrigin(): string {
  const configured = process.env.QA_FAKERS_ORIGIN?.trim();
  return (configured || QA_FAKERS_DEFAULT_ORIGIN).replace(/\/+$/, "");
}

/** Traduce la petición del navegador a la ruta del mock, o `null` si no es una de las permitidas. */
export function resolveFakerTarget(
  method: string,
  segments: readonly string[],
): string | null {
  const verb = method.toUpperCase();
  if (segments[0] !== "fakers") return null;
  if (segments.length === 1) return verb === "GET" ? "/mock/fakers" : null;
  if (segments.length !== 2) return null;
  if (verb !== "GET" && verb !== "POST") return null;
  const type = segments[1];
  return TYPE_PATTERN.test(type) ? `/mock/fakers/${type}` : null;
}

function error(status: number, code: string, detail: string): FakerProxyResult {
  return { status, body: { ok: false, error: code, detail } };
}

export async function proxyFakerRequest(
  input: FakerProxyInput,
  deps: FakerProxyDeps = {},
): Promise<FakerProxyResult> {
  const target = resolveFakerTarget(input.method, input.segments);
  if (!target) {
    return error(
      404,
      "QA_FAKERS_ROUTE_NOT_ALLOWED",
      "Esta ruta no es del generador de datos de prueba.",
    );
  }
  const isPost = input.method.toUpperCase() === "POST";
  if (isPost && (input.body ?? "").length > QA_FAKERS_MAX_BODY_BYTES) {
    return error(
      413,
      "QA_FAKERS_BODY_TOO_LARGE",
      "La petición es demasiado grande.",
    );
  }
  const origin = (deps.origin ?? qaFakersOrigin()).replace(/\/+$/, "");
  const search = !isPost && input.search ? input.search : "";
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    deps.timeoutMs ?? QA_FAKERS_TIMEOUT_MS,
  );
  try {
    const response = await (deps.fetchImpl ?? fetch)(
      `${origin}${target}${search}`,
      {
        method: isPost ? "POST" : "GET",
        headers: {
          accept: "application/json",
          ...(isPost ? { "content-type": "application/json" } : {}),
        },
        body: isPost ? (input.body ?? "{}") : undefined,
        signal: controller.signal,
        cache: "no-store",
      },
    );
    const text = await response.text();
    try {
      return { status: response.status, body: JSON.parse(text) as unknown };
    } catch {
      return error(
        502,
        "QA_FAKERS_BAD_RESPONSE",
        "El generador de datos de prueba respondió algo que no es JSON.",
      );
    }
  } catch {
    return error(503, "QA_FAKERS_UNAVAILABLE", QA_FAKERS_UNAVAILABLE_MESSAGE);
  } finally {
    clearTimeout(timer);
  }
}
