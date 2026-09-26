import { TokenBrokerService } from '../src/application/outbound/token-broker.service';
import { AuthBrokerError } from '../src/domain/auth-broker.errors';
import type { ProviderCredential } from '../src/domain/auth-broker.types';
import { TokenEndpointClient } from '../src/infrastructure/http/token-endpoint.client';
import type { HttpFetch } from '../src/application/ports';
import {
  FakeClock,
  FakeCredentialRegistry,
  FakeVault,
  jsonResponse,
  silentLogger,
} from './helpers';

const SEGIP: ProviderCredential = {
  providerCode: 'SEGIP',
  authMethod: 'oauth2_client_credentials',
  secretRef: 'provider:SEGIP',
  tokenEndpoint: 'https://idp.example/token',
  scopes: ['identity.verify'],
  issuedAt: '2026-01-01T00:00:00.000Z',
};

type Harness = {
  broker: TokenBrokerService;
  clock: FakeClock;
  calls: () => number;
};

function buildBroker(
  fetchImpl: HttpFetch,
  credential: ProviderCredential = SEGIP,
  maxRetries = 0,
): Harness {
  const clock = new FakeClock();
  let calls = 0;
  const countingFetch: HttpFetch = (url, init): Promise<Response> => {
    calls += 1;
    return fetchImpl(url, init);
  };

  const broker = new TokenBrokerService({
    credentials: FakeCredentialRegistry.of(credential),
    vault: FakeVault.withProviderSecret('provider:SEGIP', {
      CLIENT_ID: 'atlas-client',
      CLIENT_SECRET: 'atlas-secret',
      API_KEY: 'atlas-api-key',
    }),
    tokenClient: new TokenEndpointClient({
      fetchImpl: countingFetch,
      timeoutMs: 1_000,
      maxRetries,
      sleep: (): Promise<void> => Promise.resolve(),
    }),
    clock,
    logger: silentLogger,
    refreshSkewSeconds: 60,
  });

  return { broker, clock, calls: () => calls };
}

const validToken = (): Response =>
  jsonResponse(200, { access_token: 'token-abc', token_type: 'Bearer', expires_in: 3_600 });

describe('TokenBrokerService — autorización saliente', () => {
  it('devuelve la cabecera Authorization con el token emitido', async () => {
    const { broker } = buildBroker(() => Promise.resolve(validToken()));

    const authorization = await broker.authorize('SEGIP');

    expect(authorization.headers.authorization).toBe('Bearer token-abc');
    expect(authorization.authMethod).toBe('oauth2_client_credentials');
  });

  it('presenta las credenciales con client_secret_basic y no en el cuerpo', async () => {
    let capturedHeaders: Record<string, string> = {};
    let capturedBody = '';
    const { broker } = buildBroker((_url, init) => {
      capturedHeaders = init.headers as Record<string, string>;
      capturedBody = typeof init.body === 'string' ? init.body : '';
      return Promise.resolve(validToken());
    });

    await broker.authorize('SEGIP');

    expect(capturedHeaders.authorization).toMatch(/^Basic /u);
    expect(capturedBody).not.toContain('atlas-secret');
    expect(capturedBody).toContain('grant_type=client_credentials');
  });

  it('reutiliza el token cacheado mientras siga fresco', async () => {
    const { broker, calls } = buildBroker(() => Promise.resolve(validToken()));

    await broker.authorize('SEGIP');
    await broker.authorize('SEGIP');
    await broker.authorize('SEGIP');

    expect(calls()).toBe(1);
  });

  it('renueva el token antes de que expire, con el margen configurado', async () => {
    const { broker, clock, calls } = buildBroker(() => Promise.resolve(validToken()));

    await broker.authorize('SEGIP');
    // Un segundo antes de entrar en el margen de 60 s: aún sirve el token cacheado.
    clock.advance((3_600 - 61) * 1_000);
    await broker.authorize('SEGIP');
    expect(calls()).toBe(1);

    // Dentro del margen: debe renovar aunque el token técnicamente no haya expirado.
    clock.advance(2_000);
    await broker.authorize('SEGIP');
    expect(calls()).toBe(2);
  });

  it('agrupa las peticiones concurrentes en una sola llamada al emisor', async () => {
    let resolveToken: (response: Response) => void = () => undefined;
    const pending = new Promise<Response>((resolve) => {
      resolveToken = resolve;
    });
    const { broker, calls } = buildBroker(() => pending);

    const inFlight = Promise.all([
      broker.authorize('SEGIP'),
      broker.authorize('SEGIP'),
      broker.authorize('SEGIP'),
      broker.authorize('SEGIP'),
    ]);
    resolveToken(validToken());
    const results = await inFlight;

    expect(calls()).toBe(1);
    expect(results.every((entry) => entry.headers.authorization === 'Bearer token-abc')).toBe(true);
  });

  it('descarta el token cacheado al invalidar', async () => {
    const { broker, calls } = buildBroker(() => Promise.resolve(validToken()));

    await broker.authorize('SEGIP');
    broker.invalidate('SEGIP');
    await broker.authorize('SEGIP');

    expect(calls()).toBe(2);
  });
});

describe('TokenBrokerService — fallos del emisor', () => {
  it('no reintenta un 401: la credencial es incorrecta', async () => {
    const { broker, calls } = buildBroker(() => Promise.resolve(jsonResponse(401, {})), SEGIP, 3);

    await expect(broker.authorize('SEGIP')).rejects.toMatchObject({
      code: 'PROVIDER_AUTH_FAILED',
    });
    expect(calls()).toBe(1);
  });

  it('reintenta un 503 y acaba reportando indisponibilidad', async () => {
    const { broker, calls } = buildBroker(() => Promise.resolve(jsonResponse(503, {})), SEGIP, 2);

    await expect(broker.authorize('SEGIP')).rejects.toMatchObject({
      code: 'PROVIDER_AUTH_UNAVAILABLE',
    });
    expect(calls()).toBe(3);
  });

  it('registra el último fallo en el diagnóstico publicable', async () => {
    const { broker } = buildBroker(() => Promise.resolve(jsonResponse(401, {})));

    await expect(broker.authorize('SEGIP')).rejects.toBeInstanceOf(AuthBrokerError);

    const diagnostics = broker.diagnosticsFor('SEGIP');
    expect(diagnostics.hasToken).toBe(false);
    expect(diagnostics.lastFailureCode).toBe('PROVIDER_AUTH_FAILED');
    expect(diagnostics.lastFailureAt).toBeDefined();
  });

  it('rechaza una respuesta que no cumple RFC 6749', async () => {
    const { broker } = buildBroker(() => Promise.resolve(jsonResponse(200, { token: 'mal' })));

    await expect(broker.authorize('SEGIP')).rejects.toMatchObject({
      code: 'PROVIDER_AUTH_FAILED',
    });
  });
});

describe('TokenBrokerService — estado de la credencial', () => {
  it('se niega a autorizar con una credencial revocada', async () => {
    const { broker } = buildBroker(() => Promise.resolve(validToken()), {
      ...SEGIP,
      revokedAt: '2025-12-01T00:00:00.000Z',
    });

    await expect(broker.authorize('SEGIP')).rejects.toMatchObject({ code: 'CREDENTIAL_REVOKED' });
  });

  it('se niega a autorizar con una credencial expirada', async () => {
    const { broker } = buildBroker(() => Promise.resolve(validToken()), {
      ...SEGIP,
      expiresAt: '2025-12-01T00:00:00.000Z',
    });

    await expect(broker.authorize('SEGIP')).rejects.toMatchObject({ code: 'CREDENTIAL_EXPIRED' });
  });

  it('falla si el método exige tokenEndpoint y no está configurado', async () => {
    const withoutEndpoint: ProviderCredential = { ...SEGIP };
    delete (withoutEndpoint as { tokenEndpoint?: string }).tokenEndpoint;
    const { broker } = buildBroker(() => Promise.resolve(validToken()), withoutEndpoint);

    await expect(broker.authorize('SEGIP')).rejects.toMatchObject({
      code: 'TOKEN_ENDPOINT_NOT_CONFIGURED',
    });
  });

  it('falla si un proveedor no tiene credencial declarada', async () => {
    const { broker } = buildBroker(() => Promise.resolve(validToken()));

    await expect(broker.authorize('INFOCENTER')).rejects.toMatchObject({
      code: 'CREDENTIAL_NOT_FOUND',
    });
  });
});

describe('TokenBrokerService — métodos sin token', () => {
  it('usa la cabecera declarada para api_key y no llama al emisor', async () => {
    const { broker, calls } = buildBroker(() => Promise.resolve(validToken()), {
      ...SEGIP,
      authMethod: 'api_key',
      apiKeyHeader: 'x-segip-key',
    });

    const authorization = await broker.authorize('SEGIP');

    expect(authorization.headers['x-segip-key']).toBe('atlas-api-key');
    expect(calls()).toBe(0);
  });

  it('no añade cabeceras para mtls: autentica el canal TLS', async () => {
    const { broker } = buildBroker(() => Promise.resolve(validToken()), {
      ...SEGIP,
      authMethod: 'mtls',
    });

    expect((await broker.authorize('SEGIP')).headers).toEqual({});
  });
});
