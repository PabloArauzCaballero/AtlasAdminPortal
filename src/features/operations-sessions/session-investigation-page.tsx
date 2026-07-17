"use client";

import { isAtlasApiError } from "@/shared/api/errors";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { useSessionInvestigationSummary } from "./hooks";
import { SessionDetailTabs } from "./session-detail-tabs";
import { SessionSignalsSection } from "./session-signals-section";

export function SessionInvestigationPage({
  sessionId,
}: Readonly<{ sessionId: string }>) {
  const summary = useSessionInvestigationSummary(sessionId);

  // Sin PermissionGate a propósito, igual que la investigación de cliente y la
  // cola de trabajo (`operations-cases`): el backend gatea por rol
  // (internal_operator/risk_analyst/compliance_analyst/fraud_analyst/admin/
  // platform_admin) y no existe un permiso granular equivalente en el catálogo
  // de /internal/permissions. Gatear con `audit.events.read` mostraría
  // "Prohibido" a un fraud_analyst que el backend sí atiende — justo el público
  // de esta pantalla. Si el rol no alcanza, el backend responde 403 con mensaje.
  return (
    <>
      <PageHeader
        eyebrow="Operaciones"
        title={`Investigación de la sesión #${sessionId}`}
        description="¿Esta sesión es legítima? Señales de fraude, dispositivo, red, autenticación y actividad — todo lo que el backend registró sobre esta sesión."
        actions={
          summary.data ? (
            <StatusBadge value={summary.data.session.status} />
          ) : null
        }
      />
      <BusinessContextNote>
        Esta vista solo lee. Por privacidad, las capturas de GPS informan
        únicamente si hubo coordenadas: el backend nunca devuelve latitud ni
        longitud, así que el portal no puede ubicar al cliente en un mapa.
      </BusinessContextNote>
      {summary.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {summary.error ? (
        <ErrorState
          description={
            isAtlasApiError(summary.error)
              ? summary.error.message
              : `No se pudo cargar la investigación de la sesión #${sessionId}.`
          }
          requestId={
            isAtlasApiError(summary.error) ? summary.error.requestId : undefined
          }
          onRetry={() => void summary.refetch()}
        />
      ) : null}
      {summary.data ? (
        <>
          <SessionSignalsSection summary={summary.data} />
          <SectionHeader
            title="Evidencia de la sesión"
            description="Los registros crudos que respaldan las señales: snapshots del dispositivo, reputación de IP, SIM, autenticación, permisos, ubicación, actividad y auditoría."
          />
          <SessionDetailTabs summary={summary.data} />
        </>
      ) : null}
    </>
  );
}
