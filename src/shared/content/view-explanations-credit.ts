import type { ModuleExplanation } from "./view-explanations-types";

/**
 * Crédito (P-06). Módulo propio con el prefijo más largo, para que gane al de «Operaciones»
 * (`/internal/operations`) en las pantallas de crédito.
 */
export const creditModuleExplanations: ModuleExplanation[] = [
  {
    module: "Crédito",
    prefixes: ["/internal/operations/credit"],
    systems:
      "Pantallas de crédito para el equipo interno (operaciones, riesgo y administración): catálogo de productos, detalle de la solicitud con su historial, decisión humana, aceptación del negocio y recálculo de la línea.",
    business:
      "Qué crédito ofrece Atlas y cómo se resuelven las solicitudes que el motor no decide solo: quién decidió, con qué motivo y cuándo, siempre con rastro.",
    views: {
      "/internal/operations/credit/products": {
        systems:
          "Lista los productos activos y vigentes. Un producto nuevo se crea en borrador y el código no se puede repetir; activarlo, suspenderlo o retirarlo pide un motivo.",
        business:
          "El catálogo que ve el cliente en la app. Un producto nuevo nace en borrador y activarlo es una decisión aparte, con motivo; suspender o retirar lo saca de la oferta al instante sin tocar las solicitudes en curso.",
      },
      "/internal/operations/credit/applications": {
        systems:
          "La solicitud con hasta 100 eventos de su historial. Se puede decidir solo si no estaba resuelta y si la revisión no le toca al Motor; la aceptación del negocio solo si está pendiente. Decidir cierra a la vez el caso «CR-…» de la cola de trabajo.",
        business:
          "La solicitud completa: qué pidió el cliente, qué dijo el motor y qué falta. Aquí una persona aprueba, rechaza o pide más información, y se registra si el negocio acepta la venta que el motor aprobó.",
      },
      "/internal/operations/credit/applications/from-case": {
        systems:
          "Busca, entre las solicitudes del cliente, la que corresponde al caso «CR-…» de la cola y la abre.",
        business:
          "El puente desde la cola de trabajo hasta la solicitud que resuelve el caso.",
      },
    },
  },
];
