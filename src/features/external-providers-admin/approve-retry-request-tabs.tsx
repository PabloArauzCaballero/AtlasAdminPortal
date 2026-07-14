"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  useApproveRequestMutation,
  useRebuildFeaturesMutation,
  useRetryRequestMutation,
} from "./hooks";

export function ApproveRequestTab() {
  const [requestId, setRequestId] = useState("");
  const [approvalReason, setApprovalReason] = useState("");
  const approve = useApproveRequestMutation();

  return (
    <div className="space-y-4">
      <p className="text-sm text-atlas-muted">
        Aprueba una solicitud bloqueada por política de costo o que requiere
        revisión manual, permitiendo su ejecución. Solo{" "}
        <span className="font-mono">admin</span>/
        <span className="font-mono">platform_admin</span>.
      </p>
      <Field label="ID de solicitud">
        <Input
          value={requestId}
          onChange={(event) => setRequestId(event.target.value)}
          placeholder="ej: 4021"
          className="font-mono text-xs"
        />
      </Field>
      <Field label="Motivo de aprobación (opcional)">
        <Textarea
          value={approvalReason}
          onChange={(event) => setApprovalReason(event.target.value)}
          className="min-h-16"
        />
      </Field>
      {approve.error ? (
        <ErrorState
          title="No se pudo aprobar la solicitud"
          description={
            isAtlasApiError(approve.error)
              ? approve.error.message
              : "Error inesperado."
          }
          requestId={
            isAtlasApiError(approve.error) ? approve.error.requestId : undefined
          }
        />
      ) : null}
      <Button
        variant="primary"
        disabled={!requestId.trim()}
        isLoading={approve.isPending}
        loadingText="Aprobando…"
        onClick={() =>
          approve.mutate({
            requestId: requestId.trim(),
            body: { approvalReason: approvalReason.trim() || undefined },
          })
        }
      >
        Aprobar solicitud
      </Button>
      {approve.data ? (
        <JsonViewer title="Resultado" value={approve.data} />
      ) : null}
    </div>
  );
}

export function RetryRequestTab() {
  const [requestId, setRequestId] = useState("");
  const retry = useRetryRequestMutation();

  return (
    <div className="space-y-4">
      <p className="text-sm text-atlas-muted">
        Reintenta una solicitud fallida a un proveedor externo, reutilizando sus
        parámetros originales.
      </p>
      <Field label="ID de solicitud">
        <Input
          value={requestId}
          onChange={(event) => setRequestId(event.target.value)}
          placeholder="ej: 4021"
          className="font-mono text-xs"
        />
      </Field>
      {retry.error ? (
        <ErrorState
          title="No se pudo reintentar la solicitud"
          description={
            isAtlasApiError(retry.error)
              ? retry.error.message
              : "Error inesperado."
          }
          requestId={
            isAtlasApiError(retry.error) ? retry.error.requestId : undefined
          }
        />
      ) : null}
      <Button
        variant="primary"
        disabled={!requestId.trim()}
        isLoading={retry.isPending}
        loadingText="Reintentando…"
        onClick={() => retry.mutate({ requestId: requestId.trim(), body: {} })}
      >
        Reintentar solicitud
      </Button>
      {retry.data ? <JsonViewer title="Resultado" value={retry.data} /> : null}
    </div>
  );
}

export function RebuildFeaturesTab() {
  const [requestId, setRequestId] = useState("");
  const rebuild = useRebuildFeaturesMutation();

  return (
    <div className="space-y-4">
      <p className="text-sm text-atlas-muted">
        Recalcula el snapshot de features a partir de la respuesta ya almacenada
        de una solicitud, sin volver a consultar al proveedor.
      </p>
      <Field label="ID de solicitud">
        <Input
          value={requestId}
          onChange={(event) => setRequestId(event.target.value)}
          placeholder="ej: 4021"
          className="font-mono text-xs"
        />
      </Field>
      {rebuild.error ? (
        <ErrorState
          title="No se pudo reconstruir el snapshot"
          description={
            isAtlasApiError(rebuild.error)
              ? rebuild.error.message
              : "Error inesperado."
          }
          requestId={
            isAtlasApiError(rebuild.error) ? rebuild.error.requestId : undefined
          }
        />
      ) : null}
      <Button
        variant="primary"
        disabled={!requestId.trim()}
        isLoading={rebuild.isPending}
        loadingText="Reconstruyendo…"
        onClick={() => rebuild.mutate(requestId.trim())}
      >
        Reconstruir features
      </Button>
      {rebuild.data ? (
        <JsonViewer title="Resultado" value={rebuild.data} />
      ) : null}
    </div>
  );
}
