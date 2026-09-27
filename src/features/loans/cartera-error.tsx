"use client";

import { isAtlasApiError } from "@/shared/api/errors";
import { ErrorState } from "@/shared/components/ui/states";
import { explicarErrorDeCartera } from "./loan-labels";

/** El error de una lectura de la cartera, con su código traducido y el id para soporte. */
export function CarteraError({
  error,
  generico,
  onRetry,
}: Readonly<{ error: unknown; generico: string; onRetry?: () => void }>) {
  return (
    <ErrorState
      description={explicarErrorDeCartera(error, generico)}
      requestId={isAtlasApiError(error) ? error.requestId : undefined}
      onRetry={onRetry}
    />
  );
}
