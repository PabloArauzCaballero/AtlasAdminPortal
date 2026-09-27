"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { formatAmount, formatDateTime, safeText } from "@/shared/lib/format";
import { creditErrorMessage } from "./credit-rules";
import {
  useCustomerCreditLine,
  useRecalculateCreditLineMutation,
} from "./hooks";
import type { CreditLine } from "./types";

/** La línea vigente del cliente y el botón para volver a preguntarle al motor. */
export function CustomerCreditLine({
  customerId,
  canOperate,
}: Readonly<{ customerId: string; canOperate: boolean }>) {
  const line = useCustomerCreditLine(customerId);
  const recalc = useRecalculateCreditLineMutation();
  const [confirming, setConfirming] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-atlas-text">
          Línea de crédito vigente
        </h3>
        {canOperate ? (
          <Button
            variant="secondary"
            onClick={() => {
              recalc.reset();
              setAviso(null);
              setConfirming(true);
            }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Recalcular línea
          </Button>
        ) : null}
      </div>
      {aviso ? (
        <p role="status" className="text-sm text-emerald-700">
          {aviso}
        </p>
      ) : null}
      {recalc.error ? (
        <ErrorState
          title="No se recalculó la línea."
          description={creditErrorMessage(
            recalc.error,
            "No se pudo recalcular la línea de crédito.",
          )}
        />
      ) : null}
      {line.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {line.error ? (
        <ErrorState
          description={creditErrorMessage(
            line.error,
            "No se pudo cargar la línea de crédito.",
          )}
          onRetry={() => void line.refetch()}
        />
      ) : null}
      {line.data === null ? (
        <EmptyState
          title="El motor todavía no calculó una línea para este cliente."
          description="Se calcula al terminar el alta o al subir un extracto. Puedes pedirla ahora con «Recalcular línea»."
        />
      ) : null}
      {line.data ? <CreditLineGrid line={line.data} /> : null}
      <ConfirmDialog
        open={confirming}
        title={`Recalcular la línea del cliente #${customerId}`}
        description="El motor vuelve a calcular con el expediente de hoy y abre una versión nueva de la línea: el límite puede subir o bajar. Si el motor no responde, la línea vigente no se toca."
        confirmText="Recalcular"
        isLoading={recalc.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          recalc.mutate(customerId, {
            onSuccess: (result) =>
              setAviso(
                `Línea recalculada: ${formatAmount(result.approvedLimit)} ${result.currencyCode}.`,
              ),
            onSettled: () => setConfirming(false),
          })
        }
      />
    </div>
  );
}

function CreditLineGrid({ line }: Readonly<{ line: CreditLine }>) {
  const adverse = line.reasons.filter((reason) => reason.adverseAction);
  return (
    <KeyValueGrid
      items={[
        {
          label: "Límite aprobado",
          value: `${formatAmount(line.approvedLimit)} ${line.currencyCode}`,
        },
        {
          label: "Disponible",
          value: `${formatAmount(line.available)} ${line.currencyCode}`,
        },
        {
          label: "Cuota máxima",
          value: formatAmount(line.maxAffordableInstallment),
        },
        {
          label: "Puntaje ATLAS",
          value: `${safeText(line.scoring)} · ${line.scoringBand.label}`,
        },
        { label: "Tramo de riesgo", value: line.riskBand },
        {
          label: "Tasa anual",
          value:
            line.annualPercentageRate === null
              ? "—"
              : `${line.annualPercentageRate} %`,
        },
        {
          label: "Qué limita el límite",
          value: line.capacity.explanation ?? line.capacity.bindingConstraint,
        },
        { label: "Calculada por", value: line.decision.trigger },
        {
          label: "Calculada el",
          value: formatDateTime(line.decision.calculatedAt),
        },
        {
          label: "Motivos adversos",
          value:
            adverse.length === 0
              ? "Ninguno"
              : adverse.map((reason) => reason.message).join(" · "),
        },
      ]}
    />
  );
}
