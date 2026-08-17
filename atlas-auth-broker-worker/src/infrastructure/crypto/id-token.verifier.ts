/**
 * Verificación del `id_token` de OIDC.
 *
 * Es el punto donde se decide si una identidad entrante es real. Los tres fallos clásicos que
 * este archivo cierra explícitamente:
 *
 * 1. Confusión de algoritmo: aceptar `alg: none` —o un HMAC verificado con la clave pública del
 *    IdP como secreto— permite falsificar cualquier identidad. Solo se admiten algoritmos
 *    asimétricos de una lista cerrada, y el `alg` del token debe coincidir con el de la clave.
 * 2. `aud`/`iss` sin comprobar: un token legítimo emitido para OTRA aplicación del mismo IdP
 *    valida criptográficamente pero no autoriza a nadie aquí.
 * 3. `nonce` sin comprobar: permite reinyectar un `id_token` capturado en otro flujo.
 */
import { createPublicKey, createVerify, type KeyObject } from 'node:crypto';
import { z } from 'zod';
import { AuthBrokerError } from '../../domain/auth-broker.errors';
import type { Clock, HttpFetch } from '../../application/ports';

/** Tolerancia de reloj entre el IdP y este proceso. */
const CLOCK_SKEW_SECONDS = 60;

/** Algoritmos admitidos. Todos asimétricos y ninguno configurable por el token. */
const VERIFIER_BY_ALGORITHM: Record<
  string,
  { readonly nodeAlgorithm: string; readonly pss: boolean; readonly p1363: boolean }
> = {
  RS256: { nodeAlgorithm: 'RSA-SHA256', pss: false, p1363: false },
  RS384: { nodeAlgorithm: 'RSA-SHA384', pss: false, p1363: false },
  RS512: { nodeAlgorithm: 'RSA-SHA512', pss: false, p1363: false },
  PS256: { nodeAlgorithm: 'RSA-SHA256', pss: true, p1363: false },
  ES256: { nodeAlgorithm: 'sha256', pss: false, p1363: true },
  ES384: { nodeAlgorithm: 'sha384', pss: false, p1363: true },
};

const headerSchema = z.object({ alg: z.string().min(1), kid: z.string().min(1).optional() });

const claimsSchema = z.object({
  iss: z.string().min(1),
  sub: z.string().min(1),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number(),
  iat: z.number(),
  nonce: z.string().optional(),
  azp: z.string().optional(),
  email: z.string().optional(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  auth_time: z.number().optional(),
});

export type IdTokenClaims = z.infer<typeof claimsSchema>;

const jwksSchema = z.object({
  keys: z.array(z.record(z.string(), z.unknown())),
});

export type IdTokenExpectations = {
  readonly issuer: string;
  readonly audience: string;
  readonly nonce: string;
  readonly jwksUri: string;
};

function decodeSegment(segment: string, what: string): unknown {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
  } catch {
    throw new AuthBrokerError('ID_TOKEN_INVALID', `El ${what} del id_token no es JSON válido.`);
  }
}

function invalid(reason: string): AuthBrokerError {
  return new AuthBrokerError('ID_TOKEN_INVALID', `id_token rechazado: ${reason}.`);
}

export type IdTokenVerifierOptions = {
  readonly fetchImpl: HttpFetch;
  readonly clock: Clock;
  /** Vida de la caché de JWKS. Rotar claves es normal; recargar en cada login, no. */
  readonly jwksCacheTtlMs?: number;
  readonly requestTimeoutMs?: number;
};

type CachedJwks = { readonly keys: readonly Record<string, unknown>[]; readonly fetchedAt: number };

export class IdTokenVerifier {
  private readonly cache = new Map<string, CachedJwks>();
  private readonly cacheTtlMs: number;
  private readonly timeoutMs: number;

  constructor(private readonly options: IdTokenVerifierOptions) {
    this.cacheTtlMs = options.jwksCacheTtlMs ?? 600_000;
    this.timeoutMs = options.requestTimeoutMs ?? 5_000;
  }

  async verify(idToken: string, expectations: IdTokenExpectations): Promise<IdTokenClaims> {
    const segments = idToken.split('.');
    if (segments.length !== 3) throw invalid('no tiene tres segmentos');
    const [encodedHeader, encodedPayload, encodedSignature] = segments as [string, string, string];

    const header = headerSchema.safeParse(decodeSegment(encodedHeader, 'encabezado'));
    if (!header.success) throw invalid('el encabezado no declara `alg`');

    const algorithm = VERIFIER_BY_ALGORITHM[header.data.alg];
    if (algorithm === undefined) throw invalid(`algoritmo no admitido (${header.data.alg})`);

    const key = await this.resolveKey(expectations.jwksUri, header.data.kid);
    this.assertKeyMatchesAlgorithm(key, header.data.alg);

    const verifier = createVerify(algorithm.nodeAlgorithm);
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();

    const signature = Buffer.from(encodedSignature, 'base64url');
    const signatureValid = verifier.verify(
      {
        key,
        ...(algorithm.pss ? { padding: 1 << 6, saltLength: -1 } : {}),
        ...(algorithm.p1363 ? { dsaEncoding: 'ieee-p1363' as const } : {}),
      },
      signature,
    );
    if (!signatureValid) throw invalid('la firma no valida contra la clave publicada por el IdP');

    const claims = claimsSchema.safeParse(decodeSegment(encodedPayload, 'cuerpo'));
    if (!claims.success) throw invalid('faltan reclamaciones obligatorias');

    this.assertClaims(claims.data, expectations);
    return claims.data;
  }

  /**
   * `alg` viene del token, que es material no confiable; la familia de la clave viene del IdP.
   * Comprobar que concuerdan es lo que impide presentar un token firmado con HMAC para que se
   * verifique contra una clave RSA, y viceversa.
   */
  private assertKeyMatchesAlgorithm(key: KeyObject, alg: string): void {
    const expectedType = alg.startsWith('ES') ? 'ec' : 'rsa';
    if (
      key.asymmetricKeyType !== expectedType &&
      !(expectedType === 'rsa' && key.asymmetricKeyType === 'rsa-pss')
    ) {
      throw invalid('el algoritmo declarado no corresponde al tipo de clave del IdP');
    }
  }

  private assertClaims(claims: IdTokenClaims, expectations: IdTokenExpectations): void {
    const nowSeconds = Math.floor(this.options.clock.now() / 1_000);

    if (claims.iss !== expectations.issuer) throw invalid('el emisor no es el esperado');

    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audiences.includes(expectations.audience)) {
      throw invalid('la audiencia no incluye a este cliente');
    }
    // Con múltiples audiencias, OIDC Core §3.1.3.7 exige `azp` y que apunte a este cliente.
    if (audiences.length > 1 && claims.azp !== expectations.audience) {
      throw invalid('token multi-audiencia sin `azp` para este cliente');
    }

    if (claims.exp + CLOCK_SKEW_SECONDS <= nowSeconds) throw invalid('está expirado');
    if (claims.iat - CLOCK_SKEW_SECONDS > nowSeconds) throw invalid('fue emitido en el futuro');

    if (claims.nonce === undefined) throw invalid('no trae `nonce`');
    if (claims.nonce !== expectations.nonce)
      throw invalid('el `nonce` no corresponde a esta autorización');
  }

  private async resolveKey(jwksUri: string, kid: string | undefined): Promise<KeyObject> {
    let keys = await this.jwks(jwksUri, false);
    let jwk = this.selectKey(keys, kid);

    // Un `kid` desconocido suele significar que el IdP rotó claves desde el último refresco. Se
    // recarga una vez —y solo una— antes de rechazar, para no convertir cada rotación del IdP en
    // una caída de login ni cada token inválido en una tormenta de peticiones al JWKS.
    if (jwk === undefined) {
      keys = await this.jwks(jwksUri, true);
      jwk = this.selectKey(keys, kid);
    }
    if (jwk === undefined) throw invalid('el IdP no publica la clave con la que se firmó');

    try {
      return createPublicKey({ key: jwk as never, format: 'jwk' });
    } catch {
      throw invalid('la clave publicada por el IdP no es utilizable');
    }
  }

  private selectKey(
    keys: readonly Record<string, unknown>[],
    kid: string | undefined,
  ): Record<string, unknown> | undefined {
    if (kid !== undefined) return keys.find((key) => key.kid === kid);
    return keys.length === 1 ? keys[0] : undefined;
  }

  private async jwks(
    jwksUri: string,
    forceRefresh: boolean,
  ): Promise<readonly Record<string, unknown>[]> {
    const cached = this.cache.get(jwksUri);
    if (!forceRefresh && cached && this.options.clock.now() - cached.fetchedAt < this.cacheTtlMs) {
      return cached.keys;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.options.fetchImpl(jwksUri, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`jwks ${response.status}`);
      const parsed = jwksSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error('jwks inválido');

      this.cache.set(jwksUri, { keys: parsed.data.keys, fetchedAt: this.options.clock.now() });
      return parsed.data.keys;
    } catch {
      // Si el JWKS no se pudo recargar pero hay copia previa, se usa: preferimos verificar con
      // claves algo viejas a rechazar todos los logins porque el IdP tuvo un hipo de red.
      if (cached) return cached.keys;
      throw new AuthBrokerError(
        'PROVIDER_AUTH_UNAVAILABLE',
        'No se pudo obtener el juego de claves públicas del IdP.',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
