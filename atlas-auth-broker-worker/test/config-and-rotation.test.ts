import { CredentialHealthService } from '../src/application/outbound/credential-health.service';
import { CredentialRotationService } from '../src/application/outbound/credential-rotation.service';
import type { TokenBrokerService } from '../src/application/outbound/token-broker.service';
import { loadAuthBrokerConfig } from '../src/config/auth-broker.config';
import type { ProviderCredential } from '../src/domain/auth-broker.types';
import {
  generateMasterKeyBase64,
  secretFingerprint,
} from '../src/infrastructure/crypto/envelope-encryption';
import {
  EnvelopeSecretVault,
  InMemorySealedSecretStore,
} from '../src/infrastructure/vault/envelope-secret-vault.adapter';
import { InMemoryCredentialRegistry } from '../src/infrastructure/memory/in-memory-registries';
import { FakeClock, silentLogger } from './helpers';

const VALID_TOKEN = 'a'.repeat(32);

describe('loadAuthBrokerConfig', () => {
  it('exige un token de servicio de al menos 32 caracteres', () => {
    expect(() => loadAuthBrokerConfig({ AUTH_BROKER_SERVICE_TOKEN: 'corto' })).toThrow();
  });

  it('se niega a usar el driver `env` en producción', () => {
    expect(() =>
      loadAuthBrokerConfig({
        NODE_ENV: 'production',
        AUTH_BROKER_SERVICE_TOKEN: VALID_TOKEN,
        AUTH_BROKER_VAULT_DRIVER: 'env',
      }),
    ).toThrow(/no puede ser `env`/u);
  });

  it('exige clave maestra con el driver `kms`', () => {
    expect(() =>
      loadAuthBrokerConfig({
        AUTH_BROKER_SERVICE_TOKEN: VALID_TOKEN,
        AUTH_BROKER_VAULT_DRIVER: 'kms',
      }),
    ).toThrow(/clave maestra/u);
  });

  it('rechaza avisar de la rotación después de que la credencial ya venció', () => {
    expect(() =>
      loadAuthBrokerConfig({
        AUTH_BROKER_SERVICE_TOKEN: VALID_TOKEN,
        AUTH_BROKER_CREDENTIAL_MAX_AGE_DAYS: '30',
        AUTH_BROKER_ROTATION_WARNING_DAYS: '30',
      }),
    ).toThrow(/rotationWarningDays/u);
  });

  /**
   * Regresión: `seedSecretsFromEnv` estaba declarado en el esquema y en el mapeo de entorno, pero
   * no se copiaba al objeto de configuración, así que caía siempre al valor por defecto `false` y
   * la siembra del vault no se ejecutaba nunca. El síntoma era un broker que arrancaba sin errores
   * y respondía `CREDENTIAL_NOT_FOUND` a toda petición. Lo detectó la prueba end-to-end.
   */
  it('propaga seedSecretsFromEnv desde el entorno', () => {
    const config = loadAuthBrokerConfig({
      AUTH_BROKER_SERVICE_TOKEN: VALID_TOKEN,
      AUTH_BROKER_SEED_SECRETS_FROM_ENV: 'true',
    });

    expect(config.seedSecretsFromEnv).toBe(true);
  });

  it('no siembra el vault si no se pide explícitamente', () => {
    expect(
      loadAuthBrokerConfig({ AUTH_BROKER_SERVICE_TOKEN: VALID_TOKEN }).seedSecretsFromEnv,
    ).toBe(false);
  });

  it('acepta una configuración de desarrollo completa', () => {
    const config = loadAuthBrokerConfig({ AUTH_BROKER_SERVICE_TOKEN: VALID_TOKEN });

    expect(config.vaultDriver).toBe('env');
    expect(config.port).toBe(3020);
    expect(config.tokenRefreshSkewSeconds).toBe(60);
  });
});

describe('CredentialRotationService', () => {
  const credential: ProviderCredential = {
    providerCode: 'SEGIP',
    authMethod: 'oauth2_client_credentials',
    secretRef: 'provider:SEGIP',
    tokenEndpoint: 'https://idp.example/token',
    scopes: [],
    issuedAt: '2026-01-01T00:00:00.000Z',
  };

  function build(): {
    rotation: CredentialRotationService;
    vault: EnvelopeSecretVault;
    invalidated: string[];
    credentials: InMemoryCredentialRegistry;
  } {
    const clock = new FakeClock(Date.parse('2026-06-01T00:00:00.000Z'));
    const vault = new EnvelopeSecretVault(
      generateMasterKeyBase64(),
      new InMemorySealedSecretStore(),
    );
    const credentials = new InMemoryCredentialRegistry([credential]);
    const invalidated: string[] = [];
    const tokenBroker = {
      invalidate: (providerCode: string) => invalidated.push(providerCode),
      diagnosticsFor: () => ({ hasToken: false }),
    } as unknown as TokenBrokerService;

    const health = new CredentialHealthService({
      credentials,
      vault,
      tokenBroker,
      clock,
      credentialMaxAgeDays: 90,
      rotationWarningDays: 14,
      refreshSkewSeconds: 60,
    });

    return {
      rotation: new CredentialRotationService({
        credentials,
        vault,
        tokenBroker,
        health,
        clock,
        logger: silentLogger,
      }),
      vault,
      invalidated,
      credentials,
    };
  }

  it('sella el material nuevo y devuelve su huella', async () => {
    const { rotation, vault } = build();

    const result = await rotation.rotate('SEGIP', 'CLIENT_SECRET', 'secreto-nuevo-largo');

    expect(result.fingerprint).toBe(secretFingerprint('secreto-nuevo-largo'));
    expect(await vault.read('provider:SEGIP', 'CLIENT_SECRET')).toBe('secreto-nuevo-largo');
  });

  it('invalida el token cacheado: sin eso la rotación sería nominal', async () => {
    const { rotation, invalidated } = build();

    await rotation.rotate('SEGIP', 'CLIENT_SECRET', 'secreto-nuevo-largo');

    expect(invalidated).toEqual(['SEGIP']);
  });

  it('reinicia el contador de antigüedad al rotar', async () => {
    const { rotation, credentials } = build();

    await rotation.rotate('SEGIP', 'CLIENT_SECRET', 'secreto-nuevo-largo');

    const updated = await credentials.find('SEGIP');
    expect(updated?.rotatedAt).toBe('2026-06-01T00:00:00.000Z');
  });

  it('rechaza material vacío', async () => {
    const { rotation } = build();

    await expect(rotation.rotate('SEGIP', 'CLIENT_SECRET', '   ')).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    });
  });

  it('rechaza rotar un proveedor sin credencial declarada', async () => {
    const { rotation } = build();

    await expect(
      rotation.rotate('NO_EXISTE', 'CLIENT_SECRET', 'material-valido'),
    ).rejects.toMatchObject({
      code: 'CREDENTIAL_NOT_FOUND',
    });
  });

  it('revoca e invalida el token', async () => {
    const { rotation, credentials, invalidated } = build();

    await rotation.revoke('SEGIP', 'secreto filtrado en un log');

    expect((await credentials.find('SEGIP'))?.revokedAt).toBe('2026-06-01T00:00:00.000Z');
    expect(invalidated).toEqual(['SEGIP']);
  });

  it('rotar reactiva una credencial revocada', async () => {
    const { rotation, credentials } = build();

    await rotation.revoke('SEGIP', 'incidente');
    await rotation.rotate('SEGIP', 'CLIENT_SECRET', 'secreto-de-reemplazo');

    expect((await credentials.find('SEGIP'))?.revokedAt).toBeUndefined();
  });

  it('ordena las credenciales pendientes por urgencia', async () => {
    const { rotation } = build();

    const pending = await rotation.pendingRotation();

    // Sin material sellado todavía, la credencial declarada aparece como MISSING.
    expect(pending.map((entry) => entry.credentialStatus)).toEqual(['MISSING']);
  });
});
