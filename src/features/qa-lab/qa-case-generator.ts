import type { ContractField } from "./contract-fields";

/**
 * Generación DETERMINISTA de datos de prueba a partir del contrato del endpoint.
 *
 * Es el equivalente, para pruebas de endpoint, de lo que el motor de decisión hace en el simulador
 * («Generar valores»): las tres clases describen la ENTRADA —si respeta el contrato, si roza el
 * límite, o si debe ser rechazada— y la semilla hace el lote reproducible.
 *
 * Dos decisiones que no son cosméticas:
 *
 * 1. **Determinismo real.** El azar sale de un PRNG sembrado con la cadena de la semilla, no de
 *    `Math.random()`. Sin eso, «repite la corrida que falló» es imposible: cada pulsación produce
 *    un payload distinto y el fallo no se puede volver a mirar.
 * 2. **Valores creíbles, no rellenos.** El valor se elige por el NOMBRE del campo: `email` recibe
 *    un correo, `phone` un móvil boliviano con su prefijo, `documentNumber` un carnet, `amount` un
 *    importe con dos decimales. Un `"string-1"` en cada hueco pasa la validación de tipo y falla la
 *    de formato, así que la prueba habría medido el validador de formato y no el endpoint.
 *
 * Lo que este generador NO hace, y por eso se avisa en la interfaz: no conoce las reglas Zod del
 * backend (rangos, enums, regex propias). Deriva de lo que el CATÁLOGO declara. Para los endpoints
 * con reglas finas siguen estando los presets escritos a mano de `payload-presets.ts`.
 */

export const CASE_KINDS = ["valid", "boundary", "invalid"] as const;
export type QaCaseKind = (typeof CASE_KINDS)[number];

export const KIND_LABELS: Record<QaCaseKind, string> = {
  valid: "Válidos",
  boundary: "En el límite del contrato",
  invalid: "Inválidos (deben rechazarse)",
};

export const KIND_INTENT: Record<QaCaseKind, string> = {
  valid: "El endpoint debería aceptarlos y responder 2xx.",
  boundary:
    "Valores extremos que el contrato todavía admite: cadenas vacías, cero, negativos, listas vacías.",
  invalid:
    "Rompen el contrato a propósito: falta un campo obligatorio o el tipo no corresponde. Un 2xx aquí es un defecto.",
};

export type QaGeneratedCase = {
  label: string;
  kind: QaCaseKind;
  /** Qué se alteró respecto del caso válido. Vacío en los válidos. */
  mutation: string | null;
  payload: Record<string, unknown>;
};

/** PRNG sembrado (mulberry32) — 32 bits, suficiente y estable entre navegadores. */
function makeRandom(seed: string): () => number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length) % values.length];
}

function intBetween(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

const FIRST_NAMES = ["Ana", "Luis", "Carla", "Hugo", "Sofia", "Marco"];
const LAST_NAMES = ["Arispe", "Quiroga", "Mendoza", "Villarroel", "Tarifa"];

/**
 * Valor «normal» para un campo, elegido por su nombre y su tipo.
 *
 * El orden importa: primero el nombre (más específico), y solo si no lo reconoce, el tipo. Un campo
 * `amount` de tipo `string` sigue queriendo un importe, no una cadena cualquiera.
 */
function validValue(field: ContractField, random: () => number): unknown {
  const name = field.name.toLowerCase();
  const first = pick(random, FIRST_NAMES);
  const last = pick(random, LAST_NAMES);

  if (name.includes("email")) {
    return `${first.toLowerCase()}.${last.toLowerCase()}@atlas.test`;
  }
  if (name.includes("password")) return "Atlas_Qa#2026!";
  if (name.includes("phone") || name.includes("msisdn")) {
    return `+591${intBetween(random, 60000000, 79999999)}`;
  }
  if (name.includes("documentnumber") || name.includes("nationalid")) {
    return String(intBetween(random, 1000000, 9999999));
  }
  if (name.includes("firstname")) return first;
  if (name.includes("lastname")) return last;
  if (name.includes("fullname") || name === "name") return `${first} ${last}`;
  if (name.includes("birth")) {
    return `19${intBetween(random, 70, 99)}-0${intBetween(random, 1, 9)}-1${intBetween(random, 0, 9)}`;
  }
  if (name.endsWith("at") || name.includes("date")) {
    return new Date(Date.UTC(2026, 0, intBetween(random, 1, 28))).toISOString();
  }
  if (
    name.includes("amount") ||
    name.includes("salary") ||
    name.includes("income")
  ) {
    return Number((intBetween(random, 500, 25000) + random()).toFixed(2));
  }
  if (name.includes("currency")) return "BOB";
  if (name.includes("code")) return `QA_${intBetween(random, 100, 999)}`;
  if (name.includes("uuid") || name.includes("token")) {
    return `qa-${intBetween(random, 100000, 999999)}-${intBetween(random, 1000, 9999)}`;
  }
  if (name.endsWith("id")) return String(intBetween(random, 1, 9));
  if (name.includes("accepted") || name.includes("consent")) {
    return field.type === "array" ? ["risk_fraud_assessment"] : true;
  }

  switch (field.type) {
    case "boolean":
      return random() > 0.5;
    case "number":
      return Number((random() * 1000).toFixed(2));
    case "integer":
      return intBetween(random, 1, 500);
    case "array":
      return [`qa-${intBetween(random, 1, 99)}`];
    case "object":
      return {};
    default:
      return `qa-${field.name}-${intBetween(random, 100, 999)}`;
  }
}

/** Valor en el borde de lo admisible: sigue respetando el TIPO, pero es el extremo. */
function boundaryValue(field: ContractField): unknown {
  switch (field.type) {
    case "boolean":
      return false;
    case "number":
    case "integer":
      return 0;
    case "array":
      return [];
    case "object":
      return {};
    default:
      return "";
  }
}

/** Valor que rompe el contrato: el tipo es OTRO. */
function wrongTypeValue(field: ContractField): unknown {
  return field.type === "string" || field.type === "unknown"
    ? 12345
    : "no-es-el-tipo";
}

function buildValid(
  fields: readonly ContractField[],
  random: () => number,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) payload[field.name] = validValue(field, random);
  return payload;
}

/**
 * Genera el lote. Los casos inválidos se derivan uno por campo obligatorio —quitándolo, o
 * poniéndole el tipo que no es—, no al azar: así el lote cubre CADA regla del contrato en vez de
 * repetir tres veces la misma violación y dejar el resto sin probar.
 */
export function generateCases(
  fields: readonly ContractField[],
  kind: QaCaseKind,
  count: number,
  seed: string,
): QaGeneratedCase[] {
  if (fields.length === 0) return [];
  const random = makeRandom(`${seed}:${kind}`);
  const cases: QaGeneratedCase[] = [];

  if (kind === "valid") {
    for (let index = 0; index < count; index += 1) {
      cases.push({
        label: `Válido ${index + 1}`,
        kind,
        mutation: null,
        payload: buildValid(fields, random),
      });
    }
    return cases;
  }

  if (kind === "boundary") {
    for (let index = 0; index < count; index += 1) {
      const target = fields[index % fields.length];
      const payload = buildValid(fields, random);
      payload[target.name] = boundaryValue(target);
      cases.push({
        label: `Límite · ${target.name}`,
        kind,
        mutation: `${target.name} en su valor extremo`,
        payload,
      });
    }
    return cases;
  }

  // Inválidos: se prioriza quitar los obligatorios, que es la violación que todo endpoint debe
  // rechazar. Si el contrato no declara ninguno, se ataca por tipo.
  const required = fields.filter((field) => field.required);
  const targets = required.length > 0 ? required : fields;
  for (let index = 0; index < count; index += 1) {
    const target = targets[index % targets.length];
    const payload = buildValid(fields, random);
    const removeIt = index < targets.length && required.length > 0;
    if (removeIt) {
      delete payload[target.name];
      cases.push({
        label: `Sin ${target.name}`,
        kind,
        mutation: `falta el campo obligatorio ${target.name}`,
        payload,
      });
    } else {
      payload[target.name] = wrongTypeValue(target);
      cases.push({
        label: `${target.name} con tipo erróneo`,
        kind,
        mutation: `${target.name} deja de ser ${target.type}`,
        payload,
      });
    }
  }
  return cases;
}
