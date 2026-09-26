"use client";

import { useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { useAuth } from "@/shared/auth/auth-context";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Textarea } from "@/shared/components/ui/input";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { formatDateTime, safeText } from "@/shared/lib/format";
import {
  usePartnerQrImage,
  useQrPendingReview,
  useReviewPartnerQrMutation,
} from "./hooks";
import type { PartnerQrPending } from "./types";

/**
 * La cola de QR de cobro esperando revisión.
 *
 * Un QR de cobro dice a qué cuenta transfieren los clientes de un comercio. Nace en
 * `pending_review` y hasta que alguien lo aprueba aquí la app NO lo enseña: hasta el 2026-09-14 no
 * existía esta pantalla y ningún QR salía nunca de «pendiente», así que el cliente veía un código
 * que nadie había mirado. Se pinta la IMAGEN —por blob, con la sesión— porque decidir sobre una
 * cuenta de cobro mirando sólo el hash es firmar sin haber visto.
 *
 * Los botones sólo aparecen con `partner.qr.review` (MERCHANT_OPERATIONS): el backend responde 403
 * sin él, y una promesa que termina en 403 no es una promesa.
 */
export function PartnerQrReviewQueue() {
  const cola = useQrPendingReview();
  const items = cola.data?.items ?? [];

  return (
    <Card className="p-5">
      <h2 className="mb-1 text-base font-semibold text-atlas-text">
        QR de cobro esperando revisión
      </h2>
      <p className="mb-4 text-sm text-atlas-muted">
        Cada imagen es el código con el que un comercio pide que le transfieran.
        Hasta que se aprueba, la app del cliente no lo enseña. Rechazar exige
        una nota: es lo único que le dice al comercio qué corregir.
      </p>
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
      {cola.data && items.length === 0 ? (
        <EmptyState
          title="No hay QR esperando revisión."
          description="Cuando un comercio suba o cambie su QR de cobro, aparecerá aquí."
        />
      ) : null}
      {items.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((qr) => (
            <li key={qr.qrId}>
              <QrPendingCard qr={qr} />
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function QrPendingCard({ qr }: Readonly<{ qr: PartnerQrPending }>) {
  const { hasPermission } = useAuth();
  const puedeRevisar = hasPermission("partner.qr.review");
  const revisar = useReviewPartnerQrMutation();
  const imagen = usePartnerQrImage(qr.partnerId, qr.qrId);
  const [nota, setNota] = useState("");
  const [pendiente, setPendiente] = useState<"aprobar" | "rechazar" | null>(
    null,
  );
  const nombre = safeText(qr.partner?.tradeName ?? qr.partner?.legalName);
  const tipo = qr.qrKind === "bank" ? "QR bancario (cobro)" : "QR del negocio";

  return (
    <article
      className="rounded-xl border border-slate-200 bg-white p-4"
      data-testid={`qr-pendiente-${qr.qrId}`}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-atlas-text">{nombre}</h3>
          <p className="text-xs text-atlas-muted">
            {tipo} · expediente {qr.partnerId}
            {qr.partner ? ` · ${qr.partner.onboardingStatus}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
          pendiente
        </span>
      </header>

      <div className="mb-3 flex justify-center rounded-lg border border-dashed border-slate-200 bg-atlas-soft p-3">
        {imagen.isLoading ? <LoadingSkeleton rows={2} /> : null}
        {imagen.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- es un blob local con la sesión puesta; next/image no puede cargarlo
          <img
            src={imagen.url}
            alt={`${tipo} de ${nombre}`}
            className="max-h-56 w-auto"
          />
        ) : null}
        {imagen.error ? (
          <p className="text-xs text-red-700">
            No se pudo cargar la imagen del QR.
          </p>
        ) : null}
      </div>

      <dl className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-atlas-muted">Entidad</dt>
        <dd className="font-mono">{qr.bankInstitutionCode ?? "—"}</dd>
        <dt className="text-atlas-muted">Cuenta</dt>
        <dd className="font-mono">{qr.accountNumberMasked ?? "—"}</dd>
        <dt className="text-atlas-muted">Huella del archivo</dt>
        <dd className="font-mono">{qr.fingerprint}</dd>
        <dt className="text-atlas-muted">Subido</dt>
        <dd>{formatDateTime(qr.createdAt)}</dd>
      </dl>

      {puedeRevisar ? (
        <div className="space-y-2">
          <Field
            tooltip="Explicación que lee el comercio; obligatoria si rechazas su QR."
            label="Nota para el comercio"
            hint="Obligatoria para rechazar: es lo que el comercio lee para corregir."
          >
            <Textarea
              rows={2}
              value={nota}
              onChange={(evento) => setNota(evento.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => setPendiente("aprobar")}>
              Aprobar QR
            </Button>
            <Button
              variant="danger"
              disabled={nota.trim().length < 3}
              onClick={() => setPendiente("rechazar")}
            >
              Rechazar QR
            </Button>
          </div>
          {revisar.error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {isAtlasApiError(revisar.error)
                ? revisar.error.message
                : "No se pudo revisar el QR."}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-atlas-muted">
          Revisar un QR exige el permiso «partner.qr.review»
          (MERCHANT_OPERATIONS). Tu sesión no lo tiene.
        </p>
      )}

      <ConfirmDialog
        open={pendiente !== null}
        title={pendiente === "aprobar" ? "Aprobar el QR" : "Rechazar el QR"}
        description={
          pendiente === "aprobar"
            ? "Desde ahora los clientes de este comercio verán este código al pagar. Si había otro activo, queda archivado."
            : "El comercio verá la nota y tendrá que subir otra imagen."
        }
        confirmText={pendiente === "aprobar" ? "Aprobar" : "Rechazar"}
        isLoading={revisar.isPending}
        onCancel={() => setPendiente(null)}
        onConfirm={() => {
          const aprobado = pendiente === "aprobar";
          void revisar
            .mutateAsync({
              partnerId: qr.partnerId,
              qrId: qr.qrId,
              approved: aprobado,
              ...(nota.trim() ? { note: nota.trim() } : {}),
            })
            .finally(() => setPendiente(null));
        }}
      />
    </article>
  );
}
