"use client";

import { useState } from "react";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Button } from "@/shared/components/ui/button";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { Field, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useApproveSchemaChangeMutation } from "./hooks";
import type { SchemaChangeLog } from "./types";

export function ApproveChangeDialog({
  change,
  onClose,
}: Readonly<{ change: SchemaChangeLog; onClose: () => void }>) {
  const [approvalNotes, setApprovalNotes] = useState("");
  const [pendingApproval, setPendingApproval] = useState<
    "approve" | "reject" | null
  >(null);
  const approve = useApproveSchemaChangeMutation();

  const canReject = approvalNotes.trim().length >= 5;

  function submit(approval: "approve" | "reject") {
    setPendingApproval(approval);
    approve.mutate({
      changeId: change.changeId,
      body: { approval, approvalNotes: approvalNotes.trim() || undefined },
    });
  }

  return (
    <DrawerPanel
      open
      title={`Revisar propuesta #${change.changeId}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-sm text-atlas-text">
          {change.changeType} · solicitado por{" "}
          <span className="font-mono">#{change.requesterPlatformUserId}</span>
        </p>
        <JsonViewer title="Payload propuesto" value={change.changePayload} />
        <Field
          label="Notas de aprobación"
          hint="Obligatorio para rechazar (requisito de auditoría)."
        >
          <Textarea
            value={approvalNotes}
            onChange={(event) => setApprovalNotes(event.target.value)}
            className="min-h-20"
          />
        </Field>
        {approve.error ? (
          <ErrorState
            title="No se pudo registrar la decisión"
            description={
              isAtlasApiError(approve.error)
                ? approve.error.message
                : "Error inesperado."
            }
            requestId={
              isAtlasApiError(approve.error)
                ? approve.error.requestId
                : undefined
            }
          />
        ) : null}
        {approve.isSuccess ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {approve.data.message}
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button
            variant="primary"
            isLoading={approve.isPending && pendingApproval === "approve"}
            loadingText="Aprobando…"
            disabled={approve.isPending}
            onClick={() => submit("approve")}
          >
            Aprobar
          </Button>
          <Button
            variant="danger"
            disabled={!canReject || approve.isPending}
            isLoading={approve.isPending && pendingApproval === "reject"}
            loadingText="Rechazando…"
            onClick={() => submit("reject")}
          >
            Rechazar
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </DrawerPanel>
  );
}
