import type { ModuleExplanation } from "./view-explanations-types";

/**
 * La sección Procesos. Va en su propio archivo porque los otros dos registros rozan las 300 líneas
 * que admite `yarn max-lines`, y porque es un módulo de negocio, no de sistemas: su texto de
 * negocio lo lee gente de operaciones.
 */
export const processesModuleExplanations: ModuleExplanation[] = [
  {
    module: "Procesos",
    prefixes: ["/internal/procesos"],
    systems:
      "Muestra los procesos tal como están definidos en el sistema (una definición por proceso con su explicación, etapas y pasos). Pide permiso de consulta de procesos. Cruza cada paso con el mapa de rutas para saber desde qué portal se hace. Solo lee: abrir una ficha no ejecuta ningún paso.",
    business:
      "Los procesos del negocio de principio a fin —el alta de un cliente, el crédito, el cobro, el alta de un comercio— explicados para quien no ha leído el código: para qué existen, quién los mueve, qué pasa cuando fallan y si cada paso que hace una persona tiene su pantalla.",
    views: {
      "/internal/procesos": {
        systems:
          "Lista todos los procesos con sus totales. «Documentado» quiere decir que tiene respondidas las cinco preguntas (con al menos 80 caracteres cada una), un responsable, qué se sigue en cada caso, una pantalla en cada etapa que hace una persona y que lo que dice coincide con lo que hay en el sistema. «Conectado» quiere decir que cada paso que hace una persona tiene de verdad una pantalla en su portal que lo lanza.",
        business:
          "El inventario de procesos con su estado: cuántos están bien explicados y cuántos tienen pasos que una persona debería hacer desde su portal y todavía no puede. Al abrir uno se ve su ficha: las cinco preguntas, las etapas en orden con desde dónde se hace cada una, los pasos sin pantalla marcados en rojo y de dónde sale lo que dice la ficha.",
      },
      "/internal/procesos/[code]": {
        systems:
          "La definición completa del proceso, con cada paso cruzado con el mapa de rutas (si está conectado, su riesgo, si está verificado, si tiene prueba automática y quién lo lanza) y el total de pasos críticos y verificados. Cuatro pestañas: Resumen, Pasos y flujos (con la ficha técnica de cada flujo para quien tiene permiso del mapa de rutas), Casos en curso y Documentación y conexiones.",
        business:
          "La ficha de un proceso: las cinco preguntas que cualquiera debe poder contestar, las etapas en el orden en que ocurren con quién actúa y desde qué pantalla, los casos reales que hay en cada estado y en qué etapa está cada uno, y los pasos que una persona debería poder hacer y hoy no puede, destacados en rojo.",
      },
    },
  },
];
