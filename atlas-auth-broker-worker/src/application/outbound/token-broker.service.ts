/**
 * Broker de autenticación saliente: convierte "quiero llamar a SEGIP" en las cabeceras con las
 * que esa llamada se autentica, y se encarga de que el token detrás nunca esté vencido.
 *
 * Concentrar esto aquí es lo que permite que ningún adaptador de proveedor de AtlasBackend vuelva
 * a leer un `*_CLIENT_SECRET`: los adaptadores piden autorización, no credenciales.
 */
import {
  AuthBrokerError,
  type AuthBrokerErrorCode,
  isAuthBrokerError,
} from '../../domain/auth-broker.errors';
import type {
  IssuedAccessToken,
  ProviderAuthMethod,
  ProviderCredential,
} from '../../domain/auth-broker.types';
import { buildClientAssertion } from '../../infrastructure/crypto/client-assertion';
import type {
  ResolvedClientCredential,
  TokenEndpointClient,
} from '../../infrastructure/http/token-endpoint.client';
import { SECRET_FIELDS } from '../../infrastructure/vault/secret-ref';
import type { AuthBrokerLogger, Clock, CredentialRegistry, SecretVault } from '../ports';

/** Vida de la aserción de cliente. Un minuto basta para una llamada y acota el replay. */
const ASSERTION_LIFETIME_SECONDS = 60;

const DEFAULT_API_KEY_HEADER = 'x-api-key';

/** Cabeceras con las que el llamante autentica su petición al proveedor. */
export type ProviderAuthorization = {
  readonly providerCode: string;
  readonly authMethod: ProviderAuthMethod;
  readonly headers: Readonly<Record<string, string>>;
  /** Momento (epoch ms) en el que la autorización deja de valer. Ausente si no caduca. */
  readonly expiresAt?: number;
};

/** Diagnóstico publicable del último intento. Alimenta la vista de salud del portal. */
export type TokenDiagnostics = {
  readonly lastRefreshAt?: number;
  readonly lastFailureCode?: AuthBrokerErrorCode;
  readonly lastFailureAt?: number;
  readonly tokenExpiresAt?: number;
  readonly hasToken: boolean;
};

export type TokenBrokerDependencies = {
  readonly credentials: CredentialRegistry;
  readonly vault: SecretVault;
  readonly tokenClient: TokenEndpointClient;
  readonly clock: Clock;
  readonly logger: AuthBrokerLogger;
  readonly refreshSkewSeconds: number;
};

export class TokenBrokerService {
  private readonly cache = new Map<string, IssuedAccessToken>();
  /**
   * Peticiones de token en vuelo, por proveedor.
   *
   * Sin esto, una ráfaga de N verificaciones simultáneas tras expirar el token dispara N
   * peticiones idénticas al emisor: gasto de cuota, riesgo de rate limit y, en proveedores que
   * invalidan el token anterior al emitir uno nuevo, una carrera en la que unas llamadas viajan
   * con un token ya revocado.
   */
  private readonly inFlight = new Map<string, Promise<IssuedAccessToken>>();
  private readonly diagnostics = new Map<string, TokenDiagnostics>();

  constructor(private readonly dependencies: TokenBrokerDependencies) {}

  /** Resuelve las cabeceras de autenticación para llamar a un proveedor. */
  async authorize(providerCode: string): Promise<ProviderAuthorization> {
    const credential = await this.requireUsableCredential(providerCode);

    switch (credential.authMethod) {
      case 'none':
        return { providerCode, authMethod: 'none', headers: {} };

      case 'mtls':
        // La autenticación la aporta el certificado de cliente del canal TLS; a nivel HTTP no hay
        // nada que añadir. El broker sigue mediando para validar vigencia y rotación del material.
        return { providerCode, authMethod: 'mtls', headers: {} };

      case 'api_key': {
        const apiKey = await this.readSecret(credential, SECRET_FIELDS.apiKey);
        return {
          providerCode,
          authMethod: 'api_key',
          headers: { [credential.apiKeyHeader ?? DEFAULT_API_KEY_HEADER]: apiKey },
        };
      }

      case 'oauth2_client_credentials':
      case 'jwt_bearer': {
        const token = await this.token(credential);
        return {
          providerCode,
          authMethod: credential.authMethod,
          headers: { authorization: `${token.tokenType} ${token.accessToken}` },
          expiresAt: token.expiresAt,
        };
      }

      default:
        throw new AuthBrokerError(
          'UNSUPPORTED_AUTH_METHOD',
          `Método de autenticación no implementado para ${providerCode}.`,
          { providerCode },
        );
    }
  }

  /**
   * Descarta el token cacheado de un proveedor.
   *
   * Lo llaman la rotación de credenciales y el kill switch: tras cambiar el secreto, seguir
   * usando el token emitido con el anterior es exactamente lo que la rotación quiere impedir.
   */
  invalidate(providerCode: string): void {
    this.cache.delete(providerCode);
    this.inFlight.delete(providerCode);
  }

  /** Diagnóstico publicable del proveedor. No expone material sensible. */
  diagnosticsFor(providerCode: string): TokenDiagnostics {
    return this.diagnostics.get(providerCode) ?? { hasToken: false };
  }

  private async requireUsableCredential(providerCode: string): Promise<ProviderCredential> {
    const credential = await this.dependencies.credentials.find(providerCode);
    if (!credential) {
      throw new AuthBrokerError(
        'CREDENTIAL_NOT_FOUND',
        `No hay credencial declarada para ${providerCode}.`,
        { providerCode },
      );
    }
    if (credential.revokedAt !== undefined) {
      throw new AuthBrokerError(
        'CREDENTIAL_REVOKED',
        `La credencial de ${providerCode} está revocada.`,
        { providerCode },
      );
    }
    if (
      credential.expiresAt !== undefined &&
      Date.parse(credential.expiresAt) <= this.dependencies.clock.now()
    ) {
      throw new AuthBrokerError(
        'CREDENTIAL_EXPIRED',
        `La credencial de ${providerCode} venció y debe rotarse.`,
        { providerCode },
      );
    }
    return credential;
  }

  private async readSecret(credential: ProviderCredential, field: string): Promise<string> {
    const value = await this.dependencies.vault.read(credential.secretRef, field);
    if (value === undefined) {
      throw new AuthBrokerError(
        'CREDENTIAL_NOT_FOUND',
        `Falta el campo ${field} de la credencial de ${credential.providerCode} en el vault.`,
        { providerCode: credential.providerCode, field },
      );
    }
    return value;
  }

  private isFresh(token: IssuedAccessToken): boolean {
    const skewMs = this.dependencies.refreshSkewSeconds * 1_000;
    return token.expiresAt - skewMs > this.dependencies.clock.now();
  }

  private async token(credential: ProviderCredential): Promise<IssuedAccessToken> {
    const providerCode = credential.providerCode;

    const cached = this.cache.get(providerCode);
    if (cached && this.isFresh(cached)) return cached;

    const inFlight = this.inFlight.get(providerCode);
    if (inFlight) return inFlight;

    const request = this.fetchToken(credential)
      .then((token) => {
        this.cache.set(providerCode, token);
        this.diagnostics.set(providerCode, {
          hasToken: true,
          lastRefreshAt: this.dependencies.clock.now(),
          tokenExpiresAt: token.expiresAt,
        });
        this.dependencies.logger.info('provider_token_refreshed', {
          providerCode,
          expiresAt: new Date(token.expiresAt).toISOString(),
        });
        return token;
      })
      .catch((error: unknown) => {
        const code: AuthBrokerErrorCode = isAuthBrokerError(error)
          ? error.code
          : 'PROVIDER_AUTH_UNAVAILABLE';
        const previous = this.diagnostics.get(providerCode);
        this.diagnostics.set(providerCode, {
          ...previous,
          hasToken: false,
          lastFailureCode: code,
          lastFailureAt: this.dependencies.clock.now(),
        });
        this.dependencies.logger.error('provider_token_refresh_failed', { providerCode, code });
        throw error;
      })
      .finally(() => {
        this.inFlight.delete(providerCode);
      });

    this.inFlight.set(providerCode, request);
    return request;
  }

  private async fetchToken(credential: ProviderCredential): Promise<IssuedAccessToken> {
    if (credential.tokenEndpoint === undefined) {
      throw new AuthBrokerError(
        'TOKEN_ENDPOINT_NOT_CONFIGURED',
        `${credential.providerCode} usa ${credential.authMethod} pero no declara tokenEndpoint.`,
        { providerCode: credential.providerCode },
      );
    }

    const resolved = await this.resolveClientCredential(credential, credential.tokenEndpoint);
    const response = await this.dependencies.tokenClient.requestToken({
      providerCode: credential.providerCode,
      tokenEndpoint: credential.tokenEndpoint,
      scopes: credential.scopes,
      ...(credential.audience !== undefined ? { audience: credential.audience } : {}),
      credential: resolved,
    });

    return {
      providerCode: credential.providerCode,
      accessToken: response.accessToken,
      tokenType: response.tokenType,
      expiresAt: this.dependencies.clock.now() + response.expiresInSeconds * 1_000,
      scopes: response.scopes,
    };
  }

  private async resolveClientCredential(
    credential: ProviderCredential,
    tokenEndpoint: string,
  ): Promise<ResolvedClientCredential> {
    const clientId = await this.readSecret(credential, SECRET_FIELDS.clientId);

    if (credential.authMethod === 'jwt_bearer') {
      const privateKeyPem = await this.readSecret(credential, SECRET_FIELDS.privateKey);
      return {
        kind: 'client_assertion',
        clientId,
        assertion: buildClientAssertion({
          clientId,
          audience: credential.audience ?? tokenEndpoint,
          privateKeyPem,
          algorithm: credential.assertionAlgorithm ?? 'RS256',
          lifetimeSeconds: ASSERTION_LIFETIME_SECONDS,
          nowMs: this.dependencies.clock.now(),
        }),
      };
    }

    return {
      kind: 'client_secret',
      clientId,
      clientSecret: await this.readSecret(credential, SECRET_FIELDS.clientSecret),
    };
  }
}
