"use client";

import Link from "next/link";
import { KeyValueSection } from "@/shared/components/data-display/key-value";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Badge,
  RiskBadge,
  SeverityBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime, formatNumber, safeText } from "@/shared/lib/format";
import { useInvestigationSummary } from "./hooks";
import { Search } from "lucide-react";

export function InvestigationSummaryPage({
  customerId,
}: Readonly<{ customerId: string }>) {
  const summary = useInvestigationSummary(customerId);

  return (
    <>
      <PageHeader
        icon={Search}
        eyebrow="Operaciones"
        title={`Investigación del cliente #${customerId}`}
        description="Perfil, contactos, consentimientos, última evaluación de riesgo y casos abiertos — vista consolidada para revisión manual o de fraude."
      />
      <BusinessContextNote>
        Esta vista solo lee. Para decidir un caso, volvé a la Cola de trabajo y
        usá la acción &quot;Decidir&quot; sobre la fila correspondiente.
      </BusinessContextNote>
      {summary.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {summary.error ? (
        <ErrorState
          description={
            isAtlasApiError(summary.error)
              ? summary.error.message
              : `No se pudo cargar la investigación del cliente #${customerId}.`
          }
          requestId={
            isAtlasApiError(summary.error) ? summary.error.requestId : undefined
          }
          onRetry={() => void summary.refetch()}
        />
      ) : null}
      {summary.data ? (
        <div className="space-y-6">
          <KeyValueSection
            title="Cliente"
            items={[
              {
                label: "ID",
                value: summary.data.customer.customerId,
                mono: true,
              },
              {
                label: "Código",
                value: summary.data.customer.customerCode,
                mono: true,
              },
              { label: "Estado", value: summary.data.customer.status },
              {
                label: "Teléfono (últimos 4)",
                value: summary.data.customer.phoneLast4,
              },
              {
                label: "Dominio de email",
                value: summary.data.customer.emailDomain,
              },
              {
                label: "Creado",
                value: formatDateTime(summary.data.customer.createdAt),
              },
              ...(summary.data.profile
                ? [
                    {
                      label: "Nombre",
                      value: `${safeText(summary.data.profile.firstName)} ${safeText(summary.data.profile.lastName)}`,
                    },
                    {
                      label: "Fecha de nacimiento",
                      value: summary.data.profile.birthDate,
                    },
                    {
                      label: "Idioma preferido",
                      value: summary.data.profile.preferredLanguage,
                    },
                  ]
                : []),
            ]}
          />

          <section className="rounded-2xl border border-atlas-border bg-white shadow-subtle">
            <div className="border-b border-atlas-border bg-slate-50/70 px-5 py-4">
              <h2 className="text-sm font-semibold text-atlas-text">
                Última evaluación de riesgo
              </h2>
            </div>
            <div className="p-5">
              {summary.data.latestRiskAssessment ? (
                <div className="flex flex-wrap items-center gap-3">
                  <RiskBadge
                    value={summary.data.latestRiskAssessment.riskLevel}
                  />
                  <span className="text-sm text-atlas-text">
                    {safeText(
                      summary.data.latestRiskAssessment.recommendedAction,
                    )}
                  </span>
                  <span className="text-sm text-atlas-muted">
                    Score:{" "}
                    {formatNumber(summary.data.latestRiskAssessment.fraudScore)}
                  </span>
                  <Link
                    href={`/internal/operations/risk-assessments/${summary.data.latestRiskAssessment.riskAssessmentRunId}`}
                    className="ml-auto font-mono text-xs text-atlas-accent underline"
                  >
                    run #{summary.data.latestRiskAssessment.riskAssessmentRunId}
                  </Link>
                  <span className="w-full text-xs text-atlas-muted">
                    Decidido:{" "}
                    {formatDateTime(
                      summary.data.latestRiskAssessment.decidedAt,
                    )}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-atlas-muted">
                  Sin evaluaciones de riesgo registradas.
                </p>
              )}
            </div>
          </section>

          {/*
            Identidad y agenda: la mitad del expediente que esta pantalla no enseñaba.

            Quien investiga un caso de fraude documental necesita saber, en el mismo sitio, si el
            carnet se verificó, con qué parecido, con cuánto riesgo de falsificación y si el teléfono
            desde el que se dio de alta se parece al de alguien que vive con él. Estaba todo
            registrado y repartido entre tres herramientas, así que la investigación empezaba
            reuniéndolo a mano — y con prisa se decidía sin ello.

            De la agenda se enseña su FORMA y nunca su contenido: ni un nombre, ni un teléfono. Lo
            que el teléfono manda son cuentas, y lo que el servidor cruza son hashes que descarta.
          */}
          <section className="grid gap-4 md:grid-cols-2">
            <KeyValueSection
              title="Verificación de identidad"
              items={
                summary.data.latestIdentityVerification
                  ? [
                      {
                        label: "Resultado",
                        value: safeText(summary.data.latestIdentityVerification.result),
                      },
                      {
                        label: "Canal",
                        value: safeText(summary.data.latestIdentityVerification.channel),
                      },
                      {
                        label: "Parecido biométrico",
                        value: formatNumber(summary.data.latestIdentityVerification.similarity),
                      },
                      {
                        // Riesgo de FALSIFICACIÓN del documento, no confianza en la lectura. Se
                        // nombra entero porque los dos números viven al lado y se confunden.
                        label: "Riesgo de fraude documental",
                        value: formatNumber(summary.data.latestIdentityVerification.fraudRisk),
                      },
                      {
                        label: "Solicitada",
                        value: formatDateTime(summary.data.latestIdentityVerification.requestedAt),
                      },
                      {
                        label: "Resuelta",
                        value: formatDateTime(summary.data.latestIdentityVerification.completedAt),
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
                summary.data.addressBook.available
                  ? [
                      {
                        label: "Contactos",
                        value: formatNumber(summary.data.addressBook.totalContacts),
                      },
                      {
                        label: "Números distintos",
                        value: formatNumber(summary.data.addressBook.uniqueRatio),
                      },
                      {
                        label: "Números bolivianos",
                        value: formatNumber(summary.data.addressBook.bolivianRatio),
                      },
                      {
                        label: "Referencias dentro de la agenda",
                        value: formatNumber(
                          summary.data.addressBook.referencesFoundInAddressBook,
                        ),
                      },
                      {
                        label: "Coincidencias con teléfonos ya marcados",
                        value: formatNumber(summary.data.addressBook.riskMatches),
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

          <section className="grid gap-4 md:grid-cols-2">
            <ListCard title="Contactos" empty="Sin contactos registrados.">
              {summary.data.contacts.map((contact, index) => (
                <li
                  key={`${contact.contactType}-${index}`}
                  className="flex items-center justify-between gap-2 py-1.5 text-sm"
                >
                  <span>
                    {safeText(contact.contactType)} · ···
                    {safeText(contact.valueLast4)}
                    {contact.isPrimary ? (
                      <Badge tone="info" className="ml-2">
                        Primario
                      </Badge>
                    ) : null}
                  </span>
                  <StatusBadge value={contact.status} />
                </li>
              ))}
            </ListCard>
            <ListCard
              title="Consentimientos"
              empty="Sin consentimientos registrados."
            >
              {summary.data.consents.map((consent, index) => (
                <li
                  key={`${consent.purposeCode}-${index}`}
                  className="flex items-center justify-between gap-2 py-1.5 text-sm"
                >
                  <span>{safeText(consent.purposeCode)}</span>
                  <Badge tone={consent.granted ? "success" : "muted"}>
                    {consent.granted ? "Otorgado" : "No otorgado"}
                  </Badge>
                </li>
              ))}
            </ListCard>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <ListCard
              title={`Casos de revisión manual (${summary.data.manualReviewCases.length})`}
              empty="Sin casos de revisión manual abiertos."
            >
              {summary.data.manualReviewCases.map((item) => (
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
              title={`Casos de fraude (${summary.data.fraudCases.length})`}
              empty="Sin casos de fraude abiertos."
            >
              {summary.data.fraudCases.map((item) => (
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
        </div>
      ) : null}
    </>
  );
}

function ListCard({
  title,
  empty,
  children,
}: Readonly<{ title: string; empty: string; children: React.ReactNode }>) {
  const hasChildren = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);
  return (
    <section className="rounded-2xl border border-atlas-border bg-white shadow-subtle">
      <div className="border-b border-atlas-border bg-slate-50/70 px-5 py-3">
        <h2 className="text-sm font-semibold text-atlas-text">{title}</h2>
      </div>
      <div className="p-5">
        {hasChildren ? (
          <ul className="divide-y divide-slate-100">{children}</ul>
        ) : (
          <p className="text-sm text-atlas-muted">{empty}</p>
        )}
      </div>
    </section>
  );
}
