import type { AmbientVariant } from "./AmbientBackground";

/**
 * Qué fondo ambiental le toca a cada ruta del portal.
 *
 * El portal entero pedía `dashboard`, es decir, la lechada de la portada —aurora al 0,52, red de
 * nodos al 0,75, malla y viñeta— también detrás de los catálogos, la auditoría, las colas de QA y
 * las tablas de esquema. Sobre blanco eso no se lee como profundidad: se lee como suciedad. El
 * verde se cuela por los huecos entre paneles, tiñe sus bordes y el texto de cabecera —que vive
 * sobre el fondo, no sobre una tarjeta— pierde contraste contra una superficie que además cambia
 * de color mientras se lee.
 *
 * Es exactamente la lección que el motor de decisión aprendió y dejó escrita en su propio CSS
 * («la lechada verde se veía a través de los huecos entre paneles»), y que este portal heredó a
 * medias: se trajo el componente y las variantes tranquilas, pero no la decisión de cuándo usar
 * cada una.
 *
 * La regla es al revés que allí: se enumeran las PORTADAS, que son dos, y todo lo demás cae en la
 * variante de trabajo. Así una pantalla nueva nace con el lienzo limpio —que es lo que necesita
 * una tabla— sin que nadie tenga que acordarse de añadirla a una lista.
 */
const PORTADAS: readonly string[] = ["/internal"];

export function ambientVariantFor(pathname: string): AmbientVariant {
  return PORTADAS.includes(pathname) ? "dashboard" : "results";
}
