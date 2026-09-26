import type { Nodo } from "./types";

/**
 * De qué tipo es un archivo del expediente, para decidir con qué visor se abre.
 *
 * ## Por qué no basta con lo que dice la respuesta
 *
 * El almacén rotula `application/octet-stream` cuando no supo decir más —un PUT prefirmado sin
 * `Content-Type` deja el objeto así—, el nodo hereda ese tipo y el backend lo repite. Con eso,
 * todo archivo caía en «no se puede previsualizar» aunque el nombre dijera `.pdf` a gritos.
 *
 * El orden es del más específico al más general: lo que dice la respuesta, lo que declaró el nodo
 * y, por último, la extensión del nombre. La extensión es la última porque la pone quien sube, y
 * la primera que sigue estando cuando las otras dos se rindieron.
 */
export function tipoEfectivo(
  contentType: string | undefined,
  nodo: Pick<Nodo, "mimeType" | "nombre">,
): string {
  const candidatos = [contentType, nodo.mimeType, porExtension(nodo.nombre)];
  return candidatos.find((tipo) => tipo && !esGenerico(tipo)) ?? "";
}

function esGenerico(tipo: string): boolean {
  return tipo.startsWith("application/octet-stream");
}

/**
 * Los tipos que este expediente guarda de verdad: identidad y domicilio en imagen, extractos en
 * PDF, y el manifiesto y los contactos en JSON. No es una tabla MIME general y no pretende serlo:
 * lo que no esté aquí se descarga, que es lo que hay que hacer con un archivo que no se sabe abrir.
 */
const POR_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  gif: "image/gif",
  json: "application/json",
  txt: "text/plain",
  csv: "text/csv",
  xml: "application/xml",
};

function porExtension(nombre: string): string | undefined {
  const extension = nombre.split(".").pop()?.toLowerCase();
  return extension ? POR_EXTENSION[extension] : undefined;
}

export function esTexto(tipo: string): boolean {
  return (
    tipo.includes("json") || tipo.startsWith("text/") || tipo.includes("xml")
  );
}

/**
 * El mismo contenido, rotulado con el tipo que de verdad tiene.
 *
 * Elegir bien el visor no basta: lo que decide si el navegador PINTA un PDF dentro de un
 * `<iframe>` es el tipo del blob, no el elemento que lo envuelve. Con `application/octet-stream`
 * el marco se queda en `about:blank` —en blanco, sin un solo error en la consola ni en la
 * pantalla—, que es exactamente como se veía el extracto bancario. Una imagen se salva porque el
 * navegador olfatea los bytes; un marco no lo hace.
 *
 * Se devuelve el mismo blob cuando el tipo ya es correcto: reenvolverlo copia la referencia, no
 * los bytes, pero mantener la identidad evita recrear la URL del objeto sin motivo.
 */
export function conTipo(blob: Blob, tipo: string): Blob {
  if (!tipo || blob.type === tipo) return blob;
  return new Blob([blob], { type: tipo });
}
