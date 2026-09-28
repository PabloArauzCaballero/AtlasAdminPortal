/**
 * Qué acciones admite un caso según su estado, con el mismo criterio que el servidor.
 *
 * La máquina de estados vive en el servidor (`SUPPORT_CASE_TRANSITIONS`) y ahí se decide de verdad.
 * Esta copia sólo evita ofrecer un botón que va a terminar en «no se puede desde este estado»:
 * cuando una acción no aplica, se apaga y se explica en una línea qué hay que hacer antes.
 *
 * - Resolver pasa a «Resuelto», que sólo se alcanza desde «En curso», las esperas y «Escalado».
 *   Un caso pasa a «En curso» cuando un agente le escribe al cliente por la conversación.
 * - Cerrar exige una resolución documentada: sólo desde «Resuelto» o «Duplicado».
 * - Escalar sigue la tabla; un caso ya escalado puede volver a escalarse (otro tipo, otro equipo).
 * - Transferir a otra cola devuelve el caso a «Clasificado» sin agente, y eso sólo se admite desde
 *   «Nuevo», «Clasificado», «Asignado» y «Reabierto».
 */
export type AccionCaso = "resolver" | "cerrar" | "escalar" | "transferir";

export type Permiso =
  { permitida: true } | { permitida: false; motivo: string };

const PUEDE_RESOLVER = new Set([
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "WAITING_INTERNAL",
  "WAITING_PARTNER",
  "ESCALATED",
]);

const PUEDE_CERRAR = new Set(["RESOLVED", "DUPLICATE"]);

const PUEDE_ESCALAR = new Set([
  "NEW",
  "TRIAGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "WAITING_INTERNAL",
  "WAITING_PARTNER",
  "ESCALATED",
  "ON_HOLD",
  "REOPENED",
]);

const PUEDE_TRANSFERIR = new Set(["NEW", "TRIAGED", "ASSIGNED", "REOPENED"]);

/** Estados en los que el caso ya terminó: ninguna acción de trabajo aplica. */
const TERMINADOS = new Set(["CLOSED", "CANCELLED"]);

const SI: Permiso = { permitida: true };
const no = (motivo: string): Permiso => ({ permitida: false, motivo });

function motivoResolver(estado: string): string {
  if (estado === "RESOLVED") return "El caso ya está resuelto.";
  if (TERMINADOS.has(estado))
    return "El caso ya terminó; para resolverlo, reábrelo.";
  if (estado === "DUPLICATE")
    return "Un duplicado no se resuelve: se trabaja en el caso original.";
  if (estado === "ON_HOLD")
    return "El caso está en pausa: desde aquí sólo puede escalarse, y una vez escalado ya se puede resolver.";
  return "Para resolver, primero tómalo y responde al cliente por la conversación: al contestarle, el caso pasa a «En curso».";
}

function motivoCerrar(estado: string): string {
  if (TERMINADOS.has(estado)) return "El caso ya está cerrado o cancelado.";
  return "Sólo se cierra un caso resuelto o marcado como duplicado: primero resuélvelo con su código y respuesta.";
}

function motivoEscalar(estado: string): string {
  if (estado === "RESOLVED")
    return "Un caso resuelto no se escala; si el problema sigue, se reabre.";
  if (TERMINADOS.has(estado) || estado === "DUPLICATE")
    return "El caso ya terminó; no se puede escalar.";
  return "Desde este estado no se puede escalar.";
}

function motivoTransferir(estado: string): string {
  if (TERMINADOS.has(estado) || estado === "RESOLVED" || estado === "DUPLICATE")
    return "El caso ya terminó; no se puede pasar a otra cola.";
  return "Con el caso ya en marcha no se puede cambiar de cola: escálalo si necesita a otro equipo.";
}

export function permisoAccion(accion: AccionCaso, estado: string): Permiso {
  switch (accion) {
    case "resolver":
      return PUEDE_RESOLVER.has(estado) ? SI : no(motivoResolver(estado));
    case "cerrar":
      return PUEDE_CERRAR.has(estado) ? SI : no(motivoCerrar(estado));
    case "escalar":
      return PUEDE_ESCALAR.has(estado) ? SI : no(motivoEscalar(estado));
    case "transferir":
      return PUEDE_TRANSFERIR.has(estado) ? SI : no(motivoTransferir(estado));
  }
}

export function accionesPermitidas(
  estado: string,
): Record<AccionCaso, Permiso> {
  return {
    resolver: permisoAccion("resolver", estado),
    cerrar: permisoAccion("cerrar", estado),
    escalar: permisoAccion("escalar", estado),
    transferir: permisoAccion("transferir", estado),
  };
}
