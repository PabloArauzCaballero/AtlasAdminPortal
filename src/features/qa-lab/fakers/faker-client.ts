/**
 * Cliente del generador de datos de prueba. Va al reenvío del MISMO origen (`/api/qa-fakers`), no
 * al cliente de AtlasBackend: por eso usa `fetch` y está en la lista de `check-source-boundaries`.
 */
import type {
  FakerBatch,
  FakerBatchRequest,
  FakerCatalog,
  FakerContext,
  FakerParamValues,
  FakerVariant,
} from "./faker-types";

const BASE = "/api/qa-fakers/fakers";

export const FAKER_UNAVAILABLE_TEXT =
  "El generador de datos de prueba no responde. Sin él no se inventan datos: vuelve a intentarlo en un momento o avisa a quien mantiene el mock de proveedores externos.";

export class FakerError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: { param: string; detail: string }[];

  constructor(input: {
    code: string;
    status: number;
    message: string;
    details?: { param: string; detail: string }[];
  }) {
    super(input.message);
    this.name = "FakerError";
    this.code = input.code;
    this.status = input.status;
    this.details = input.details ?? [];
  }
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { accept: "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new FakerError({
      code: "QA_FAKERS_UNAVAILABLE",
      status: 0,
      message: FAKER_UNAVAILABLE_TEXT,
    });
  }
  const body = await readJson(response);
  if (response.ok) return body as T;
  const code = typeof body.error === "string" ? body.error : "QA_FAKERS_ERROR";
  const details = Array.isArray(body.errors)
    ? (body.errors as { param: string; detail: string }[])
    : [];
  const message =
    code === "QA_FAKERS_UNAVAILABLE" || response.status >= 500
      ? FAKER_UNAVAILABLE_TEXT
      : typeof body.detail === "string"
        ? body.detail
        : "El generador de datos de prueba rechazó la petición.";
  throw new FakerError({ code, status: response.status, message, details });
}

export function fetchFakerCatalog(): Promise<FakerCatalog> {
  return call<FakerCatalog>("");
}

export function fetchFakerBatch(
  type: string,
  request: FakerBatchRequest,
): Promise<FakerBatch> {
  return call<FakerBatch>(`/${encodeURIComponent(type)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      seed: request.seed,
      count: request.count,
      variant: request.variant,
      params: request.params ?? {},
    }),
  });
}

/** Parámetros elegidos en el panel, separados por tipo de faker. */
export type FakerParamsByType = Record<string, FakerParamValues>;

export type FakerCasesRequest = {
  seed: string;
  count: number;
  variant: FakerVariant;
  params?: FakerParamsByType;
};

/**
 * Un lote de «casos» completos: `caso` y `monto` con la misma semilla, unidos por posición. El
 * elemento i no depende de `count` (garantía del mock), así que ampliar el lote no cambia los
 * primeros.
 */
export async function fetchFakerCases(
  request: FakerCasesRequest,
): Promise<FakerContext[]> {
  const shared = {
    seed: request.seed,
    count: request.count,
    variant: request.variant,
  };
  const [casos, montos] = await Promise.all([
    fetchFakerBatch("caso", { ...shared, params: request.params?.caso }),
    fetchFakerBatch("monto", {
      ...shared,
      // El monto no tiene variante inválida propia que tenga sentido junto a la del caso: la regla
      // rota ya la lleva el caso. Se pide siempre válido.
      variant: request.variant === "invalido" ? "valido" : request.variant,
      params: request.params?.monto,
    }),
  ]);
  return casos.items.map((caso, index) => ({
    caso,
    monto: montos.items[index],
  }));
}
