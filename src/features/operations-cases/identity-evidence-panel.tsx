"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/input";
import { IDENTITY_DECISIONS } from "./decision-options";
import { VistaDeDocumento } from "./evidence-document-view";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { engineExecutionUrl } from "@/shared/decision-engine/engine-links";
import { safeText } from "@/shared/lib/format";
import { useDecideIdentityMutation, useEvidenceDocuments } from "./hooks";
import {
  DEFAULT_IDENTITY_REASON,
  identityDecisionErrorText,
} from "./identity-review-rules";

/**
 * Las imágenes de identidad del cliente y la decisión sobre ellas, en la misma pantalla.
 *
 * Hasta el 2026-09-14 el portal interno decidía la revisión sin ver el carnet: el único sitio donde
 * alguien veía la imagen junto a la decisión era el portal del Motor, y el endpoint de decisión de
 * identidad de AtlasBackend no tenía ninguna pantalla que lo llamara. Si el Motor tiene el intento
 * en SU cola, el backend responde `IDENTITY_DECISION_DELEGADA_AL_MOTOR` y aquí se explica y se
 * enlaza: dos personas resolviendo la misma identidad sin verse era justo lo que había que evitar.
 */
export function IdentityEvidencePanel({
  customerId,
  decisionExecutionId,
}: Readonly<{ customerId: string; decisionExecutionId?: string | null }>) {
  const documentos = useEvidenceDocuments(customerId);
  const decidir = useDecideIdentityMutation();
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [reasonCode, setReasonCode] = useState<string>(
    DEFAULT_IDENTITY_REASON.approve,
  );
  const [notes, setNotes] = useState("");

  const delegada =
    decidir.error &&
    isAtlasApiError(decidir.error) &&
    /IDENTITY_DECISION_DELEGADA_AL_MOTOR/.test(decidir.error.message);
  const enlaceMotor = engineExecutionUrl(
    delegada
      ? (/ejecución (\S+) del Motor/.exec(decidir.error!.message)?.[1] ??
          decisionExecutionId ??
          null)
      : null,
  );

  return (
    <section
      id="identidad"
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
      data-testid="identity-evidence-panel"
    >
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        Documentos de identidad
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Lo que el cliente subió desde la app, tal cual lo evaluó el Motor (el
        hash coincide con su ejecución). Se cargan con tu sesión, nunca por URL.
      </p>

      {documentos.isLoading ? <LoadingSkeleton rows={2} /> : null}
      {documentos.error ? (
        <ErrorState
          title="No se pudieron cargar los documentos"
          description={
            isAtlasApiError(documentos.error)
              ? documentos.error.message
              : "Error inesperado."
          }
        />
      ) : null}
      {documentos.data && documentos.data.documents.length === 0 ? (
        <EmptyState
          title="Sin documentos"
          description="El cliente todavía no subió carnet ni selfie."
        />
      ) : null}
      {documentos.data && documentos.data.documents.length > 0 ? (
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {documentos.data.documents.map((documento) => (
            <li key={documento.documentId}>
              <VistaDeDocumento customerId={customerId} documento={documento} />
            </li>
          ))}
        </ul>
      ) : null}

      <form
        className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800"
        onSubmit={(event) => {
          event.preventDefault();
          decidir.mutate({
            customerId,
            body: {
              decision,
              reasonCode,
              ...(notes.trim() ? { notes: notes.trim() } : {}),
            },
          });
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Decisión sobre la identidad"
            tooltip="Si la persona de la selfie es la del carnet y el documento es válido. Queda auditado."
          >
            <Select
              name="identity-decision"
              testId="identity-decision"
              options={IDENTITY_DECISIONS}
              value={decision}
              onChange={(valor) => {
                const siguiente = valor as "approve" | "reject";
                setDecision(siguiente);
                // Si el motivo sigue siendo el de por defecto, acompaña a la decisión: un rechazo
                // auditado como `identity_verified` diría lo contrario de lo que pasó.
                if (
                  Object.values(DEFAULT_IDENTITY_REASON).includes(
                    reasonCode as never,
                  )
                )
                  setReasonCode(DEFAULT_IDENTITY_REASON[siguiente]);
              }}
            />
          </Field>
          <Field
            label="Código de motivo"
            tooltip="Código corto que resume la decisión para los informes. Ej.: face_mismatch"
          >
            <Input
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value)}
              data-testid="identity-reason"
            />
          </Field>
        </div>
        <Field
          label="Notas"
          tooltip="Qué viste en la evidencia para decidir así. No copies números de documento."
          hint={
            decision === "reject"
              ? "Obligatorias al rechazar: hay que justificarlo."
              : "Opcional."
          }
        >
          <Textarea
            className="min-h-16"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
        {delegada ? (
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            data-testid="identity-delegada"
          >
            Esta identidad la tiene el Motor en su cola de revisión: se resuelve
            allí, con las imágenes y la petición de información, y su veredicto
            vuelve solo. Aquí no se decide para no tener dos personas
            resolviendo lo mismo sin verse.
            {enlaceMotor ? (
              <a
                href={enlaceMotor}
                target="_blank"
                rel="noreferrer"
                className="ml-2 inline-flex items-center gap-1 font-medium underline"
              >
                Abrir en el Motor{" "}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        ) : decidir.error ? (
          <ErrorState
            title="No se pudo registrar la decisión"
            description={identityDecisionErrorText(decidir.error)}
            requestId={
              isAtlasApiError(decidir.error)
                ? decidir.error.requestId
                : undefined
            }
          />
        ) : null}
        {decidir.isSuccess ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Identidad{" "}
            {decidir.data.identityVerificationResult === "verified"
              ? "aprobada"
              : "rechazada"}{" "}
            · {decidir.data.resolvedEvidenceReviews} evidencia(s) resueltas ·
            estado del cliente: {safeText(decidir.data.lifecycleStatus)}.
          </div>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          isLoading={decidir.isPending}
          loadingText="Guardando…"
          disabled={
            decidir.isPending || (decision === "reject" && !notes.trim())
          }
        >
          Registrar decisión de identidad
        </Button>
      </form>
    </section>
  );
}
