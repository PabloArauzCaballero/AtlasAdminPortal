/**
 * Catálogo de credenciales de los proveedores externos de Atlas.
 *
 * Refleja lo que AtlasBackend declara hoy en `PRODUCTION_CREDENTIAL_REQUIREMENTS`
 * (`src/modules/external-data/application/external-data-policy.util.ts`): SEGIP, INFOCENTER y
 * FACEBOOK_META exigen par cliente/secreto; el resto solo declara una URL base.
 *
 * Decisión explícita sobre esos "solo URL base": se declaran como `api_key` y no como `none`.
 * Ninguno tiene integración real todavía —los adaptadores lanzan
 * `*_REAL_INTEGRATION_NOT_CONFIGURED`—, así que su método real de autenticación es desconocido.
 * Declararlos `none` los pintaría en verde como "no requiere credencial", que es la afirmación
 * más peligrosa de las dos posibles: llegado el día de conectar el proveedor real, nadie miraría.
 * Declarados `api_key` sin material en el vault, aparecen como `MISSING` hasta que alguien decida
 * conscientemente qué credencial llevan.
 */
import type { ProviderAuthMethod, ProviderCredential } from '../domain/auth-broker.types';
import { providerSecretRef } from '../infrastructure/vault/secret-ref';

type CatalogEntry = {
  readonly providerCode: string;
  readonly authMethod: ProviderAuthMethod;
  readonly scopes: readonly string[];
};

const CATALOG: readonly CatalogEntry[] = [
  { providerCode: 'SEGIP', authMethod: 'oauth2_client_credentials', scopes: ['identity.verify'] },
  { providerCode: 'INFOCENTER', authMethod: 'oauth2_client_credentials', scopes: ['bureau.read'] },
  { providerCode: 'FACEBOOK_META', authMethod: 'oauth2_client_credentials', scopes: [] },
  { providerCode: 'QR_GENERIC', authMethod: 'api_key', scopes: [] },
  { providerCode: 'BANKING_GENERIC', authMethod: 'api_key', scopes: [] },
  { providerCode: 'TELCO_GENERIC', authMethod: 'api_key', scopes: [] },
  { providerCode: 'WHATSAPP_GENERIC', authMethod: 'api_key', scopes: [] },
  { providerCode: 'DIGITAL_TRUST_GENERIC', authMethod: 'api_key', scopes: [] },
];

/** Endpoint de token por proveedor, si el operador lo configuró. */
function tokenEndpointFor(
  providerCode: string,
  environment: NodeJS.ProcessEnv,
): string | undefined {
  const raw = environment[`AUTH_BROKER_${providerCode}_TOKEN_ENDPOINT`];
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : undefined;
}

/**
 * Construye el catálogo inicial de credenciales.
 *
 * `issuedAt` arranca en el momento del despliegue cuando no hay registro previo. Es una
 * aproximación honesta: no sabemos cuándo se emitió realmente una credencial que hasta ahora vivía
 * en una variable de entorno, y fingir una fecha antigua dispararía alertas de rotación falsas.
 */
export function buildAtlasProviderCatalog(
  nowIso: string,
  environment: NodeJS.ProcessEnv = process.env,
): readonly ProviderCredential[] {
  return CATALOG.map((entry) => {
    const tokenEndpoint = tokenEndpointFor(entry.providerCode, environment);
    return {
      providerCode: entry.providerCode,
      authMethod: entry.authMethod,
      secretRef: providerSecretRef(entry.providerCode),
      scopes: entry.scopes,
      issuedAt: nowIso,
      ...(tokenEndpoint !== undefined ? { tokenEndpoint } : {}),
    };
  });
}
