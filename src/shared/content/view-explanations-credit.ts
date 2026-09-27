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
      "Pantallas sobre `operations/credit/*` de AtlasBackend (CreditOperationsController, @Roles internal_operator/risk_analyst/admin/platform_admin): catálogo de productos, detalle de la solicitud con su historial, decisión humana, aceptación del negocio y recálculo de la línea.",
    business:
      "Qué crédito ofrece Atlas y cómo se resuelven las solicitudes que el motor no decide solo: quién decidió, con qué motivo y cuándo, siempre con rastro.",
    views: {
      "/internal/operations/credit/products": {
        systems:
          "GET /operations/credit/products (sólo activos y vigentes), POST /operations/credit/products (nace en `draft`, 409 si el código existe) y PATCH /operations/credit/products/:productId/status con `reasonCode`.",
        business:
          "El catálogo que ve el cliente en la app. Un producto nuevo nace en borrador y activarlo es una decisión aparte, con motivo; suspender o retirar lo saca de la oferta al instante sin tocar las solicitudes en curso.",
      },
      "/internal/operations/credit/applications": {
        systems:
          "GET /operations/credit/applications/:id (solicitud + hasta 100 eventos), POST …/decision (409 si ya estaba resuelta o si la revisión es del Motor) y POST …/business-acceptance (sólo con aceptación `pending`). Decidir cierra el caso `CR-…` de la cola de trabajo en la misma transacción.",
        business:
          "La solicitud completa: qué pidió el cliente, qué dijo el motor y qué falta. Aquí una persona aprueba, rechaza o pide más información, y se registra si el negocio acepta la venta que el motor aprobó.",
      },
      "/internal/operations/credit/applications/from-case": {
        systems:
          "Resuelve el caso `CR-<código>` de la cola a su solicitud leyendo GET /customers/:customerId/credit-applications y buscando el código.",
        business:
          "El puente desde la cola de trabajo hasta la solicitud que resuelve el caso.",
      },
    },
  },
];
