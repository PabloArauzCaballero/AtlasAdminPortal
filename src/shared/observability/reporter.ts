import { isAtlasApiError } from "@/shared/api/errors";
import { redactSensitive, redactString } from "./redact";

export type ObservabilityEventType =
  | "route_error"
  | "global_error"
  | "contract_error"
  | "refresh_fail"
  | "web_vital";

export type ObservabilityContext = Record<string, unknown>;

export type ObservabilityEvent = {
  type: ObservabilityEventType;
  name: string;
  message: string;
  status?: number;
  code?: string;
  requestId?: string;
  context: ObservabilityContext;
};

export type ObservabilitySink = (event: ObservabilityEvent) => void;

const noop: ObservabilitySink = () => {};
let sink: ObservabilitySink = noop;

/** Registra el destino real (Sentry, un endpoint, etc.). null vuelve al no-op. */
export function setObservabilitySink(next: ObservabilitySink | null): void {
  sink = next ?? noop;
}

/**
 * Reporta un evento con contexto redactado. Nunca lanza: un fallo de la
 * telemetría no debe tumbar la app.
 */
export function reportEvent(
  type: ObservabilityEventType,
  error: unknown,
  context: ObservabilityContext = {},
): void {
  const apiError = isAtlasApiError(error) ? error : null;
  const event: ObservabilityEvent = {
    type,
    name: error instanceof Error ? error.name : "UnknownError",
    message: redactString(errorMessage(error)),
    status: apiError?.status,
    code: apiError?.code,
    requestId: apiError?.requestId ?? asString(context.requestId),
    context: redactSensitive({
      ...baseContext(),
      ...context,
    }) as ObservabilityContext,
  };

  try {
    sink(event);
  } catch {
    // La observabilidad es best-effort: se traga cualquier error del sink.
  }
}

function baseContext(): ObservabilityContext {
  return {
    environment: process.env.NEXT_PUBLIC_ATLAS_ENVIRONMENT ?? "unknown",
    release: process.env.NEXT_PUBLIC_ATLAS_RELEASE,
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Error sin mensaje";
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
