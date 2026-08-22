import { CredentialHealthService } from '../src/application/outbound/credential-health.service';
import type { TokenBrokerService } from '../src/application/outbound/token-broker.service';
import type { ProviderCredential } from '../src/domain/auth-broker.types';
import { FakeClock, FakeCredentialRegistry, FakeVault } from './helpers';

const NOW = '2026-06-01T00:00:00.000Z';
const DAY_MS = 86_400_000;

function daysAgo(days: number): string {
  return new Date(Date.parse(NOW) - days * DAY_MS).toISOString();
}

const baseCredential: ProviderCredential = {
  providerCode: 'SEGIP',
  authMethod: 'oauth2_client_credentials',
  secretRef: 'provider:SEGIP',
  tokenEndpoint: 'https://idp.example/token',
  scopes: ['identity.verify'],
  issuedAt: daysAgo(1),
};

function buildHealth(
  credential: ProviderCredential,
  options: {
    vaultHasSecret?: boolean;
    diagnostics?: ReturnType<TokenBrokerService['diagnosticsFor']>;
  } = {},
): CredentialHealthService {
  const clock = new FakeClock(Date.parse(NOW));
  const vault =
    options.vaultHasSecret === false
      ? new FakeVault()
      : FakeVault.withProviderSecret('provider:SEGIP', {
          CLIENT_ID: 'atlas-client',
          CLIENT_SECRET: 'atlas-secret',
          API_KEY: 'atlas-api-key',
          PRIVATE_KEY: 'atlas-private-key',
        });

  const tokenBroker = {
    diagnosticsFor: () => options.diagnostics ?? { hasToken: false },
  } as unknown as TokenBrokerService;

  return new CredentialHealthService({
    credentials: FakeCredentialRegistry.of(credential),
    vault,
    tokenBroker,
    clock,
    credentialMaxAgeDays: 90,
    rotationWarningDays: 14,
    refreshSkewSeconds: 60,
  });
}

describe('CredentialHealthService — estado de la credencial', () => {
  it('marca ACTIVE una credencial reciente con material en el vault', async () => {
    const state = await buildHealth(baseCredential).stateFor('SEGIP');

    expect(state.credentialStatus).toBe('ACTIVE');
    expect(state.credentialAgeDays).toBe(1);
  });

  it('marca ROTATION_DUE dentro de la ventana de aviso', async () => {
    // 80 días: pasada la marca de 90-14=76, aún no vencida.
    const state = await buildHealth({ ...baseCredential, issuedAt: daysAgo(80) }).stateFor('SEGIP');

    expect(state.credentialStatus).toBe('ROTATION_DUE');
  });

  it('marca EXPIRED al superar la vida máxima por política', async () => {
    const state = await buildHealth({ ...baseCredential, issuedAt: daysAgo(120) }).stateFor(
      'SEGIP',
    );

    expect(state.credentialStatus).toBe('EXPIRED');
  });

  it('cuenta la antigüedad desde la última rotación, no desde el alta', async () => {
    const state = await buildHealth({
      ...baseCredential,
      issuedAt: daysAgo(200),
      rotatedAt: daysAgo(3),
    }).stateFor('SEGIP');

    expect(state.credentialStatus).toBe('ACTIVE');
    expect(state.credentialAgeDays).toBe(3);
  });

  it('marca REVOKED por encima de cualquier otro estado', async () => {
    const state = await buildHealth({ ...baseCredential, revokedAt: daysAgo(1) }).stateFor('SEGIP');

    expect(state.credentialStatus).toBe('REVOKED');
  });

  it('marca EXPIRED si el proveedor declaró una expiración ya pasada', async () => {
    const state = await buildHealth({ ...baseCredential, expiresAt: daysAgo(1) }).stateFor('SEGIP');

    expect(state.credentialStatus).toBe('EXPIRED');
  });

  it('marca MISSING si la credencial está declarada pero no hay material en el vault', async () => {
    const state = await buildHealth(baseCredential, { vaultHasSecret: false }).stateFor('SEGIP');

    expect(state.credentialStatus).toBe('MISSING');
    expect(state.credentialFingerprint).toBeUndefined();
  });

  it('marca NOT_REQUIRED cuando el proveedor no exige autenticación', async () => {
    const state = await buildHealth({ ...baseCredential, authMethod: 'none' }).stateFor('SEGIP');

    expect(state.credentialStatus).toBe('NOT_REQUIRED');
  });

  it('reporta MISSING para un proveedor sin credencial declarada', async () => {
    const state = await buildHealth(baseCredential).stateFor('INFOCENTER');

    expect(state.credentialStatus).toBe('MISSING');
    expect(state.tokenStatus).toBe('NONE');
  });
});

describe('CredentialHealthService — publicabilidad', () => {
  it('expone la huella de la credencial pero nunca el secreto', async () => {
    const state = await buildHealth(baseCredential).stateFor('SEGIP');

    expect(state.credentialFingerprint).toHaveLength(16);
    expect(JSON.stringify(state)).not.toContain('atlas-secret');
  });
});

describe('CredentialHealthService — estado del token', () => {
  const withDiagnostics = (
    diagnostics: ReturnType<TokenBrokerService['diagnosticsFor']>,
  ): Promise<string> =>
    buildHealth(baseCredential, { diagnostics })
      .stateFor('SEGIP')
      .then((state) => state.tokenStatus);

  it('VALID cuando el token vigente está lejos de expirar', async () => {
    await expect(
      withDiagnostics({ hasToken: true, tokenExpiresAt: Date.parse(NOW) + 3_600_000 }),
    ).resolves.toBe('VALID');
  });

  it('EXPIRING cuando entra en el margen de renovación', async () => {
    await expect(
      withDiagnostics({ hasToken: true, tokenExpiresAt: Date.parse(NOW) + 30_000 }),
    ).resolves.toBe('EXPIRING');
  });

  it('EXPIRED cuando ya venció', async () => {
    await expect(
      withDiagnostics({ hasToken: true, tokenExpiresAt: Date.parse(NOW) - 1_000 }),
    ).resolves.toBe('EXPIRED');
  });

  it('REFRESH_FAILED cuando el último intento falló y no hay token', async () => {
    await expect(
      withDiagnostics({ hasToken: false, lastFailureCode: 'PROVIDER_AUTH_FAILED' }),
    ).resolves.toBe('REFRESH_FAILED');
  });

  it('NONE cuando nunca se pidió un token', async () => {
    await expect(withDiagnostics({ hasToken: false })).resolves.toBe('NONE');
  });
});
