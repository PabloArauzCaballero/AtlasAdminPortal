import { FederatedLoginService } from '../src/application/inbound/federated-login.service';
import type { IdentityProviderConfig } from '../src/domain/auth-broker.types';
import type { AuthorizationCodeClient } from '../src/infrastructure/http/authorization-code.client';
import type { IdTokenVerifier } from '../src/infrastructure/crypto/id-token.verifier';
import { InMemoryAuthorizationStore } from '../src/infrastructure/memory/in-memory-authorization.store';
import { InMemoryIdentityProviderRegistry } from '../src/infrastructure/memory/in-memory-registries';
import { FakeClock, FakeVault, silentLogger } from './helpers';

const CORPORATE: IdentityProviderConfig = {
  idpCode: 'CORPORATE_OIDC',
  realm: 'internal_sso',
  issuer: 'https://sso.empresa.example',
  authorizationEndpoint: 'https://sso.empresa.example/authorize',
  tokenEndpoint: 'https://sso.empresa.example/token',
  jwksUri: 'https://sso.empresa.example/jwks',
  clientId: 'atlas-portal',
  secretRef: 'idp:CORPORATE_OIDC',
  scopes: ['openid', 'profile', 'email'],
  redirectUri: 'https://portal.atlas.example/internal/login/callback',
};

const SOCIAL: IdentityProviderConfig = {
  ...CORPORATE,
  idpCode: 'META_SOCIAL',
  realm: 'customer_social',
  clientId: 'atlas-social',
};

type Harness = {
  service: FederatedLoginService;
  clock: FakeClock;
  store: InMemoryAuthorizationStore;
  verifiedNonces: string[];
};

function buildService(options: { vaultHasIdpSecret?: boolean } = {}): Harness {
  const clock = new FakeClock();
  const store = new InMemoryAuthorizationStore();
  const verifiedNonces: string[] = [];

  const codeClient = {
    exchange: () => Promise.resolve({ idToken: 'id-token-simulado' }),
  } as unknown as AuthorizationCodeClient;

  const idTokenVerifier = {
    verify: (_token: string, expectations: { nonce: string; issuer: string }) => {
      verifiedNonces.push(expectations.nonce);
      return Promise.resolve({
        iss: expectations.issuer,
        sub: 'usuario-1',
        aud: 'atlas-portal',
        iat: 0,
        exp: 0,
        email: 'persona@empresa.example',
        email_verified: true,
        name: 'Persona Ejemplo',
      });
    },
  } as unknown as IdTokenVerifier;

  const service = new FederatedLoginService({
    identityProviders: new InMemoryIdentityProviderRegistry([CORPORATE, SOCIAL]),
    authorizations: store,
    codeClient,
    idTokenVerifier,
    vault:
      options.vaultHasIdpSecret === false
        ? new FakeVault()
        : FakeVault.withProviderSecret('idp:CORPORATE_OIDC', { CLIENT_SECRET: 'secreto-idp' }),
    clock,
    logger: silentLogger,
    authorizationTtlSeconds: 600,
  });

  return { service, clock, store, verifiedNonces };
}

describe('FederatedLoginService — inicio de la autorización', () => {
  it('construye la URL con PKCE S256, state y nonce', async () => {
    const { service } = buildService();

    const result = await service.begin('CORPORATE_OIDC');
    const url = new URL(result.authorizationUrl);

    expect(url.origin + url.pathname).toBe('https://sso.empresa.example/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('atlas-portal');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toHaveLength(43);
    expect(url.searchParams.get('state')).toBe(result.state);
    expect(url.searchParams.get('nonce')).toBeTruthy();
  });

  it('nunca expone el code_verifier en la URL', async () => {
    const { service } = buildService();

    const result = await service.begin('CORPORATE_OIDC');

    expect(result.authorizationUrl).not.toContain('code_verifier');
  });

  it('genera un state distinto en cada inicio', async () => {
    const { service } = buildService();

    const first = await service.begin('CORPORATE_OIDC');
    const second = await service.begin('CORPORATE_OIDC');

    expect(first.state).not.toBe(second.state);
  });

  it('rechaza un IdP inexistente', async () => {
    const { service } = buildService();

    await expect(service.begin('NO_EXISTE')).rejects.toMatchObject({
      code: 'IDENTITY_PROVIDER_NOT_FOUND',
    });
  });

  it('rechaza iniciar en un ámbito de confianza distinto al del IdP', async () => {
    const { service } = buildService();

    await expect(service.begin('META_SOCIAL', 'internal_sso')).rejects.toMatchObject({
      code: 'AUTHORIZATION_REALM_MISMATCH',
    });
  });
});

describe('FederatedLoginService — cierre de la autorización', () => {
  it('devuelve la identidad federada del ámbito correcto', async () => {
    const { service } = buildService();

    const started = await service.begin('CORPORATE_OIDC');
    const identity = await service.complete(started.state, 'codigo-del-idp');

    expect(identity.subject).toBe('usuario-1');
    expect(identity.realm).toBe('internal_sso');
    expect(identity.idpCode).toBe('CORPORATE_OIDC');
    expect(identity.emailVerified).toBe(true);
  });

  it('valida el id_token contra el nonce de ESA autorización', async () => {
    const { service, verifiedNonces } = buildService();

    const started = await service.begin('CORPORATE_OIDC');
    const url = new URL(started.authorizationUrl);
    await service.complete(started.state, 'codigo');

    expect(verifiedNonces).toEqual([url.searchParams.get('nonce')]);
  });

  it('consume el state una sola vez: el replay del código falla', async () => {
    const { service } = buildService();

    const started = await service.begin('CORPORATE_OIDC');
    await service.complete(started.state, 'codigo');

    await expect(service.complete(started.state, 'codigo')).rejects.toMatchObject({
      code: 'AUTHORIZATION_STATE_INVALID',
    });
  });

  it('rechaza un state desconocido', async () => {
    const { service } = buildService();

    await expect(service.complete('state-inventado', 'codigo')).rejects.toMatchObject({
      code: 'AUTHORIZATION_STATE_INVALID',
    });
  });

  it('rechaza una autorización caducada', async () => {
    const { service, clock } = buildService();

    const started = await service.begin('CORPORATE_OIDC');
    clock.advance(601 * 1_000);

    await expect(service.complete(started.state, 'codigo')).rejects.toMatchObject({
      code: 'AUTHORIZATION_STATE_EXPIRED',
    });
  });

  /**
   * Regresión: con un IdP declarado confidencial y el vault sin material, el canje salía sin
   * autenticación de cliente y el IdP devolvía 401. El operador leía "el proveedor rechazó las
   * credenciales" cuando la causa era un vault vacío. Lo detectó la prueba end-to-end.
   */
  it('falla con CREDENTIAL_NOT_FOUND si el IdP es confidencial y el vault no tiene su secreto', async () => {
    const { service } = buildService({ vaultHasIdpSecret: false });

    const started = await service.begin('CORPORATE_OIDC');

    await expect(service.complete(started.state, 'codigo')).rejects.toMatchObject({
      code: 'CREDENTIAL_NOT_FOUND',
    });
  });

  it('impide que una identidad social cierre un flujo de SSO interno', async () => {
    const { service } = buildService();

    const started = await service.begin('META_SOCIAL');

    await expect(service.complete(started.state, 'codigo', 'internal_sso')).rejects.toMatchObject({
      code: 'AUTHORIZATION_REALM_MISMATCH',
    });
  });
});

describe('FederatedLoginService — mantenimiento', () => {
  it('purga las autorizaciones caducadas', async () => {
    const { service, clock, store } = buildService();

    await service.begin('CORPORATE_OIDC');
    await service.begin('META_SOCIAL');
    expect(store.size()).toBe(2);

    clock.advance(601 * 1_000);

    expect(await service.purgeExpired()).toBe(2);
    expect(store.size()).toBe(0);
  });
});
