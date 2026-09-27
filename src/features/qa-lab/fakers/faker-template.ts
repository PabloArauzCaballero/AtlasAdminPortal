import type { FakerContext } from "./faker-types";

/**
 * Plantillas con marcadores `{{faker.<tipo>.<ruta>}}` y `{{qa.<valor>}}`.
 *
 * Los ejemplos de `payload-presets.ts` ya no llevan datos escritos a mano: llevan marcadores que se
 * resuelven contra un caso del generador con la semilla elegida. Dos reglas:
 *
 * 1. Un marcador que ocupa TODO el valor conserva el tipo del dato: `"{{faker.caso.direccion.latitude}}"`
 *    se convierte en el número `-16.5`, no en la cadena `"-16.5"`, y `"{{faker.caso.dispositivo.snapshot}}"`
 *    en el objeto entero. Un validador que pide `number` rechazaría la cadena.
 * 2. Un marcador dentro de un texto más largo se sustituye como texto.
 *
 * Un marcador que no se puede resolver se deja tal cual y se informa en `missing`: mandar el
 * marcador literal es visible y se entiende; inventarse un valor no.
 */
export type LocalValues = Readonly<Record<string, unknown>>;

export type TemplateResolution<T> = { value: T; missing: string[] };

const WHOLE = /^\{\{\s*([A-Za-z0-9_.]+)\s*\}\}$/;
const ANY = /\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g;

function lookup(
  path: string,
  context: FakerContext,
  local: LocalValues,
): { found: boolean; value?: unknown } {
  const [root, ...rest] = path.split(".");
  let current: unknown;
  let keys: string[];
  if (root === "faker") {
    const [type, ...fieldPath] = rest;
    current = (context as Record<string, unknown>)[type];
    keys = fieldPath;
  } else if (root === "qa") {
    current = local;
    keys = rest;
  } else {
    return { found: false };
  }
  for (const key of keys) {
    if (current === null || typeof current !== "object")
      return { found: false };
    if (!(key in (current as Record<string, unknown>))) return { found: false };
    current = (current as Record<string, unknown>)[key];
  }
  return current === undefined
    ? { found: false }
    : { found: true, value: current };
}

function resolveString(
  text: string,
  context: FakerContext,
  local: LocalValues,
  missing: string[],
): unknown {
  const whole = WHOLE.exec(text);
  if (whole) {
    const hit = lookup(whole[1], context, local);
    if (hit.found) return structuredCloneSafe(hit.value);
    missing.push(whole[1]);
    return text;
  }
  return text.replace(ANY, (match, path: string) => {
    const hit = lookup(path, context, local);
    if (!hit.found) {
      missing.push(path);
      return match;
    }
    return typeof hit.value === "object"
      ? JSON.stringify(hit.value)
      : String(hit.value);
  });
}

function structuredCloneSafe(value: unknown): unknown {
  return value !== null && typeof value === "object"
    ? (JSON.parse(JSON.stringify(value)) as unknown)
    : value;
}

function walk(
  value: unknown,
  context: FakerContext,
  local: LocalValues,
  missing: string[],
): unknown {
  if (typeof value === "string")
    return resolveString(value, context, local, missing);
  if (Array.isArray(value))
    return value.map((item) => walk(item, context, local, missing));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        walk(item, context, local, missing),
      ]),
    );
  }
  return value;
}

export function resolveFakerTemplate<T>(
  template: T,
  context: FakerContext,
  local: LocalValues = {},
): TemplateResolution<T> {
  const missing: string[] = [];
  const value = walk(template, context, local, missing) as T;
  return { value, missing: [...new Set(missing)] };
}

/** true si el valor (a cualquier profundidad) contiene algún marcador. */
export function hasTemplateMarkers(value: unknown): boolean {
  return /\{\{\s*(faker|qa)\.[A-Za-z0-9_.]+\s*\}\}/.test(
    JSON.stringify(value ?? null),
  );
}
