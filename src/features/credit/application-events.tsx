import { History } from "lucide-react";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/ui/states";
import { formatDateTime } from "@/shared/lib/format";
import { APPLICATION_STATUS_LABELS, labelOr } from "./credit-options";
import type { CreditApplicationEvent } from "./types";

const EVENT_LABELS: Record<string, string> = {
  submitted: "Solicitud enviada",
  decision_recorded: "Decisión registrada",
  decision_deferred: "Decisión aplazada",
  business_acceptance_recorded: "Respuesta del negocio",
};

/** Quién escribió el evento: el motor, su bandeja de revisión o una persona (por su rol). */
const ACTOR_LABELS: Record<string, string> = {
  decision_engine: "Motor de decisiones",
  decision_engine_manual_review: "Revisión en el Motor",
  customer: "Cliente",
  merchant: "Comercio",
};

/** El historial de la solicitud, más reciente primero (hasta 100 eventos, como lo sirve el backend). */
export function ApplicationEvents({
  events,
}: Readonly<{ events: CreditApplicationEvent[] }>) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          icon={History}
          title="Historial"
          description="Cada cambio de la solicitud, quién lo hizo y por qué. No se edita ni se borra."
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <EmptyState
            title="Sin eventos registrados."
            description="Las solicitudes anteriores al historial pueden no tener eventos."
          />
        ) : (
          <ol className="space-y-3">
            {events.map((event) => (
              <li
                key={event.id}
                className="rounded-lg border border-atlas-border px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span
                    className="font-medium text-atlas-text"
                    title={event.eventType}
                  >
                    {labelOr(EVENT_LABELS, event.eventType)}
                  </span>
                  <span className="text-xs text-atlas-muted">
                    {formatDateTime(event.happenedAt)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-atlas-muted">
                  {event.previousStatus || event.newStatus
                    ? `${labelOr(APPLICATION_STATUS_LABELS, event.previousStatus)} → ${labelOr(APPLICATION_STATUS_LABELS, event.newStatus)} · `
                    : ""}
                  {labelOr(ACTOR_LABELS, event.actorType)}
                  {event.actorInternalUserId
                    ? ` #${event.actorInternalUserId}`
                    : ""}
                  {event.reasonCode ? ` · ${event.reasonCode}` : ""}
                </p>
                {event.notes ? (
                  <p className="mt-1 whitespace-pre-line text-atlas-text">
                    {event.notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
