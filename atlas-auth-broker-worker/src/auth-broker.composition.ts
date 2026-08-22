/**
 * Raíz de composición: arma el broker completo a partir de la configuración.
 *
 * Todo el cableado vive aquí para que ningún servicio construya sus propias dependencias y para
 * que la elección de vault —la decisión de seguridad más importante del worker— sea visible en un
 * solo lugar.
 */
import { loadAuthBrokerConfig, type AuthBrokerConfig } from './config/auth-broker.config';
import { buildAtlasProviderCatalog } from './config/atlas-provider-catalog';
import { loadIdentityProviderCatalog } from './config/identity-provider-catalog';
import { AuthBrokerError } from './domain/auth-broker.errors';
import { CredentialHealthService } from './application/outbound/credential-health.service';
import { CredentialRotationService } from './application/outbound/credential-rotation.service';
import { TokenBrokerService } from './application/outbound/token-broker.service';
import { FederatedLoginService } from './application/inbound/federated-login.service';
import {
  systemClock,
  type AuthBrokerLogger,
  type Clock,
  type SecretVault,
  type WritableSecretVault,
} from './application/ports';
import { IdTokenVerifier } from './infrastructure/crypto/id-token.verifier';
import { AuthorizationCodeClient } from './infrastructure/http/authorization-code.client';
import { TokenEndpointClient } from './infrastructure/http/token-endpoint.client';
import { InMemoryAuthorizationStore } from './infrastructure/memory/in-memory-authorization.store';
import {
  InMemoryCredentialRegistry,
  InMemoryIdentityProviderRegistry,
} from './infrastructure/memory/in-memory-registries';
import { EnvSecretVault } from './infrastructure/vault/env-secret-vault.adapter';
import {
  EnvelopeSecretVault,
  InMemorySealedSecretStore,
  type SealedSecretStore,
} from './infrastructure/vault/envelope-secret-vault.adapter';
import { RedactingLogger } from './observability/redacting-logger';
import type { AuthBrokerServices } from './infrastructure/http/auth-broker.http-server';

/**
 * Envoltura de solo lectura para el driver `env`.
 *
 * Rotar exige escribir material cifrado, y el driver de desarrollo no cifra nada. En vez de
 * degradar en silencio —guardando el secreto nuevo en una variable de entorno que se perdería al
 * reiniciar—, la rotación falla con un error explicativo.
 */
class ReadOnlyVault implements WritableSecretVault {
  readonly driver: SecretVault['driver'];

  constructor(private readonly inner: SecretVault) {
    this.driver = inner.driver;
  }

  read(secretRef: string, field: string): Promise<string | undefined> {
    return this.inner.read(secretRef, field);
  }

  fingerprint(secretRef: string, field: string): Promise<string | undefined> {
    return this.inner.fingerprint(secretRef, field);
  }

  isAvailable(): Promise<boolean> {
    return this.inner.isAvailable();
  }

  seal(): Promise<string> {
    return Promise.reject(
      new AuthBrokerError(
        'VAULT_UNAVAILABLE',
        'La rotación de credenciales exige el driver `kms`: el driver `env` no puede custodiar material nuevo.',
      ),
    );
  }
}

export type CompositionOverrides = {
  readonly clock?: Clock;
  readonly fetchImpl?: typeof fetch;
  readonly sealedSecretStore?: SealedSecretStore;
  readonly environment?: NodeJS.ProcessEnv;
};

export type ComposedBroker = {
  readonly services: AuthBrokerServices;
  readonly config: AuthBrokerConfig;
  /** Trabajo asíncrono de arranque (siembra del vault). Debe completarse antes de servir. */
  readonly initialize: () => Promise<void>;
  /** Mantenimiento periódico: purga autorizaciones OIDC caducadas. */
  readonly runMaintenance: () => Promise<void>;
};

const SECRET_ENV_PREFIX = 'AUTH_BROKER_SECRET__';

/**
 * Siembra el vault cifrado con los secretos que ya estén en el entorno.
 *
 * Es la ruta de migración desde el modelo actual de AtlasBackend, donde las credenciales viven en
 * variables de entorno: permite adoptar el vault sin un corte de servicio. Deliberadamente NO es
 * silenciosa — cada secreto sembrado se registra por su huella, y el resumen final recuerda que
 * esas variables deben retirarse del despliegue. Un mecanismo de migración que se olvida deja el
 * sistema con las dos copias del secreto y la peor de las dos garantías.
 */
async function seedVaultFromEnvironment(
  vault: WritableSecretVault,
  environment: NodeJS.ProcessEnv,
  logger: AuthBrokerLogger,
): Promise<number> {
  let seeded = 0;
  for (const [name, value] of Object.entries(environment)) {
    if (!name.startsWith(SECRET_ENV_PREFIX)) continue;
    if (typeof value !== 'string' || value.trim() === '') continue;

    const [reference, field] = name.slice(SECRET_ENV_PREFIX.length).split('__');
    if (reference === undefined || field === undefined) {
      logger.warn('auth_broker_seed_variable_ignored', { variable: name });
      continue;
    }

    const fingerprint = await vault.seal(reference, field, value.trim());
    logger.info('auth_broker_secret_seeded', { secretRef: reference, field, fingerprint });
    seeded += 1;
  }
  return seeded;
}

function buildVault(
  config: AuthBrokerConfig,
  overrides: CompositionOverrides,
): WritableSecretVault {
  if (config.vaultDriver === 'env') {
    return new ReadOnlyVault(new EnvSecretVault(overrides.environment ?? process.env));
  }
  // `masterKeyBase64` está garantizado por el `superRefine` de la configuración.
  return new EnvelopeSecretVault(
    config.masterKeyBase64 ?? '',
    overrides.sealedSecretStore ?? new InMemorySealedSecretStore(),
  );
}

export function composeAuthBroker(overrides: CompositionOverrides = {}): ComposedBroker {
  const environment = overrides.environment ?? process.env;
  const config = loadAuthBrokerConfig(environment);
  const clock = overrides.clock ?? systemClock;
  const logger = new RedactingLogger();
  const fetchImpl = overrides.fetchImpl ?? fetch;

  const vault = buildVault(config, overrides);
  const credentials = new InMemoryCredentialRegistry(
    buildAtlasProviderCatalog(new Date(clock.now()).toISOString(), environment),
  );
  const identityProviders = new InMemoryIdentityProviderRegistry(
    loadIdentityProviderCatalog(environment),
  );

  const tokenBroker = new TokenBrokerService({
    credentials,
    vault,
    tokenClient: new TokenEndpointClient({
      fetchImpl,
      timeoutMs: config.tokenRequestTimeoutMs,
      maxRetries: config.tokenMaxRetries,
    }),
    clock,
    logger,
    refreshSkewSeconds: config.tokenRefreshSkewSeconds,
  });

  const health = new CredentialHealthService({
    credentials,
    vault,
    tokenBroker,
    clock,
    credentialMaxAgeDays: config.credentialMaxAgeDays,
    rotationWarningDays: config.rotationWarningDays,
    refreshSkewSeconds: config.tokenRefreshSkewSeconds,
  });

  const rotation = new CredentialRotationService({
    credentials,
    vault,
    tokenBroker,
    health,
    clock,
    logger,
  });

  const authorizations = new InMemoryAuthorizationStore();
  const federatedLogin = new FederatedLoginService({
    identityProviders,
    authorizations,
    codeClient: new AuthorizationCodeClient(fetchImpl, config.tokenRequestTimeoutMs),
    idTokenVerifier: new IdTokenVerifier({ fetchImpl, clock }),
    vault,
    clock,
    logger,
    authorizationTtlSeconds: config.authorizationTtlSeconds,
  });

  return {
    config,
    services: {
      config,
      tokenBroker,
      health,
      rotation,
      federatedLogin,
      identityProviders,
      vault,
      logger,
    },
    initialize: async (): Promise<void> => {
      if (!config.seedSecretsFromEnv) return;
      if (config.vaultDriver !== 'kms') {
        // Con el driver `env` los secretos ya SON las variables de entorno: sembrarlos sería
        // copiarlos sobre sí mismos.
        logger.warn('auth_broker_seed_skipped', { reason: 'vault_driver_is_env' });
        return;
      }
      const seeded = await seedVaultFromEnvironment(vault, environment, logger);
      logger.warn('auth_broker_seeded_from_environment', {
        seeded,
        recordatorio:
          'Los secretos quedaron cifrados en el vault. Retire las variables AUTH_BROKER_SECRET__* del despliegue y desactive AUTH_BROKER_SEED_SECRETS_FROM_ENV.',
      });
    },
    runMaintenance: async (): Promise<void> => {
      const purged = await federatedLogin.purgeExpired();
      if (purged > 0) logger.info('federated_authorizations_purged', { purged });
    },
  };
}
