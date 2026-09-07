"use client";

import { useId, useState } from "react";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { formatDateTime, safeText } from "@/shared/lib/format";
import type {
  MerchantProvisioningRequest,
  MerchantProvisioningResult,
} from "./types";

/**
 * Decidir sobre una petición encolada por el ERP.
 *
 * El diálogo enseña la petición y NO deja editarla: el correo y el nombre son los que el ERP
 * mandó. Si están mal, se corrigen allí y se vuelve a encolar. Poder retocarlos aquí devolvería la
 * avería que la cola resuelve —la identidad diciendo una cosa y el CRM otra—, y encima dejaría la
 * petición mintiendo sobre lo que se concedió.
 */
export function ProvisioningDecisionDialog({
  peticion,
  accion,
  onClose,
  onAprobar,
  onRechazar,
  isPending,
  error,
}: Readonly<{
  peticion: MerchantProvisioningRequest;
  accion: "aprobar" | "rechazar";
  onClose: () => void;
  onAprobar: (userCode?: string) => Promise<MerchantProvisioningResult | void>;
  onRechazar: (motivo: string) => Promise<unknown>;
  isPending: boolean;
  error: string | null;
}>) {
  const tituloId = useId();
  const [userCode, setUserCode] = useState("");
  const [motivo, setMotivo] = useState("");
  const aprobar = accion === "aprobar";

  return (
    <DialogShell
      open
      labelledBy={tituloId}
      onClose={onClose}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="w-full max-w-xl rounded-xl border border-atlas-border bg-white p-5 shadow-card"
    >
      <h2
        id={tituloId}
        className="mb-1 text-base font-semibold text-atlas-text"
      >
        {aprobar ? "Conceder el acceso pedido" : "Rechazar la petición"}
      </h2>
      <p className="mb-4 text-sm text-atlas-muted">
        {aprobar
          ? "Se creará la identidad con los datos que mandó el ERP y nacerá en «invited». La contraseña provisional se enseña una sola vez, al terminar."
          : "El motivo viaja al ERP: es lo que le dice al ejecutivo comercial qué corregir antes de volver a pedirlo."}
      </p>

      <div className="mb-4">
        <KeyValueGrid
          items={[
            { label: "Comercio", value: safeText(peticion.accountName) },
            { label: "Sucursal", value: safeText(peticion.branchName) },
            { label: "Persona", value: peticion.fullName },
            { label: "Correo", value: peticion.email, mono: true },
            { label: "Rol en el ERP", value: safeText(peticion.roleCode) },
            { label: "Lo pidió", value: safeText(peticion.requestedBy) },
            { label: "Pedido", value: formatDateTime(peticion.requestedAt) },
            {
              label: "Referencia del ERP",
              value: peticion.externalReference,
              mono: true,
            },
          ]}
        />
      </div>

      {aprobar ? (
        <Field
          label="Código de usuario"
          hint="Opcional, y el único dato que pone Atlas: el resto viene del ERP."
        >
          <Input
            value={userCode}
            onChange={(evento) => setUserCode(evento.target.value)}
          />
        </Field>
      ) : (
        <Field label="Motivo del rechazo" hint="Mínimo ocho caracteres.">
          <Textarea
            rows={3}
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
          />
        </Field>
      )}

      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant={aprobar ? "primary" : "danger"}
          isLoading={isPending}
          disabled={!aprobar && motivo.trim().length < 8}
          onClick={() =>
            void (aprobar
              ? onAprobar(userCode.trim() || undefined)
              : onRechazar(motivo.trim()))
          }
        >
          {aprobar ? "Conceder" : "Rechazar"}
        </Button>
      </div>
    </DialogShell>
  );
}

/**
 * La contraseña provisional, enseñada una sola vez.
 *
 * No se guarda en claro en ninguna parte, así que ninguna pantalla la puede volver a mostrar. El
 * diálogo lo dice antes de que se cierre, porque descubrirlo después obliga a un restablecimiento
 * que el usuario del comercio no ha pedido.
 */
export function CredencialEntregadaDialog({
  resultado,
  onClose,
}: Readonly<{ resultado: MerchantProvisioningResult; onClose: () => void }>) {
  const tituloId = useId();
  return (
    <DialogShell
      open
      labelledBy={tituloId}
      onClose={onClose}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="w-full max-w-lg rounded-xl border border-atlas-border bg-white p-5 shadow-card"
    >
      <h2
        id={tituloId}
        className="mb-1 text-base font-semibold text-atlas-text"
      >
        Acceso concedido
      </h2>
      <p className="mb-4 text-sm text-atlas-muted">
        {`${resultado.merchantUser.fullName} ya tiene identidad en Atlas. Entrégale esta contraseña provisional: la deberá cambiar en su primer acceso y no se puede volver a consultar.`}
      </p>
      <p className="select-all rounded-lg border border-atlas-border bg-atlas-soft px-3 py-2 font-mono text-base text-atlas-text">
        {resultado.temporaryPassword}
      </p>
      <div className="mt-4 flex justify-end">
        <Button variant="primary" onClick={onClose}>
          Ya la copié
        </Button>
      </div>
    </DialogShell>
  );
}
