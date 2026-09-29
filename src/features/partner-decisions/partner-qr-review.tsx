"use client";

import { useMemo, useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { withoutClientSorting } from "@/shared/components/data-table/without-client-sorting";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { useQrPendingReview } from "./hooks";
import { PartnerQrDialog } from "./partner-qr-dialog";
import { buildQrColumns, TIPO_QR_OPTIONS } from "./partner-qr-columns";
import type { PartnerQrPending } from "./types";

const QR_POR_PAGINA = 10;

/**
 * La cola de QR de cobro esperando revisión.
 *
 * Un QR de cobro dice a qué cuenta transfieren los clientes de un comercio. Nace en
 * `pending_review` y hasta que alguien lo aprueba aquí la app NO lo enseña: hasta el 2026-09-14 no
 * existía esta pantalla y ningún QR salía nunca de «pendiente», así que el cliente veía un código
 * que nadie había mirado.
 *
 * Es una tabla —un QR por fila, con el comercio, la sucursal, la cuenta y la huella— y la IMAGEN se
 * ve al pulsar «Revisar», junto a las decisiones (`PartnerQrDialog`): una tarjeta con imagen por
 * cada fila descargaba todas las imágenes a la vez y no dejaba buscar ni filtrar. La búsqueda, el
 * filtro por tipo y la paginación son del servidor; las cifras salen de su `summary`, de la cola
 * entera, y no cambian al buscar.
 */
export function PartnerQrReviewQueue() {
  const [q, setQ] = useState("");
  const [qrKind, setQrKind] = useState("");
  const [page, setPage] = useState(1);
  const [abierto, setAbierto] = useState<PartnerQrPending | null>(null);
  const cola = useQrPendingReview({
    page,
    limit: QR_POR_PAGINA,
    q: q.trim() || undefined,
    qrKind: qrKind || undefined,
  });
  const items = useMemo(() => cola.data?.items ?? [], [cola.data]);
  const columns = useMemo(
    () => withoutClientSorting(buildQrColumns(setAbierto)),
    [],
  );
  const resumen = cola.data?.summary;
  const filtrando = Boolean(q.trim() || qrKind);

  return (
    <Card className="p-5">
      <h2 className="mb-1 text-base font-semibold text-atlas-text">
        QR de cobro esperando revisión
      </h2>
      <p className="mb-4 text-sm text-atlas-muted">
        Cada fila es el código con el que un comercio pide que le transfieran.
        Hasta que se aprueba, la app del cliente no lo enseña. «Revisar» abre la
        imagen y las decisiones; rechazar exige una nota: es lo único que le
        dice al comercio qué corregir.
      </p>
      {resumen ? (
        <section className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            label="QR esperando"
            value={formatNumber(resumen.total)}
          />
          <MetricCard
            label="Del negocio"
            value={formatNumber(resumen.business)}
          />
          <MetricCard
            label="De cuenta bancaria"
            value={formatNumber(resumen.bank)}
          />
        </section>
      ) : null}
      <FilterBar
        search={q}
        searchPlaceholder="Comercio, NIT, sucursal, cuenta o n.º de QR…"
        searchTooltip="Busca en el servidor, en toda la cola: coincide con parte del nombre legal o comercial del comercio, su NIT, el nombre, código o ciudad de la sucursal, la entidad, la cuenta enmascarada, la huella del archivo y el número del QR o del comercio."
        filters={[
          {
            name: "qrKind",
            label: "Tipo de QR",
            value: qrKind,
            options: TIPO_QR_OPTIONS,
            tooltip:
              "Sólo los QR del negocio o sólo los de una cuenta bancaria.",
          },
        ]}
        onSearchChange={(valor) => {
          setQ(valor);
          setPage(1);
        }}
        onFilterChange={(_nombre, valor) => {
          setQrKind(valor);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setQrKind("");
          setPage(1);
        }}
      />
      {cola.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {cola.error ? (
        <ErrorState
          description={
            isAtlasApiError(cola.error)
              ? cola.error.message
              : "No se pudo cargar la cola de QR."
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
          emptyTitle={
            filtrando
              ? "Ningún QR esperando revisión coincide con la búsqueda."
              : "No hay QR esperando revisión."
          }
          emptyDescription={
            filtrando
              ? "Cambia o borra el texto y el filtro."
              : "Cuando un comercio suba o cambie su QR de cobro, aparecerá aquí."
          }
        />
      ) : null}
      {abierto ? (
        <PartnerQrDialog qr={abierto} onClose={() => setAbierto(null)} />
      ) : null}
    </Card>
  );
}
