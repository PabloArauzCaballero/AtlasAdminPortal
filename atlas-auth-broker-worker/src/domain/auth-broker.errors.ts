/**
 * Errores tipados del broker.
 *
 * Cada error lleva un `code` estable y un `safeMessage` publicable. La distinción importa: el
 * detalle del proveedor (cuerpo de la respuesta del `tokenEndpoint`, por ejemplo) puede contener
 * el secreto enviado o parte de él, así que nunca se propaga — solo el código.
 */

export type AuthBrokerErrorCode =
  /** No hay credencial declarada para el proveedor. */
  | 'CREDENTIAL_NOT_FOUND'
  /** La credencial existe pero fue revocada explícitamente. */
  | 'CREDENTIAL_REVOKED'
  /** La credencial pasó su fecha de expiración declarada. */
  | 'CREDENTIAL_EXPIRED'
  /** El método declarado exige un `tokenEndpoint` y no está configurado. */
  | 'TOKEN_ENDPOINT_NOT_CONFIGURED'
  /** El método de autenticación declarado no tiene implementación en este broker. */
  | 'UNSUPPORTED_AUTH_METHOD'
  /** El proveedor rechazó las credenciales (4xx en el `tokenEndpoint`). */
  | 'PROVIDER_AUTH_FAILED'
  /** El proveedor no respondió o devolvió 5xx: es indisponibilidad, no credencial inválida. */
  | 'PROVIDER_AUTH_UNAVAILABLE'
  /** El vault no está disponible o no pudo descifrar el material. */
  | 'VAULT_UNAVAILABLE'
  | 'VAULT_DECRYPTION_FAILED'
  /** El llamante no presentó un token de servicio válido. */
  | 'UNAUTHORIZED_CALLER'
  /** Federación entrante. */
  | 'IDENTITY_PROVIDER_NOT_FOUND'
  | 'AUTHORIZATION_STATE_INVALID'
  | 'AUTHORIZATION_STATE_EXPIRED'
  | 'AUTHORIZATION_REALM_MISMATCH'
  | 'ID_TOKEN_INVALID'
  /** Entrada que no cumple el contrato declarado. */
  | 'INVALID_REQUEST';

const HTTP_STATUS_BY_CODE: Record<AuthBrokerErrorCode, number> = {
  CREDENTIAL_NOT_FOUND: 404,
  CREDENTIAL_REVOKED: 409,
  CREDENTIAL_EXPIRED: 409,
  TOKEN_ENDPOINT_NOT_CONFIGURED: 409,
  UNSUPPORTED_AUTH_METHOD: 501,
  PROVIDER_AUTH_FAILED: 502,
  PROVIDER_AUTH_UNAVAILABLE: 503,
  VAULT_UNAVAILABLE: 503,
  VAULT_DECRYPTION_FAILED: 500,
  UNAUTHORIZED_CALLER: 401,
  IDENTITY_PROVIDER_NOT_FOUND: 404,
  AUTHORIZATION_STATE_INVALID: 400,
  AUTHORIZATION_STATE_EXPIRED: 410,
  AUTHORIZATION_REALM_MISMATCH: 403,
  ID_TOKEN_INVALID: 401,
  INVALID_REQUEST: 400,
};

export class AuthBrokerError extends Error {
  readonly code: AuthBrokerErrorCode;
  readonly httpStatus: number;
  /** Contexto no sensible para el log (código de proveedor, estado HTTP recibido, etc.). */
  readonly context: Readonly<Record<string, string | number>>;

  constructor(
    code: AuthBrokerErrorCode,
    safeMessage: string,
    context: Readonly<Record<string, string | number>> = {},
  ) {
    super(safeMessage);
    this.name = 'AuthBrokerError';
    this.code = code;
    this.httpStatus = HTTP_STATUS_BY_CODE[code];
    this.context = context;
  }
}

export function isAuthBrokerError(error: unknown): error is AuthBrokerError {
  return error instanceof AuthBrokerError;
}

/**
 * Traduce el estado HTTP del `tokenEndpoint` a un error tipado.
 *
 * La separación entre `PROVIDER_AUTH_FAILED` (4xx: la credencial no sirve) y
 * `PROVIDER_AUTH_UNAVAILABLE` (5xx: el proveedor está caído) es la que permite al portal decir
 * "hay que rotar la credencial" en vez de "el proveedor está caído", que son acciones distintas.
 */
export function tokenEndpointError(providerCode: string, httpStatus: number): AuthBrokerError {
  if (httpStatus >= 500) {
    return new AuthBrokerError(
      'PROVIDER_AUTH_UNAVAILABLE',
      `El emisor de tokens de ${providerCode} respondió ${httpStatus}.`,
      { providerCode, httpStatus },
    );
  }
  return new AuthBrokerError(
    'PROVIDER_AUTH_FAILED',
    `${providerCode} rechazó las credenciales (${httpStatus}).`,
    { providerCode, httpStatus },
  );
}
