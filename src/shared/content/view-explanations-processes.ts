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
      "Lee el catálogo de procesos declarado en el código del núcleo (una definición por proceso con su narrativa, etapas y pasos) por `GET /internal/processes`, con sesión interna y el permiso `workflows.read`. Cruza cada paso con el mapa de rutas para saber qué portal llama a su operación. Sólo lee: abrir una ficha no ejecuta ningún paso.",
    business:
      "Los procesos del negocio de principio a fin —el alta de un cliente, el crédito, el cobro, el alta de un comercio— explicados para quien no ha leído el código: para qué existen, quién los mueve, qué pasa cuando fallan y si cada paso que hace una persona tiene su pantalla.",
    views: {
      "/internal/procesos": {
        systems:
          "`GET /internal/processes` devuelve todos los procesos con sus totales; el filtrado y la paginación se hacen en el navegador. Documentado = narrativa de cinco respuestas (≥ 80 caracteres cada una), dueño, entidad de instancia, pantalla en cada etapa de personas y huella en la base igual a la del código. Cableado = cada paso HTTP que ejecuta una persona en un portal aparece llamado por ese portal en el catálogo de Flujos. La ficha (`/internal/processes/:code`) añade etapas y pasos enriquecidos y `…/wiring` lista los pasos sin llamador.",
        business:
          "El inventario de procesos con su estado: cuántos están bien explicados y cuántos tienen pasos que una persona debería hacer desde su portal y todavía no puede. Al abrir uno se ve su ficha: las cinco preguntas, las etapas en orden con desde dónde se hace cada una, los pasos sin pantalla marcados en rojo y de dónde sale lo que dice la ficha.",
      },
      "/internal/procesos/[code]": {
        systems:
          "`GET /internal/processes/:code` devuelve la definición completa del proceso con cada paso enriquecido desde el mapa de rutas (cableado, riesgo, verificación, prueba automática y quién llama a su operación), los contadores de pasos críticos y verificados y las huellas del código y de la base. Cuatro pestañas en `?tab=`: Resumen, Pasos y flujos (con la ficha técnica de cada flujo para quien tiene permiso del mapa de rutas), Casos en curso (`…/instances`, con el caso abierto en `?caso=`) y Documentación y cableado (`…/wiring`).",
        business:
          "La ficha de un proceso: las cinco preguntas que cualquiera debe poder contestar, las etapas en el orden en que ocurren con quién actúa y desde qué pantalla, los casos reales que hay en cada estado y en qué etapa está cada uno, y los pasos que una persona debería poder hacer y hoy no puede, destacados en rojo.",
      },
    },
  },
];
