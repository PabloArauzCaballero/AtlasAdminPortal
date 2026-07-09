"use client";

import { useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { useCancelJobRunMutation, useRetryJobRunMutation } from "./hooks";

type PendingAction = "retry" | "cancel" | null;

export function JobActions({ jobRunId }: Readonly<{ jobRunId: string }>) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const retry = useRetryJobRunMutation(jobRunId);
  const cancel = useCancelJobRunMutation(jobRunId);
  const isLoading = retry.isPending || cancel.isPending;

  return (
    <PermissionGate permissions={["internal.jobs.execute"]}>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setPendingAction("retry")}>Reintentar</Button>
        <Button variant="danger" onClick={() => setPendingAction("cancel")}>
          Cancelar
        </Button>
      </div>
      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction === "retry" ? "Reintentar job" : "Cancelar job"}
        description="Esta acción cambia el estado operativo del proceso y quedará auditada. Confirma que corresponde ejecutarla."
        confirmText={pendingAction === "retry" ? "Reintentar" : "Cancelar"}
        isLoading={isLoading}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          const action = pendingAction === "retry" ? retry : cancel;
          void action.mutateAsync().finally(() => setPendingAction(null));
        }}
      />
    </PermissionGate>
  );
}
