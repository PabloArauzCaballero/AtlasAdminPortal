/**
 * API HTTP del broker.
 *
 * Superficie deliberadamente pequeña y toda autenticada salvo la sonda de vida. La ruta más
 * sensible es `/outbound/providers/:code/authorize`, que devuelve cabeceras con un token real:
 * es la única que entrega material utilizable y por eso el token de servicio se compara en tiempo
 * constante y el broker se niega a arrancar si no está configurado.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { z } from 'zod';
import type { AuthBrokerConfig } from '../../config/auth-broker.config';
import { AuthBrokerError, isAuthBrokerError } from '../../domain/auth-broker.errors';
import {
  beginAuthorizationSchema,
  completeAuthorizationSchema,
  federationRealmSchema,
  providerCodeSchema,
  revokeCredentialSchema,
  rotateCredentialSchema,
} from '../../domain/auth-broker.schemas';
import type { CredentialHealthService } from '../../application/outbound/credential-health.service';
import type { CredentialRotationService } from '../../application/outbound/credential-rotation.service';
import type { TokenBrokerService } from '../../application/outbound/token-broker.service';
import type { FederatedLoginService } from '../../application/inbound/federated-login.service';
import type {
  AuthBrokerLogger,
  IdentityProviderRegistry,
  SecretVault,
} from '../../application/ports';
import { secretsMatch } from '../crypto/envelope-encryption';

/** Un cuerpo mayor que esto no es una petición legítima a este API. */
const MAX_BODY_BYTES = 64 * 1024;

export type AuthBrokerServices = {
  readonly config: AuthBrokerConfig;
  readonly tokenBroker: TokenBrokerService;
  readonly health: CredentialHealthService;
  readonly rotation: CredentialRotationService;
  readonly federatedLogin: FederatedLoginService;
  readonly identityProviders: IdentityProviderRegistry;
  readonly vault: SecretVault;
  readonly logger: AuthBrokerLogger;
};

type RouteHandler = (
  context: RouteContext,
) => Promise<{ status: number; body: unknown }> | { status: number; body: unknown };

type RouteContext = {
  readonly url: URL;
  readonly params: Readonly<Record<string, string>>;
  readonly body: unknown;
};

type Route = {
  readonly method: string;
  readonly pattern: RegExp;
  readonly paramNames: readonly string[];
  /** La sonda de vida no exige token: debe responder aunque la configuración esté rota. */
  readonly requiresAuth: boolean;
  readonly handler: RouteHandler;
};

function route(method: string, path: string, handler: RouteHandler, requiresAuth = true): Route {
  const paramNames: string[] = [];
  const pattern = new RegExp(
    `^${path.replace(/:([a-zA-Z]+)/gu, (_match, name: string) => {
      paramNames.push(name);
      return '([^/]+)';
    })}$`,
    'u',
  );
  return { method, pattern, paramNames, requiresAuth, handler };
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > MAX_BODY_BYTES)
      throw new AuthBrokerError('INVALID_REQUEST', 'Cuerpo demasiado grande.');
    chunks.push(buffer);
  }
  if (chunks.length === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new AuthBrokerError('INVALID_REQUEST', 'El cuerpo no es JSON válido.');
  }
}

/**
 * Traduce un fallo de validación sin devolver el valor recibido.
 *
 * Un eco del input en el error sería una fuga directa: la petición de rotación lleva el material
 * de la credencial en el cuerpo.
 */
function validationFailure(error: z.ZodError): { status: number; body: unknown } {
  return {
    status: 400,
    body: {
      code: 'INVALID_REQUEST',
      message: 'La petición no cumple el contrato del broker.',
      issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    },
  };
}

/** Rutas del broker. Se construyen aparte para poder comprobarlas sin levantar el servidor. */
export function authBrokerRoutes(services: AuthBrokerServices): readonly Route[] {
  return [
    route('GET', '/health/live', () => ({ status: 200, body: { status: 'alive' } }), false),

    route('GET', '/health/ready', async () => {
      const vaultAvailable = await services.vault.isAvailable();
      return {
        status: vaultAvailable ? 200 : 503,
        body: { status: vaultAvailable ? 'ready' : 'degraded', vaultDriver: services.vault.driver },
      };
    }),

    // --- Autenticación saliente -------------------------------------------
    route('POST', '/outbound/providers/:providerCode/authorize', async ({ params }) => {
      const providerCode = providerCodeSchema.parse(params.providerCode);
      const authorization = await services.tokenBroker.authorize(providerCode);
      return { status: 200, body: authorization };
    }),

    route('GET', '/outbound/providers/auth-state', async () => ({
      status: 200,
      body: { providers: await services.health.states() },
    })),

    route('GET', '/outbound/providers/:providerCode/auth-state', async ({ params }) => ({
      status: 200,
      body: await services.health.stateFor(providerCodeSchema.parse(params.providerCode)),
    })),

    route('GET', '/outbound/credentials/pending-rotation', async () => ({
      status: 200,
      body: { credentials: await services.rotation.pendingRotation() },
    })),

    route('POST', '/outbound/providers/:providerCode/rotate', async ({ params, body }) => {
      const providerCode = providerCodeSchema.parse(params.providerCode);
      const input = rotateCredentialSchema.parse(body);
      return {
        status: 200,
        body: await services.rotation.rotate(providerCode, input.field, input.material),
      };
    }),

    route('POST', '/outbound/providers/:providerCode/revoke', async ({ params, body }) => {
      const providerCode = providerCodeSchema.parse(params.providerCode);
      const input = revokeCredentialSchema.parse(body);
      return { status: 200, body: await services.rotation.revoke(providerCode, input.reason) };
    }),

    route('POST', '/outbound/providers/:providerCode/invalidate-token', ({ params }) => {
      const providerCode = providerCodeSchema.parse(params.providerCode);
      services.tokenBroker.invalidate(providerCode);
      return { status: 200, body: { providerCode, invalidated: true } };
    }),

    // --- Federación entrante ----------------------------------------------
    route('GET', '/inbound/identity-providers', async ({ url }) => {
      const realmParameter = url.searchParams.get('realm');
      const realm =
        realmParameter === null ? undefined : federationRealmSchema.parse(realmParameter);
      const providers = await services.identityProviders.list(realm);
      // Se enumeran los campos publicables en vez de omitir `secretRef` del resto: así, si mañana
      // el catálogo gana un campo sensible, no se filtra por olvido.
      return {
        status: 200,
        body: {
          identityProviders: providers.map((idp) => ({
            idpCode: idp.idpCode,
            realm: idp.realm,
            issuer: idp.issuer,
            authorizationEndpoint: idp.authorizationEndpoint,
            clientId: idp.clientId,
            scopes: idp.scopes,
            redirectUri: idp.redirectUri,
            confidential: idp.secretRef !== undefined,
          })),
        },
      };
    }),

    route('POST', '/inbound/authorizations', async ({ body }) => {
      const input = beginAuthorizationSchema.parse(body);
      return { status: 201, body: await services.federatedLogin.begin(input.idpCode, input.realm) };
    }),

    route('POST', '/inbound/authorizations/callback', async ({ body }) => {
      const input = completeAuthorizationSchema.parse(body);
      return {
        status: 200,
        body: await services.federatedLogin.complete(input.state, input.code, input.realm),
      };
    }),
  ];
}

function presentsValidServiceToken(request: IncomingMessage, expectedToken: string): boolean {
  const header = request.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  return secretsMatch(header.slice('Bearer '.length), expectedToken);
}

export function createAuthBrokerServer(services: AuthBrokerServices): Server {
  const routes = authBrokerRoutes(services);

  return createServer((request: IncomingMessage, response: ServerResponse) => {
    void handle(request, response, routes, services);
  });
}

async function handle(
  request: IncomingMessage,
  response: ServerResponse,
  routes: readonly Route[],
  services: AuthBrokerServices,
): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://internal');
  const matched = routes
    .map((candidate) => ({ candidate, match: candidate.pattern.exec(url.pathname) }))
    .find((entry) => entry.match !== null && entry.candidate.method === (request.method ?? 'GET'));

  if (matched === undefined || matched.match === null) {
    send(response, 404, { code: 'NOT_FOUND', message: 'Ruta no encontrada.' });
    return;
  }

  if (
    matched.candidate.requiresAuth &&
    !presentsValidServiceToken(request, services.config.serviceToken)
  ) {
    services.logger.warn('auth_broker_unauthorized_call', { path: url.pathname });
    send(response, 401, { code: 'UNAUTHORIZED_CALLER', message: 'Token de servicio inválido.' });
    return;
  }

  const params: Record<string, string> = {};
  matched.candidate.paramNames.forEach((name, index) => {
    params[name] = matched.match?.[index + 1] ?? '';
  });

  try {
    const body = request.method === 'GET' ? undefined : await readBody(request);
    const result = await matched.candidate.handler({ url, params, body });
    send(response, result.status, result.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const failure = validationFailure(error);
      send(response, failure.status, failure.body);
      return;
    }
    if (isAuthBrokerError(error)) {
      services.logger.warn('auth_broker_request_failed', {
        path: url.pathname,
        code: error.code,
        ...error.context,
      });
      send(response, error.httpStatus, { code: error.code, message: error.message });
      return;
    }
    // Un error no previsto puede arrastrar material en su mensaje: se registra el tipo y se
    // responde genérico, nunca el mensaje original.
    services.logger.error('auth_broker_unexpected_error', {
      path: url.pathname,
      errorName: error instanceof Error ? error.name : typeof error,
    });
    send(response, 500, { code: 'INTERNAL_ERROR', message: 'Error interno del broker.' });
  }
}

function send(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body ?? {});
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    // El material que sirve este API no debe quedar en ninguna caché intermedia.
    pragma: 'no-cache',
  });
  response.end(payload);
}
