"use client";

import { useState } from "react";
import { CircleCheck, RefreshCcwDot, RotateCw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { explainStatus } from "./finding-codes";
import { leerJsonObjeto } from "./provider-display";
import { RequestResultCard } from "./request-result-card";
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
        Aprueba una solicitud frenada por política de costo o que espera
        revisión manual. Aprobar NO la ejecuta: queda aprobada y hay que volver
        a lanzarla. Sólo pueden hacerlo los administradores de la plataforma.
      </p>
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Sólo se aprueban solicitudes en «
        {explainStatus("MANUAL_APPROVAL_REQUIRED").label}», «
        {explainStatus("BLOCKED_BY_COST_POLICY").label}» o «
        {explainStatus("PENDING").label}». Comprueba su estado en el listado
        antes: cualquier otra se rechaza.
      </p>
      <Field
        tooltip="Número de la solicitud al proveedor que quieres aprobar."
        label="ID de solicitud"
      >
        <Input
          value={requestId}
          onChange={(event) => setRequestId(event.target.value)}
          placeholder="ej: 4021"
          className="font-mono text-xs"
        />
      </Field>
      <Field
        tooltip="Por qué apruebas esta solicitud frenada por política."
        label="Motivo de aprobación (opcional)"
      >
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
        <RequestResultCard title="Solicitud aprobada" result={approve.data} />
      ) : null}
    </Card>
  );
}

export function RetryRequestTab() {
  const [requestId, setRequestId] = useState("");
  const [inputJson, setInputJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const retry = useRetryRequestMutation();

  function reintentar() {
    // Obligatorio: por privacidad el backend no guarda los datos originales y, sin ellos,
    // responde 400 (RETRY_REQUIRES_NEW_INPUT). Se valida aquí para no gastar el viaje.
    const lectura = leerJsonObjeto(inputJson, { obligatorio: true });
    if (!lectura.ok) {
      setJsonError(lectura.error);
      return;
    }
    setJsonError(null);
    retry.mutate({
      requestId: requestId.trim(),
      body: { input: lectura.value },
    });
  }

  return (
    <Card className="max-w-2xl space-y-4 p-5">
      <p className="text-sm text-atlas-muted">
        Vuelve a lanzar una solicitud a un proveedor externo. Reutiliza el
        proveedor, el tipo de consulta, el cliente y la finalidad de la
        original, pero NO sus datos: por privacidad no se guardan, así que hay
        que escribirlos de nuevo.
      </p>
      <Field
        tooltip="Número de la solicitud al proveedor que quieres reintentar."
        label="ID de solicitud"
      >
        <Input
          value={requestId}
          onChange={(event) => setRequestId(event.target.value)}
          placeholder="ej: 4021"
          className="font-mono text-xs"
        />
      </Field>
      <Field
        tooltip="Los datos que se envían otra vez al proveedor, como objeto JSON entre llaves."
        label="Datos de la consulta (JSON)"
        hint="Obligatorio. P. ej. el número de documento que se consultó."
      >
        <Textarea
          value={inputJson}
          onChange={(event) => setInputJson(event.target.value)}
          placeholder='{"documentNumber": "1234567"}'
          className="min-h-24 font-mono text-xs"
        />
      </Field>
      {jsonError ? (
        <ErrorState title="Revisa los datos" description={jsonError} />
      ) : null}
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
        disabled={!requestId.trim() || !inputJson.trim()}
        isLoading={retry.isPending}
        loadingText="Reintentando…"
        onClick={reintentar}
      >
        <RotateCw className="h-4 w-4" aria-hidden />
        Reintentar solicitud
      </Button>
      {retry.data ? (
        <RequestResultCard title="Solicitud reintentada" result={retry.data} />
      ) : null}
    </Card>
  );
}

export function RebuildFeaturesTab() {
  const [requestId, setRequestId] = useState("");
  const rebuild = useRebuildFeaturesMutation();

  return (
    <Card className="max-w-2xl space-y-4 p-5">
      <p className="text-sm text-atlas-muted">
        Recalcula los indicadores que se sacan de una solicitud a partir de la
        respuesta ya guardada, sin volver a consultar al proveedor.
      </p>
      <Field
        tooltip="Número de la solicitud al proveedor sobre la que actúas."
        label="ID de solicitud"
      >
        <Input
          value={requestId}
          onChange={(event) => setRequestId(event.target.value)}
          placeholder="ej: 4021"
          className="font-mono text-xs"
        />
      </Field>
      {rebuild.error ? (
        <ErrorState
          title="No se pudieron recalcular los indicadores"
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
        loadingText="Recalculando…"
        onClick={() => rebuild.mutate(requestId.trim())}
      >
        <RefreshCcwDot className="h-4 w-4" aria-hidden />
        Recalcular indicadores
      </Button>
      {rebuild.data ? (
        <RequestResultCard
          title="Indicadores recalculados"
          result={rebuild.data}
        />
      ) : null}
    </Card>
  );
}
