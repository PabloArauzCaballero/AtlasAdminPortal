import type { ContractField } from "./contract-fields";
import { fakerPathForField } from "./fakers/faker-field-map";
import type { FakerContext, FakerVariant } from "./fakers/faker-types";
import {
  boundaryValue,
  localValue,
  makeRandom,
  wrongTypeValue,
} from "./qa-local-values";

/**
 * Casos de prueba a partir del CONTRATO del endpoint y de un lote del generador de datos.
 *
 * - Los datos de persona (correo, teléfono, carnet, nombre, fecha de nacimiento, dirección, GPS,
 *   dispositivo, ingresos, montos) salen del `caso` del mock, pedido con la semilla elegida: nada
 *   de listas escritas a mano. El mapeo es por nombre de campo (`fakers/faker-field-map.ts`).
 * - Lo que no es de nadie (booleanos, ids, códigos, enums, fechas de evento) lo pone un PRNG local
 *   sembrado con la misma semilla (`qa-local-values.ts`).
 *
 * Por defecto sólo se generan los campos OBLIGATORIOS: mandar todos los opcionales —incluidos
 * enums que el catálogo no enumera— hacía que el caso «válido» rebotara con 400. Si el contrato no
 * marca ninguno como obligatorio, se generan todos.
 */
export const CASE_KINDS = ["valid", "boundary", "invalid"] as const;
export type QaCaseKind = (typeof CASE_KINDS)[number];

export const KIND_LABELS: Record<QaCaseKind, string> = {
  valid: "Válidos",
  boundary: "En el límite",
  invalid: "Inválidos (deben rechazarse)",
};

export const KIND_INTENT: Record<QaCaseKind, string> = {
  valid: "Datos que cumplen las reglas: la operación debería aceptarlos.",
  boundary:
    "Datos válidos pero en el borde: edad mínima exacta, monto máximo, carnet corto.",
  invalid:
    "Cada caso rompe UNA regla a propósito (un dato imposible o un campo obligatorio que falta). Si la operación los acepta, hay un defecto.",
};

/** Qué variante del generador corresponde a cada clase de caso. */
export const KIND_VARIANT: Record<QaCaseKind, FakerVariant> = {
  valid: "valido",
  boundary: "frontera",
  invalid: "invalido",
};

export type QaGeneratedCase = {
  label: string;
  kind: QaCaseKind;
  /** Qué se alteró respecto del caso válido. Vacío en los válidos. */
  mutation: string | null;
  payload: Record<string, unknown>;
  /** Campos que el generador debía rellenar y no pudo (dato ausente en el lote). */
  unresolved: string[];
};

export type GenerateCasesInput = {
  fields: readonly ContractField[];
  kind: QaCaseKind;
  count: number;
  seed: string;
  /** Lote del generador pedido con la variante de `KIND_VARIANT[kind]`. */
  cases: readonly FakerContext[];
  includeOptional?: boolean;
};

export function selectFields(
  fields: readonly ContractField[],
  includeOptional = false,
): ContractField[] {
  if (includeOptional) return [...fields];
  const required = fields.filter((field) => field.required);
  return required.length > 0 ? required : [...fields];
}

type Built = {
  payload: Record<string, unknown>;
  used: string[];
  unresolved: string[];
};

function lookup(context: FakerContext, path: string): unknown {
  let current: unknown = context;
  for (const key of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current === undefined
    ? undefined
    : (JSON.parse(JSON.stringify(current)) as unknown);
}

function buildObject(
  fields: readonly ContractField[],
  context: FakerContext,
  random: () => number,
  includeOptional: boolean,
  prefix = "",
): Built {
  const built: Built = { payload: {}, used: [], unresolved: [] };
  for (const field of selectFields(fields, includeOptional)) {
    const label = `${prefix}${field.name}`;
    // Un objeto que declara sus campos se construye por dentro; sólo sin ellos recibe el objeto
    // entero del caso (p. ej. `device` → el dispositivo completo).
    const declaresFields =
      field.type === "object" && Boolean(field.fields?.length);
    const path = declaresFields
      ? null
      : fakerPathForField(field.name, field.type);
    if (path) {
      const value = lookup(context, path);
      if (value !== undefined) {
        built.payload[field.name] = stripInvalidMark(value);
        built.used.push(path);
        continue;
      }
      if (field.type !== "object") {
        built.unresolved.push(label);
        continue;
      }
    }
    if (field.type === "object") {
      if (!field.fields?.length) {
        built.unresolved.push(`${label} (objeto sin campos en el contrato)`);
        built.payload[field.name] = {};
        continue;
      }
      const nested = buildObject(
        field.fields,
        context,
        random,
        includeOptional,
        `${label}.`,
      );
      built.payload[field.name] = nested.payload;
      built.used.push(...nested.used);
      built.unresolved.push(...nested.unresolved);
      continue;
    }
    built.payload[field.name] = localValue(field, random);
  }
  return built;
}

function stripInvalidMark(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const { _invalid: _ignored, ...rest } = value as Record<string, unknown>;
    return rest;
  }
  return value;
}

/** ¿El payload lleva el dato que el mock rompió a propósito? */
function carriesBrokenField(
  used: readonly string[],
  fakerField: string,
): boolean {
  const target = `caso.${fakerField}`;
  return used.some((path) => target === path || target.startsWith(`${path}.`));
}

export function generateCases(input: GenerateCasesInput): QaGeneratedCase[] {
  const { fields, kind, seed, cases } = input;
  const includeOptional = input.includeOptional ?? false;
  if (fields.length === 0) return [];
  const random = makeRandom(`${seed}:${kind}`);
  const selected = selectFields(fields, includeOptional);
  const required = selected.filter((field) => field.required);
  const result: QaGeneratedCase[] = [];
  let structural = 0;

  for (let index = 0; index < input.count; index += 1) {
    const context = cases.length ? cases[index % cases.length] : {};
    const built = buildObject(fields, context, random, includeOptional);
    const base = { kind, payload: built.payload, unresolved: built.unresolved };

    if (kind === "valid") {
      result.push({ ...base, label: `Válido ${index + 1}`, mutation: null });
      continue;
    }

    if (kind === "boundary") {
      if (built.used.length > 0) {
        result.push({
          ...base,
          label: `En el límite ${index + 1}`,
          mutation: "datos de persona en el borde de lo admitido",
        });
        continue;
      }
      const target = selected[index % selected.length];
      built.payload[target.name] = boundaryValue(target);
      result.push({
        ...base,
        label: `Límite · ${target.name}`,
        mutation: `${target.name} en su valor extremo`,
      });
      continue;
    }

    const mark = context.caso?._invalid;
    if (mark && carriesBrokenField(built.used, mark.field)) {
      result.push({
        ...base,
        label: `Regla rota · ${mark.field.split(".").pop()}`,
        mutation: mark.reason,
      });
      continue;
    }
    const targets = required.length > 0 ? required : selected;
    const target = targets[structural % targets.length];
    const removeIt = structural < targets.length && required.length > 0;
    structural += 1;
    if (removeIt) {
      delete built.payload[target.name];
      result.push({
        ...base,
        label: `Sin ${target.name}`,
        mutation: `falta el campo obligatorio ${target.name}`,
      });
    } else {
      built.payload[target.name] = wrongTypeValue(target);
      result.push({
        ...base,
        label: `${target.name} con tipo erróneo`,
        mutation: `${target.name} deja de ser ${target.type}`,
      });
    }
  }
  return result;
}

/** Datos de ruta o de consulta: sólo valores locales (ids, enums), nunca de persona. */
export function generateLocalValues(
  fields: readonly ContractField[],
  seed: string,
  context: FakerContext = {},
  includeOptional = false,
): Record<string, unknown> {
  if (fields.length === 0) return {};
  return buildObject(
    fields,
    context,
    makeRandom(`${seed}:local`),
    includeOptional,
  ).payload;
}
