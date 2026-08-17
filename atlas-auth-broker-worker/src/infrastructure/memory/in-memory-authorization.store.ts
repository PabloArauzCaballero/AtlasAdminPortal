/**
 * Almacén en memoria de autorizaciones OIDC en curso.
 *
 * Es suficiente mientras el broker corra como un proceso único, y su límite está documentado a
 * propósito: con varias réplicas detrás de un balanceador, el `callback` puede aterrizar en una
 * instancia distinta de la que inició el flujo y el `state` no se encontraría. Para escalar
 * horizontalmente hay que sustituirlo por un respaldo compartido (Redis con TTL), respetando la
 * misma semántica de un solo uso.
 */
import type { PendingAuthorization } from '../../domain/auth-broker.types';
import type { AuthorizationStore } from '../../application/ports';

export class InMemoryAuthorizationStore implements AuthorizationStore {
  private readonly entries = new Map<string, PendingAuthorization>();

  save(pending: PendingAuthorization): Promise<void> {
    this.entries.set(pending.state, pending);
    return Promise.resolve();
  }

  /**
   * Devuelve y BORRA la autorización. El borrado incondicional es la defensa contra replay: aunque
   * el canje posterior falle, ese `state` ya no vuelve a ser utilizable.
   */
  consume(state: string): Promise<PendingAuthorization | undefined> {
    const pending = this.entries.get(state);
    if (pending !== undefined) this.entries.delete(state);
    return Promise.resolve(pending);
  }

  purgeExpired(nowMs: number): Promise<number> {
    let removed = 0;
    for (const [state, pending] of this.entries) {
      if (pending.expiresAt <= nowMs) {
        this.entries.delete(state);
        removed += 1;
      }
    }
    return Promise.resolve(removed);
  }

  /** Autorizaciones vivas. Solo para observabilidad: nunca expone `codeVerifier`. */
  size(): number {
    return this.entries.size;
  }
}
