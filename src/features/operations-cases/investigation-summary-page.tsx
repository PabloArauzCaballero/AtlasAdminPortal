"use client";

import { KeyValueSection } from "@/shared/components/data-display/key-value";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { TarjetaDeExpediente } from "@/features/files/expediente-summary-card";
import { CustomerCreditSection } from "@/features/credit/customer-credit-section";
import { CustomerPortfolioSection } from "@/features/loans/customer-portfolio-section";
import { UltimaEvaluacionDeRiesgo } from "./latest-risk-section";
import { IdentityEvidencePanel } from "./identity-evidence-panel";
import {
  CasosAbiertosSection,
  IdentidadYAgendaSection,
} from "./investigation-summary-sections";
import { ContactosYConsentimientos } from "./investigation-contact-tables";
import { CustomerDecisionsPanel } from "./customer-decisions-panel";
import { RecalculateRiskAction } from "./recalculate-risk-action";
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
        Aquí se investiga y se actúa sobre el cliente: cribado de listas
        restrictivas, decisión de habilitación y recálculo del riesgo. Los casos
        de alta o de fraude se deciden desde la Cola de trabajo o desde las
        colas de revisión manual y de fraude; las solicitudes de crédito, desde
        la sección Crédito, abriendo cada solicitud.
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
          <RecalculateRiskAction customerId={customerId} />

          <CustomerDecisionsPanel
            customerId={customerId}
            currentStatus={summary.data.customer.status}
          />

          <CustomerCreditSection customerId={customerId} />

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

          <ContactosYConsentimientos
            customerId={customerId}
            contactos={summary.data.contacts}
            consentimientos={summary.data.consents}
          />

          <CasosAbiertosSection data={summary.data} />

          <CustomerPortfolioSection customerId={customerId} />
        </div>
      ) : null}
    </>
  );
}
