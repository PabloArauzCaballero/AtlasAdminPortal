"use client";

import { useState } from "react";
import { RoleGate } from "@/shared/auth/role-gate";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { useAcknowledgeAlertMutation } from "./hooks";

export function AlertActions({ alertId }: Readonly<{ alertId: string }>) {
  const [open, setOpen] = useState(false);
  const acknowledge = useAcknowledgeAlertMutation();

  return (
    <RoleGate roles={INTERNAL_PORTAL_ROLE_LIST} fallback={null}>
      <Button onClick={() => setOpen(true)}>Reconocer</Button>
      <ConfirmDialog
        open={open}
        title="Reconocer alerta"
        description="La alerta quedará marcada como revisada para el equipo interno. Esta acción será auditable."
        confirmText="Reconocer"
        isLoading={acknowledge.isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          void acknowledge.mutateAsync(alertId).finally(() => setOpen(false));
        }}
      />
    </RoleGate>
  );
}
