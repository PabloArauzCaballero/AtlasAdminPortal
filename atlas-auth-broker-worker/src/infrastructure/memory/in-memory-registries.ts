/**
 * Registros en memoria de credenciales y proveedores de identidad.
 *
 * Sostienen el catálogo declarado y las marcas de rotación/revocación. Cuando el broker deje de
 * ser un proceso único habrá que respaldarlos en base de datos: `markRotated` y `revoke` se
 * perderían al reiniciar, y una revocación que no sobrevive a un reinicio no es una revocación.
 * El límite está aquí y no repartido por el código para que sustituirlo sea un cambio localizado.
 */
import type { CredentialRegistry, IdentityProviderRegistry } from '../../application/ports';
import type {
  FederationRealm,
  IdentityProviderConfig,
  ProviderCredential,
} from '../../domain/auth-broker.types';

export class InMemoryCredentialRegistry implements CredentialRegistry {
  private readonly credentials = new Map<string, ProviderCredential>();

  constructor(seed: readonly ProviderCredential[] = []) {
    for (const credential of seed) this.credentials.set(credential.providerCode, credential);
  }

  list(): Promise<readonly ProviderCredential[]> {
    return Promise.resolve([...this.credentials.values()]);
  }

  find(providerCode: string): Promise<ProviderCredential | undefined> {
    return Promise.resolve(this.credentials.get(providerCode));
  }

  markRotated(providerCode: string, rotatedAtIso: string): Promise<void> {
    const current = this.credentials.get(providerCode);
    if (current === undefined) return Promise.resolve();
    // Rotar reactiva una credencial revocada: sustituir el material es justamente la forma de
    // recuperarse de una revocación, y dejarla revocada obligaría a un segundo paso silencioso.
    const reactivated: ProviderCredential = { ...current, rotatedAt: rotatedAtIso };
    delete (reactivated as { revokedAt?: string }).revokedAt;
    this.credentials.set(providerCode, reactivated);
    return Promise.resolve();
  }

  revoke(providerCode: string, revokedAtIso: string): Promise<void> {
    const current = this.credentials.get(providerCode);
    if (current === undefined) return Promise.resolve();
    this.credentials.set(providerCode, { ...current, revokedAt: revokedAtIso });
    return Promise.resolve();
  }
}

export class InMemoryIdentityProviderRegistry implements IdentityProviderRegistry {
  private readonly providers = new Map<string, IdentityProviderConfig>();

  constructor(seed: readonly IdentityProviderConfig[] = []) {
    for (const provider of seed) this.providers.set(provider.idpCode, provider);
  }

  list(realm?: FederationRealm): Promise<readonly IdentityProviderConfig[]> {
    const all = [...this.providers.values()];
    return Promise.resolve(realm === undefined ? all : all.filter((idp) => idp.realm === realm));
  }

  find(idpCode: string): Promise<IdentityProviderConfig | undefined> {
    return Promise.resolve(this.providers.get(idpCode));
  }
}
