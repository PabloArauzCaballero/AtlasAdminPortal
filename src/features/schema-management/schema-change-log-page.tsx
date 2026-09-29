"use client";

import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SchemaChangeLogTable } from "./schema-change-log-table";
import { History } from "lucide-react";

export function SchemaChangeLogPage() {
  return (
    <>
      <PageHeader
        icon={History}
        eyebrow="Esquema"
        title="Historial de cambios propuestos"
        description="Propuestas de cambio de esquema (crear tabla) pendientes o resueltas, con el segundo par de ojos de aprobación."
      />
      <BusinessContextNote>
        Aprobar o rechazar exige el permiso para aprobar cambios de esquema (lo
        tienen Gobierno de datos, Administración de sistemas y
        Superadministración), y el sistema impide que quien propuso un cambio lo
        apruebe (siempre revisan dos personas).
      </BusinessContextNote>
      <SchemaChangeLogTable />
    </>
  );
}
