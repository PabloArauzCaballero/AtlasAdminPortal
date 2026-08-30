"use client";

import { useMemo, useState } from "react";
import { Gauge } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { isAtlasApiError } from "@/shared/api/errors";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Card } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Input } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import {
  useDelinquencySweepMutation,
  useDispatchOutcomesMutation,
  useExhaustedOutcomes,
  usePortfolioSummary,
  useRateCustomerMutation,
  useRateLoanMutation,
  useSweepRatingsMutation,
} from "./hooks";
import type { ExhaustedOutcome, PortfolioGrade } from "./types";

/**
 * Operación de cartera.
 *
 * Reúne las dos mitades que el backend expone y nadie llamaba: **calificar** (qué categoría tiene
 * cada deuda y cuánta previsión exige) y **cerrar el bucle** (recalcular mora y entregarle al motor
 * los desenlaces, que es como el motor llega a saber si acertó al decidir).
 *
 * Están juntas porque se usan juntas y en este orden —antes de un cierre se recalcula mora, se
 * entregan desenlaces y se recalifica—, y separarlas en dos pantallas obligaría a recordar la
 * secuencia en vez de leerla.
 */
export function PortfolioOperationsPage() {
  return (
    <RoleGate roles={INTERNAL_PORTAL_ROLE_LIST}>
      <AuthorizedPortfolioPage />
    </RoleGate>
  );
}

type Confirmacion =
  | { tipo: "ratings"; limite: number }
  | { tipo: "mora"; limite: number; tenantScoped: boolean }
  | { tipo: "desenlaces"; limite: number }
  | null;

function AuthorizedPortfolioPage() {
  const [confirmacion, setConfirmacion] = useState<Confirmacion>(null);
  const [loanId, setLoanId] = useState("");
  const [customerId, setCustomerId] = useState("");

  const resumen = usePortfolioSummary();
  const backlog = useExhaustedOutcomes(100);
  const sweepRatings = useSweepRatingsMutation();
  const sweepMora = useDelinquencySweepMutation();
  const entregar = useDispatchOutcomesMutation();
  const calificarCredito = useRateLoanMutation();
  const calificarCliente = useRateCustomerMutation();

  const grades = useMemo(() => resumen.data?.grades ?? [], [resumen.data]);
  const pendientes = useMemo(() => backlog.data?.items ?? [], [backlog.data]);
  const columnasGrado = useMemo(() => buildGradeColumns(), []);
  const columnasBacklog = useMemo(() => buildBacklogColumns(), []);
  const ejecutando =
    sweepRatings.isPending || sweepMora.isPending || entregar.isPending;

  function confirmar() {
    if (!confirmacion) return;
    const promesa =
      confirmacion.tipo === "ratings"
        ? sweepRatings.mutateAsync(confirmacion.limite)
        : confirmacion.tipo === "mora"
          ? sweepMora.mutateAsync({
              limit: confirmacion.limite,
              tenantScoped: confirmacion.tenantScoped,
            })
          : entregar.mutateAsync(confirmacion.limite);
    void promesa.finally(() => setConfirmacion(null));
  }

  return (
    <>
      <PageHeader
        icon={Gauge}
        eyebrow="Operación de cartera"
        title="Riesgo y desenlaces"
        description="Recalificar la cartera, recalcular mora y entregarle al motor los desenlaces ya observados. Son las llamadas del runbook, no un acceso a la base."
      />

      {resumen.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {resumen.error ? (
        <ErrorState
          description={
            isAtlasApiError(resumen.error) &&
            resumen.error.message.includes("RATING_POLICY_NOT_ACTIVE")
              ? "No hay matriz de calificación vigente: sin política activa no se puede calificar nada."
              : isAtlasApiError(resumen.error)
                ? resumen.error.message
                : "No se pudo leer la cartera calificada."
          }
          requestId={
            isAtlasApiError(resumen.error) ? resumen.error.requestId : undefined
          }
          onRetry={() => void resumen.refetch()}
        />
      ) : null}

      {resumen.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Créditos calificados"
              value={formatNumber(resumen.data.totals.loanCount)}
            />
            <MetricCard
              label="Exposición"
              value={resumen.data.totals.exposureAmount}
            />
            <MetricCard
              label="Previsión"
              value={resumen.data.totals.provisionAmount}
            />
            <MetricCard
              label="Desenlaces agotados"
              value={formatNumber(pendientes.length)}
            />
          </section>

          <Card>
            <h2 className="mb-1 text-base font-semibold text-atlas-text">
              Cartera por categoría
            </h2>
            <p className="mb-4 text-sm text-atlas-muted">
              {`Política ${resumen.data.policy.policyCode} ${resumen.data.policy.versionCode} · escala ${resumen.data.policy.scaleCode}`}
              {resumen.data.policy.contaminationEnabled
                ? " · el cliente hereda la PEOR categoría de sus deudas"
                : " · cada deuda se califica sola"}
            </p>
            <DataTable
              data={grades}
              columns={columnasGrado}
              emptyTitle="Sin deudas calificadas todavía."
              emptyDescription="«Recalificar la cartera» las califica con la política vigente."
            />
          </Card>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card>
              <h2 className="mb-1 text-base font-semibold text-atlas-text">
                Recalificar
              </h2>
              <p className="mb-4 text-sm text-atlas-muted">
                Calificar un crédito recalifica también a su titular: su categoría se deriva por
                arrastre de todas sus operaciones, y hacerlo a medias dejaría la ficha mintiendo.
              </p>
              <div className="space-y-3">
                <Button
                  disabled={ejecutando}
                  onClick={() => setConfirmacion({ tipo: "ratings", limite: 500 })}
                >
                  Recalificar la cartera
                </Button>
                <Field label="Recalificar un crédito" hint="Identificador del crédito.">
                  <div className="flex gap-2">
                    <Input value={loanId} onChange={(e) => setLoanId(e.target.value)} />
                    <Button
                      disabled={!loanId || calificarCredito.isPending}
                      onClick={() => void calificarCredito.mutateAsync(loanId)}
                    >
                      Calificar
                    </Button>
                  </div>
                </Field>
                <Field label="Recalificar un cliente" hint="Identificador del cliente.">
                  <div className="flex gap-2">
                    <Input
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                    />
                    <Button
                      disabled={!customerId || calificarCliente.isPending}
                      onClick={() => void calificarCliente.mutateAsync(customerId)}
                    >
                      Calificar
                    </Button>
                  </div>
                </Field>
              </div>
            </Card>

            <Card>
              <h2 className="mb-1 text-base font-semibold text-atlas-text">
                Mora y desenlaces
              </h2>
              <p className="mb-4 text-sm text-atlas-muted">
                Son dos pasos y no uno: el barrido produce observaciones y la entrega las manda.
                Separados, la mora se sigue midiendo aunque el motor esté caído —que es justo
                cuando más conviene—, y la cola se entrega cuando vuelva.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={ejecutando}
                  onClick={() => setConfirmacion({ tipo: "mora", limite: 200, tenantScoped: true })}
                >
                  Recalcular mora
                </Button>
                <Button
                  disabled={ejecutando}
                  onClick={() => setConfirmacion({ tipo: "desenlaces", limite: 100 })}
                >
                  Entregar desenlaces
                </Button>
              </div>
            </Card>
          </div>

          <Card>
            <h2 className="mb-1 text-base font-semibold text-atlas-text">
              Desenlaces que agotaron reintentos
            </h2>
            <p className="mb-4 text-sm text-atlas-muted">
              Cada fila es una decisión de la que el motor nunca supo el resultado. No se reintentan
              solos: hay que arreglar la causa y volver a entregar.
            </p>
            {backlog.isLoading ? <LoadingSkeleton rows={3} /> : null}
            <DataTable
              data={pendientes}
              columns={columnasBacklog}
              emptyTitle="Ningún desenlace agotó sus reintentos."
              emptyDescription="El motor está recibiendo las observaciones de cosecha."
            />
          </Card>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmacion !== null}
        title={
          confirmacion?.tipo === "ratings"
            ? "Recalificar toda la cartera"
            : confirmacion?.tipo === "mora"
              ? "Recalcular la mora"
              : "Entregar los desenlaces pendientes"
        }
        description={
          confirmacion?.tipo === "ratings"
            ? "Recorre los clientes con deuda viva y recalifica cada operación y su ficha. Devuelve cuántos se calificaron y cuáles fallaron."
            : confirmacion?.tipo === "mora"
              ? "Actualiza días de atraso y tramo de la cartera viva de ESTE inquilino, y encola una observación por cada ventana de cosecha ya vencida."
              : "Manda en lote las observaciones encoladas. El motor deduplica por ejecución y ventana, así que reintentar un lote es seguro."
        }
        confirmText="Ejecutar"
        isLoading={ejecutando}
        onCancel={() => setConfirmacion(null)}
        onConfirm={confirmar}
      />
    </>
  );
}

function buildGradeColumns(): ColumnDef<PortfolioGrade>[] {
  return [
    {
      accessorKey: "grade",
      header: "Categoría",
      cell: ({ row }) => <StatusBadge value={row.original.grade} />,
    },
    { accessorKey: "gradeLabel", header: "Significado" },
    {
      accessorKey: "loanCount",
      header: "Créditos",
      cell: ({ row }) => formatNumber(row.original.loanCount),
    },
    { accessorKey: "exposureAmount", header: "Exposición" },
    { accessorKey: "provisionAmount", header: "Previsión" },
  ];
}

function buildBacklogColumns(): ColumnDef<ExhaustedOutcome>[] {
  return [
    {
      accessorKey: "loanId",
      header: "Crédito",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.loanId}</span>,
    },
    {
      accessorKey: "decisionExecutionId",
      header: "Ejecución",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.decisionExecutionId}</span>
      ),
    },
    {
      accessorKey: "windowDays",
      header: "Ventana",
      cell: ({ row }) => `${row.original.windowDays} días`,
    },
    { accessorKey: "label", header: "Desenlace" },
    {
      accessorKey: "attempts",
      header: "Intentos",
      cell: ({ row }) => formatNumber(row.original.attempts),
    },
    { accessorKey: "lastError", header: "Último error" },
    {
      accessorKey: "observedAt",
      header: "Observado",
      cell: ({ row }) => formatDateTime(row.original.observedAt),
    },
  ];
}
