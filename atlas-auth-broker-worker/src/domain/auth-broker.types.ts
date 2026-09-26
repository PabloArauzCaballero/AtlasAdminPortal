/**
 * Modelo de dominio del broker de autenticación.
 *
 * Regla que atraviesa todo el archivo: aquí NO viaja material sensible. Una credencial se
 * representa por su referencia en el vault y por su huella (`fingerprint`), nunca por su valor.
 * El único tipo que contiene un secreto en claro es `IssuedAccessToken`, que existe durante la
 * llamada al proveedor y jamás se persiste ni se serializa hacia el portal.
 */

/**
 * Método con el que Atlas se autentica ante un proveedor externo.
 *
 * - `oauth2_client_credentials`: RFC 6749 §4.4. El broker pide un token al `tokenEndpoint` y lo
 *   cachea hasta poco antes de su expiración.
 * - `jwt_bearer`: RFC 7523. El cliente se autentica firmando una aserción con su clave privada,
 *   sin enviar nunca un secreto compartido por la red.
 * - `mtls`: RFC 8705. La autenticación es el certificado de cliente del canal TLS.
 * - `api_key`: cabecera estática. Es el método más débil; solo se acepta si el proveedor no
 *   ofrece otra cosa, y obliga a rotación explícita.
 * - `none`: el proveedor no requiere autenticación (mocks, endpoints públicos).
 */
export type ProviderAuthMethod =
  'oauth2_client_credentials' | 'jwt_bearer' | 'mtls' | 'api_key' | 'none';

/**
 * Estado de la credencial custodiada para un proveedor. Es lo que el portal pinta: describe la
 * credencial, no el proveedor. Un proveedor sano con credencial vencida está `EXPIRED`.
 */
export type CredentialStatus =
  'ACTIVE' | 'MISSING' | 'EXPIRED' | 'ROTATION_DUE' | 'REVOKED' | 'NOT_REQUIRED';

/** Estado del token de acceso vigente en la caché del broker. */
export type AccessTokenStatus = 'VALID' | 'EXPIRING' | 'EXPIRED' | 'NONE' | 'REFRESH_FAILED';

/** Ámbito de confianza de la federación entrante. Los dos NO se mezclan. */
export type FederationRealm = 'internal_sso' | 'customer_social';

/**
 * Credencial declarada para un proveedor. `secretRef` apunta al vault; el valor vive allí.
 */
export type ProviderCredential = {
  readonly providerCode: string;
  readonly authMethod: ProviderAuthMethod;
  /** Referencia opaca al vault. Nunca es el secreto. */
  readonly secretRef: string;
  /** Endpoint de emisión de token. Obligatorio para `oauth2_client_credentials` y `jwt_bearer`. */
  readonly tokenEndpoint?: string;
  readonly scopes: readonly string[];
  readonly audience?: string;
  /**
   * Cabecera en la que viaja la clave para `api_key`. No hay estándar: cada proveedor elige la
   * suya (`x-api-key`, `apikey`, `authorization: ApiKey …`), así que se declara por credencial en
   * vez de asumir una y fallar con un 401 opaco.
   */
  readonly apiKeyHeader?: string;
  /** Algoritmo de firma para `jwt_bearer`. */
  readonly assertionAlgorithm?: 'RS256' | 'ES256';
  /** Alta de la credencial, en ISO 8601. Base del cálculo de antigüedad para la rotación. */
  readonly issuedAt: string;
  /** Última rotación efectiva, en ISO 8601. */
  readonly rotatedAt?: string;
  /** Expiración declarada por el proveedor, si la publica. */
  readonly expiresAt?: string;
  readonly revokedAt?: string;
};

/**
 * Token emitido por el proveedor. Contiene el secreto en claro: no se persiste, no se registra y
 * no se serializa hacia el portal.
 */
export type IssuedAccessToken = {
  readonly providerCode: string;
  readonly accessToken: string;
  readonly tokenType: string;
  readonly expiresAt: number;
  readonly scopes: readonly string[];
};

/**
 * Proyección segura del estado de autenticación de un proveedor. Este es el contrato que consume
 * AtlasBackend y, a través suyo, AtlasAdminPortal. Todo campo aquí es publicable.
 */
export type ProviderAuthState = {
  readonly providerCode: string;
  readonly authMethod: ProviderAuthMethod;
  readonly credentialStatus: CredentialStatus;
  readonly tokenStatus: AccessTokenStatus;
  /**
   * Huella de la credencial cargada (SHA-256 truncado). Permite confirmar QUÉ credencial está
   * activa —y detectar que dos entornos usan distinta— sin revelar el secreto.
   */
  readonly credentialFingerprint?: string;
  readonly scopes: readonly string[];
  readonly issuedAt?: string;
  readonly rotatedAt?: string;
  readonly rotationDueAt?: string;
  readonly credentialAgeDays?: number;
  readonly tokenExpiresAt?: string;
  readonly lastRefreshAt?: string;
  readonly lastFailureCode?: string;
  readonly lastFailureAt?: string;
};

/** Configuración de un proveedor de identidad para la federación entrante. */
export type IdentityProviderConfig = {
  readonly idpCode: string;
  readonly realm: FederationRealm;
  readonly issuer: string;
  readonly authorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly jwksUri: string;
  readonly clientId: string;
  /** Referencia al vault para el secreto de cliente. Ausente en clientes públicos con PKCE. */
  readonly secretRef?: string;
  readonly scopes: readonly string[];
  readonly redirectUri: string;
};

/**
 * Autorización en curso. Guarda el `codeVerifier` de PKCE (RFC 7636) y el `nonce` de OIDC hasta
 * que vuelve el `code`. Es material de un solo uso: se consume o expira.
 */
export type PendingAuthorization = {
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly idpCode: string;
  readonly realm: FederationRealm;
  readonly redirectUri: string;
  readonly createdAt: number;
  readonly expiresAt: number;
};

/** Identidad devuelta por el IdP tras validar el `id_token`. */
export type FederatedIdentity = {
  readonly issuer: string;
  readonly subject: string;
  readonly realm: FederationRealm;
  readonly idpCode: string;
  readonly email?: string;
  readonly emailVerified: boolean;
  readonly displayName?: string;
  readonly authenticatedAt?: string;
};
