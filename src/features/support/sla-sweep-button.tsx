"use client";

import { TimerReset } from "lucide-react";
import { useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { SUPPORT_ADMIN_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { useSweepSlaMutation } from "./hooks";

/**
 * «Revisar plazos ahora»: el barrido de SLA que normalmente hace el job programado.
 *
 * Existe para que un supervisor no tenga que esperar al siguiente ciclo antes de un comité. No
 * deshace nada: marca como incumplidos los plazos que YA vencieron y avisa de cada uno. Repetirlo no
 * duplica avisos, porque cada aviso lleva la clave de su reloj. Sólo lo ve admin y platform_admin,
 * que es a quien el servidor se lo permite.
 */
export function SlaSweepButton() {
  return (
    <RoleGate roles={SUPPORT_ADMIN_ROLE_LIST} fallback={null}>
      <Barrido />
    </RoleGate>
  );
}

function Barrido() {
  const barrer = useSweepSlaMutation();
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" onClick={() => setAbierto(true)}>
        <TimerReset className="h-4 w-4" aria-hidden />
        Revisar plazos ahora
      </Button>
      {barrer.data ? (
        <p role="status" className="text-xs text-atlas-muted">
          {barrer.data.breached === 0
            ? "Ningún plazo nuevo vencido."
            : `${barrer.data.breached} ${barrer.data.breached === 1 ? "plazo marcado" : "plazos marcados"} como incumplido${barrer.data.breached === 1 ? "" : "s"}.`}
        </p>
      ) : null}
      {barrer.error ? (
        <p role="alert" className="text-xs text-red-700">
          {isAtlasApiError(barrer.error)
            ? barrer.error.message
            : "No se pudo revisar los plazos."}
        </p>
      ) : null}
      <ConfirmDialog
        open={abierto}
        title="¿Revisar los plazos ahora?"
        description="Los casos cuyo plazo de respuesta o de resolución ya venció quedan marcados como incumplidos y se avisa a sus responsables. No cambia plazos que aún no vencieron."
        confirmText="Revisar plazos"
        isLoading={barrer.isPending}
        onCancel={() => setAbierto(false)}
        onConfirm={() =>
          barrer.mutate(undefined, { onSettled: () => setAbierto(false) })
        }
      />
    </div>
  );
}
