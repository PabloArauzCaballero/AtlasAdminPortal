/**
 * La pantalla que está abierta ahora mismo, para que cada llamada al backend diga de dónde viene.
 *
 * ## Por qué un módulo con estado y no un parámetro
 *
 * `apiRequest` ya acepta `flow`, y nadie lo rellenaba: exigirlo en cada una de las ~190 llamadas
 * habría significado tocarlas todas y olvidarse en la mitad, que es peor que no tenerlo —una
 * cobertura a medias se lee como «esta pantalla no llama a nada»—. Aquí lo pone una sola vez quien
 * sabe la respuesta (el marco de la ruta) y lo lee una sola vez quien la necesita (`buildHeaders`).
 *
 * ## Por qué se manda la RUTA CONCRETA y la normaliza el backend
 *
 * La primera versión intentaba reconstruir aquí la plantilla —`/internal/audit/request/:requestId`—
 * sustituyendo los valores de `useParams()` por su nombre. Una prueba lo tumbó enseguida: con un id
 * cuyo valor coincide con un segmento estático (`/internal/customers/internal`), el reemplazo se
 * come el prefijo y produce `/:id/customers/:id`, una plantilla que no existe en ningún catálogo.
 * El cliente no sabe qué segmento es dinámico sin adivinar, y adivinar aquí significa identificar
 * una pantalla equivocada.
 *
 * Quien sí lo sabe sin adivinar es el backend, porque tiene el catálogo de pantallas con sus
 * plantillas. Así que aquí va la ruta tal cual y allí se resuelve contra las plantillas reales.
 *
 * ## Qué pasa cuando esto no está puesto
 *
 * La cabecera no viaja y el backend guarda un nulo, que significa «nadie dijo de dónde venía».
 * Es exactamente lo que debe pasar con lo que no sale de una pantalla: la app móvil, un webhook o
 * un trabajo de fondo. Nunca se inventa un origen.
 */
let pantallaActual: string | null = null;

/** Formato aceptado por el backend; lo que no encaje se descarta ahí, así que no se manda. */
const PLANTILLA = /^\/[A-Za-z0-9/_:.-]{0,199}$/;

export function setCurrentScreen(plantilla: string | null): void {
  pantallaActual = plantilla && PLANTILLA.test(plantilla) ? plantilla : null;
}

export function getCurrentScreen(): string | null {
  return pantallaActual;
}
