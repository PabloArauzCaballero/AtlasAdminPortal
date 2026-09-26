import type { Option } from "@/shared/lib/options";
import type { SupportCodeOption, SupportQueue } from "./types";

/**
 * Las listas de la mesa de soporte, con lo que significa cada opción.
 *
 * Las colas y los códigos llegan del backend: una cola es una ENTIDAD, así que su descripción es
 * su ficha (código · contexto · prioridad por defecto) y no un texto inventado. Los códigos de
 * resolución y prioridad traen su propia explicación en `label`, que es justo la descripción.
 */
export function queueOptions(
  queues: SupportQueue[],
  key: "queueCode" | "queueId",
): Option[] {
  return queues.map((cola) => ({
    value: cola[key],
    label: cola.name,
    description:
      cola.description ??
      `${cola.queueCode} · contexto ${cola.contextType} · prioridad por defecto ${cola.defaultPriority}`,
  }));
}

/** El código es la etiqueta; lo que el backend llama `label` es la explicación. */
export function codeOptions(codes: SupportCodeOption[]): Option[] {
  return codes.map((codigo) => ({
    value: codigo.code,
    label: codigo.code,
    description: codigo.label,
  }));
}

export const SIN_CAMBIAR: Option = {
  value: "",
  label: "Sin cambiar",
  description: "Deja este dato del caso tal como está ahora.",
};

export const PRESENCIA_OPTIONS: Option[] = [
  {
    value: "AVAILABLE",
    label: "Disponible",
    description: "Recibes conversaciones nuevas hasta llenar tu capacidad.",
  },
  {
    value: "BUSY",
    label: "Ocupado",
    description: "Sigues con lo tuyo pero no te llegan conversaciones nuevas.",
  },
  {
    value: "AWAY",
    label: "Ausente",
    description: "Fuera de tu puesto un rato; el reparto te salta.",
  },
  {
    value: "WRAP_UP",
    label: "Cerrando",
    description: "Terminando notas de la última atención antes de tomar otra.",
  },
  {
    value: "TRAINING",
    label: "En formación",
    description: "En capacitación; no cuentas como capacidad de la mesa.",
  },
  {
    value: "OFFLINE",
    label: "Desconectado",
    description: "Fuera de turno: no recibes nada hasta volver a conectarte.",
  },
];

export const NIVEL_OPTIONS: Option[] = [
  {
    value: "L1",
    label: "L1",
    description: "Primera línea: atiende y resuelve lo frecuente del cliente.",
  },
  {
    value: "L2",
    label: "L2",
    description: "Segunda línea: recibe lo que L1 no puede cerrar.",
  },
  {
    value: "SPECIALIST",
    label: "Especialista",
    description: "Experto de un dominio (pagos, identidad) al que se deriva.",
  },
  {
    value: "SUPERVISOR",
    label: "Supervisor",
    description: "Ve todos los casos de su equipo y recibe los escalados.",
  },
  {
    value: "MANAGER",
    label: "Responsable",
    description: "Dirige la mesa; ve todo y decide los escalados jerárquicos.",
  },
];

export const CUALQUIER_COLA: Option = {
  value: "",
  label: "Cualquiera",
  description: "Sin cola fija: el reparto le asigna casos de todas.",
};

export const CAPACIDAD_OPTIONS: Option[] = [1, 2, 3, 4, 5, 6, 8, 10].map(
  (valor) => ({
    value: String(valor),
    label: String(valor),
    description:
      valor === 1
        ? "Una conversación a la vez; para quien está aprendiendo."
        : `Hasta ${valor} conversaciones abiertas a la vez antes de dejar de recibir.`,
  }),
);

export const TIPO_ESCALADO_OPTIONS: Option[] = [
  {
    value: "FUNCTIONAL",
    label: "Funcional (hace falta otro equipo)",
    description: "El caso necesita a otro equipo con el conocimiento técnico.",
  },
  {
    value: "HIERARCHICAL",
    label: "Jerárquico (hace falta un supervisor)",
    description: "Hace falta la autoridad de un supervisor para decidir.",
  },
  {
    value: "SECURITY",
    label: "Seguridad",
    description: "Posible acceso indebido o cuenta comprometida del cliente.",
  },
  {
    value: "FRAUD",
    label: "Fraude",
    description: "Señales de fraude: pasa al equipo que investiga fraude.",
  },
  {
    value: "PRIVACY",
    label: "Privacidad",
    description: "Pedido o incidente sobre datos personales del cliente.",
  },
];

export const PRIORIDAD_FILTRO_OPTIONS: Option[] = [
  {
    value: "",
    label: "Todas",
    description: "Casos de cualquier prioridad, de P1 a P4.",
  },
  {
    value: "P1",
    label: "P1",
    description: "Crítica: el cliente no puede operar; se atiende ya.",
  },
  {
    value: "P2",
    label: "P2",
    description: "Alta: afecta a una operación importante del cliente.",
  },
  {
    value: "P3",
    label: "P3",
    description: "Normal: molesta pero el cliente puede seguir operando.",
  },
  {
    value: "P4",
    label: "P4",
    description: "Baja: consulta o mejora sin impacto en la operación.",
  },
];

export const CAUSA_RAIZ_FILTRO_OPTIONS: Option[] = [
  {
    value: "",
    label: "Cualquiera",
    description: "Sin filtrar por causa raíz, resueltos o no.",
  },
  {
    value: "UNKNOWN",
    label: "Sin determinar (UNKNOWN)",
    description: "Se resolvió sin llegar a saber por qué pasó.",
  },
  {
    value: "APPLICATION_DEFECT",
    label: "Defecto de la aplicación",
    description: "Un error del producto de Atlas lo provocó.",
  },
  {
    value: "THIRD_PARTY",
    label: "Proveedor externo",
    description: "Falló un servicio de terceros (banco, pasarela, SMS).",
  },
  {
    value: "USER_MISUNDERSTANDING",
    label: "Malentendido del usuario",
    description: "Todo funcionaba; el cliente entendió mal cómo se usa.",
  },
];

export const ASIGNACION_OPTIONS: Option[] = [
  {
    value: "todos",
    label: "Toda la cola",
    description: "Casos de cualquier agente que tu rol te deja ver.",
  },
  {
    value: "mios",
    label: "Sólo los míos",
    description: "Sólo los casos asignados a ti ahora mismo.",
  },
];
