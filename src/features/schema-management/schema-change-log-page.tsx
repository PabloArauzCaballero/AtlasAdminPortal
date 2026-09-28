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
        title="Change log de propuestas"
        description="Propuestas de cambio de esquema (crear tabla) pendientes o resueltas, con el segundo par de ojos de aprobación."
      />
      <BusinessContextNote>
        Aprobar/rechazar exige el permiso{" "}
        <span className="font-mono">governance.schema.approve</span> (lo tienen
        Gobierno de datos, Administración de sistemas y Superadministración) y
        el backend impide que quien propuso apruebe su propio cambio (4 ojos).
      </BusinessContextNote>
      <SchemaChangeLogTable />
    </>
  );
}
