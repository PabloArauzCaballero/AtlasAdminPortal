"use client";

import Link from "next/link";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { CustomerAuditFeedSection } from "./customer-audit-feed-section";
import { UserSearch } from "lucide-react";

/**
 * Una sola fuente: el feed por cursor (`GET /operations/audit/customer/:id/feed`). La ruta anterior
 * por offset está deprecada en el backend (pagina en memoria sobre 1000 filas por fuente, así que sus
 * totales eran aproximados) y el portal ya no la llama (auditoría 2026-09-29, §5).
 */
export function CustomerAuditPage({
  customerId,
}: Readonly<{ customerId: string }>) {
  return (
    <PermissionGate permissions={["audit.events.read"]}>
      <PageHeader
        icon={UserSearch}
        eyebrow="Operaciones"
        title={`Auditoría del cliente #${customerId}`}
        description="Historial de auditoría del cliente unificado desde 8 fuentes del sistema: auditoría operativa, cambios de datos, autenticación, consentimientos, acciones del cliente, cambios de estado, fraude y revisión manual."
        actions={
          <Link
            href={`/internal/operations/customers/${encodeURIComponent(customerId)}/investigation-summary`}
            className="text-sm font-medium text-atlas-accent underline"
          >
            Ver investigación
          </Link>
        }
      />
      <BusinessContextNote>
        Esta vista solo lee. Sirve para reconstruir qué le pasó a un cliente y
        quién lo hizo: cuándo cambió de estado, cuándo se autenticó, qué
        consintió y qué decisiones de riesgo o fraude se tomaron sobre él. Se
        recorre del más reciente al más antiguo, completo, sin totales
        aproximados.
      </BusinessContextNote>
      <CustomerAuditFeedSection customerId={customerId} />
    </PermissionGate>
  );
}
