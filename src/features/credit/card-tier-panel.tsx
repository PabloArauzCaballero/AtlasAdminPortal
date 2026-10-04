"use client";

import { useState } from "react";
import { CreditCard, Pencil, Undo2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime } from "@/shared/lib/format";
import {
  useCustomerCardTier,
  useRevokeCardTierMutation,
  useSetCardTierMutation,
} from "./card-tier-hooks";
import { CardTierHistory } from "./card-tier-history";
import { RevokeCardTierDialog, SetCardTierDialog } from "./card-tier-dialogs";
import type { CardTierTheme, CustomerCardTier } from "./card-tier-types";
import { cardTierErrorMessage } from "./card-tier-errors";

export function cardBackground(theme: CardTierTheme): string {
  return `linear-gradient(135deg, ${theme.gradient.join(", ")})`;
}

/** La tarjeta como la ve el cliente, en pequeño: el personal reconoce lo que el cliente tiene en la app. */
function CardPreview({ card }: Readonly<{ card: CustomerCardTier }>) {
  return (
    <div
      data-testid="card-tier-preview"
      role="img"
      aria-label={`Tarjeta ${card.label}, acabado ${card.theme.finish}`}
      className="flex h-28 w-48 shrink-0 flex-col justify-between rounded-xl p-3 shadow-card"
      style={{
        background: cardBackground(card.theme),
        color: card.theme.ink,
        boxShadow: `inset 0 0 0 1px ${card.theme.accent}`,
      }}
    >
      <span className="text-[10px] font-semibold tracking-[0.2em]">ATLAS</span>
      <span className="text-lg font-semibold leading-none">{card.label}</span>
    </div>
  );
}

/** De dónde sale la tarjeta, dicho en una frase para quien opera. */
export function sourceSentence(card: CustomerCardTier): string {
  if (card.source === "AUTOMATICA") {
    return `La ganó por su nivel Atlas. Cambia sola cuando el cliente sube o baja de nivel.`;
  }
  const hasta = card.manual?.expiresAt
    ? `hasta el ${formatDateTime(card.manual.expiresAt)}`
    : "sin fecha de vencimiento";
  return `Puesta a mano por el personal, ${hasta}. Por su nivel le correspondería ${card.automatic.label}.`;
}

/** La tarjeta del cliente en su ficha: ver, cambiar a mano (con motivo) y quitar el ajuste. */
export function CustomerCardTierPanel({
  customerId,
}: Readonly<{ customerId: string }>) {
  const query = useCustomerCardTier(customerId);
  const setMutation = useSetCardTierMutation(customerId);
  const revokeMutation = useRevokeCardTierMutation(customerId);
  const [dialog, setDialog] = useState<"set" | "revoke" | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const customerLabel = `el cliente #${customerId}`;

  const close = () => setDialog(null);
  const card = query.data;

  return (
    <div className="space-y-3" data-testid="tarjeta-del-cliente">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-atlas-text">
          <CreditCard className="h-4 w-4" aria-hidden />
          Tarjeta Atlas
        </h3>
        {card ? (
          <div className="flex gap-2">
            {card.source === "MANUAL" ? (
              <Button
                variant="secondary"
                onClick={() => {
                  revokeMutation.reset();
                  setDialog("revoke");
                }}
              >
                <Undo2 className="h-4 w-4" aria-hidden />
                Quitar ajuste
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => {
                setMutation.reset();
                setAviso(null);
                setDialog("set");
              }}
            >
              <Pencil className="h-4 w-4" aria-hidden />
              Cambiar tarjeta
            </Button>
          </div>
        ) : null}
      </div>
      {aviso ? (
        <p role="status" className="text-sm text-emerald-700">
          {aviso}
        </p>
      ) : null}
      {query.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {query.error ? (
        <ErrorState
          description={cardTierErrorMessage(
            query.error,
            "No se pudo cargar la tarjeta del cliente.",
          )}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {card ? (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <CardPreview card={card} />
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <p className="font-medium text-atlas-text">
                {card.label}{" "}
                <span className="font-normal text-atlas-muted">
                  · {card.source === "MANUAL" ? "ajuste manual" : "automática"}
                </span>
              </p>
              <p className="text-atlas-muted">{sourceSentence(card)}</p>
              <p className="text-xs text-atlas-muted">
                La tarjeta es presentación y estatus: no cambia su límite de
                crédito.
              </p>
            </div>
          </div>
          <CardTierHistory history={card.history} catalog={card.catalog} />
        </>
      ) : null}
      {card && dialog === "set" ? (
        <SetCardTierDialog
          catalog={card.catalog}
          currentCode={card.code}
          customerLabel={customerLabel}
          isLoading={setMutation.isPending}
          error={setMutation.error}
          onCancel={close}
          onSubmit={(body) =>
            setMutation.mutate(body, {
              onSuccess: (next) => {
                setAviso(`Tarjeta cambiada a ${next.label}.`);
                close();
              },
            })
          }
        />
      ) : null}
      {card && dialog === "revoke" ? (
        <RevokeCardTierDialog
          automaticLabel={card.automatic.label}
          customerLabel={customerLabel}
          isLoading={revokeMutation.isPending}
          error={revokeMutation.error}
          onCancel={close}
          onSubmit={(body) =>
            revokeMutation.mutate(body, {
              onSuccess: (next) => {
                setAviso(`Ajuste quitado: vuelve a ${next.label}.`);
                close();
              },
            })
          }
        />
      ) : null}
    </div>
  );
}
