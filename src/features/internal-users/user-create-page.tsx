"use client";

import { UserCreateForm } from "./user-create-form";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";

export function UserCreatePage() {
  return (
    <PermissionGate permissions={["internal.users.manage"]}>
      <PageHeader
        eyebrow="Administración"
        title="Nuevo usuario interno"
        description="Alta de personal con acceso al backoffice. La contraseña inicial es temporal y generada al azar; nadie la elige a mano."
      />
      <BusinessContextNote>
        Cada cuenta interna es una puerta a datos de clientes y acciones
        críticas. Por eso el alta exige rol explícito y motivo auditable, y
        fuerza cambio de contraseña en el primer login: la contraseña temporal
        solo se muestra una vez, para compartirla fuera de este portal.
      </BusinessContextNote>
      <UserCreateForm />
    </PermissionGate>
  );
}
