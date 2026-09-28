"use client";

import { useState } from "react";
import { useAuth } from "@/shared/auth/auth-context";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Input } from "@/shared/components/ui/input";
import {
  RATING_OPERATE_ROLES,
  describeCustomerRating,
  describeLoanRating,
  describeSweep,
  isDatabaseId,
  ratingErrorMessage,
} from "./access";
import {
  useRateCustomerMutation,
  useRateLoanMutation,
  useSweepRatingsMutation,
} from "./hooks";

/**
 * Recalificar a mano: la cartera entera, un crédito o un cliente.
 *
 * Salió de `portfolio-page.tsx` al añadirle lo que le faltaba: DECIR qué pasó. El diálogo prometía
 * «devuelve cuántos se calificaron y cuáles fallaron» y nada lo pintaba; «Calificar» con un número
 * que no existe no decía nada. Ahora cada acción deja su resultado o su error debajo.
 *
 * Sólo se ofrece a los roles que el backend deja recalificar (ver `access.ts`).
 */
export function PortfolioRerate() {
  const { hasAnyRole } = useAuth();
  const puedeRecalificar = hasAnyRole(RATING_OPERATE_ROLES);
  const [confirmarBarrido, setConfirmarBarrido] = useState(false);
  const [loanId, setLoanId] = useState("");
  const [customerId, setCustomerId] = useState("");

  const barrido = useSweepRatingsMutation();
  const credito = useRateLoanMutation();
  const cliente = useRateCustomerMutation();

  return (
    <Card className="p-5">
      <h2 className="mb-1 text-base font-semibold text-atlas-text">
        Recalificar
      </h2>
      <p className="mb-4 text-sm text-atlas-muted">
        Calificar un crédito recalifica también a su titular: su categoría se
        deriva por arrastre de todas sus operaciones, y hacerlo a medias dejaría
        la ficha mintiendo.
      </p>
      {!puedeRecalificar ? (
        <p className="text-sm text-atlas-muted">
          Tu usuario puede consultar la cartera, pero recalificar lo hacen
          Análisis de riesgo, Operaciones y Administración.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <Button
              disabled={barrido.isPending}
              onClick={() => {
                barrido.reset();
                setConfirmarBarrido(true);
              }}
            >
              Recalificar la cartera
            </Button>
            <Resultado
              exito={barrido.data ? describeSweep(barrido.data) : null}
              error={
                barrido.error
                  ? ratingErrorMessage(barrido.error, "cartera")
                  : null
              }
            />
          </div>
          <Field
            tooltip="Número del crédito cuya calificación se recalcula ahora."
            label="Recalificar un crédito"
            hint="El número del crédito, sólo cifras."
          >
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                value={loanId}
                onChange={(e) => {
                  setLoanId(e.target.value);
                  credito.reset();
                }}
              />
              <Button
                disabled={!isDatabaseId(loanId) || credito.isPending}
                onClick={() => {
                  const id = loanId.trim();
                  credito.mutateAsync(id).catch(() => undefined);
                }}
              >
                Calificar
              </Button>
            </div>
            <Resultado
              aviso={soloCifras(loanId)}
              exito={
                credito.data && credito.variables
                  ? describeLoanRating(credito.variables, credito.data)
                  : null
              }
              error={
                credito.error
                  ? ratingErrorMessage(credito.error, "crédito")
                  : null
              }
            />
          </Field>
          <Field
            tooltip="Número del cliente cuya calificación se recalcula ahora."
            label="Recalificar un cliente"
            hint="El número del cliente, el de su ficha; sólo cifras."
          >
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  cliente.reset();
                }}
              />
              <Button
                disabled={!isDatabaseId(customerId) || cliente.isPending}
                onClick={() => {
                  const id = customerId.trim();
                  cliente.mutateAsync(id).catch(() => undefined);
                }}
              >
                Calificar
              </Button>
            </div>
            <Resultado
              aviso={soloCifras(customerId)}
              exito={
                cliente.data && cliente.variables
                  ? describeCustomerRating(cliente.variables, cliente.data)
                  : null
              }
              error={
                cliente.error
                  ? ratingErrorMessage(cliente.error, "cliente")
                  : null
              }
            />
          </Field>
        </div>
      )}

      <ConfirmDialog
        open={confirmarBarrido}
        title="Recalificar toda la cartera"
        description="Recorre los clientes con deuda viva y recalifica cada operación y su ficha. Al terminar, verás aquí cuántos se calificaron y cuáles fallaron."
        confirmText="Ejecutar"
        isLoading={barrido.isPending}
        onCancel={() => setConfirmarBarrido(false)}
        onConfirm={() => {
          barrido
            .mutateAsync(500)
            .catch(() => undefined)
            .finally(() => setConfirmarBarrido(false));
        }}
      />
    </Card>
  );
}

/** Hay algo escrito y no es un número: se avisa antes de mandar nada. */
function soloCifras(valor: string): boolean {
  return valor.trim() !== "" && !isDatabaseId(valor);
}

function Resultado({
  aviso = false,
  exito,
  error,
}: Readonly<{
  aviso?: boolean;
  exito: string | null;
  error: string | null;
}>) {
  if (aviso) {
    return (
      <p className="mt-2 text-xs text-amber-800">
        Escribe sólo cifras: el número no lleva letras ni espacios.
      </p>
    );
  }
  if (error) {
    return (
      <p
        role="alert"
        className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {error}
      </p>
    );
  }
  if (exito) {
    return (
      <p
        role="status"
        className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
      >
        {exito}
      </p>
    );
  }
  return null;
}
