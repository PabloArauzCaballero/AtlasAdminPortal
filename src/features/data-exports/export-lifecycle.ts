/**
 * El ciclo de vida de un reporte o exportación, y qué permite cada estado.
 *
 * **Qué arregla.** La acción de descarga se ofrecía en cuanto el registro traía
 * una `downloadUrl`, sin mirar ni el estado ni la caducidad. Eso produce dos
 * pantallas que mienten de formas distintas:
 *
 * - Una exportación FALLIDA que llegó a escribir su ruta antes de romperse
 *   enseña «Abrir archivo», y quien lo pulsa recibe un error del servidor sin
 *   ninguna pista de que el trabajo nunca terminó.
 * - Una exportación CADUCADA enseña el mismo botón: hoy funciona y mañana da un
 *   403. El archivo no está roto, es que su ventana pasó — y eso hay que decirlo
 *   antes del clic, no después.
 *
 * **Y lo que faltaba entero: qué hacer cuando NO se puede descargar.** Un
 * reporte fallido o caducado necesita volver a pedirse. Sin esa acción, la única
 * salida es rehacer a mano los filtros en otra pantalla, que es donde se pierde
 * el trabajo — los parámetros ya están guardados en el registro.
 */

/** Qué puede hacer alguien con un trabajo, según su estado. */
export type AccionDeExportacion = "esperar" | "descargar" | "regenerar";

export interface EstadoDeExportacion {
  code: string;
  label: string;
  tone: "muted" | "info" | "success" | "warning" | "critical";
  /** Si el trabajo sigue vivo. Decide si la pantalla debe seguir consultando. */
  enCurso: boolean;
  accion: AccionDeExportacion;
  help: string;
}

export const ESTADOS_DE_EXPORTACION: Record<string, EstadoDeExportacion> = {
  PENDIENTE: {
    code: "PENDIENTE",
    label: "Pendiente",
    tone: "muted",
    enCurso: true,
    accion: "esperar",
    help: "Aceptada y esperando turno. Todavía no ha empezado a generarse.",
  },
  PROCESANDO: {
    code: "PROCESANDO",
    label: "Procesando",
    tone: "info",
    enCurso: true,
    accion: "esperar",
    help: "Generándose ahora. Puedes cerrar la pantalla: el trabajo sigue.",
  },
  COMPLETADA: {
    code: "COMPLETADA",
    label: "Completada",
    tone: "success",
    enCurso: false,
    accion: "descargar",
    help: "Lista para descargar.",
  },
  CADUCADA: {
    code: "CADUCADA",
    label: "Caducada",
    tone: "warning",
    enCurso: false,
    accion: "regenerar",
    help: "Se generó bien, pero su ventana de descarga ya pasó. Vuelve a pedirla con los mismos parámetros.",
  },
  FALLIDA: {
    code: "FALLIDA",
    label: "Fallida",
    tone: "critical",
    enCurso: false,
    accion: "regenerar",
    help: "El trabajo no llegó a terminar. Los parámetros se conservan para reintentarlo.",
  },
  CANCELADA: {
    code: "CANCELADA",
    label: "Cancelada",
    tone: "muted",
    enCurso: false,
    accion: "regenerar",
    help: "Alguien la detuvo antes de terminar.",
  },
};

/**
 * Las grafías que el backend puede escribir.
 *
 * Se acepta más de una por estado porque la columna es texto y han convivido
 * varias generaciones. Una grafía no prevista NO se trata como completada: se
 * cae a «procesando», que es lo conservador —invita a esperar en vez de a pulsar
 * un botón que puede fallar—.
 */
const SINONIMOS: Record<string, string> = {
  PENDING: "PENDIENTE",
  QUEUED: "PENDIENTE",
  PENDIENTE: "PENDIENTE",
  RUNNING: "PROCESANDO",
  PROCESSING: "PROCESANDO",
  IN_PROGRESS: "PROCESANDO",
  PROCESANDO: "PROCESANDO",
  COMPLETED: "COMPLETADA",
  SUCCEEDED: "COMPLETADA",
  READY: "COMPLETADA",
  DONE: "COMPLETADA",
  COMPLETADA: "COMPLETADA",
  EXPIRED: "CADUCADA",
  CADUCADA: "CADUCADA",
  FAILED: "FALLIDA",
  ERROR: "FALLIDA",
  FALLIDA: "FALLIDA",
  CANCELLED: "CANCELADA",
  CANCELED: "CANCELADA",
  CANCELADA: "CANCELADA",
};

export interface EntradaDeExportacion {
  status?: string | null;
  expiresAt?: string | null;
  downloadUrl?: string | null;
}

/**
 * El estado EFECTIVO de una exportación ahora mismo.
 *
 * El orden importa. La caducidad sólo se aplica a lo que llegó a completarse:
 * una exportación fallida no «caduca», falló — y presentarla como caducada
 * sugeriría que hubo un archivo que ya no está, cuando nunca lo hubo.
 *
 * Y una completada SIN ruta de descarga se trata como fallida. Es la
 * combinación que produce el botón que no lleva a ninguna parte: el trabajo se
 * dio por bueno pero no dejó archivo, y decirlo es lo único accionable.
 */
export function estadoDeExportacion(
  entrada: EntradaDeExportacion,
  ahora: Date = new Date(),
): EstadoDeExportacion {
  const clave = entrada.status
    ? (SINONIMOS[entrada.status.trim().toUpperCase()] ?? "PROCESANDO")
    : "PROCESANDO";
  const base =
    ESTADOS_DE_EXPORTACION[clave] ?? ESTADOS_DE_EXPORTACION.PROCESANDO;

  if (base.code !== "COMPLETADA") return base;

  if (!entrada.downloadUrl?.trim()) return ESTADOS_DE_EXPORTACION.FALLIDA;

  const expira = fecha(entrada.expiresAt);
  if (expira !== null && expira.getTime() <= ahora.getTime()) {
    return ESTADOS_DE_EXPORTACION.CADUCADA;
  }
  return base;
}

function fecha(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const parsed = new Date(valor);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Si la pantalla debe seguir consultando este trabajo. */
export function sigueEnCurso(
  entrada: EntradaDeExportacion,
  ahora?: Date,
): boolean {
  return estadoDeExportacion(entrada, ahora).enCurso;
}

/**
 * Cada cuánto volver a preguntar por los trabajos en curso.
 *
 * Sin nada vivo devuelve `false`, que apaga el sondeo. Es la diferencia entre
 * una pantalla abierta toda la tarde haciendo una petición cada cinco segundos
 * —sobre datos que ya no cambian— y una que se calla cuando no hay nada que
 * mirar.
 */
export function intervaloDeSondeo(
  entradas: readonly EntradaDeExportacion[],
  ahora?: Date,
): number | false {
  return entradas.some((entrada) => sigueEnCurso(entrada, ahora))
    ? 5_000
    : false;
}
