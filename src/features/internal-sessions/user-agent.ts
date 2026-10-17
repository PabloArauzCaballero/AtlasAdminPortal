/**
 * «Chrome en macOS» a partir de la cadena del navegador. Sólo para leer la tabla de un vistazo: la
 * cadena entera va en el `title` de la celda. El orden importa: Edge y Opera dicen también «Chrome», y
 * Chrome dice también «Safari».
 */
const NAVEGADORES: ReadonlyArray<[RegExp, string]> = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SISTEMAS: ReadonlyArray<[RegExp, string]> = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

const primero = (
  tabla: ReadonlyArray<[RegExp, string]>,
  texto: string,
): string | null => tabla.find(([patron]) => patron.test(texto))?.[1] ?? null;

export function describeUserAgent(
  userAgent: string | null | undefined,
): string {
  const texto = userAgent?.trim();
  if (!texto) return "Sin dato";
  const navegador = primero(NAVEGADORES, texto);
  const sistema = primero(SISTEMAS, texto);
  if (navegador && sistema) return `${navegador} en ${sistema}`;
  return navegador ?? sistema ?? "Otro cliente";
}
