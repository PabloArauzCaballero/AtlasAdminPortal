import type { ContractField } from "./contract-fields";

/**
 * Valores que NO son de ninguna persona: identificadores, códigos, booleanos, enums, fechas de
 * evento. Salen de un PRNG sembrado con la semilla elegida, así que el lote es reproducible.
 *
 * Todo lo que sí es de una persona (nombre, correo, carnet, teléfono, dirección, huella del
 * dispositivo, ingresos) NO se genera aquí: sale del generador del mock (ver
 * `fakers/faker-field-map.ts`). Si este archivo empieza a tener listas de nombres o correos, algo
 * se hizo mal.
 */
export function makeRandom(seed: string): () => number {
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

export function intBetween(
  random: () => number,
  min: number,
  max: number,
): number {
  return min + Math.floor(random() * (max - min + 1));
}

function pick<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length) % values.length];
}

/**
 * PIN de 4 dígitos que el backend acepta: ni repetidos (`1111`), ni escaleras (`1234`, `4321`),
 * ni los de la lista negra más obvios. El alta de cliente pide PIN, no contraseña.
 */
const OBVIOUS_PINS = new Set([
  "1212",
  "1122",
  "1004",
  "2000",
  "6969",
  "1313",
  "2001",
  "1010",
]);

export function isAcceptablePin(pin: string): boolean {
  if (!/^\d{4}$/.test(pin)) return false;
  if (OBVIOUS_PINS.has(pin)) return false;
  const digits = pin.split("").map(Number);
  if (digits.every((digit) => digit === digits[0])) return false;
  const steps = digits
    .slice(1)
    .map((digit, index) => (digit - digits[index] + 10) % 10);
  if (steps.every((step) => step === 1) || steps.every((step) => step === 9))
    return false;
  return true;
}

export function generatePin(random: () => number): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const pin = String(intBetween(random, 0, 9999)).padStart(4, "0");
    if (isAcceptablePin(pin)) return pin;
  }
  return "2749";
}

/** Nombre de campo que es una fecha de EVENTO (`createdAt`, `capturedAt`, `decidedAt`, `date`). */
export function isEventDateField(name: string): boolean {
  return /[a-z0-9]At$/.test(name) || /date$/i.test(name) || /^date/i.test(name);
}

/** Valor local para un campo no personal, elegido por nombre y luego por tipo. */
export function localValue(
  field: ContractField,
  random: () => number,
): unknown {
  const name = field.name.toLowerCase();
  if (field.options?.length) return pick(random, field.options);
  if (name === "pin" || name.includes("password")) return generatePin(random);
  if (isEventDateField(field.name)) {
    return new Date(Date.UTC(2026, 0, intBetween(random, 1, 28))).toISOString();
  }
  if (name.includes("accepted") || name.includes("consent")) {
    return field.type === "array" ? ["risk_fraud_assessment"] : true;
  }
  if (name.includes("uuid") || name.includes("token")) {
    return `qa-${intBetween(random, 100000, 999999)}-${intBetween(random, 1000, 9999)}`;
  }
  if (name.endsWith("id")) return String(intBetween(random, 1, 9));
  if (name.includes("code")) return `QA_${intBetween(random, 100, 999)}`;
  switch (field.type) {
    case "boolean":
      return random() > 0.5;
    case "number":
      return Number((random() * 1000).toFixed(2));
    case "integer":
      return intBetween(random, 1, 500);
    case "array":
      return [];
    default:
      return `qa-${field.name}-${intBetween(random, 100, 999)}`;
  }
}

/** Valor en el borde de lo admisible: sigue respetando el TIPO, pero es el extremo. */
export function boundaryValue(field: ContractField): unknown {
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
export function wrongTypeValue(field: ContractField): unknown {
  return field.type === "string" || field.type === "unknown"
    ? 12345
    : "no-es-el-tipo";
}
