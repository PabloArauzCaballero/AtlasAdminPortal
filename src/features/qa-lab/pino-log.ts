import { redactedHeaders } from "./qa-safety";
import { sanitizeQaValue } from "./response-sanitizer";

const LOGGER_NAME = "atlas-admin-qa-lab";
const HOSTNAME = "browser";
const PID = 0;

export type QaLogLevel = "debug" | "info" | "warn" | "error";

export type QaLogEntry = {
  level: number;
  time: number;
  pid: number;
  hostname: string;
  name: string;
  layer: string;
  msg: string;
  event: string;
  runId: string;
  data?: unknown;
};

export type QaPinoLogger = {
  runId: string;
  child: (layer: string) => QaLayerLogger;
  lines: () => string[];
  entries: () => QaLogEntry[];
};

export type QaLayerLogger = {
  debug: (event: string, msg: string, data?: unknown) => void;
  info: (event: string, msg: string, data?: unknown) => void;
  warn: (event: string, msg: string, data?: unknown) => void;
  error: (event: string, msg: string, data?: unknown) => void;
};

export function createQaPinoLogger(seed: string): QaPinoLogger {
  const runId = buildRunId(seed);
  const entries: QaLogEntry[] = [];
  return {
    runId,
    child: (layer) => buildLayerLogger(entries, runId, layer),
    lines: () => entries.map((entry) => JSON.stringify(entry)),
    entries: () => [...entries],
  };
}

export function buildPinoLogFileName(prefix: string, runId: string): string {
  return `.logs/${prefix}-${runId}.log`;
}

export function toSafeLogData(value: unknown): unknown {
  if (value instanceof Headers)
    return redactedHeaders(Object.fromEntries(value));
  if (value instanceof Error)
    return { name: value.name, message: value.message };
  return sanitizeQaValue(value);
}

function buildLayerLogger(
  entries: QaLogEntry[],
  runId: string,
  layer: string,
): QaLayerLogger {
  const push = (
    level: QaLogLevel,
    event: string,
    msg: string,
    data?: unknown,
  ) =>
    entries.push({
      level: toPinoLevel(level),
      time: Date.now(),
      pid: PID,
      hostname: HOSTNAME,
      name: LOGGER_NAME,
      layer,
      msg,
      event,
      runId,
      ...(data === undefined ? {} : { data: toSafeLogData(data) }),
    });
  return {
    debug: (event, msg, data) => push("debug", event, msg, data),
    info: (event, msg, data) => push("info", event, msg, data),
    warn: (event, msg, data) => push("warn", event, msg, data),
    error: (event, msg, data) => push("error", event, msg, data),
  };
}

function toPinoLevel(level: QaLogLevel): number {
  if (level === "debug") return 20;
  if (level === "info") return 30;
  if (level === "warn") return 40;
  return 50;
}

function buildRunId(seed: string): string {
  const cleanSeed = seed.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "qa";
  return `${cleanSeed}-${Date.now().toString(36)}`;
}
