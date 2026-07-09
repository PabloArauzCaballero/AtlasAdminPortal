"use client";

import { useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Field, Textarea } from "@/shared/components/ui/input";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { ErrorState } from "@/shared/components/ui/states";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { isAtlasApiError } from "@/shared/api/errors";
import { useRunReportMutation } from "./hooks";

function parseFilters(
  value: string,
): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, data: value.trim() ? JSON.parse(value) : {} };
  } catch {
    return { ok: false, error: "El JSON de filtros no es válido." };
  }
}

export function ReportRunCard({ reportId }: Readonly<{ reportId: string }>) {
  const [filters, setFilters] = useState("{}");
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const runMutation = useRunReportMutation(reportId);

  function requestExecution() {
    const parsed = parseFilters(filters);
    if (!parsed.ok) {
      setLocalError(parsed.error);
      return;
    }
    setLocalError(null);
    setConfirmOpen(true);
  }

  function execute() {
    const parsed = parseFilters(filters);
    if (!parsed.ok) {
      setLocalError(parsed.error);
      setConfirmOpen(false);
      return;
    }
    setConfirmOpen(false);
    runMutation.mutate(parsed.data);
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Ejecutar reporte"
          description="Envía filtros JSON al contrato `/internal/reports/:id/run`. No se permite SQL desde la interfaz."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <PermissionGate permissions={["reporting.execute"]}>
          <Field
            label="Filtros JSON"
            error={localError ?? undefined}
            hint="Usa solo filtros permitidos por la definición del reporte."
          >
            <Textarea
              value={filters}
              onChange={(event) => setFilters(event.target.value)}
            />
          </Field>
          <Button
            variant="primary"
            disabled={runMutation.isPending}
            onClick={requestExecution}
          >
            {runMutation.isPending ? "Ejecutando…" : "Ejecutar reporte"}
          </Button>
        </PermissionGate>
        <ConfirmDialog
          open={confirmOpen}
          title="Confirmar ejecución"
          description="La ejecución puede consultar fuentes agregadas y quedará registrada en auditoría. Continúa solo si corresponde al ambiente actual."
          confirmText="Ejecutar"
          isLoading={runMutation.isPending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={execute}
        />
        {runMutation.error ? (
          <ErrorState
            description={
              isAtlasApiError(runMutation.error)
                ? runMutation.error.message
                : "No se pudo ejecutar el reporte."
            }
            requestId={
              isAtlasApiError(runMutation.error)
                ? runMutation.error.requestId
                : undefined
            }
          />
        ) : null}
        {runMutation.data ? (
          <JsonViewer title="Resultado de ejecución" value={runMutation.data} />
        ) : null}
      </CardContent>
    </Card>
  );
}
