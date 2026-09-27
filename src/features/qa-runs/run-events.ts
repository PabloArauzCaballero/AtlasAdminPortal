import type {
  QaRunEvent,
  QaRunEventLog,
  QaRunEventPage,
} from "./run-extras-types";

/**
 * Suma una página de eventos a lo acumulado.
 *
 * Se deduplica por `sequence` porque dos sondeos pueden solaparse (el primero tarda, el segundo
 * sale con el mismo cursor) y pintar dos veces «Persona terminada» haría creer que terminó otra.
 * El cursor nunca retrocede: una respuesta vacía devuelve el mismo `after`.
 */
export function mergeRunEvents(
  previous: QaRunEventLog,
  page: QaRunEventPage,
): QaRunEventLog {
  const bySequence = new Map<number, QaRunEvent>();
  for (const event of previous.items) bySequence.set(event.sequence, event);
  for (const event of page.items) bySequence.set(event.sequence, event);
  const items = [...bySequence.values()].sort(
    (a, b) => a.sequence - b.sequence,
  );
  return { items, cursor: Math.max(previous.cursor, page.nextCursor) };
}

const EVENT_LABEL: Record<string, string> = {
  RUN_QUEUED: "Corrida en cola",
  RUN_STARTED: "Corrida iniciada",
  MOCK_NAMESPACE_OPENED: "Simulador de proveedores preparado",
  PERSONA_FINISHED: "Persona terminada",
  RUN_FINISHED: "Corrida terminada",
};

function field(payload: unknown, name: string): unknown {
  return payload && typeof payload === "object"
    ? (payload as Record<string, unknown>)[name]
    : undefined;
}

/** Una línea legible por evento; los tipos desconocidos se muestran con su código tal cual. */
export function describeRunEvent(event: QaRunEvent): {
  label: string;
  detail: string | null;
} {
  const label = EVENT_LABEL[event.type] ?? event.type;
  const p = event.payload;
  switch (event.type) {
    case "RUN_STARTED":
      return {
        label,
        detail: `${String(field(p, "persons") ?? "?")} personas, ${String(field(p, "concurrency") ?? "?")} a la vez`,
      };
    case "PERSONA_FINISHED": {
      const failed = field(p, "failedStepKey");
      return {
        label,
        detail: `${String(field(p, "personaKey") ?? "?")} · ${String(field(p, "status") ?? "?")}${failed ? ` · falló en ${String(failed)}` : ""}`,
      };
    }
    case "RUN_FINISHED": {
      const verdict = field(p, "verdict");
      return {
        label,
        detail: `${String(field(p, "status") ?? "?")} · ${verdict ? `veredicto ${String(verdict)}` : "sin veredicto"}`,
      };
    }
    case "MOCK_NAMESPACE_OPENED":
      return { label, detail: String(field(p, "namespace") ?? "") || null };
    default:
      return { label, detail: null };
  }
}
