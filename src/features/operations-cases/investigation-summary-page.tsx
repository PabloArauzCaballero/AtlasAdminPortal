"use client";

import { useState } from "react";

import { KeyValueSection } from "@/shared/components/data-display/key-value";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge, StatusBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { TarjetaDeExpediente } from "@/features/files/expediente-summary-card";
import { UltimaEvaluacionDeRiesgo } from "./latest-risk-section";
import { IdentityEvidencePanel } from "./identity-evidence-panel";
import {
  CasosAbiertosSection,
  IdentidadYAgendaSection,
} from "./investigation-summary-sections";
import { ListCard } from "./list-card";
import {
  useInvestigationSummary,
  useResendContactVerificationMutation,
} from "./hooks";
import { MailCheck, Search } from "lucide-react";

export function InvestigationSummaryPage({
  customerId,
}: Readonly<{ customerId: string }>) {
  const summary = useInvestigationSummary(customerId);
  const reenvio = useResendContactVerificationMutation();
  const [reenvioAviso, setReenvioAviso] = useState<string | null>(null);

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

          <TarjetaDeExpediente customerId={customerId} />

          <UltimaEvaluacionDeRiesgo
            evaluacion={summary.data.latestRiskAssessment}
          />

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
          <IdentityEvidencePanel customerId={customerId} />

          <IdentidadYAgendaSection data={summary.data} />

          <section className="grid gap-4 grid-cols-1 md:grid-cols-2">
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
                  <span className="flex items-center gap-2">
                    <StatusBadge value={contact.status} />
                    {contact.status === "unverified" &&
                    (contact.contactType === "email" ||
                      contact.contactType === "phone") ? (
                      <Button
                        variant="secondary"
                        disabled={reenvio.isPending}
                        onClick={() =>
                          reenvio.mutate(
                            {
                              customerId,
                              body: {
                                contactType: contact.contactType as
                                  "email" | "phone",
                              },
                            },
                            {
                              onSuccess: () =>
                                setReenvioAviso("Código reenviado al cliente."),
                              onError: (error) =>
                                setReenvioAviso(
                                  `No se pudo reenviar: ${isAtlasApiError(error) ? error.message : "inténtalo en un minuto."}`,
                                ),
                            },
                          )
                        }
                      >
                        <MailCheck className="h-3.5 w-3.5" />
                        Reenviar código
                      </Button>
                    ) : null}
                  </span>
                </li>
              ))}
              {reenvioAviso ? (
                <li className="py-1.5 text-xs text-atlas-muted" role="status">
                  {reenvioAviso}
                </li>
              ) : null}
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

          <CasosAbiertosSection data={summary.data} />
        </div>
      ) : null}
    </>
  );
}
