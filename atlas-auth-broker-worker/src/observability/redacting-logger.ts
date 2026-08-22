/**
 * Log estructurado con redacción obligatoria.
 *
 * En un proceso cuya razón de ser es custodiar credenciales, el log es la fuga más probable: no
 * hace falta un atacante, basta un `logger.error('fallo', { error })` donde el error arrastra el
 * cuerpo de la petición. Por eso la redacción no es opcional ni configurable, y actúa por dos
 * vías independientes —el nombre del campo y la forma del valor—, de modo que un campo con nombre
 * inocente que contenga un JWT se redacta igual.
 */
import type { AuthBrokerLogger } from '../application/ports';

const SENSITIVE_KEY =
  /(secret|password|passwd|private_?key|api_?key|assertion|access_?token|id_?token|refresh_?token|code_?verifier|cookie|authorization)/iu;

/** Campos con nombre sensible que son publicables por construcción. */
const EXPLICITLY_PUBLIC = new Set([
  'authMethod',
  'credentialStatus',
  'credentialFingerprint',
  'fingerprint',
  'tokenStatus',
  'tokenExpiresAt',
  'lastFailureCode',
  'lastRefreshAt',
]);

/** Un JWT o un blob base64 largo no debería aparecer nunca en un log de este worker. */
const JWT_SHAPED = /^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/u;
const LONG_OPAQUE = /^[A-Za-z0-9+/_-]{40,}={0,2}$/u;

const REDACTED = '[redactado]';
const MAX_STRING_LENGTH = 256;
const MAX_DEPTH = 4;

function redactValue(value: unknown, depth: number): unknown {
  if (typeof value === 'string') {
    if (JWT_SHAPED.test(value) || LONG_OPAQUE.test(value)) return REDACTED;
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (value === undefined) return undefined;
  if (depth >= MAX_DEPTH) return '[profundidad máxima]';
  if (Array.isArray(value)) return value.map((entry) => redactValue(entry, depth + 1));
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (typeof value === 'object') return redactObject(value as Record<string, unknown>, depth + 1);
  return REDACTED;
}

function redactObject(input: Record<string, unknown>, depth: number): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!EXPLICITLY_PUBLIC.has(key) && SENSITIVE_KEY.test(key)) {
      output[key] = REDACTED;
      continue;
    }
    output[key] = redactValue(value, depth);
  }
  return output;
}

/** Aplica la redacción a un contexto de log. Exportada para poder comprobarla directamente. */
export function redactContext(
  context: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  return redactObject(context, 0);
}

export type LogLevel = 'info' | 'warn' | 'error';

export class RedactingLogger implements AuthBrokerLogger {
  constructor(
    private readonly service = 'atlas-auth-broker-worker',
    private readonly sink: (line: string) => void = (line): void => {
      process.stdout.write(`${line}\n`);
    },
  ) {}

  private emit(level: LogLevel, event: string, context?: Readonly<Record<string, unknown>>): void {
    this.sink(
      JSON.stringify({
        level,
        service: this.service,
        event,
        timestamp: new Date().toISOString(),
        ...redactContext(context),
      }),
    );
  }

  info(event: string, context?: Readonly<Record<string, unknown>>): void {
    this.emit('info', event, context);
  }

  warn(event: string, context?: Readonly<Record<string, unknown>>): void {
    this.emit('warn', event, context);
  }

  error(event: string, context?: Readonly<Record<string, unknown>>): void {
    this.emit('error', event, context);
  }
}
