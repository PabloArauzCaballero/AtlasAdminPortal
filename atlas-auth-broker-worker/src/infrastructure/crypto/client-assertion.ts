/**
 * Aserción de cliente JWT (RFC 7523) para autenticarse ante el emisor de tokens.
 *
 * Frente a `client_secret_basic`, la aserción firmada no envía nunca el material secreto por la
 * red: viaja una firma con vida de segundos sobre un `jti` irrepetible. Si el canal se
 * compromete, lo capturado no sirve para pedir tokens nuevos. Es el método preferible siempre que
 * el proveedor lo acepte.
 */
import { createSign, randomUUID } from 'node:crypto';

/** Algoritmos de firma admitidos. Ninguno simétrico: la clave privada no debe salir del vault. */
export type ClientAssertionAlgorithm = 'RS256' | 'ES256';

const SIGNER_BY_ALGORITHM: Record<ClientAssertionAlgorithm, string> = {
  RS256: 'RSA-SHA256',
  ES256: 'sha256',
};

export const CLIENT_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export type ClientAssertionInput = {
  readonly clientId: string;
  /** `aud` debe ser el emisor o su endpoint de token, según exija el proveedor (RFC 7523 §3). */
  readonly audience: string;
  readonly privateKeyPem: string;
  readonly algorithm: ClientAssertionAlgorithm;
  /** Vida de la aserción en segundos. Corta a propósito: no es un token de acceso. */
  readonly lifetimeSeconds: number;
  readonly nowMs: number;
};

/**
 * Construye y firma la aserción.
 *
 * `jti` aleatorio e `iat`/`exp` estrechos son lo que impide el replay: el emisor puede rechazar
 * un `jti` ya visto dentro de la ventana de validez.
 */
export function buildClientAssertion(input: ClientAssertionInput): string {
  const issuedAt = Math.floor(input.nowMs / 1_000);
  const header = { alg: input.algorithm, typ: 'JWT' };
  const payload = {
    iss: input.clientId,
    sub: input.clientId,
    aud: input.audience,
    jti: randomUUID(),
    iat: issuedAt,
    exp: issuedAt + input.lifetimeSeconds,
  };

  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signer = createSign(SIGNER_BY_ALGORITHM[input.algorithm]);
  signer.update(signingInput);
  signer.end();

  const signature =
    input.algorithm === 'ES256'
      ? signer.sign({ key: input.privateKeyPem, dsaEncoding: 'ieee-p1363' })
      : signer.sign(input.privateKeyPem);

  return `${signingInput}.${signature.toString('base64url')}`;
}
