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
      "Lee el catálogo de procesos declarado en el código del núcleo (una definición por proceso con su narrativa, etapas y pasos) por `GET /internal/processes`, con sesión interna y el permiso `workflows.read`. Cruza cada paso con el mapa de Flujos para saber qué portal llama a su ruta. Sólo lee: abrir una ficha no ejecuta ningún paso.",
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
          "`GET /internal/processes/:code` devuelve la definición completa del proceso con cada paso enriquecido desde Flujos (estado de cableado, riesgo, verificación y quién llama a su ruta) y las huellas del código y de la base. `…/wiring` alimenta el aviso de pasos sin pantalla. El método y la ruta de cada paso quedan plegados en «Detalle técnico», con enlace a su ficha en Flujos.",
        business:
          "La ficha de un proceso: las cinco preguntas que cualquiera debe poder contestar, cómo se ve que salió bien o mal, las etapas en el orden en que ocurren con quién actúa y desde qué pantalla, y los pasos que una persona debería poder hacer y hoy no puede, destacados arriba y en rojo.",
      },
      "/internal/procesos/[code]/instancias": {
        systems:
          "`GET /internal/processes/:code/instances` cuenta por estado y pagina los casos de la tabla que declara el proceso (sólo si vive en el núcleo; si no, dice en qué sistema están). `…/instances/:id/progress` sitúa un caso en cada etapa comparando su estado con los estados de entrada y salida declarados.",
        business:
          "Los casos reales de un proceso: cuántos hay en cada estado, cuáles siguen en curso y, al abrir uno, en qué etapa está y desde qué pantalla se sigue. Sirve para ver dónde se atascan los casos sin pedir una consulta a sistemas.",
      },
    },
  },
];
