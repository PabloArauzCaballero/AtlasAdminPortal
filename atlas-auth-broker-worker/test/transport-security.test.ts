/**
 * Transporte seguro del broker (auditoría 2026-10-28, COBIT 5 DSS05.02 / DSS05.04).
 *
 * Dos controles que el código declaraba y no cumplía:
 *  - `AUTH_BROKER_STRICT_TRANSPORT` existía en el esquema del entorno y nadie lo leía: un
 *    `AUTH_BROKER_<PROVEEDOR>_TOKEN_ENDPOINT` por `http://` mandaba el secreto de cliente en claro.
 *  - Las llamadas con credenciales seguían redirecciones, reenviando cuerpo y cabeceras a un
 *    destino que el operador no declaró.
 *
 * Los casos salen del contrato de cada pieza: correcto, límite e inválido.
 */
import { buildAtlasProviderCatalog } from '../src/config/atlas-provider-catalog';
import { loadAuthBrokerConfig } from '../src/config/auth-broker.config';
import { composeAuthBroker } from '../src/auth-broker.composition';
import { IdTokenVerifier } from '../src/infrastructure/crypto/id-token.verifier';
import { AuthorizationCodeClient } from '../src/infrastructure/http/authorization-code.client';
import { TokenEndpointClient } from '../src/infrastructure/http/token-endpoint.client';
import { FakeClock } from './helpers';

const NOW = '2026-01-01T00:00:00.000Z';
const SERVICE_TOKEN = 'a'.repeat(32);

describe('catálogo de proveedores — endpoint de token', () => {
  it('correcto: acepta un endpoint HTTPS', () => {
    const catalog = buildAtlasProviderCatalog(NOW, {
      AUTH_BROKER_SEGIP_TOKEN_ENDPOINT: 'https://idp.example/token',
    });

    expect(catalog.find((entry) => entry.providerCode === 'SEGIP')?.tokenEndpoint).toBe(
      'https://idp.example/token',
    );
  });

  it('inválido: rechaza un endpoint por http:// y no filtra el valor', () => {
    expect(() =>
      buildAtlasProviderCatalog(NOW, {
        AUTH_BROKER_SEGIP_TOKEN_ENDPOINT: 'http://idp.interno/token?x=valor-sensible',
      }),
    ).toThrow(/AUTH_BROKER_SEGIP_TOKEN_ENDPOINT debe usar HTTPS/u);

    try {
      buildAtlasProviderCatalog(NOW, {
        AUTH_BROKER_SEGIP_TOKEN_ENDPOINT: 'http://idp.interno/token?x=valor-sensible',
      });
    } catch (error) {
      expect((error as Error).message).not.toContain('valor-sensible');
    }
  });

  it('inválido: rechaza una URL mal formada y un esquema que no es http(s)', () => {
    expect(() =>
      buildAtlasProviderCatalog(NOW, { AUTH_BROKER_INFOCENTER_TOKEN_ENDPOINT: 'no es una url' }),
    ).toThrow(/no es una URL válida/u);
    // Ni siquiera la excepción local admite otro esquema que http/https.
    expect(() =>
      buildAtlasProviderCatalog(
        NOW,
        { AUTH_BROKER_INFOCENTER_TOKEN_ENDPOINT: 'ftp://idp.interno/token' },
        { allowInsecureTransport: true },
      ),
    ).toThrow(/debe usar HTTPS/u);
  });

  it('límite: http:// sólo pasa con la excepción explícita, y una variable vacía se ignora', () => {
    const catalog = buildAtlasProviderCatalog(
      NOW,
      {
        AUTH_BROKER_SEGIP_TOKEN_ENDPOINT: 'http://127.0.0.1:9000/token',
        AUTH_BROKER_INFOCENTER_TOKEN_ENDPOINT: '   ',
      },
      { allowInsecureTransport: true },
    );

    expect(catalog.find((entry) => entry.providerCode === 'SEGIP')?.tokenEndpoint).toBe(
      'http://127.0.0.1:9000/token',
    );
    expect(
      catalog.find((entry) => entry.providerCode === 'INFOCENTER')?.tokenEndpoint,
    ).toBeUndefined();
  });
});

describe('AUTH_BROKER_STRICT_TRANSPORT', () => {
  it('correcto: vale `true` si no se declara', () => {
    const config = loadAuthBrokerConfig({ AUTH_BROKER_SERVICE_TOKEN: SERVICE_TOKEN });

    expect(config.strictTransport).toBe(true);
  });

  it('límite: `false` se admite fuera de producción', () => {
    const config = loadAuthBrokerConfig({
      AUTH_BROKER_SERVICE_TOKEN: SERVICE_TOKEN,
      AUTH_BROKER_STRICT_TRANSPORT: 'false',
    });

    expect(config.strictTransport).toBe(false);
  });

  it('inválido: el broker no arranca con `false` en producción', () => {
    expect(() =>
      loadAuthBrokerConfig({
        NODE_ENV: 'production',
        AUTH_BROKER_SERVICE_TOKEN: SERVICE_TOKEN,
        AUTH_BROKER_VAULT_DRIVER: 'kms',
        AUTH_BROKER_MASTER_KEY_BASE64: Buffer.alloc(32, 1).toString('base64'),
        AUTH_BROKER_STRICT_TRANSPORT: 'false',
      }),
    ).toThrow(/AUTH_BROKER_STRICT_TRANSPORT no puede ser `false`/u);
  });

  it('inválido: un valor que no es true/false falla en vez de asumirse', () => {
    expect(() =>
      loadAuthBrokerConfig({
        AUTH_BROKER_SERVICE_TOKEN: SERVICE_TOKEN,
        AUTH_BROKER_STRICT_TRANSPORT: 'no',
      }),
    ).toThrow();
  });
});

describe('composición del broker', () => {
  const environment = {
    AUTH_BROKER_SERVICE_TOKEN: SERVICE_TOKEN,
    AUTH_BROKER_SEGIP_TOKEN_ENDPOINT: 'http://idp.interno/token',
  };

  it('inválido: no arranca con un endpoint de token por http:// y el transporte estricto', () => {
    expect(() => composeAuthBroker({ environment })).toThrow(
      /AUTH_BROKER_SEGIP_TOKEN_ENDPOINT debe usar HTTPS/u,
    );
  });

  it('límite: arranca con el endpoint http:// sólo si se relaja el transporte fuera de producción', () => {
    expect(() =>
      composeAuthBroker({ environment: { ...environment, AUTH_BROKER_STRICT_TRANSPORT: 'false' } }),
    ).not.toThrow();
  });
});

describe('llamadas salientes con credenciales — redirecciones', () => {
  const okToken = (): Response =>
    new Response(JSON.stringify({ access_token: 't', token_type: 'Bearer', expires_in: 60 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  it('el cliente de tokens pide `redirect: error`', async () => {
    let seen: RequestInit | undefined;
    const client = new TokenEndpointClient({
      fetchImpl: (_url, init): Promise<Response> => {
        seen = init;
        return Promise.resolve(okToken());
      },
      timeoutMs: 1_000,
      maxRetries: 0,
    });

    await client.requestToken({
      providerCode: 'SEGIP',
      tokenEndpoint: 'https://idp.example/token',
      scopes: [],
      credential: { kind: 'client_secret', clientId: 'id', clientSecret: 'secreto-de-prueba' },
    });

    expect(seen?.redirect).toBe('error');
  });

  it('inválido: si el emisor responde con una redirección el cliente la trata como indisponibilidad', async () => {
    // `fetch` real con `redirect: 'error'` rechaza ante un 3xx; el doble reproduce ese contrato.
    const client = new TokenEndpointClient({
      fetchImpl: (_url, init): Promise<Response> =>
        init.redirect === 'error'
          ? Promise.reject(new TypeError('redirect mode is set to error'))
          : Promise.resolve(okToken()),
      timeoutMs: 1_000,
      maxRetries: 0,
    });

    await expect(
      client.requestToken({
        providerCode: 'SEGIP',
        tokenEndpoint: 'https://idp.example/token',
        scopes: [],
        credential: { kind: 'client_secret', clientId: 'id', clientSecret: 'secreto-de-prueba' },
      }),
    ).rejects.toMatchObject({ code: 'PROVIDER_AUTH_UNAVAILABLE' });
  });

  it('el canje del código pide `redirect: error`', async () => {
    let seen: RequestInit | undefined;
    const client = new AuthorizationCodeClient((_url, init): Promise<Response> => {
      seen = init;
      return Promise.resolve(
        new Response(JSON.stringify({ id_token: 'a.b.c' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    }, 1_000);

    await client.exchange({
      idpCode: 'CORPORATE_OIDC',
      tokenEndpoint: 'https://sso.example/token',
      clientId: 'atlas-portal',
      clientSecret: 'secreto-de-prueba',
      code: 'codigo',
      codeVerifier: 'verificador',
      redirectUri: 'https://portal.example/callback',
    });

    expect(seen?.redirect).toBe('error');
  });

  it('la descarga del JWKS pide `redirect: error`', async () => {
    let seen: RequestInit | undefined;
    const verifier = new IdTokenVerifier({
      fetchImpl: (_url, init): Promise<Response> => {
        seen = init;
        return Promise.resolve(new Response(JSON.stringify({ keys: [] }), { status: 200 }));
      },
      clock: new FakeClock(),
    });

    // El token no llega a verificarse: sólo interesa la forma de la petición al JWKS.
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'k' })).toString('base64url');
    await expect(
      verifier.verify(`${header}.e30.firma`, {
        issuer: 'https://idp.example',
        audience: 'atlas-portal',
        nonce: 'n',
        jwksUri: 'https://idp.example/jwks',
      }),
    ).rejects.toMatchObject({ code: 'ID_TOKEN_INVALID' });

    expect(seen?.redirect).toBe('error');
  });
});
