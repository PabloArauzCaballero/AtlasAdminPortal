import { z } from "zod";
import { CARD_TIER_CODES } from "./card-tier-types";

/*
 * Espejo de `card-tier.schemas.ts` de AtlasBackend: el mismo mínimo de 10 caracteres en el motivo para que el error
 * salga en el campo y no como un 400 después.
 */
const reason = z
  .string()
  .trim()
  .min(10, "Explica el cambio con al menos 10 caracteres.")
  .max(500, "Máximo 500 caracteres.");

export const setCardTierSchema = z.object({
  tierCode: z.enum(CARD_TIER_CODES, { message: "Elige una tarjeta." }),
  reason,
  /** `YYYY-MM-DD` del selector de fecha; vacío = no vence. */
  expiresOn: z
    .string()
    .refine(
      (value) => value === "" || !Number.isNaN(Date.parse(`${value}T23:59:59`)),
      "Fecha no válida.",
    )
    .refine(
      (value) => value === "" || new Date(`${value}T23:59:59`) > new Date(),
      "El vencimiento debe ser futuro.",
    ),
});
export type SetCardTierForm = z.infer<typeof setCardTierSchema>;

export const revokeCardTierSchema = z.object({ reason });
export type RevokeCardTierForm = z.infer<typeof revokeCardTierSchema>;

/** `YYYY-MM-DD` → ISO al final de ese día en la zona de quien opera; vacío → sin vencimiento. */
export function expiryToIso(expiresOn: string): string | undefined {
  return expiresOn === ""
    ? undefined
    : new Date(`${expiresOn}T23:59:59`).toISOString();
}
