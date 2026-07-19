let fallbackCounter = 0;

/**
 * Genera una llave de idempotencia para una mutación.
 *
 * Regla de uso: se llama UNA vez por acción del usuario y la misma llave se
 * reenvía en cada reintento de esa acción (doble clic, retry de red). No debe
 * regenerarse por reintento — eso anularía la deduplicación del backend.
 */
export function newIdempotencyKey(): string {
  const webcrypto = globalThis.crypto;
  if (webcrypto?.randomUUID) return webcrypto.randomUUID();

  // Fallback sin Math.random: bytes criptográficos + contador para garantizar
  // unicidad incluso si getRandomValues no estuviera disponible.
  const bytes = new Uint8Array(16);
  webcrypto?.getRandomValues?.(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  fallbackCounter += 1;
  return `idk-${hex}-${fallbackCounter}`;
}
