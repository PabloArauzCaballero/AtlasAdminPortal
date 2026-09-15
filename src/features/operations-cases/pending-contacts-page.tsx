"use client";

import { useCallback, useMemo, useState } from "react";
import { MailCheck } from "lucide-react";
import { DataTable } from "@/shared/components/data-table/data-table";
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
import type { PendingContactVerificationItem } from "./types";

/**
 * Usuarios de la app que declararon un correo o un teléfono y no lo confirmaron.
 *
 * Hasta el 2026-09-14 no había forma de verlos ni de ayudarlos: el código de verificación sólo lo
 * pedía la propia app, y quien no lo recibía (correo mal escrito, carpeta de spam, SMS apagado)
 * se quedaba a mitad del alta sin que nadie lo supiera. Aquí se ven todos y se reenvía con un clic.
 */
export function PendingContactsPage() {
  const pending = usePendingContactVerification();
  const resend = useResendContactVerificationMutation();
  const [sendingId, setSendingId] = useState<string | null>(null);
  // El resultado del último reenvío se muestra en un aviso en la página: el portal no tiene toasts.
  const [aviso, setAviso] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  const items = useMemo(() => pending.data?.items ?? [], [pending.data]);
  const emails = useMemo(
    () => items.filter((item) => item.contactType === "email").length,
    [items],
  );
  const phones = useMemo(
    () => items.filter((item) => item.contactType === "phone").length,
    [items],
  );

  const onResend = useCallback(
    async (item: PendingContactVerificationItem) => {
      setSendingId(item.contactMethodId);
      try {
        await resend.mutateAsync({
          customerId: item.customerId,
          body: {
            contactType: item.contactType === "phone" ? "phone" : "email",
            contactMethodId: item.contactMethodId,
          },
        });
        setAviso({
          tone: "ok",
          text: `${item.contactType === "phone" ? "SMS" : "Correo"} reenviado: se envió un código nuevo al cliente ${item.customerCode ?? item.customerId}.`,
        });
      } catch (error) {
        setAviso({
          tone: "error",
          text: `No se pudo reenviar: ${isAtlasApiError(error) ? error.message : "el backend rechazó el reenvío; intenta de nuevo en un minuto."}`,
        });
      } finally {
        setSendingId(null);
      }
    },
    [resend],
  );

  const columns = useMemo(
    () => buildPendingContactsColumns(onResend, sendingId),
    [sendingId],
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
        sólo dispara el envío, y el backend limita la frecuencia.
      </BusinessContextNote>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Contactos pendientes"
          value={formatNumber(items.length)}
        />
        <MetricCard label="Correos" value={formatNumber(emails)} />
        <MetricCard label="Teléfonos" value={formatNumber(phones)} />
      </div>
      {aviso ? (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${aviso.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {aviso.text}
        </p>
      ) : null}
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
        />
      ) : null}
      {!pending.isLoading && !pending.error ? (
        <DataTable
          data={items}
          columns={columns}
          emptyTitle="No hay contactos pendientes de verificación."
          emptyDescription="Todos los correos y teléfonos declarados están confirmados."
        />
      ) : null}
    </>
  );
}
