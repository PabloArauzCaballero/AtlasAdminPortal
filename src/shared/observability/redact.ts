/**
 * Redacción para observabilidad: la telemetría nunca debe arrastrar credenciales
 * ni PII. Se aplica a cualquier contexto antes de mandarlo al sink.
 */

const SENSITIVE_KEY =
  /^(authorization|cookie|set-cookie|password|passwd|pwd|token|access_?token|refresh_?token|csrf(token)?|secret|api_?key|email|phone|telefono|documento|document|nid|ci)$/i;

const REDACTED = "[redactado]";
const MAX_DEPTH = 6;

/** Enmascara tokens tipo "Bearer xxx" dentro de una cadena libre. */
export function redactString(value: string): string {
  return value.replace(/Bearer\s+[\w.\-]+/gi, "Bearer [redactado]");
}

/** Redacta recursivamente por nombre de clave; corta a profundidad MAX_DEPTH. */
export function redactSensitive(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[…]";
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item, depth + 1));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key)
        ? REDACTED
        : redactSensitive(val, depth + 1);
    }
    return out;
  }
  return value;
}
