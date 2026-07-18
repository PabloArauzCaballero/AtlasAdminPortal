"use client";

import Link from "next/link";
import { KeyValueSection } from "@/shared/components/data-display/key-value";
import { formatDateTime } from "@/shared/lib/format";
import type { SessionInvestigationSummary } from "./types";

export function SessionOverviewSection({
  summary,
}: Readonly<{ summary: SessionInvestigationSummary }>) {
  const { session, customer, device } = summary;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <KeyValueSection
        title="Sesión"
        items={[
          { label: "ID de sesión", value: session.sessionId, mono: true },
          { label: "Estado", value: session.status },
          { label: "Canal", value: session.channel },
          { label: "Método de autenticación", value: session.authMethod },
          { label: "Iniciada", value: formatDateTime(session.startedAt) },
          { label: "Finalizada", value: formatDateTime(session.endedAt) },
          { label: "Dirección IP", value: session.ipAddress, mono: true },
          { label: "User agent", value: session.userAgent },
        ]}
      />
      <div className="space-y-4">
        <KeyValueSection
          title="Cliente"
          description={
            customer ? undefined : "La sesión no tiene un cliente asociado."
          }
          items={
            customer
              ? [
                  { label: "ID", value: customer.customerId, mono: true },
                  { label: "Código", value: customer.customerCode, mono: true },
                  {
                    label: "Estado de ciclo de vida",
                    value: customer.lifecycleStatus,
                  },
                ]
              : []
          }
        />
        {customer ? (
          <Link
            href={`/internal/operations/customers/${customer.customerId}/investigation-summary`}
            className="inline-flex text-sm font-semibold text-atlas-accent underline"
          >
            Ver la investigación del cliente #{customer.customerId} →
          </Link>
        ) : null}
        <KeyValueSection
          title="Dispositivo"
          description={
            device
              ? undefined
              : "La sesión no tiene un dispositivo asociado — por eso no hay eventos de riesgo de dispositivo."
          }
          items={
            device
              ? [
                  { label: "ID", value: device.deviceId, mono: true },
                  { label: "Estado de riesgo", value: device.riskStatus },
                  {
                    label: "Visto por primera vez",
                    value: formatDateTime(device.firstSeenAt),
                  },
                  {
                    label: "Visto por última vez",
                    value: formatDateTime(device.lastSeenAt),
                  },
                ]
              : []
          }
        />
      </div>
    </div>
  );
}
