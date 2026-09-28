"use client";

import { Button } from "@/shared/components/ui/button";
import { partnerActionErrorMessage } from "./labels";

/**
 * Pedir (o volver a pedir) la verificación al Motor.
 *
 * `POST :partnerId/kyb-review` exige `partner.kyb.request`: sin él no se ofrece el botón, porque
 * el backend respondería 403. Y si la petición falla (409, Motor caído), se dice.
 */
export function PedirVerificacion({
  texto,
  permitido,
  pendiente,
  error,
  onPedir,
}: Readonly<{
  texto: string;
  permitido: boolean;
  pendiente: boolean;
  error: unknown;
  onPedir: () => void;
}>) {
  return (
    <>
      {permitido ? (
        <Button disabled={pendiente} onClick={onPedir}>
          {texto}
        </Button>
      ) : (
        <p className="text-xs text-atlas-muted">
          Tu usuario no puede pedir la verificación al Motor: lo hacen Jefatura
          de operaciones y Superadministración.
        </p>
      )}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {partnerActionErrorMessage(
            error,
            "No se pudo pedir la verificación.",
          )}
        </p>
      ) : null}
    </>
  );
}
