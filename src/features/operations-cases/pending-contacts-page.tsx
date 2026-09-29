"use client";

import { useCallback, useMemo, useState } from "react";
import { MailCheck } from "lucide-react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { withoutClientSorting } from "@/shared/components/data-table/without-client-sorting";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import {
  usePendingContactVerification,
  useResendContactVerificationMutation,
} from "./hooks";
import { buildPendingContactsColumns } from "./pending-contacts-columns";
import { resendNotice, type ResendNotice } from "./pending-contacts-notice";
import type { PendingContactVerificationItem } from "./types";

const POR_PAGINA = 25;

const TIPOS = [
  {
    value: "email",
    label: "Correos",
    description: "Sólo los correos declarados y sin confirmar.",
  },
  {
    value: "phone",
    label: "Teléfonos",
    description: "Sólo los teléfonos declarados y sin confirmar.",
  },
];

/**
 * Usuarios de la app que declararon un correo o un teléfono y no lo confirmaron.
 *
 * Hasta el 2026-09-14 no había forma de verlos ni de ayudarlos: el código de verificación sólo lo
 * pedía la propia app, y quien no lo recibía (correo mal escrito, carpeta de spam, SMS apagado)
 * se quedaba a mitad del alta sin que nadie lo supiera. Aquí se ven todos —por páginas: antes el
 * servidor cortaba en 200 sin decirlo— y se reenvía con un clic.
 */
export function PendingContactsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [contactType, setContactType] = useState("");
  const pending = usePendingContactVerification({
    page,
    limit: POR_PAGINA,
    q: search.trim(),
    contactType,
  });
  const resend = useResendContactVerificationMutation();
  const [sendingId, setSendingId] = useState<string | null>(null);
  // El resultado del último reenvío se muestra en un aviso en la página: el portal no tiene toasts.
  const [aviso, setAviso] = useState<ResendNotice | null>(null);

  const items = useMemo(() => pending.data?.items ?? [], [pending.data]);
  const resumen = pending.data?.summary;

  const onResend = useCallback(
    async (item: PendingContactVerificationItem) => {
      setSendingId(item.contactMethodId);
      try {
        const result = await resend.mutateAsync({
          customerId: item.customerId,
          body: {
            contactType: item.contactType === "phone" ? "phone" : "email",
            contactMethodId: item.contactMethodId,
          },
        });
        setAviso(resendNotice(item, result));
      } catch (error) {
        setAviso({
          tone: "error",
          text: `No se pudo reenviar: ${isAtlasApiError(error) ? error.message : "no hubo respuesta del servidor; intenta de nuevo en un minuto."}`,
        });
      } finally {
        setSendingId(null);
      }
    },
    [resend],
  );

  const columns = useMemo(
    () =>
      withoutClientSorting(buildPendingContactsColumns(onResend, sendingId)),
    [onResend, sendingId],
  );

  return (
    <>
      <PageHeader
        icon={MailCheck}
        eyebrow="Operaciones"
        title="Contactos sin verificar"
        description="Clientes que declararon un correo o un teléfono y todavía no confirmaron el código. Desde aquí se les reenvía."
      />
      <BusinessContextNote>
        Un cliente sin correo verificado no puede recuperar su PIN ni recibir
        avisos, y su alta se queda a medias. Reenviar el código usa el mismo
        canal que la app: el operador no ve el contacto completo ni el código;
        sólo dispara el envío, y el sistema limita la frecuencia.
      </BusinessContextNote>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Contactos pendientes (toda la cola)"
          value={resumen ? formatNumber(resumen.total) : "—"}
        />
        <MetricCard
          label="Correos"
          value={resumen ? formatNumber(resumen.email) : "—"}
        />
        <MetricCard
          label="Teléfonos"
          value={resumen ? formatNumber(resumen.phone) : "—"}
        />
      </div>
      {aviso ? (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${aviso.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {aviso.text}
        </p>
      ) : null}
      <FilterBar
        search={search}
        searchPlaceholder="Código de cliente, dominio o últimos 4…"
        searchTooltip="Busca por parte del código del cliente (CUS-…), del dominio del correo (gmail.com) o de los últimos 4 caracteres del contacto. El contacto completo no se guarda a la vista."
        filters={[
          {
            name: "contactType",
            label: "Tipo de contacto",
            value: contactType,
            tooltip: "Separa los correos de los teléfonos por confirmar.",
            options: TIPOS,
          },
        ]}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onFilterChange={(_name, value) => {
          setContactType(value);
          setPage(1);
        }}
        onClear={() => {
          setSearch("");
          setContactType("");
          setPage(1);
        }}
      />
      {pending.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {pending.error ? (
        <ErrorState
          description={
            isAtlasApiError(pending.error)
              ? pending.error.message
              : "No se pudo cargar la lista."
          }
          requestId={
            isAtlasApiError(pending.error) ? pending.error.requestId : undefined
          }
          onRetry={() => void pending.refetch()}
        />
      ) : null}
      {pending.data ? (
        <DataTable
          data={items}
          columns={columns}
          meta={pending.data.meta}
          onPageChange={setPage}
          emptyTitle="No hay contactos pendientes con estos filtros."
          emptyDescription="Quita un filtro o la búsqueda; sin filtros, vacío significa que todos los contactos están confirmados."
        />
      ) : null}
    </>
  );
}
