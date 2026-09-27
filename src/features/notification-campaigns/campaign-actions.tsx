"use client";

import { useId, useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { CAMPAIGN_OPERATE_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Field, Textarea } from "@/shared/components/ui/input";
import { allowedActions } from "./campaign-options";
import { useCampaignActionMutation } from "./hooks";
import type { CampaignAction, NotificationCampaign } from "./types";

const MIN_REASON = 8;
const MAX_REASON = 400;

/**
 * Las tres palancas de freno. Sólo se ofrecen las que el estado admite y sólo a quien el servidor
 * deja usarlas (`admin`/`platform_admin`): a un operador le devolvería 403.
 */
export function CampaignActions({
  campaign,
}: Readonly<{ campaign: NotificationCampaign }>) {
  return (
    <RoleGate roles={CAMPAIGN_OPERATE_ROLE_LIST} fallback={null}>
      <CampaignActionButtons campaign={campaign} />
    </RoleGate>
  );
}

function CampaignActionButtons({
  campaign,
}: Readonly<{ campaign: NotificationCampaign }>) {
  const [open, setOpen] = useState<CampaignAction | null>(null);
  const mutation = useCampaignActionMutation(campaign.id);
  const actions = allowedActions(campaign.status);
  if (actions.length === 0) return null;

  const error = mutation.error
    ? isAtlasApiError(mutation.error)
      ? mutation.error.message
      : "No se pudo aplicar la acción."
    : null;

  const run = (action: CampaignAction, reason?: string) =>
    mutation.mutate({ action, reason }, { onSuccess: () => setOpen(null) });

  const close = () => {
    mutation.reset();
    setOpen(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.includes("pause") ? (
        <Button onClick={() => setOpen("pause")}>Pausar</Button>
      ) : null}
      {actions.includes("resume") ? (
        <Button variant="primary" onClick={() => setOpen("resume")}>
          Reanudar
        </Button>
      ) : null}
      {actions.includes("cancel") ? (
        <Button variant="danger" onClick={() => setOpen("cancel")}>
          Cancelar campaña
        </Button>
      ) : null}
      {error && open !== "cancel" ? (
        <p role="alert" className="w-full text-xs text-red-700">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={open === "pause"}
        title="Pausar la campaña"
        description="El reparto se detiene y los avisos que faltan esperan. Nada se pierde: al reanudar sigue donde quedó, siempre que no haya pasado el fin de su ventana."
        confirmText="Pausar"
        isLoading={mutation.isPending}
        onConfirm={() => run("pause")}
        onCancel={close}
      />
      <ConfirmDialog
        open={open === "resume"}
        title="Reanudar la campaña"
        description="Vuelve a repartir los avisos pendientes a su ritmo por minuto."
        confirmText="Reanudar"
        isLoading={mutation.isPending}
        onConfirm={() => run("resume")}
        onCancel={close}
      />
      {open === "cancel" ? (
        <CancelDialog
          isPending={mutation.isPending}
          error={error}
          onCancel={close}
          onConfirm={(reason) => run("cancel", reason)}
        />
      ) : null}
    </div>
  );
}

function CancelDialog({
  isPending,
  error,
  onCancel,
  onConfirm,
}: Readonly<{
  isPending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}>) {
  const titleId = useId();
  const [reason, setReason] = useState("");
  const valid = reason.trim().length >= MIN_REASON;

  return (
    <DialogShell
      open
      labelledBy={titleId}
      onClose={onCancel}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="w-full max-w-lg rounded-xl border border-atlas-border bg-white p-5 shadow-card"
    >
      <h2 id={titleId} className="mb-1 text-base font-semibold text-atlas-text">
        Cancelar la campaña
      </h2>
      <p className="mb-4 text-sm text-atlas-muted">
        No tiene vuelta atrás: los avisos que todavía no salieron se anulan y la
        campaña queda cerrada. Lo ya entregado no se puede retirar. El motivo
        queda escrito en la campaña y lo verá el equipo del ERP.
      </p>
      <Field
        label="Motivo de la cancelación"
        tooltip="Por qué se frena la campaña, para quien la creó en el ERP; por ejemplo «el enlace lleva a una pantalla rota»."
        hint={`Entre ${MIN_REASON} y ${MAX_REASON} caracteres.`}
      >
        <Textarea
          rows={3}
          maxLength={MAX_REASON}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onCancel} disabled={isPending}>
          Volver
        </Button>
        <Button
          variant="danger"
          isLoading={isPending}
          disabled={!valid}
          onClick={() => onConfirm(reason.trim())}
        >
          Cancelar campaña
        </Button>
      </div>
    </DialogShell>
  );
}
