"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { useAuth } from "@/shared/auth/auth-context";
import {
  COMPLIANCE_CLEAR_ROLE_LIST,
  COMPLIANCE_SCREENING_ROLE_LIST,
} from "@/shared/auth/portal-roles";
import { actionErrorMessage } from "./action-error";
import {
  useClearMatchesMutation,
  useComplianceScreeningMutation,
} from "./customer-actions-hooks";
import { BlockerList } from "./blocker-list";
import { lifecycleLabel } from "./eligibility-options";

const QUIEN_CRIBA = "cumplimiento, riesgo y administración";
const QUIEN_DESCARTA = "cumplimiento y administración";

/**
 * Cribado de listas restrictivas y descarte de coincidencias (condición C13 de la habilitación).
 *
 * Hasta 2026-09-26 no había pantalla, job ni llamador del cribado: la condición C13 no medía nada
 * porque el cotejo no se ejecutaba nunca. El servidor no expone la lista de coincidencias (sólo
 * cuántas hay al cribar), por eso esta sección enseña los conteos y los bloqueadores, no la
 * entrada de la lista: el cotejo es por hash y el dato de la lista no sale de allí.
 */
export function ComplianceSection({
  customerId,
}: Readonly<{ customerId: string }>) {
  const { hasAnyRole } = useAuth();
  // Los botones salen sólo a quien el backend acepta (`@Roles` de CustomerVerificationController):
  // antes «Ejecutar cribado» se ofrecía a operación y «Descartar» a riesgo, y los dos acababan en 403.
  const puedeCribar = hasAnyRole(COMPLIANCE_SCREENING_ROLE_LIST);
  const rolDescarta = hasAnyRole(COMPLIANCE_CLEAR_ROLE_LIST);
  const cribado = useComplianceScreeningMutation(customerId);
  const descarte = useClearMatchesMutation(customerId);
  const [reasonCode, setReasonCode] = useState("false_positive");
  const [notes, setNotes] = useState("");

  const errorCribado = cribado.error
    ? actionErrorMessage(cribado.error, QUIEN_CRIBA)
    : null;
  const errorDescarte = descarte.error
    ? actionErrorMessage(descarte.error, QUIEN_DESCARTA)
    : null;
  const puedeDescartar = reasonCode.trim() !== "" && notes.trim() !== "";

  return (
    <section
      className="rounded-2xl border border-atlas-border bg-white shadow-subtle"
      data-testid="compliance-section"
    >
      <div className="border-b border-atlas-border bg-slate-50/70 px-5 py-4">
        <h2 className="text-sm font-semibold text-atlas-text">Cumplimiento</h2>
        <p className="mt-1 text-xs text-atlas-muted">
          Coteja nombre, teléfono y correo del cliente contra las listas
          restrictivas vigentes. Una coincidencia nueva bloquea la habilitación
          y pasa al cliente a revisión. Repetir el cribado no duplica nada.
        </p>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          {puedeCribar ? (
            <Button
              variant="primary"
              onClick={() => cribado.mutate()}
              isLoading={cribado.isPending}
              loadingText="Cribando…"
              disabled={cribado.isPending}
              data-testid="compliance-screen"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Ejecutar cribado
            </Button>
          ) : (
            <p
              className="text-xs text-atlas-muted"
              data-testid="compliance-screen-sin-rol"
            >
              Ejecutar el cribado es de {QUIEN_CRIBA}.
            </p>
          )}
          {cribado.data ? (
            <span
              className="flex flex-wrap items-center gap-2 text-sm"
              role="status"
            >
              <Badge
                tone={cribado.data.totalMatches > 0 ? "critical" : "success"}
              >
                {cribado.data.totalMatches > 0
                  ? `${formatNumber(cribado.data.totalMatches)} coincidencia(s)`
                  : "Sin coincidencias"}
              </Badge>
              <span className="text-atlas-muted">
                {formatNumber(cribado.data.newMatches)} nueva(s) ·{" "}
                {formatNumber(cribado.data.candidatesEvaluated)} dato(s)
                cotejado(s) · estado:{" "}
                {lifecycleLabel(cribado.data.lifecycleStatus)}
              </span>
            </span>
          ) : null}
        </div>
        {errorCribado ? (
          <ErrorState
            title="No se pudo ejecutar el cribado"
            description={errorCribado.message}
            requestId={errorCribado.requestId}
          />
        ) : null}
        {cribado.data ? (
          <BlockerList
            eligible={cribado.data.eligible}
            blockers={cribado.data.blockers}
          />
        ) : null}

        {rolDescarta ? (
          <form
            className="space-y-3 border-t border-atlas-border pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!puedeDescartar) return;
              descarte.mutate({
                reasonCode: reasonCode.trim(),
                notes: notes.trim(),
              });
            }}
          >
            <h3 className="text-sm font-medium text-atlas-text">
              Descartar coincidencias
            </h3>
            <p className="text-xs text-atlas-muted">
              Cierra como falsos positivos TODAS las coincidencias del cliente y
              recalcula su habilitación. Sólo cumplimiento y administración.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Código de motivo"
                required
                tooltip="Código corto para los informes de cumplimiento. Ej.: false_positive, homonimo"
              >
                <Input
                  value={reasonCode}
                  onChange={(event) => setReasonCode(event.target.value)}
                  data-testid="clear-matches-reason"
                />
              </Field>
            </div>
            <Field
              label="Nota"
              required
              tooltip="Por qué no es la persona de la lista: qué dato comprobaste y contra qué fuente."
              hint="Obligatoria: un descarte sin motivo escrito no se puede defender después."
            >
              <Textarea
                className="min-h-16"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                data-testid="clear-matches-notes"
              />
            </Field>
            {errorDescarte ? (
              <ErrorState
                title="No se pudieron descartar las coincidencias"
                description={errorDescarte.message}
                requestId={errorDescarte.requestId}
              />
            ) : null}
            {descarte.data ? (
              <div
                className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                role="status"
              >
                {formatNumber(descarte.data.clearedMatches)} coincidencia(s)
                descartada(s).
              </div>
            ) : null}
            {descarte.data ? (
              <BlockerList
                eligible={descarte.data.eligible}
                blockers={descarte.data.blockers}
              />
            ) : null}
            <Button
              type="submit"
              variant="secondary"
              isLoading={descarte.isPending}
              loadingText="Descartando…"
              disabled={descarte.isPending || !puedeDescartar}
              data-testid="clear-matches-submit"
            >
              Descartar coincidencias
            </Button>
          </form>
        ) : (
          <p
            className="border-t border-atlas-border pt-4 text-xs text-atlas-muted"
            data-testid="clear-matches-sin-rol"
          >
            Descartar coincidencias es de {QUIEN_DESCARTA}.
          </p>
        )}
      </div>
    </section>
  );
}
