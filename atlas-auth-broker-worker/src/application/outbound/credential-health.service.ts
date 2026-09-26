/**
 * Proyección publicable del estado de autenticación de cada proveedor.
 *
 * Este servicio es la fuente de la vista "Autenticación" del portal. Su contrato es que TODO lo
 * que devuelve puede pintarse en una pantalla: huellas, fechas y códigos de fallo, nunca material.
 */
import type {
  AccessTokenStatus,
  CredentialStatus,
  ProviderAuthState,
  ProviderCredential,
} from '../../domain/auth-broker.types';
import { SECRET_FIELDS } from '../../infrastructure/vault/secret-ref';
import type { Clock, CredentialRegistry, SecretVault } from '../ports';
import type { TokenBrokerService } from './token-broker.service';

const MILLISECONDS_PER_DAY = 86_400_000;

/** Campo cuya huella identifica la credencial, por método de autenticación. */
const FINGERPRINT_FIELD: Record<string, string> = {
  oauth2_client_credentials: SECRET_FIELDS.clientSecret,
  jwt_bearer: SECRET_FIELDS.privateKey,
  api_key: SECRET_FIELDS.apiKey,
  mtls: SECRET_FIELDS.privateKey,
};

export type CredentialHealthDependencies = {
  readonly credentials: CredentialRegistry;
  readonly vault: SecretVault;
  readonly tokenBroker: TokenBrokerService;
  readonly clock: Clock;
  readonly credentialMaxAgeDays: number;
  readonly rotationWarningDays: number;
  readonly refreshSkewSeconds: number;
};

export class CredentialHealthService {
  constructor(private readonly dependencies: CredentialHealthDependencies) {}

  async states(): Promise<readonly ProviderAuthState[]> {
    const credentials = await this.dependencies.credentials.list();
    return Promise.all(credentials.map((credential) => this.describe(credential)));
  }

  async stateFor(providerCode: string): Promise<ProviderAuthState> {
    const credential = await this.dependencies.credentials.find(providerCode);
    if (!credential) {
      return {
        providerCode,
        authMethod: 'none',
        credentialStatus: 'MISSING',
        tokenStatus: 'NONE',
        scopes: [],
      };
    }
    return this.describe(credential);
  }

  /** Momento en el que la credencial supera la vida máxima permitida por política. */
  private rotationDueAt(credential: ProviderCredential): number {
    const baseline = Date.parse(credential.rotatedAt ?? credential.issuedAt);
    return baseline + this.dependencies.credentialMaxAgeDays * MILLISECONDS_PER_DAY;
  }

  /**
   * Estado de la credencial.
   *
   * `EXPIRED` cubre dos causas distintas —la expiración declarada por el proveedor y el
   * vencimiento de la política de rotación— y se distinguen mirando `expiresAt` frente a
   * `rotationDueAt`. La política de rotación NO bloquea el tráfico (eso lo decide
   * `TokenBrokerService`, que solo falla cerrado ante la expiración declarada): tumbar las
   * verificaciones de identidad de clientes reales porque una credencial cumplió 90 días sería un
   * daño mayor que el riesgo que evita. Aquí se marca para que alguien la rote, no para cortar.
   */
  private credentialStatus(credential: ProviderCredential, now: number): CredentialStatus {
    if (credential.authMethod === 'none') return 'NOT_REQUIRED';
    if (credential.revokedAt !== undefined) return 'REVOKED';
    if (credential.expiresAt !== undefined && Date.parse(credential.expiresAt) <= now) {
      return 'EXPIRED';
    }

    const dueAt = this.rotationDueAt(credential);
    if (now >= dueAt) return 'EXPIRED';
    if (now >= dueAt - this.dependencies.rotationWarningDays * MILLISECONDS_PER_DAY) {
      return 'ROTATION_DUE';
    }
    return 'ACTIVE';
  }

  private tokenStatus(
    providerCode: string,
    now: number,
    requiresToken: boolean,
  ): AccessTokenStatus {
    const diagnostics = this.dependencies.tokenBroker.diagnosticsFor(providerCode);
    if (!requiresToken) return 'NONE';
    if (!diagnostics.hasToken) {
      return diagnostics.lastFailureCode !== undefined ? 'REFRESH_FAILED' : 'NONE';
    }
    const expiresAt = diagnostics.tokenExpiresAt;
    if (expiresAt === undefined) return 'VALID';
    if (expiresAt <= now) return 'EXPIRED';
    if (expiresAt - this.dependencies.refreshSkewSeconds * 1_000 <= now) return 'EXPIRING';
    return 'VALID';
  }

  private async describe(credential: ProviderCredential): Promise<ProviderAuthState> {
    const now = this.dependencies.clock.now();
    const requiresToken =
      credential.authMethod === 'oauth2_client_credentials' ||
      credential.authMethod === 'jwt_bearer';

    const fingerprintField = FINGERPRINT_FIELD[credential.authMethod];
    const fingerprint =
      fingerprintField === undefined
        ? undefined
        : await this.dependencies.vault.fingerprint(credential.secretRef, fingerprintField);

    // Una credencial declarada cuyo material no está en el vault es indistinguible, en la
    // práctica, de no tener credencial: la primera llamada real fallará. Se reporta como MISSING
    // para que el portal lo muestre antes de esa llamada.
    const declaredStatus = this.credentialStatus(credential, now);
    const credentialStatus: CredentialStatus =
      fingerprintField !== undefined && fingerprint === undefined ? 'MISSING' : declaredStatus;

    const diagnostics = this.dependencies.tokenBroker.diagnosticsFor(credential.providerCode);
    const baseline = Date.parse(credential.rotatedAt ?? credential.issuedAt);

    return {
      providerCode: credential.providerCode,
      authMethod: credential.authMethod,
      credentialStatus,
      tokenStatus: this.tokenStatus(credential.providerCode, now, requiresToken),
      scopes: credential.scopes,
      issuedAt: credential.issuedAt,
      credentialAgeDays: Math.floor((now - baseline) / MILLISECONDS_PER_DAY),
      rotationDueAt: new Date(this.rotationDueAt(credential)).toISOString(),
      ...(fingerprint !== undefined ? { credentialFingerprint: fingerprint } : {}),
      ...(credential.rotatedAt !== undefined ? { rotatedAt: credential.rotatedAt } : {}),
      ...(diagnostics.tokenExpiresAt !== undefined
        ? { tokenExpiresAt: new Date(diagnostics.tokenExpiresAt).toISOString() }
        : {}),
      ...(diagnostics.lastRefreshAt !== undefined
        ? { lastRefreshAt: new Date(diagnostics.lastRefreshAt).toISOString() }
        : {}),
      ...(diagnostics.lastFailureCode !== undefined
        ? { lastFailureCode: diagnostics.lastFailureCode }
        : {}),
      ...(diagnostics.lastFailureAt !== undefined
        ? { lastFailureAt: new Date(diagnostics.lastFailureAt).toISOString() }
        : {}),
    };
  }
}
