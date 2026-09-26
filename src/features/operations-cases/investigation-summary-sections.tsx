"use client";

import { KeyValueSection } from "@/shared/components/data-display/key-value";
import { SeverityBadge, StatusBadge } from "@/shared/components/ui/badges";
import { formatDateTime, formatNumber, safeText } from "@/shared/lib/format";
import { ListCard } from "./list-card";
import type { getInvestigationSummary } from "./services";

type Resumen = Awaited<ReturnType<typeof getInvestigationSummary>>;

/**
 * Las dos secciones de la página de investigación que sólo PINTAN datos del resumen: la verificación
 * de identidad con la forma de la agenda, y los casos abiertos. Viven aparte porque la página
 * superaba las 300 líneas del gate al sumar el panel de evidencia y el reenvío de códigos; separar lo
 * que sólo lee de lo que actúa deja la página con las acciones y estas con la lectura.
 */
export function IdentidadYAgendaSection({ data }: Readonly<{ data: Resumen }>) {
  return (
    <section className="grid gap-4 grid-cols-1 md:grid-cols-2">
      <KeyValueSection
        title="Verificación de identidad"
        items={
          data.latestIdentityVerification
            ? [
                {
                  label: "Resultado",
                  value: safeText(data.latestIdentityVerification.result),
                },
                {
                  label: "Canal",
                  value: safeText(data.latestIdentityVerification.channel),
                },
                {
                  label: "Parecido biométrico",
                  value: formatNumber(
                    data.latestIdentityVerification.similarity,
                  ),
                },
                {
                  // Riesgo de FALSIFICACIÓN del documento, no confianza en la lectura. Se
                  // nombra entero porque los dos números viven al lado y se confunden.
                  label: "Riesgo de fraude documental",
                  value: formatNumber(
                    data.latestIdentityVerification.fraudRisk,
                  ),
                },
                {
                  label: "Solicitada",
                  value: formatDateTime(
                    data.latestIdentityVerification.requestedAt,
                  ),
                },
                {
                  label: "Resuelta",
                  value: formatDateTime(
                    data.latestIdentityVerification.completedAt,
                  ),
                },
              ]
            : [
                {
                  label: "Resultado",
                  value: "Sin verificaciones de identidad registradas",
                },
              ]
        }
      />
      <KeyValueSection
        title="Agenda del dispositivo"
        items={
          data.addressBook.available
            ? [
                {
                  label: "Contactos",
                  value: formatNumber(data.addressBook.totalContacts),
                },
                {
                  label: "Números distintos",
                  value: formatNumber(data.addressBook.uniqueRatio),
                },
                {
                  label: "Números bolivianos",
                  value: formatNumber(data.addressBook.bolivianRatio),
                },
                {
                  label: "Referencias dentro de la agenda",
                  value: formatNumber(
                    data.addressBook.referencesFoundInAddressBook,
                  ),
                },
                {
                  label: "Coincidencias con teléfonos ya marcados",
                  value: formatNumber(data.addressBook.riskMatches),
                },
              ]
            : [
                {
                  /*
                              «No compartida» y no «vacía», y la diferencia importa: negarse a dar el
                              permiso es un derecho, no una señal de fraude. Enseñarlo como una agenda
                              de cero contactos invitaría a leer una decisión legítima como sospechosa.
                            */
                  label: "Estado",
                  value:
                    "No compartida — la persona no dio el permiso, o el alta es anterior a esta señal",
                },
              ]
        }
      />
    </section>
  );
}

export function CasosAbiertosSection({ data }: Readonly<{ data: Resumen }>) {
  return (
    <section className="grid gap-4 grid-cols-1 md:grid-cols-2">
      <ListCard
        title={`Casos de revisión manual (${data.manualReviewCases.length})`}
        empty="Sin casos de revisión manual abiertos."
      >
        {data.manualReviewCases.map((item) => (
          <li
            key={item.caseId}
            className="flex items-center justify-between gap-2 py-1.5 text-sm"
          >
            <span className="font-mono text-xs">
              #{item.caseId} · {safeText(item.caseType)}
            </span>
            <StatusBadge value={item.status} />
          </li>
        ))}
      </ListCard>
      <ListCard
        title={`Casos de fraude (${data.fraudCases.length})`}
        empty="Sin casos de fraude abiertos."
      >
        {data.fraudCases.map((item) => (
          <li
            key={item.caseId}
            className="flex items-center justify-between gap-2 py-1.5 text-sm"
          >
            <span className="font-mono text-xs">#{item.caseId}</span>
            <span className="flex items-center gap-2">
              <SeverityBadge value={item.severity} />
              <StatusBadge value={item.caseStatus} />
            </span>
          </li>
        ))}
      </ListCard>
    </section>
  );
}
