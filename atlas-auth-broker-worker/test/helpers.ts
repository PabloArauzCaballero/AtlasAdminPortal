import type {
  AuthBrokerLogger,
  Clock,
  CredentialRegistry,
  SecretVault,
} from '../src/application/ports';
import type { ProviderCredential } from '../src/domain/auth-broker.types';
import { secretFingerprint } from '../src/infrastructure/crypto/envelope-encryption';

/** Reloj controlable: la expiración se comprueba avanzando el tiempo, no esperándolo. */
export class FakeClock implements Clock {
  constructor(private current: number = Date.parse('2026-01-01T00:00:00.000Z')) {}

  now(): number {
    return this.current;
  }

  advance(milliseconds: number): void {
    this.current += milliseconds;
  }

  set(iso: string): void {
    this.current = Date.parse(iso);
  }
}

export class FakeVault implements SecretVault {
  readonly driver = 'env' as const;

  constructor(private readonly entries = new Map<string, string>()) {}

  static withProviderSecret(
    secretRef: string,
    fields: Readonly<Record<string, string>>,
  ): FakeVault {
    const entries = new Map<string, string>();
    for (const [field, value] of Object.entries(fields))
      entries.set(`${secretRef}/${field}`, value);
    return new FakeVault(entries);
  }

  read(secretRef: string, field: string): Promise<string | undefined> {
    return Promise.resolve(this.entries.get(`${secretRef}/${field}`));
  }

  async fingerprint(secretRef: string, field: string): Promise<string | undefined> {
    const value = await this.read(secretRef, field);
    return value === undefined ? undefined : secretFingerprint(value);
  }

  isAvailable(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

export class FakeCredentialRegistry implements CredentialRegistry {
  constructor(private readonly credentials: Map<string, ProviderCredential>) {}

  static of(...credentials: readonly ProviderCredential[]): FakeCredentialRegistry {
    return new FakeCredentialRegistry(
      new Map(credentials.map((entry) => [entry.providerCode, entry])),
    );
  }

  list(): Promise<readonly ProviderCredential[]> {
    return Promise.resolve([...this.credentials.values()]);
  }

  find(providerCode: string): Promise<ProviderCredential | undefined> {
    return Promise.resolve(this.credentials.get(providerCode));
  }

  markRotated(providerCode: string, rotatedAtIso: string): Promise<void> {
    const current = this.credentials.get(providerCode);
    if (current) this.credentials.set(providerCode, { ...current, rotatedAt: rotatedAtIso });
    return Promise.resolve();
  }

  revoke(providerCode: string, revokedAtIso: string): Promise<void> {
    const current = this.credentials.get(providerCode);
    if (current) this.credentials.set(providerCode, { ...current, revokedAt: revokedAtIso });
    return Promise.resolve();
  }
}

export const silentLogger: AuthBrokerLogger = {
  info: (): void => undefined,
  warn: (): void => undefined,
  error: (): void => undefined,
};

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
