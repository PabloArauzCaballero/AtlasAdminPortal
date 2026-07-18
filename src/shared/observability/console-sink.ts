import type { ObservabilityEvent } from "./reporter";

/**
 * Sink de desarrollo: imprime el evento (ya redactado por el reporter) en la
 * consola. En producción se registra un sink real (Sentry/endpoint), no este.
 */
export function consoleSink(event: ObservabilityEvent): void {
  const detail = {
    name: event.name,
    status: event.status,
    code: event.code,
    requestId: event.requestId,
    ...event.context,
  };
  // eslint-disable-next-line no-console -- salida intencional del sink de dev
  console.warn(`[obs:${event.type}] ${event.message}`, detail);
}
