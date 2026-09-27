"use client";

import { RefreshCw } from "lucide-react";
import { KeyValueSection } from "@/shared/components/data-display/key-value";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { actionErrorMessage } from "./action-error";
import {
  useBehaviorSummary,
  useRecalculateBehaviorMutation,
} from "./customer-actions-hooks";
import type { BehaviorSummary } from "./customer-actions-types";

const QUIEN_LEE = "operación, riesgo, cumplimiento y administración";

function porcentaje(valor: number | null): string {
  return valor === null ? "—" : `${Math.round(valor * 100)} %`;
}

function siNo(valor: boolean | null | undefined): string {
  if (valor === null || valor === undefined) return "No medido";
  return valor ? "Sí" : "No";
}

/**
 * CÓMO hizo el alta el cliente: tiempos, correcciones, pegados y la heurística de automatización.
 *
 * Son las mismas cifras que recibió el artefacto de identidad del Motor, para que quien revisa vea
 * los números con los que se decidió. La probabilidad de automatización es una señal para mirar
 * más de cerca, no un veredicto.
 */
export function BehaviorSummarySection({
  customerId,
}: Readonly<{ customerId: string }>) {
  const resumen = useBehaviorSummary(customerId);
  const recalcular = useRecalculateBehaviorMutation(customerId);
  const error = resumen.error
    ? actionErrorMessage(resumen.error, QUIEN_LEE)
    : null;
  const errorRecalculo = recalcular.error
    ? actionErrorMessage(recalcular.error, QUIEN_LEE)
    : null;

  return (
    <section className="space-y-3" data-testid="behavior-summary-section">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-atlas-text">
          Comportamiento durante el alta
        </h2>
        <Button
          variant="ghost"
          onClick={() => recalcular.mutate()}
          isLoading={recalcular.isPending}
          loadingText="Recalculando…"
          data-testid="behavior-recalculate"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Recalcular desde la bitácora
        </Button>
      </div>
      {resumen.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {error ? (
        <ErrorState
          title="No se pudo cargar el comportamiento"
          description={error.message}
          requestId={error.requestId}
          onRetry={() => void resumen.refetch()}
        />
      ) : null}
      {errorRecalculo ? (
        <ErrorState
          title="No se pudo recalcular"
          description={errorRecalculo.message}
          requestId={errorRecalculo.requestId}
        />
      ) : null}
      {resumen.isSuccess && !resumen.data ? (
        <EmptyState
          title="Sin resumen calculado"
          description="Nunca se calculó el comportamiento de este alta. «Recalcular desde la bitácora» lo calcula con lo que la app haya enviado."
        />
      ) : null}
      {resumen.data ? <Resumen data={resumen.data} /> : null}
    </section>
  );
}

function Resumen({ data }: Readonly<{ data: BehaviorSummary }>) {
  const detalle = data.interScreenTimingJson?.detalle ?? {};
  if (!data.disponible) {
    return (
      <EmptyState
        title="La app no envió eventos de este alta"
        description={`Calculado ${formatDateTime(data.computedAt)}: sin bitácora no hay cifras que enseñar, y eso no es una señal en contra del cliente.`}
      />
    );
  }
  const senales = detalle.senales ?? [];
  return (
    <div className="space-y-2">
      <KeyValueSection
        title="Cifras del alta"
        items={[
          {
            label: "Duración del alta",
            value:
              data.completionTimeSeconds === null
                ? "—"
                : `${formatNumber(Math.round(data.completionTimeSeconds / 60))} min`,
          },
          {
            label: "Probabilidad de automatización",
            value: porcentaje(data.botLikelihoodScore),
          },
          { label: "Tasa de errores", value: porcentaje(data.formErrorRate) },
          {
            label: "Pegó datos de identidad",
            value: siNo(data.ciCopyPasteDetected),
          },
          {
            label: "Correcciones",
            value: formatNumber(detalle.correccionesTotales ?? null),
          },
          {
            label: "Capturas repetidas",
            value: formatNumber(detalle.capturasRepetidas ?? null),
          },
          {
            label: "Abandonos previos",
            value: formatNumber(data.abandonmentCountPrior),
          },
          {
            label: "Permisos concedidos",
            value: porcentaje(data.permissionGrantScore),
          },
          { label: "Calculado", value: formatDateTime(data.computedAt) },
          {
            label: "Versión del cálculo",
            value: data.computationVersion,
            mono: true,
          },
        ]}
      />
      {senales.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Señales detectadas">
          {senales.map((senal) => (
            <li key={senal}>
              <Badge tone="warning">{senal}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
