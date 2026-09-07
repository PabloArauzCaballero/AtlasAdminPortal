"use client";

import { useMemo, useState } from "react";
import { Stamp } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Card } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { usePartnerQueue } from "./hooks";
import { buildPartnerQueueColumns } from "./partner-queue-columns";
import { PartnerFileDrawer } from "./partner-file-drawer";
import type { PartnerQueueItem } from "./types";

/**
 * Verificación de comercios.
 *
 * ## Dejó de ser un buscador y pasó a ser una cola
 *
 * La pantalla pedía TECLEAR el identificador del comercio, que había que traer de otra vista porque
 * el backend no publicaba ningún listado de expedientes en revisión. Con eso, la carga de trabajo
 * pendiente no se veía en ninguna parte: sólo se revisaba lo que alguien recordara, y un expediente
 * olvidado se queda en «en revisión» para siempre — y con él la afiliación entera, porque sin
 * comercio verificado no hay QR de caja que resuelva ni compra que se le pueda atribuir.
 *
 * ## La comisión ya no se fija aquí
 *
 * Estaba en esta misma pantalla, junto a la decisión, y son dos cosas distintas: verificar es
 * comprobar que el comercio es quien dice ser; el MDR es un término comercial que se negocia y se
 * lleva en el ERP. Ver `services.ts`.
 *
 * El onboarding es autoservicio hasta el envío; de ahí en adelante es verificación, y por eso el
 * backend deja fuera al rol `merchant`: un comercio que pudiera aprobarse a sí mismo convertiría el
 * trámite en un formulario.
 */
export function PartnerDecisionsPage() {
  return (
    <RoleGate roles={INTERNAL_PORTAL_ROLE_LIST}>
      <AuthorizedPartnerDecisionsPage />
    </RoleGate>
  );
}

function AuthorizedPartnerDecisionsPage() {
  const [page, setPage] = useState(1);
  const [abierto, setAbierto] = useState<PartnerQueueItem | null>(null);

  const cola = usePartnerQueue({ page, limit: 25 });
  const items = useMemo(() => cola.data?.items ?? [], [cola.data]);
  const columns = useMemo(
    () => buildPartnerQueueColumns((expediente) => setAbierto(expediente)),
    [],
  );

  const masAntiguo = useMemo(
    () =>
      items.reduce<string | null>(
        (acumulado, item) =>
          item.submittedAt && (!acumulado || item.submittedAt < acumulado)
            ? item.submittedAt
            : acumulado,
        null,
      ),
    [items],
  );

  return (
    <>
      <PageHeader
        icon={Stamp}
        eyebrow="Onboarding de comercios"
        title="Verificación de expedientes"
        description="Los expedientes que esperan decisión, el más antiguo primero. Sin esta decisión el comercio nunca queda verificado."
      />
      <BusinessContextNote>
        Cada fila es un comercio que terminó su onboarding y espera que alguien
        confirme que es quien dice ser. Aprobar lo deja verificado: sus QR
        resuelven y sus ventas pueden atribuirse. Rechazar exige motivo, que el
        comercio verá y es lo que le dice qué corregir. La comisión (MDR) no se
        fija aquí: es un término comercial y se lleva en el ERP.
      </BusinessContextNote>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Esperando decisión"
          value={formatNumber(cola.data?.meta.total ?? 0)}
        />
        <MetricCard label="En esta página" value={formatNumber(items.length)} />
        <MetricCard
          label="El más antiguo"
          value={
            masAntiguo
              ? new Intl.DateTimeFormat("es-BO", {
                  dateStyle: "medium",
                }).format(new Date(masAntiguo))
              : "—"
          }
        />
      </section>

      <Card className="p-5">
        <h2 className="mb-1 text-base font-semibold text-atlas-text">
          Expedientes en revisión
        </h2>
        <p className="mb-4 text-sm text-atlas-muted">
          Sólo se decide desde «en revisión». Volver a decidir sobre un
          expediente ya resuelto responde 409: la decisión es una sola y queda
          con quién la firmó.
        </p>

        {cola.isLoading ? <LoadingSkeleton rows={5} /> : null}
        {cola.error ? (
          <ErrorState
            description={
              isAtlasApiError(cola.error)
                ? cola.error.message
                : "No se pudo cargar la cola de expedientes."
            }
            requestId={
              isAtlasApiError(cola.error) ? cola.error.requestId : undefined
            }
            onRetry={() => void cola.refetch()}
          />
        ) : null}
        {cola.data ? (
          <DataTable
            data={items}
            columns={columns}
            meta={cola.data.meta}
            onPageChange={setPage}
            emptyTitle="No hay expedientes esperando decisión."
            emptyDescription="Cuando un comercio termine su onboarding y lo envíe, aparecerá aquí."
          />
        ) : null}
      </Card>

      {abierto ? (
        <PartnerFileDrawer
          expediente={abierto}
          onClose={() => setAbierto(null)}
        />
      ) : null}
    </>
  );
}
