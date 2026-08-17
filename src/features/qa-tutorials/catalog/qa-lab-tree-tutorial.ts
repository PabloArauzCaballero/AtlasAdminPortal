import type { TutorialDefinition } from "../types";

/**
 * Recorrido de la pestaña «Árbol de decisión» del Laboratorio, que dibuja el
 * catálogo de flujos del backend (`/api/v1/workflows`). Explica primero qué es
 * el flujo declarado y después cómo leer el lienzo.
 */
export const decisionTreeTutorial: TutorialDefinition = {
  id: "qa-lab-decision-tree",
  module: "Laboratorio",
  tab: "Árbol de decisión",
  tool: "Árbol de decisión",
  title: "Leer el árbol de decisión del recorrido",
  description:
    "El proceso estándar del negocio tal como lo publica el backend: etapas, endpoints, condiciones de paso y dependencias.",
  level: "intermediate",
  version: 3,
  route: "/internal/qa/lab",
  estimatedMinutes: 7,
  goal: "Entender el recorrido real del cliente",
  steps: [
    {
      id: "what",
      title: "El recorrido no se inventa: se consulta",
      content:
        "El backend ya sabía QUÉ endpoints expone. El catálogo de flujos responde lo que faltaba: en qué ORDEN se recorren, bajo qué CONDICIÓN se pasa de uno al siguiente y qué estado del cliente habilita cada paso.\n\nEsta pestaña dibuja ese catálogo. No es un diagrama pintado a mano: si el backend publica una versión nueva del flujo, el dibujo cambia solo.",
      example:
        "Hoy hay tres flujos publicados: el alta de cuenta hasta la sesión iniciada, el arranque de la app hasta la primera pantalla, y el recorrido completo hasta la decisión de crédito.",
      demo: "decision-tree",
    },
    {
      id: "open",
      target: "qa-lab-tabs",
      title: "Abre la pestaña «Árbol de decisión»",
      content:
        "Es la tercera pestaña del Lab. Al abrirla, el portal pide el flujo al backend y lo dibuja como un lienzo de nodos: se arrastra para moverse y se hace zoom con Ctrl + rueda. Es de solo lectura: el catálogo lo publica el backend.",
      position: "bottom",
      requiredAction: {
        type: "element-appears",
        targetId: "workflow-canvas",
      },
      validation: { hint: "Pulsa «Árbol de decisión» para continuar…" },
    },
    {
      id: "stages",
      target: "workflow-graph",
      title: "Cada columna es una etapa",
      content:
        "Las etapas van en orden de ejecución y llevan su módulo y su actor: quién la ejecuta — el cliente desde la app, un usuario interno desde el portal, o el sistema.\n\nEl color del borde es el actor; el borde punteado marca las etapas opcionales. Las subetapas se dibujan anidadas dentro de su etapa madre.",
      example:
        "«Captura de datos (KYC)» es del cliente y contiene siete subetapas: contacto, datos personales, perfil económico, domicilio, documentos, referencias y consentimientos.",
      position: "right",
      waitForElement: true,
    },
    {
      id: "steps",
      target: "workflow-graph",
      title: "Cada nodo es un endpoint real",
      content:
        "Dentro de la etapa, cada fila es un paso: su método, su ruta y su nombre de negocio. Es el endpoint que hay que llamar de verdad — el mismo que puedes probar en la pestaña «Prueba unitaria».\n\nLa fila punteada es un paso opcional; las etiquetas «entrada» y «salida» marcan por dónde empieza y termina el recorrido.",
      example:
        "La entrada del flujo es POST /customer-onboarding/start y la salida, POST /operations/credit/applications/:id/decision.",
      position: "right",
      waitForElement: true,
    },
    {
      id: "edges",
      target: "workflow-legend",
      title: "Las flechas son las decisiones",
      content:
        "Aquí está el árbol de decisión: cada flecha lleva la condición bajo la que se toma.\n\nVerde «si sale bien», roja «si falla», azul «según el estado del cliente», ámbar «condicional». Las curvas del carril derecho son los saltos — las ramas de excepción que un listado ordenado no puede mostrar. Las moradas punteadas son dependencias: qué paso exige que otro esté hecho antes.",
      example:
        "Si la verificación de identidad falla, una flecha roja deriva a evidencia externa en vez de seguir al siguiente paso.",
      position: "left",
      waitForElement: true,
    },
    {
      id: "detail",
      target: "workflow-detail",
      title: "La ficha de lo que selecciones",
      content:
        "Pulsa una etapa, un paso o una flecha y aquí se explica lo que el catálogo declara: roles autorizados, estados requeridos y resultantes, eventos que produce, errores posibles y de qué pasos depende.\n\nDe una etapa verás además su regla de completitud: cuándo el backend la da por terminada.",
      example:
        "Selecciona GET /auth/me y pulsa «Enviar GET»: responde 200 con tu propio actor, o 401 si tu sesión caducó.",
      position: "left",
      waitForElement: true,
    },
    {
      id: "filters",
      target: "workflow-controls",
      title: "Versión y filtros",
      content:
        "El catálogo está versionado: puedes ver la vigente o una versión concreta, sin que publicar una nueva cambie lo que ven los demás.\n\nLos filtros por módulo y actor los aplica el BACKEND, no el navegador: así el recorte nunca deja una flecha apuntando a un paso que ya no está en pantalla.",
      example:
        "«Alta de cuenta» responde qué endpoints toca un usuario para registrarse y quedar logueado; «primera pantalla», qué se llama entre el login y el inicio.",
      position: "bottom",
      waitForElement: true,
    },
    {
      id: "why",
      title: "Para qué te sirve en QA",
      content:
        "Te dice qué probar y en qué orden: los pasos obligatorios del camino principal son los que no pueden fallar, y las dependencias te dicen qué hay que dejar hecho antes de probar uno suelto.\n\nAdemás, el backend compara este flujo declarado con las rutas realmente montadas: si alguien borra un endpoint del proceso, el informe de consistencia lo detecta.",
      example:
        "¿Vas a armar un journey en la pestaña anterior? Copia de aquí el orden de los pasos y sus rutas: es el recorrido real, no uno inventado.",
      optional: true,
    },
  ],
};
