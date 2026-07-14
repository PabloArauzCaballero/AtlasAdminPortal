"use client";

import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SchemaChangeLogTable } from "./schema-change-log-table";

export function SchemaChangeLogPage() {
  return (
    <>
      <PageHeader
        eyebrow="Esquema"
        title="Change log de propuestas"
        description="Propuestas de cambio de esquema (crear tabla) pendientes o resueltas, con el segundo par de ojos de aprobación."
      />
      <BusinessContextNote>
        Aprobar/rechazar es exclusivo de{" "}
        <span className="font-mono">platform_admin</span> y el backend impide
        que el mismo usuario que propuso apruebe su propio cambio (4 ojos) — si
        tu rol no alcanza, la acción devuelve un error claro.
      </BusinessContextNote>
      <SchemaChangeLogTable />
    </>
  );
}
