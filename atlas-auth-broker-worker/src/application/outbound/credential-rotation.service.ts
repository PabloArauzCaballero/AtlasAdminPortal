/**
 * Rotación y revocación de credenciales de proveedor.
 *
 * La rotación es una operación del broker, no del llamante: el material nuevo entra una sola vez,
 * se sella y no vuelve a salir. Que el broker sea también quien invalida el token cacheado es lo
 * que hace la rotación efectiva — sin ese paso, las llamadas seguirían usando el token emitido
 * con el secreto viejo hasta que expirara, y la rotación sería nominal.
 */
import { AuthBrokerError } from '../../domain/auth-broker.errors';
import type { ProviderAuthState } from '../../domain/auth-broker.types';
import type { AuthBrokerLogger, Clock, CredentialRegistry, WritableSecretVault } from '../ports';
import type { CredentialHealthService } from './credential-health.service';
import type { TokenBrokerService } from './token-broker.service';

export type RotationResult = {
  readonly providerCode: string;
  readonly field: string;
  readonly fingerprint: string;
  readonly rotatedAt: string;
};

export type CredentialRotationDependencies = {
  readonly credentials: CredentialRegistry;
  readonly vault: WritableSecretVault;
  readonly tokenBroker: TokenBrokerService;
  readonly health: CredentialHealthService;
  readonly clock: Clock;
  readonly logger: AuthBrokerLogger;
};

export class CredentialRotationService {
  constructor(private readonly dependencies: CredentialRotationDependencies) {}

  /**
   * Sustituye el material de un campo de la credencial.
   *
   * El orden importa: primero se sella el material nuevo, después se marca la rotación y solo al
   * final se invalida el token. Invalidar antes de tener el material nuevo dejaría una ventana en
   * la que el proveedor no es alcanzable.
   */
  async rotate(providerCode: string, field: string, plaintext: string): Promise<RotationResult> {
    const credential = await this.dependencies.credentials.find(providerCode);
    if (!credential) {
      throw new AuthBrokerError(
        'CREDENTIAL_NOT_FOUND',
        `No hay credencial declarada para ${providerCode}.`,
        { providerCode },
      );
    }
    if (plaintext.trim() === '') {
      throw new AuthBrokerError(
        'INVALID_REQUEST',
        'El material de la credencial no puede estar vacío.',
        { providerCode, field },
      );
    }

    const fingerprint = await this.dependencies.vault.seal(credential.secretRef, field, plaintext);
    const rotatedAt = new Date(this.dependencies.clock.now()).toISOString();
    await this.dependencies.credentials.markRotated(providerCode, rotatedAt);
    this.dependencies.tokenBroker.invalidate(providerCode);

    // Se registra la huella, nunca el material: deja trazabilidad de QUÉ credencial quedó activa
    // y permite comparar entornos sin filtrar el secreto al log de auditoría.
    this.dependencies.logger.info('provider_credential_rotated', {
      providerCode,
      field,
      fingerprint,
      rotatedAt,
    });

    return { providerCode, field, fingerprint, rotatedAt };
  }

  /** Revoca la credencial: a partir de aquí el broker se niega a autorizar llamadas al proveedor. */
  async revoke(providerCode: string, reason: string): Promise<{ revokedAt: string }> {
    const credential = await this.dependencies.credentials.find(providerCode);
    if (!credential) {
      throw new AuthBrokerError(
        'CREDENTIAL_NOT_FOUND',
        `No hay credencial declarada para ${providerCode}.`,
        { providerCode },
      );
    }

    const revokedAt = new Date(this.dependencies.clock.now()).toISOString();
    await this.dependencies.credentials.revoke(providerCode, revokedAt);
    this.dependencies.tokenBroker.invalidate(providerCode);
    this.dependencies.logger.warn('provider_credential_revoked', { providerCode, reason });

    return { revokedAt };
  }

  /** Credenciales que exigen atención, ordenadas de la más urgente a la menos. */
  async pendingRotation(): Promise<readonly ProviderAuthState[]> {
    const states = await this.dependencies.health.states();
    const severity: Record<string, number> = {
      EXPIRED: 0,
      REVOKED: 1,
      MISSING: 2,
      ROTATION_DUE: 3,
    };
    return states
      .filter((state) => state.credentialStatus in severity)
      .sort((left, right) => {
        const leftRank = severity[left.credentialStatus] ?? Number.MAX_SAFE_INTEGER;
        const rightRank = severity[right.credentialStatus] ?? Number.MAX_SAFE_INTEGER;
        return leftRank - rightRank;
      });
  }
}
