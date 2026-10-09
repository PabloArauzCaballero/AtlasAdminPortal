/**
 * Lee un cuerpo HTTP sin pasar de un tope de bytes.
 *
 * `request.arrayBuffer()` o `.text()` cargan el cuerpo ENTERO en memoria antes de que nadie pueda
 * medirlo: comprobar el tamaño después ya no protege nada. Aquí se lee por trozos y, en cuanto se
 * supera el tope, se corta el flujo y se descarta lo leído.
 */
export type CuerpoLeido =
  { ok: true; bytes: Uint8Array<ArrayBuffer> } | { ok: false };

export async function leerCuerpoConTope(
  flujo: ReadableStream<Uint8Array> | null,
  tope: number,
): Promise<CuerpoLeido> {
  if (!flujo) return { ok: true, bytes: new Uint8Array(0) };
  const lector = flujo.getReader();
  const trozos: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > tope) {
      await lector.cancel().catch(() => undefined);
      return { ok: false };
    }
    trozos.push(value);
  }
  const bytes = new Uint8Array(total);
  let desplazamiento = 0;
  for (const trozo of trozos) {
    bytes.set(trozo, desplazamiento);
    desplazamiento += trozo.byteLength;
  }
  return { ok: true, bytes };
}
