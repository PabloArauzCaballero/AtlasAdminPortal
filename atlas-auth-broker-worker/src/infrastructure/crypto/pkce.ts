/**
 * PKCE (RFC 7636) y parámetros antifalsificación del flujo de código de autorización.
 *
 * PKCE no es opcional aquí aunque el cliente sea confidencial: ata el `code` devuelto por el IdP
 * al proceso concreto que inició la autorización, de modo que un `code` interceptado —en el
 * historial del navegador, en un log de proxy, en un redirect mal configurado— no puede canjearse
 * sin el `code_verifier`, que nunca sale de este worker.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** 32 bytes -> 43 caracteres base64url, dentro del rango de 43..128 que exige el RFC. */
const VERIFIER_BYTES = 32;
const STATE_BYTES = 32;
const NONCE_BYTES = 32;

export type PkcePair = {
  readonly codeVerifier: string;
  readonly codeChallenge: string;
  /** Siempre `S256`: el RFC admite `plain`, que anula la protección y no se ofrece. */
  readonly codeChallengeMethod: 'S256';
};

export function createPkcePair(): PkcePair {
  const codeVerifier = randomBytes(VERIFIER_BYTES).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier, 'ascii').digest('base64url');
  return { codeVerifier, codeChallenge, codeChallengeMethod: 'S256' };
}

/**
 * `state` protege contra CSRF sobre el redirect (RFC 6749 §10.12): sin él, un atacante puede
 * inducir al navegador de la víctima a completar un flujo iniciado por el atacante.
 */
export function createState(): string {
  return randomBytes(STATE_BYTES).toString('base64url');
}

/**
 * `nonce` ata el `id_token` a esta autorización concreta (OIDC Core §3.1.2.1) e impide que un
 * `id_token` legítimo obtenido en otro flujo se reinyecte en este.
 */
export function createNonce(): string {
  return randomBytes(NONCE_BYTES).toString('base64url');
}

/** Comparación en tiempo constante para `state` y `nonce`, sin filtrar longitudes. */
export function opaqueValuesMatch(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left, 'utf8').digest();
  const rightDigest = createHash('sha256').update(right, 'utf8').digest();
  return timingSafeEqual(leftDigest, rightDigest);
}
