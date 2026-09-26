/**
 * Vault de producción: los secretos viven cifrados con cifrado de sobre y solo se abren en
 * memoria, en el momento de usarlos.
 *
 * El almacenamiento se inyecta (`SealedSecretStore`) en vez de hablar con un proveedor concreto.
 * Esa frontera es deliberada: el material cifrado puede venir de AWS Secrets Manager, de
 * HashiCorp Vault o de una tabla propia, y en los tres casos la garantía criptográfica la aporta
 * este archivo, no el proveedor. Evita además atar el broker a un SDK de nube antes de que exista
 * la decisión de infraestructura.
 */
import type { SecretVault } from '../../application/ports';
import {
  type MasterKey,
  openSecret,
  parseMasterKey,
  sealSecret,
  secretFingerprint,
} from '../crypto/envelope-encryption';
import { normalizeSecretField, normalizeSecretRef } from './secret-ref';

/** Almacén de sobres cifrados. Nunca ve el material en claro. */
export interface SealedSecretStore {
  /** Devuelve el sobre cifrado, o `undefined` si no hay material para esa clave. */
  get(key: string): Promise<string | undefined>;
  put(key: string, envelope: string): Promise<void>;
  /** Señala si el respaldo está accesible; alimenta la readiness del broker. */
  isAvailable(): Promise<boolean>;
}

/** Respaldo en memoria, para pruebas y para arranque local con secretos sembrados. */
export class InMemorySealedSecretStore implements SealedSecretStore {
  private readonly entries = new Map<string, string>();

  get(key: string): Promise<string | undefined> {
    return Promise.resolve(this.entries.get(key));
  }

  put(key: string, envelope: string): Promise<void> {
    this.entries.set(key, envelope);
    return Promise.resolve();
  }

  isAvailable(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

export class EnvelopeSecretVault implements SecretVault {
  readonly driver = 'kms' as const;

  private readonly masterKey: MasterKey;

  /**
   * Caché de huellas. Calcular la huella exige abrir el sobre, y el portal la consulta en cada
   * pintado del catálogo; cachear solo la huella —que es pública— evita descifrar material
   * sensible una vez por refresco de pantalla.
   */
  private readonly fingerprintCache = new Map<string, string>();

  constructor(
    masterKeyBase64: string,
    private readonly store: SealedSecretStore,
  ) {
    this.masterKey = parseMasterKey(masterKeyBase64);
  }

  private storeKey(secretRef: string, field: string): string {
    return `${normalizeSecretRef(secretRef)}/${normalizeSecretField(field)}`;
  }

  async read(secretRef: string, field: string): Promise<string | undefined> {
    const envelope = await this.store.get(this.storeKey(secretRef, field));
    if (envelope === undefined) return undefined;
    return openSecret(this.masterKey, envelope);
  }

  async fingerprint(secretRef: string, field: string): Promise<string | undefined> {
    const key = this.storeKey(secretRef, field);
    const cached = this.fingerprintCache.get(key);
    if (cached !== undefined) return cached;

    const value = await this.read(secretRef, field);
    if (value === undefined) return undefined;

    const fingerprint = secretFingerprint(value);
    this.fingerprintCache.set(key, fingerprint);
    return fingerprint;
  }

  /**
   * Sella y guarda un secreto. Lo usa la rotación: escribir la credencial nueva es una operación
   * del broker, no del llamante, para que el material en claro no cruce ninguna otra frontera.
   */
  async seal(secretRef: string, field: string, plaintext: string): Promise<string> {
    const key = this.storeKey(secretRef, field);
    await this.store.put(key, sealSecret(this.masterKey, plaintext));
    const fingerprint = secretFingerprint(plaintext);
    this.fingerprintCache.set(key, fingerprint);
    return fingerprint;
  }

  isAvailable(): Promise<boolean> {
    return this.store.isAvailable();
  }
}
