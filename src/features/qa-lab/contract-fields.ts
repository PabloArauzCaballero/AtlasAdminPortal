/**
 * Lectura del CONTRATO que el catálogo publica para un endpoint.
 *
 * `minPayloadSchema`, `queryParamsSchema`, `pathParamsSchema` y `headersSchema` no son JSON Schema:
 * el catálogo los guarda como un mapa plano `{ campo: "tipo|required" }`, tal como los siembra
 * `seed-systems-ops-catalog`:
 *
 * ```json
 * { "email": "string|required", "password": "string|required" }
 * { "phone": "string|required", "documentNumber": "string|required", "acceptedConsents": "array|required" }
 * ```
 *
 * Se acepta además la forma JSON Schema (`{ type, properties, required }`) porque algunos endpoints
 * la traen del manifiesto de otro bloque, y el puntero `{ schemaReference: "..." }`, que NO es un
 * contrato sino el nombre del Zod schema del backend: de ése no se puede generar nada, y decirlo es
 * mejor que inventar un payload que el endpoint rechazará por razones que nadie sabrá explicar.
 */

export type ContractFieldType =
  "string" | "number" | "integer" | "boolean" | "array" | "object" | "unknown";

export type ContractField = {
  name: string;
  type: ContractFieldType;
  required: boolean;
  /** Valores admitidos cuando el catálogo los enumera (`"all|risk|fraud"`). */
  options?: string[];
  /** Campos de un objeto anidado, cuando el catálogo los declara. */
  fields?: ContractField[];
};

export type ContractReading = {
  fields: ContractField[];
  /** El contrato es un puntero a un schema del backend: no hay campos que generar. */
  isReference: boolean;
  referenceName: string | null;
};

const TYPES: Record<string, ContractFieldType> = {
  string: "string",
  str: "string",
  text: "string",
  uuid: "string",
  date: "string",
  datetime: "string",
  number: "number",
  float: "number",
  decimal: "number",
  integer: "integer",
  int: "integer",
  "positive integer": "integer",
  "positive int": "integer",
  boolean: "boolean",
  bool: "boolean",
  array: "array",
  list: "array",
  object: "object",
  record: "object",
};

function normalizeType(raw: string): ContractFieldType {
  return TYPES[raw.trim().toLowerCase()] ?? "unknown";
}

const FLAGS = new Set(["required", "optional", "recommended"]);

/**
 * `"string|required"` → tipo y obligatoriedad. Sin sufijo, se asume opcional.
 *
 * El catálogo sembrado usa además otras dos formas que antes se leían mal: una marca sola
 * (`"optional"`, `"required"`, `"recommended"`, sin tipo) y una lista de valores (`"all|risk|fraud"`),
 * que es un enum y no un tipo desconocido.
 */
function readShorthand(value: string): Omit<ContractField, "name"> {
  const tokens = value
    .split("|")
    .map((token) => token.trim())
    .filter(Boolean);
  const lower = tokens.map((token) => token.toLowerCase());
  const required = lower.includes("required");
  const rest = tokens.filter((_, index) => !FLAGS.has(lower[index]));
  if (rest.length === 0) return { type: "unknown", required };
  const type = normalizeType(rest[0]);
  if (type === "unknown" && rest.length > 1) {
    return { type: "string", required, options: rest };
  }
  return { type, required };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readContract(schema: unknown): ContractReading {
  const empty: ContractReading = {
    fields: [],
    isReference: false,
    referenceName: null,
  };
  if (!isRecord(schema)) return empty;

  const reference = schema.schemaReference;
  if (typeof reference === "string") {
    return { fields: [], isReference: true, referenceName: reference };
  }

  // Forma JSON Schema. Se detecta por `properties`, no por `type: "object"`: hay contratos que
  // declaran el tipo y no las propiedades, y de ésos tampoco hay nada que generar.
  if (isRecord(schema.properties)) {
    const required = Array.isArray(schema.required)
      ? new Set(schema.required.map(String))
      : new Set<string>();
    return {
      ...empty,
      fields: Object.entries(schema.properties).map(([name, definition]) => ({
        name,
        type: isRecord(definition)
          ? normalizeType(String(definition.type ?? "unknown"))
          : "unknown",
        required: required.has(name),
      })),
    };
  }

  const fields: ContractField[] = [];
  for (const [name, definition] of Object.entries(schema)) {
    if (typeof definition === "string") {
      fields.push({ name, ...readShorthand(definition) });
      continue;
    }
    // Un valor anidado: si trae sus propios campos (JSON Schema o mapa abreviado) se leen, para
    // que el generador no deje un `{}` vacío donde el contrato sí dice qué va dentro.
    if (isRecord(definition)) {
      fields.push(readNested(name, definition));
      continue;
    }
    fields.push({ name, type: "unknown", required: false });
  }
  return { ...empty, fields };
}

function readNested(
  name: string,
  definition: Record<string, unknown>,
): ContractField {
  const explicitType =
    typeof definition.type === "string" ? definition.type : "object";
  const inner = Object.fromEntries(
    Object.entries(definition).filter(
      ([key]) => key !== "type" && key !== "required",
    ),
  );
  const nested = isRecord(definition.properties)
    ? readContract(definition).fields
    : readContract(inner).fields;
  return {
    name,
    type: normalizeType(explicitType),
    required: definition.required === true,
    ...(nested.length ? { fields: nested } : {}),
  };
}

/** Los `:parametros` de una ruta. Son obligatorios por definición: sin ellos no hay URL. */
export function pathParamFields(
  routePath: string | null | undefined,
): ContractField[] {
  if (!routePath) return [];
  const matches = routePath.match(/:([A-Za-z0-9_]+)/g) ?? [];
  return matches.map((match) => ({
    name: match.slice(1),
    // `:id`, `:customerId`, `:runId`… son identificadores numéricos en todo el ecosistema salvo
    // los que llevan `code` o `uuid` en el nombre, que el generador resuelve por heurística.
    type: "string" as const,
    required: true,
  }));
}
