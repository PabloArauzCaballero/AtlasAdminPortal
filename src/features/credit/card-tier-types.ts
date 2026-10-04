/*
 * Espejo de la respuesta de `GET /operations/customers/:customerId/card-tier` de AtlasBackend
 * (`card-tier.mapper.ts`). La tarjeta es presentación y estatus: NO cambia el límite de crédito.
 */

export const CARD_TIER_CODES = [
  "NORMAL",
  "SILVER",
  "GOLD",
  "PREMIUM",
  "BLACK",
] as const;
export type CardTierCode = (typeof CARD_TIER_CODES)[number];

export type CardTierTheme = {
  gradient: string[];
  ink: string;
  accent: string;
  finish: string;
};

export type CardTierDefinition = {
  code: CardTierCode;
  label: string;
  levelCode: string;
  displayOrder: number;
  description: string;
  benefits: Array<{ text: string; icon?: string }>;
  theme: CardTierTheme;
  current: boolean;
};

export type CardTierOverrideRecord = {
  overrideId: string;
  tierCode: CardTierCode;
  reason: string;
  setByInternalUserId: string | null;
  validFrom: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedByInternalUserId: string | null;
  revokeReason: string | null;
};

export type CustomerCardTier = CardTierDefinition & {
  /** `AUTOMATICA`: la ganó por su nivel. `MANUAL`: la puso una persona del personal. */
  source: "AUTOMATICA" | "MANUAL";
  automatic: { code: CardTierCode; label: string };
  manual: { since: string; expiresAt: string | null } | null;
  catalog: CardTierDefinition[];
  history: CardTierOverrideRecord[];
};

export type SetCardTierBody = {
  tierCode: CardTierCode;
  reason: string;
  expiresAt?: string;
};
export type RevokeCardTierBody = { reason: string };
