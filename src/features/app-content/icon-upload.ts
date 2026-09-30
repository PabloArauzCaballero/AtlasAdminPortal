import { MAX_ICON_BYTES } from "./icon-options";

/** Lado del icono propio. Se pinta a 20–24 px; 96 cubre pantallas de alta densidad sin pasarse de peso. */
const SIDE = 96;
const TIPOS = ["image/png", "image/webp"];

export class IconUploadError extends Error {}

/**
 * Convierte el archivo elegido en el icono que se guarda: cuadrado, de 96 px, PNG.
 *
 * Se reescala AQUÍ y no se le pide a quien edita que lo prepare: quien sube un icono trae lo que
 * tiene —un PNG de 800 px, con fondo transparente— y rechazarlo por pesar 200 KB sería culparle de
 * nuestro tope. El servidor vuelve a comprobar tipo y peso: esto es comodidad, no seguridad.
 */
export async function iconFromFile(file: File): Promise<string> {
  if (!TIPOS.includes(file.type)) {
    throw new IconUploadError(
      "El icono debe ser un PNG o WebP. SVG y GIF no se aceptan.",
    );
  }
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new IconUploadError(
      "No se pudo leer la imagen. Prueba con otro archivo.",
    );
  });
  const canvas = document.createElement("canvas");
  canvas.width = SIDE;
  canvas.height = SIDE;
  const ctx = canvas.getContext("2d");
  if (!ctx)
    throw new IconUploadError("El navegador no pudo preparar la imagen.");
  // Se ajusta dentro del cuadrado sin deformar: un icono estirado se nota en cuanto se ve.
  const scale = Math.min(SIDE / bitmap.width, SIDE / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (SIDE - w) / 2, (SIDE - h) / 2, w, h);
  bitmap.close();
  const uri = canvas.toDataURL("image/png");
  const bytes = Math.floor(((uri.length - uri.indexOf(",") - 1) * 3) / 4);
  if (bytes > MAX_ICON_BYTES) {
    throw new IconUploadError(
      "Aun reducida, la imagen pesa más de 32 KB. Usa un dibujo más simple.",
    );
  }
  return uri;
}
