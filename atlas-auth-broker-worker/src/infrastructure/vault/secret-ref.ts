/**
 * Convención de referencias al vault, compartida por todos los drivers.
 *
 * Una referencia identifica un *conjunto* de campos (`CLIENT_ID`, `CLIENT_SECRET`, …) para un
 * sujeto: `provider:SEGIP`, `idp:CORPORATE_OIDC`. Mantener la convención en un solo archivo evita
 * que cada driver invente su propio esquema de nombres y que una credencial quede inalcanzable
 * solo porque dos capas normalizan distinto.
 */

export const SECRET_FIELDS = {
  clientId: 'CLIENT_ID',
  clientSecret: 'CLIENT_SECRET',
  apiKey: 'API_KEY',
  privateKey: 'PRIVATE_KEY',
} as const;

export type SecretField = (typeof SECRET_FIELDS)[keyof typeof SECRET_FIELDS];

export function providerSecretRef(providerCode: string): string {
  return `provider:${providerCode.trim().toUpperCase()}`;
}

export function identityProviderSecretRef(idpCode: string): string {
  return `idp:${idpCode.trim().toUpperCase()}`;
}

/** Normaliza una referencia a un token apto para nombre de variable o clave de almacenamiento. */
export function normalizeSecretRef(secretRef: string): string {
  return secretRef
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/gu, '_');
}

export function normalizeSecretField(field: string): string {
  return field
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/gu, '_');
}
