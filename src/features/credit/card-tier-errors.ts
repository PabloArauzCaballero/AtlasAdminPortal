import { isAtlasApiError } from "@/shared/api/errors";
import { creditErrorMessage } from "./credit-rules";

/** Códigos que emite `card-tier.service.ts` del backend, dichos para quien opera. */
const CARD_TIER_ERRORS: ReadonlyArray<readonly [string, string]> = [
  [
    "CARD_TIER_EXPIRY_IN_PAST",
    "El vencimiento debe ser una fecha futura. Elige otra o déjalo vacío.",
  ],
  [
    "CARD_TIER_NOT_FOUND",
    "Esa tarjeta ya no está en el catálogo. Cierra el diálogo y vuelve a abrirlo.",
  ],
  [
    "CARD_TIER_OVERRIDE_NOT_FOUND",
    "El cliente ya no tiene un ajuste manual que quitar: puede que otra persona lo haya quitado o que haya vencido.",
  ],
];

export function cardTierErrorMessage(error: unknown, fallback: string): string {
  if (isAtlasApiError(error)) {
    const known = CARD_TIER_ERRORS.find(
      ([code]) => error.message.startsWith(code) || error.code === code,
    );
    if (known) return known[1];
  }
  return creditErrorMessage(error, fallback);
}
