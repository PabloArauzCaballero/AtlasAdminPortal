/**
 * Puertos del broker. Todo lo que toca el mundo exterior —vault, red, reloj, almacenamiento de
 * autorizaciones en curso— entra por aquí, para que la lógica de autenticación sea comprobable
 * sin un KMS ni un proveedor real levantado.
 */
import type {
  FederationRealm,
  IdentityProviderConfig,
  PendingAuthorization,
  ProviderCredential,
} from '../domain/auth-broker.types';

/**
 * Custodia del material sensible.
 *
 * `read` devuelve el secreto en claro y es la única puerta por la que sale del vault; quien lo
 * llama debe usarlo de inmediato y no guardarlo. `fingerprint` existe para que el resto del
 * sistema —incluido el portal— pueda razonar sobre QUÉ credencial está cargada sin verla.
 */
export interface SecretVault {
  readonly driver: 'env' | 'kms';
  read(secretRef: string, field: string): Promise<string | undefined>;
  fingerprint(secretRef: string, field: string): Promise<string | undefined>;
  isAvailable(): Promise<boolean>;
}

/**
 * Vault que además admite escritura. Solo la rotación lo necesita, y se separa a propósito: los
 * servicios que únicamente consumen credenciales reciben `SecretVault` y no pueden sobrescribir
 * material aunque tengan un fallo.
 */
export interface WritableSecretVault extends SecretVault {
  /** Sella y guarda el material. Devuelve la huella publicable de lo guardado. */
  seal(secretRef: string, field: string, plaintext: string): Promise<string>;
}

/** Catálogo de credenciales declaradas por proveedor. */
export interface CredentialRegistry {
  list(): Promise<readonly ProviderCredential[]>;
  find(providerCode: string): Promise<ProviderCredential | undefined>;
  markRotated(providerCode: string, rotatedAtIso: string): Promise<void>;
  revoke(providerCode: string, revokedAtIso: string): Promise<void>;
}

/** Catálogo de proveedores de identidad para la federación entrante. */
export interface IdentityProviderRegistry {
  list(realm?: FederationRealm): Promise<readonly IdentityProviderConfig[]>;
  find(idpCode: string): Promise<IdentityProviderConfig | undefined>;
}

/**
 * Almacén de autorizaciones en curso. `consume` es de un solo uso: devolver el mismo `state` dos
 * veces habilitaría un replay del `code` (RFC 6749 §10.12), así que la implementación debe borrar
 * la entrada al leerla.
 */
export interface AuthorizationStore {
  save(pending: PendingAuthorization): Promise<void>;
  consume(state: string): Promise<PendingAuthorization | undefined>;
  purgeExpired(nowMs: number): Promise<number>;
}

/** Reloj inyectable: la expiración de tokens y de `state` se prueba sin esperar. */
export interface Clock {
  now(): number;
}

export const systemClock: Clock = {
  now: (): number => Date.now(),
};

/** `fetch` inyectable, para poder comprobar el broker sin salir a la red. */
export type HttpFetch = (url: string, init: RequestInit) => Promise<Response>;

/** Log estructurado. La implementación redacta el contexto antes de emitirlo. */
export interface AuthBrokerLogger {
  info(event: string, context?: Readonly<Record<string, unknown>>): void;
  warn(event: string, context?: Readonly<Record<string, unknown>>): void;
  error(event: string, context?: Readonly<Record<string, unknown>>): void;
}
