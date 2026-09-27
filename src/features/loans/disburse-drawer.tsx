"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { isAtlasApiError } from "@/shared/api/errors";
import { newIdempotencyKey } from "@/shared/api/idempotency";
import { Button } from "@/shared/components/ui/button";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Field, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { formatDateTime } from "@/shared/lib/format";
import { useDisburseMutation } from "./hooks";
import { aceptacionDelComercio, explicarErrorDeCartera } from "./loan-labels";
import { Importe } from "./loan-ui";
import type { CreditApplicationSummary } from "./types";

/**
 * Desembolsar: la solicitud aprobada se convierte en préstamo con su cronograma.
 *
 * Mueve dinero, así que no hay «deshacer» desde aquí. Lo que protege de un doble desembolso es la
 * llave de idempotencia: se genera al abrir el panel y se reutiliza en cada reintento del MISMO
 * intento (un doble clic, un corte de red), de modo que el servidor devuelve el préstamo ya creado
 * en vez de crear otro. Sólo se rota tras un éxito.
 *
 * El monto y el plazo NO se editan: los aprobó la decisión. La tasa tampoco: la fija el Motor o
 * el producto, y apartarse exige un permiso propio que esta pantalla no ofrece.
 */
export function DisburseDrawer({
  application,
  onClose,
}: Readonly<{ application: CreditApplicationSummary; onClose: () => void }>) {
  const disburse = useDisburseMutation();
  const llave = useRef(newIdempotencyKey());
  const [notas, setNotas] = useState("");

  function desembolsar() {
    const notes = notas.trim();
    disburse.mutate(
      {
        applicationId: application.applicationId,
        body: notes ? { notes } : {},
        idempotencyKey: llave.current,
      },
      {
        onSuccess: () => {
          llave.current = newIdempotencyKey();
        },
      },
    );
  }

  return (
    <DrawerPanel
      open
      title={`Desembolsar la solicitud ${application.applicationCode}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <KeyValueGrid
          items={[
            {
              label: "Importe aprobado",
              value: (
                <Importe
                  value={application.requestedAmount}
                  currency={application.currencyCode}
                />
              ),
            },
            {
              label: "Plazo",
              value: `${application.requestedTermMonths} meses`,
            },
            { label: "Decidida", value: formatDateTime(application.decidedAt) },
            {
              label: "Comercio",
              value: aceptacionDelComercio(application.businessAcceptance),
            },
          ]}
        />
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Al desembolsar se crea el préstamo y su calendario de cuotas, y el
          cliente empieza a deber. Antes de hacerlo se comprueba otra vez que la
          aprobación siga vigente, que el cliente mantenga su consentimiento y
          que el importe quepa en su línea.
        </p>
        <Field
          label="Notas del desembolso (opcional)"
          tooltip="Contexto para auditoría: quién lo pidió o por qué se hace a mano. No pegues datos personales del cliente."
        >
          <Textarea
            className="min-h-20"
            value={notas}
            maxLength={2000}
            onChange={(event) => setNotas(event.target.value)}
            disabled={disburse.isPending || disburse.isSuccess}
          />
        </Field>
        {disburse.error ? (
          <ErrorState
            title="No se desembolsó"
            description={explicarErrorDeCartera(
              disburse.error,
              "No se pudo desembolsar. Vuelve a intentarlo: no se duplicará.",
            )}
            requestId={
              isAtlasApiError(disburse.error)
                ? disburse.error.requestId
                : undefined
            }
          />
        ) : null}
        {disburse.data ? (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            Préstamo {disburse.data.loanCode} desembolsado.{" "}
            <Link
              className="font-medium underline"
              href={`/internal/operations/loans/${disburse.data.loanId}`}
            >
              Abrir el préstamo
            </Link>
          </div>
        ) : null}
        <div className="flex gap-2">
          {disburse.isSuccess ? null : (
            <Button
              variant="primary"
              onClick={desembolsar}
              isLoading={disburse.isPending}
              loadingText="Desembolsando…"
              disabled={disburse.isPending}
            >
              Desembolsar
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            {disburse.isSuccess ? "Cerrar" : "Cancelar"}
          </Button>
        </div>
      </div>
    </DrawerPanel>
  );
}
