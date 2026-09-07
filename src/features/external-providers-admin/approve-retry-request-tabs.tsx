"use client";

import { useState } from "react";
import { CircleCheck, RefreshCcwDot, RotateCw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
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
    /*
     * El formulario va dentro de una tarjeta y con el ancho acotado.
     *
     * Suelto sobre el lienzo, sus campos se estiraban los 1.500 px de la vista: una caja de
     * texto de ese ancho para escribir «4021» no dice que espera cuatro dígitos, dice que
     * espera un párrafo. La tarjeta además le da un borde al que alinearse, que es lo que
     * faltaba respecto del resto del portal.
     */
    <Card className="max-w-2xl space-y-4 p-5">
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
        <CircleCheck className="h-4 w-4" aria-hidden />
        Aprobar solicitud
      </Button>
      {approve.data ? (
        <JsonViewer title="Resultado" value={approve.data} />
      ) : null}
    </Card>
  );
}

export function RetryRequestTab() {
  const [requestId, setRequestId] = useState("");
  const retry = useRetryRequestMutation();

  return (
    <Card className="max-w-2xl space-y-4 p-5">
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
        <RotateCw className="h-4 w-4" aria-hidden />
        Reintentar solicitud
      </Button>
      {retry.data ? <JsonViewer title="Resultado" value={retry.data} /> : null}
    </Card>
  );
}

export function RebuildFeaturesTab() {
  const [requestId, setRequestId] = useState("");
  const rebuild = useRebuildFeaturesMutation();

  return (
    <Card className="max-w-2xl space-y-4 p-5">
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
        <RefreshCcwDot className="h-4 w-4" aria-hidden />
        Reconstruir features
      </Button>
      {rebuild.data ? (
        <JsonViewer title="Resultado" value={rebuild.data} />
      ) : null}
    </Card>
  );
}
