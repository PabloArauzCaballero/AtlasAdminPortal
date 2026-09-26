/**
 * Vault de desarrollo: lee los secretos de variables de entorno.
 *
 * Existe para que un desarrollador pueda levantar el broker sin infraestructura de gestión de
 * secretos. NO es apto para producción —las variables de entorno son legibles por cualquier
 * proceso del contenedor y suelen quedar registradas en la definición del despliegue—, y por eso
 * `loadAuthBrokerConfig` se niega a arrancar con este driver cuando `NODE_ENV=production`.
 */
import type { SecretVault } from '../../application/ports';
import { secretFingerprint } from '../crypto/envelope-encryption';
import { normalizeSecretField, normalizeSecretRef } from './secret-ref';

const ENV_PREFIX = 'AUTH_BROKER_SECRET__';

export class EnvSecretVault implements SecretVault {
  readonly driver = 'env' as const;

  constructor(private readonly environment: NodeJS.ProcessEnv = process.env) {}

  private variableName(secretRef: string, field: string): string {
    return `${ENV_PREFIX}${normalizeSecretRef(secretRef)}__${normalizeSecretField(field)}`;
  }

  read(secretRef: string, field: string): Promise<string | undefined> {
    const raw = this.environment[this.variableName(secretRef, field)];
    const value = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : undefined;
    return Promise.resolve(value);
  }

  async fingerprint(secretRef: string, field: string): Promise<string | undefined> {
    const value = await this.read(secretRef, field);
    return value === undefined ? undefined : secretFingerprint(value);
  }

  /** Las variables de entorno están o no están; no hay dependencia externa que pueda caerse. */
  isAvailable(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
