/**
 * Canje del código de autorización por tokens (RFC 6749 §4.1.3 + PKCE RFC 7636 §4.5).
 *
 * Igual que en el cliente de `client_credentials`, el cuerpo de la respuesta de error no se
 * propaga: puede repetir el `code` y el `client_id`.
 */
import { z } from 'zod';
import type { HttpFetch } from '../../application/ports';
import { AuthBrokerError, tokenEndpointError } from '../../domain/auth-broker.errors';

const codeExchangeSchema = z.object({
  id_token: z.string().min(1),
  access_token: z.string().optional(),
  token_type: z.string().optional(),
  expires_in: z.coerce.number().int().optional(),
});

export type CodeExchangeRequest = {
  readonly idpCode: string;
  readonly tokenEndpoint: string;
  readonly clientId: string;
  /** Ausente en clientes públicos: la prueba de posesión la aporta PKCE. */
  readonly clientSecret?: string;
  readonly code: string;
  readonly codeVerifier: string;
  readonly redirectUri: string;
};

export type CodeExchangeResult = {
  readonly idToken: string;
};

export class AuthorizationCodeClient {
  constructor(
    private readonly fetchImpl: HttpFetch,
    private readonly timeoutMs: number,
  ) {}

  async exchange(request: CodeExchangeRequest): Promise<CodeExchangeResult> {
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code: request.code,
      redirect_uri: request.redirectUri,
      code_verifier: request.codeVerifier,
      client_id: request.clientId,
    });

    const headers: Record<string, string> = {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    };
    if (request.clientSecret !== undefined) {
      const basic = Buffer.from(
        `${encodeURIComponent(request.clientId)}:${encodeURIComponent(request.clientSecret)}`,
        'utf8',
      ).toString('base64');
      headers.authorization = `Basic ${basic}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(request.tokenEndpoint, {
        method: 'POST',
        headers,
        body: form.toString(),
        signal: controller.signal,
      });
    } catch {
      throw new AuthBrokerError(
        'PROVIDER_AUTH_UNAVAILABLE',
        `El proveedor de identidad ${request.idpCode} no respondió al canje del código.`,
        { idpCode: request.idpCode },
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) throw tokenEndpointError(request.idpCode, response.status);

    const parsed = codeExchangeSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) {
      throw new AuthBrokerError(
        'ID_TOKEN_INVALID',
        `El proveedor de identidad ${request.idpCode} no devolvió un id_token.`,
        { idpCode: request.idpCode },
      );
    }

    return { idToken: parsed.data.id_token };
  }
}
