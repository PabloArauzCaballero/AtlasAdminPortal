import { getApiBaseUrl } from "./config";
import { getStoredInternalSession } from "../auth/session-storage";

/**
 * Suscripción a un flujo de eventos del servidor (SSE), en la capa de transporte.
 *
 * Vive aquí y no en la feature por dos razones que se refuerzan. La primera es el límite de
 * arquitectura: `fetch` directo sólo se permite en `shared/api`, y hacerlo desde una feature deja
 * el detalle del protocolo —el troceado de bloques, la reconexión, el token— repetido en cada
 * pantalla que quiera un hilo en vivo.
 *
 * La segunda es por qué no se usa `EventSource`, que sería lo natural: no admite cabeceras, así
 * que el token tendría que viajar en la URL, donde acaba en los registros de cualquier proxy por
 * el que pase. Con `fetch` el token va en `Authorization`, como en el resto de la API.
 */
export function subscribeToServerEvents<T>(
  path: string,
  onEvent: (event: T) => void,
  onConnectionChange?: (connected: boolean) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;

  const control = new AbortController();
  let closed = false;

  const listen = async (): Promise<void> => {
    const token = getStoredInternalSession()?.accessToken;
    if (!token) return;

    try {
      const response = await fetch(
        `${getApiBaseUrl().replace(/\/+$/, "")}${path}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          signal: control.signal,
        },
      );
      if (!response.ok || !response.body)
        throw new Error(`stream HTTP ${response.status}`);

      onConnectionChange?.(true);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });

        /*
         * Los eventos SSE se separan por línea en blanco, y un trozo puede cortar uno por la
         * mitad: sólo se procesa lo que ya está completo y el resto espera al siguiente.
         */
        const blocks = pending.split("\n\n");
        pending = blocks.pop() ?? "";

        for (const block of blocks) {
          const payload = block
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim())
            .join("");
          if (!payload) continue;
          try {
            onEvent(JSON.parse(payload) as T);
          } catch {
            // Un evento ilegible no puede tumbar el hilo: se ignora y se sigue escuchando.
          }
        }
      }
    } catch {
      // Abortar al desmontar entra por aquí y no es fallo: por eso se comprueba `closed`.
    } finally {
      onConnectionChange?.(false);
    }

    if (!closed) setTimeout(() => void listen(), 3000);
  };

  void listen();

  return () => {
    closed = true;
    control.abort();
  };
}
