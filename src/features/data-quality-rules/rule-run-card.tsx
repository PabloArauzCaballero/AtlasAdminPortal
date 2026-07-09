"use client";

import { useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { ErrorState } from "@/shared/components/ui/states";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { isAtlasApiError } from "@/shared/api/errors";
import { useRunDataQualityRuleMutation } from "./hooks";

export function RuleRunCard({ ruleId }: Readonly<{ ruleId: string }>) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const runMutation = useRunDataQualityRuleMutation(ruleId);
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Ejecución controlada"
          description="Dispara `/internal/data-quality/rules/:id/run` con auditoría y permisos."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <PermissionGate permissions={["dataQuality.rules.manage"]}>
          <Button
            variant="primary"
            disabled={runMutation.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            {runMutation.isPending ? "Ejecutando…" : "Ejecutar regla"}
          </Button>
        </PermissionGate>
        <ConfirmDialog
          open={confirmOpen}
          title="Confirmar ejecución"
          description="La regla puede revisar datos operativos y crear evidencia de calidad. La acción quedará auditada."
          confirmText="Ejecutar"
          isLoading={runMutation.isPending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            runMutation.mutate();
          }}
        />
        {runMutation.error ? (
          <ErrorState
            description={
              isAtlasApiError(runMutation.error)
                ? runMutation.error.message
                : "No se pudo ejecutar la regla."
            }
            requestId={
              isAtlasApiError(runMutation.error)
                ? runMutation.error.requestId
                : undefined
            }
          />
        ) : null}
        {runMutation.data ? (
          <JsonViewer title="Resultado" value={runMutation.data} />
        ) : null}
      </CardContent>
    </Card>
  );
}
