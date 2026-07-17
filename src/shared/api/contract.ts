import type { ZodType } from "zod";
import { AtlasApiError } from "./errors";

type ContractContext = {
  endpoint: string;
  method: string;
  requestId?: string;
};

/**
 * La respuesta llegó con 2xx pero su forma no coincide con el esquema esperado.
 * Se trata como fallo, no como dato: es preferible romper de forma visible a
 * servir datos silenciosamente inválidos a la UI.
 *
 * `issues` lista solo rutas de campos y códigos de Zod, nunca los valores: el
 * error viaja a logs/observabilidad y no debe arrastrar PII.
 */
export class ApiContractError extends AtlasApiError {
  readonly endpoint: string;
  readonly method: string;
  readonly issues: string;

  constructor(input: ContractContext & { issues: string }) {
    super({
      status: 0,
      code: "API_CONTRACT_ERROR",
      message: "La respuesta del servicio no cumple el contrato esperado.",
      requestId: input.requestId,
    });
    this.name = "ApiContractError";
    this.endpoint = input.endpoint;
    this.method = input.method;
    this.issues = input.issues;
  }
}

export function isApiContractError(error: unknown): error is ApiContractError {
  return error instanceof ApiContractError;
}

/**
 * Valida `data` contra `schema`. Si pasa, devuelve el dato ORIGINAL (no el
 * parseado): el esquema es una compuerta, no un transformador, y así la UI
 * conserva cualquier campo extra que el backend haya añadido. Por eso los
 * esquemas de contrato no deben usar `.transform()` ni defaults.
 */
export function validateContract<T>(
  schema: ZodType<T>,
  data: unknown,
  context: ContractContext,
): T {
  const result = schema.safeParse(data);
  if (result.success) return data as T;

  const issues = result.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.code}`)
    .join("; ");

  throw new ApiContractError({ ...context, issues });
}
