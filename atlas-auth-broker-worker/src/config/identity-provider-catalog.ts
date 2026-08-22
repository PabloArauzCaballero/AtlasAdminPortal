/**
 * Catálogo de proveedores de identidad para la federación entrante.
 *
 * Se declara como JSON en `AUTH_BROKER_IDENTITY_PROVIDERS` y se valida con el mismo rigor que una
 * entrada HTTP. Un IdP mal declarado —un `issuer` que no coincide con el del `id_token`, un
 * `jwksUri` apuntando a otro dominio— es un agujero de autenticación, no un error de tipeo, así
 * que el proceso no arranca con uno inválido.
 */
import { z } from 'zod';
import type { IdentityProviderConfig } from '../domain/auth-broker.types';
import { identityProviderSecretRef } from '../infrastructure/vault/secret-ref';

/**
 * Solo HTTPS: un endpoint de autorización o un JWKS por HTTP plano es interceptable, y un JWKS
 * interceptado permite falsificar cualquier identidad.
 *
 * La única excepción es un IdP local en pruebas, y está doblemente cerrada: exige activar
 * `AUTH_BROKER_ALLOW_INSECURE_IDP` **y** que el proceso no esté en producción. Un despliegue
 * productivo no puede relajarla ni por error de configuración.
 */
function endpointUrl(allowInsecure: boolean): z.ZodType<string> {
  if (allowInsecure) return z.url();
  return z
    .url()
    .refine((value) => value.startsWith('https://'), 'Los endpoints del IdP deben usar HTTPS.');
}

/** Entrada del catálogo ya validada, antes de traducirse a `IdentityProviderConfig`. */
type IdentityProviderEntry = {
  idpCode: string;
  realm: 'internal_sso' | 'customer_social';
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
  clientId: string;
  confidential: boolean;
  scopes: string[];
  redirectUri: string;
};

function buildIdentityProviderSchema(allowInsecure: boolean): z.ZodType<IdentityProviderEntry> {
  const httpsUrl = endpointUrl(allowInsecure);
  return z.object({
    idpCode: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[A-Z0-9_]+$/u, 'El código del IdP solo admite mayúsculas, dígitos y guion bajo.'),
    realm: z.enum(['internal_sso', 'customer_social']),
    issuer: z.string().trim().min(1),
    authorizationEndpoint: httpsUrl,
    tokenEndpoint: httpsUrl,
    jwksUri: httpsUrl,
    clientId: z.string().trim().min(1),
    /** `true` cuando el IdP exige secreto de cliente además de PKCE. */
    confidential: z.boolean().default(true),
    scopes: z.array(z.string().trim().min(1)).default(['openid', 'profile', 'email']),
    redirectUri: httpsUrl,
  });
}

/**
 * Lee y valida el catálogo. Sin la variable definida devuelve una lista vacía: la federación
 * entrante es opcional y su ausencia no debe impedir que funcione la autenticación saliente.
 */
export function loadIdentityProviderCatalog(
  environment: NodeJS.ProcessEnv = process.env,
): readonly IdentityProviderConfig[] {
  const raw = environment.AUTH_BROKER_IDENTITY_PROVIDERS;
  if (typeof raw !== 'string' || raw.trim() === '') return [];

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new Error('AUTH_BROKER_IDENTITY_PROVIDERS no es JSON válido.');
  }

  const allowInsecure =
    environment.AUTH_BROKER_ALLOW_INSECURE_IDP === 'true' && environment.NODE_ENV !== 'production';
  const catalogSchema = z.array(buildIdentityProviderSchema(allowInsecure));

  return catalogSchema.parse(parsedJson).map((entry) => ({
    idpCode: entry.idpCode,
    realm: entry.realm,
    issuer: entry.issuer,
    authorizationEndpoint: entry.authorizationEndpoint,
    tokenEndpoint: entry.tokenEndpoint,
    jwksUri: entry.jwksUri,
    clientId: entry.clientId,
    scopes: entry.scopes,
    redirectUri: entry.redirectUri,
    ...(entry.confidential ? { secretRef: identityProviderSecretRef(entry.idpCode) } : {}),
  }));
}
