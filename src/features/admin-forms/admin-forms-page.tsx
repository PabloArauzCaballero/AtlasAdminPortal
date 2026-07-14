"use client";

import { RoleGate } from "@/shared/auth/role-gate";
import { PageHeader } from "@/shared/components/layout/page-header";
import { AdminFormsTable } from "./admin-forms-table";

export function AdminFormsPage() {
  return (
    <RoleGate roles={["SUPER_ADMIN"]}>
      <PageHeader
        eyebrow="Administración"
        title="Formularios disponibles"
        description="Mapa de formularios operativos. Las opciones de negocio se cargan desde cada módulo y no desde valores hardcodeados. Solo visible para superadmin."
      />
      <AdminFormsTable />
    </RoleGate>
  );
}
