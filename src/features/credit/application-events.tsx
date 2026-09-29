import type { ColumnDef } from "@tanstack/react-table";
import { SectionTable } from "@/shared/components/data-table/section-table";
import { formatDateTime } from "@/shared/lib/format";
import {
  APPLICATION_STATUS_LABELS,
  labelOr,
  reasonLabel,
} from "./credit-options";
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
  // Una decisión humana se registra con el rol de quien la tomó (`currentUser.role`).
  internal_operator: "Operación",
  risk_analyst: "Riesgo",
  compliance_analyst: "Cumplimiento",
  fraud_analyst: "Fraude",
  admin: "Administración",
  platform_admin: "Administración",
};

function cambioDeEstado(event: CreditApplicationEvent): string {
  return event.previousStatus || event.newStatus
    ? `${labelOr(APPLICATION_STATUS_LABELS, event.previousStatus)} → ${labelOr(APPLICATION_STATUS_LABELS, event.newStatus)}`
    : "—";
}

function actor(event: CreditApplicationEvent): string {
  return `${labelOr(ACTOR_LABELS, event.actorType)}${event.actorInternalUserId ? ` #${event.actorInternalUserId}` : ""}`;
}

const COLUMNS: ColumnDef<CreditApplicationEvent>[] = [
  {
    header: "Cuándo",
    accessorKey: "happenedAt",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {formatDateTime(row.original.happenedAt)}
      </span>
    ),
  },
  {
    header: "Evento",
    accessorFn: (event) => labelOr(EVENT_LABELS, event.eventType),
    cell: ({ row }) => (
      <span
        className="font-medium text-atlas-text"
        title={row.original.eventType}
      >
        {labelOr(EVENT_LABELS, row.original.eventType)}
      </span>
    ),
  },
  { header: "Cambio de estado", accessorFn: cambioDeEstado },
  { header: "Quién", accessorFn: actor },
  {
    header: "Motivo",
    accessorFn: (event) =>
      event.reasonCode ? reasonLabel(event.reasonCode) : "—",
  },
  {
    header: "Notas",
    accessorKey: "notes",
    cell: ({ row }) =>
      row.original.notes ? (
        <span className="whitespace-pre-line">{row.original.notes}</span>
      ) : (
        "—"
      ),
  },
];

/** El historial de la solicitud, más reciente primero (hasta 100 eventos, como lo sirve el backend). */
export function ApplicationEvents({
  events,
}: Readonly<{ events: CreditApplicationEvent[] }>) {
  return (
    <SectionTable
      title="Historial"
      description="Cada cambio de la solicitud, quién lo hizo y por qué. No se edita ni se borra."
      data={events}
      columns={COLUMNS}
      searchText={(event) =>
        `${labelOr(EVENT_LABELS, event.eventType)} ${cambioDeEstado(event)} ${actor(event)} ${event.reasonCode ? reasonLabel(event.reasonCode) : ""} ${event.notes ?? ""}`
      }
      searchPlaceholder="Buscar por evento, estado, quién, motivo o notas…"
      searchTooltip="Recorre todo el historial de la solicitud (hasta 100 eventos, que llegan enteros del servidor): coincide con parte del evento, del cambio de estado, de quién lo hizo, del motivo o de las notas."
      emptyTitle="Sin eventos registrados."
      emptyDescription="Las solicitudes anteriores al historial pueden no tener eventos."
    />
  );
}
