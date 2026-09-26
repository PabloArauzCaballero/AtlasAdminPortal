/**
 * Cliente del endpoint de emisión de tokens (RFC 6749 §4.4, RFC 7523).
 *
 * Deliberadamente NO devuelve ni registra el cuerpo de la respuesta del proveedor: en un fallo de
 * autenticación, ese cuerpo suele repetir el `client_id` y a veces fragmentos del secreto
 * enviado. Solo sale de aquí el estado HTTP, que es lo que necesita el diagnóstico.
 */
import { z } from 'zod';
import type { HttpFetch } from '../../application/ports';
import { AuthBrokerError, tokenEndpointError } from '../../domain/auth-broker.errors';

/** Credencial ya resuelta desde el vault, lista para presentarse al emisor. */
export type ResolvedClientCredential =
  | { readonly kind: 'client_secret'; readonly clientId: string; readonly clientSecret: string }
  | { readonly kind: 'client_assertion'; readonly clientId: string; readonly assertion: string };

export type TokenEndpointRequest = {
  readonly providerCode: string;
  readonly tokenEndpoint: string;
  readonly scopes: readonly string[];
  readonly audience?: string;
  readonly credential: ResolvedClientCredential;
};

export type TokenEndpointResponse = {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly expiresInSeconds: number;
  readonly scopes: readonly string[];
};

/**
 * Respuesta mínima exigida. `expires_in` es opcional en el RFC; cuando falta se aplica una vida
 * conservadora en vez de asumir que el token dura para siempre, que es como se acaba usando un
 * token vencido en una verificación de identidad real.
 */
const DEFAULT_EXPIRES_IN_SECONDS = 300;

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1).default('Bearer'),
  expires_in: z.coerce.number().int().positive().optional(),
  scope: z.string().optional(),
});

export type TokenEndpointClientOptions = {
  readonly fetchImpl: HttpFetch;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  /** Espera entre reintentos; inyectable para que las pruebas no duerman. */
  readonly sleep?: (ms: number) => Promise<void>;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function encodeForm(request: TokenEndpointRequest): URLSearchParams {
  const form = new URLSearchParams({ grant_type: 'client_credentials' });
  if (request.scopes.length > 0) form.set('scope', request.scopes.join(' '));
  if (request.audience !== undefined) form.set('audience', request.audience);
  if (request.credential.kind === 'client_assertion') {
    form.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
    form.set('client_assertion', request.credential.assertion);
    form.set('client_id', request.credential.clientId);
  }
  return form;
}

function buildHeaders(request: TokenEndpointRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/x-www-form-urlencoded',
    accept: 'application/json',
  };
  if (request.credential.kind === 'client_secret') {
    // `client_secret_basic`: RFC 6749 §2.3.1 lo prefiere sobre el secreto en el cuerpo, porque el
    // cuerpo acaba con más frecuencia en logs de proxy y trazas de aplicación.
    const basic = Buffer.from(
      `${encodeURIComponent(request.credential.clientId)}:${encodeURIComponent(request.credential.clientSecret)}`,
      'utf8',
    ).toString('base64');
    headers.authorization = `Basic ${basic}`;
  }
  return headers;
}

export class TokenEndpointClient {
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly options: TokenEndpointClientOptions) {
    this.sleep = options.sleep ?? defaultSleep;
  }

  /**
   * Pide un token al proveedor.
   *
   * Los reintentos cubren solo indisponibilidad (red caída o 5xx). Un 4xx NO se reintenta: la
   * credencial es incorrecta y repetirla solo acerca el bloqueo de la cuenta en el proveedor.
   */
  async requestToken(request: TokenEndpointRequest): Promise<TokenEndpointResponse> {
    let lastError: AuthBrokerError | undefined;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt += 1) {
      try {
        return await this.attempt(request);
      } catch (error) {
        if (!(error instanceof AuthBrokerError)) throw error;
        if (error.code !== 'PROVIDER_AUTH_UNAVAILABLE') throw error;
        lastError = error;
        if (attempt < this.options.maxRetries) {
          await this.sleep(100 * 2 ** attempt);
        }
      }
    }

    throw (
      lastError ??
      new AuthBrokerError(
        'PROVIDER_AUTH_UNAVAILABLE',
        `No se pudo obtener token de ${request.providerCode}.`,
        { providerCode: request.providerCode },
      )
    );
  }

  private async attempt(request: TokenEndpointRequest): Promise<TokenEndpointResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);

    let response: Response;
    try {
      response = await this.options.fetchImpl(request.tokenEndpoint, {
        method: 'POST',
        headers: buildHeaders(request),
        body: encodeForm(request).toString(),
        signal: controller.signal,
      });
    } catch {
      // El detalle del error de red puede incluir la URL con parámetros; se descarta a propósito.
      throw new AuthBrokerError(
        'PROVIDER_AUTH_UNAVAILABLE',
        `No hubo respuesta del emisor de tokens de ${request.providerCode}.`,
        { providerCode: request.providerCode },
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) throw tokenEndpointError(request.providerCode, response.status);

    const parsed = tokenResponseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) {
      throw new AuthBrokerError(
        'PROVIDER_AUTH_FAILED',
        `El emisor de tokens de ${request.providerCode} devolvió una respuesta que no cumple RFC 6749.`,
        { providerCode: request.providerCode },
      );
    }

    return {
      accessToken: parsed.data.access_token,
      tokenType: parsed.data.token_type,
      expiresInSeconds: parsed.data.expires_in ?? DEFAULT_EXPIRES_IN_SECONDS,
      scopes: parsed.data.scope ? parsed.data.scope.split(' ').filter(Boolean) : request.scopes,
    };
  }
}
