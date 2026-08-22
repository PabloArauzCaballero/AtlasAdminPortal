/**
 * Lectura del formato REAL en que AtlasBackend escribe `Archivo.log`.
 *
 * Cada línea es un objeto JSON independiente (NDJSON) que produce `AppFileLoggerService.buildLine`:
 *
 * ```
 * {"ts":"2026-08-20T20:05:01.313Z","level":"log","context":"ArchivoLogMongoSyncService",
 *  "correlationId":null,"traceId":null,"message":"Archivo.log reiniciado: 961131 bytes…"}
 * ```
 *
 * La terminal del portal volcaba ese texto tal cual, con las comillas, las llaves y los `null`
 * incluidos, y le pintaba color según si la CADENA contenía la palabra «ERROR». Es decir: no
 * mostraba logs, mostraba el JSON de los logs — con `"level":"error"` coloreado igual que cualquier
 * otra línea, porque el nivel va en minúsculas y la búsqueda era en mayúsculas. Aquí se
 * DESERIALIZA, de modo que el nivel, la hora, el contexto y el correlationId son campos con los que
 * se puede filtrar, alinear y colorear.
 *
 * Una línea que no sea JSON no se descarta: se devuelve como texto crudo con nivel desconocido. El
 * archivo puede llevar salida de arranque o un volcado de proceso que nunca pasó por el logger, y
 * ocultarla dejaría fuera justo lo que se busca cuando algo se rompe al arrancar.
 */

export type BackendLogLevel =
  "fatal" | "error" | "warn" | "log" | "debug" | "verbose" | "unknown";

export type BackendLogLine = {
  /** Índice estable dentro del bloque; sirve de key y de número de línea. */
  index: number;
  level: BackendLogLevel;
  timestamp: string | null;
  context: string | null;
  correlationId: string | null;
  traceId: string | null;
  message: string;
  stack: string | null;
  /** La línea original, para copiar o para cuando no se pudo interpretar. */
  raw: string;
};

const LEVELS = new Set<BackendLogLevel>([
  "fatal",
  "error",
  "warn",
  "log",
  "debug",
  "verbose",
]);

function asText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function readLevel(value: unknown): BackendLogLevel {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  // `info` no lo emite este backend, pero sí otros servicios cuyo log puede acabar subido a mano
  // por el cargador de archivos. Tratarlo como `log` es lo que espera quien lo lee.
  if (normalized === "info") return "log";
  if (normalized === "warning") return "warn";
  return LEVELS.has(normalized as BackendLogLevel)
    ? (normalized as BackendLogLevel)
    : "unknown";
}

/**
 * Nivel de una línea que NO es JSON, deducido del texto.
 *
 * Es el único sitio donde tiene sentido adivinar: sin estructura, la palabra es todo lo que hay.
 * Se compara sin distinguir mayúsculas porque cada runtime escribe el suyo a su manera.
 */
function guessLevel(raw: string): BackendLogLevel {
  if (/\b(fatal|panic)\b/i.test(raw)) return "fatal";
  if (/\b(error|err|exception)\b/i.test(raw)) return "error";
  if (/\bwarn(ing)?\b/i.test(raw)) return "warn";
  if (/\bdebug\b/i.test(raw)) return "debug";
  if (/\b(trace|verbose)\b/i.test(raw)) return "verbose";
  if (/\binfo\b/i.test(raw)) return "log";
  return "unknown";
}

export function parseBackendLogLine(
  raw: string,
  index: number,
): BackendLogLine {
  const trimmed = raw.trim();
  const fallback: BackendLogLine = {
    index,
    level: guessLevel(trimmed),
    timestamp: null,
    context: null,
    correlationId: null,
    traceId: null,
    message: raw,
    stack: null,
    raw,
  };
  if (!trimmed.startsWith("{")) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return fallback;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return fallback;
  }

  const entry = parsed as Record<string, unknown>;
  // Un JSON cualquiera no es un log: si no trae ni nivel ni mensaje, se muestra crudo en vez de
  // inventarle campos vacíos y presentarlo como una entrada del backend.
  const level = readLevel(entry.level);
  const message = asText(entry.message);
  if (level === "unknown" && message === null) return fallback;

  return {
    index,
    level,
    timestamp: asText(entry.ts) ?? asText(entry.timestamp),
    context: asText(entry.context),
    correlationId: asText(entry.correlationId),
    traceId: asText(entry.traceId),
    message: message ?? trimmed,
    stack: asText(entry.stack),
    raw,
  };
}

/** Divide un bloque de texto en líneas interpretadas, descartando las vacías. */
export function parseBackendLogBlock(content: string): BackendLogLine[] {
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map(parseBackendLogLine);
}

/** Cuántas líneas hay de cada nivel. Alimenta el resumen de la cabecera de la terminal. */
export function countByLevel(
  lines: readonly BackendLogLine[],
): Record<BackendLogLevel, number> {
  const counts: Record<BackendLogLevel, number> = {
    fatal: 0,
    error: 0,
    warn: 0,
    log: 0,
    debug: 0,
    verbose: 0,
    unknown: 0,
  };
  for (const line of lines) counts[line.level] += 1;
  return counts;
}

/** La hora, sin fecha y con milisegundos: es lo que se compara al leer una traza. */
export function logClock(timestamp: string | null): string {
  if (!timestamp) return "--:--:--.---";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const pad = (value: number, size = 2) => String(value).padStart(size, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}
