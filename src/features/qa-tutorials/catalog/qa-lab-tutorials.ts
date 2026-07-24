import type { TutorialDefinition } from "../types";

/**
 * Recorridos del Laboratorio de testing (`/internal/qa/lab`). Explicaciones
 * orientadas al negocio: qué es, para qué sirve, cuándo usarlo, cómo leer el
 * resultado y qué hacer si falla.
 */

const overview: TutorialDefinition = {
  id: "qa-lab-overview",
  module: "Laboratorio",
  tool: "Panorama",
  title: "Primeros pasos en QA LAB",
  description:
    "Qué es QA LAB y cómo se relacionan endpoints, pruebas funcionales, de carga y journeys.",
  level: "basic",
  version: 1,
  route: "/internal/qa/lab",
  estimatedMinutes: 4,
  goal: "Entender la plataforma desde cero",
  steps: [
    {
      id: "welcome",
      title: "Bienvenido a QA LAB",
      content:
        "QA LAB te deja comprobar que la API del negocio funciona antes de publicar un cambio.\n\nSin escribir código, puedes: probar un endpoint (¿responde bien?), medir cuánto aguanta bajo carga, y encadenar varios endpoints para simular un flujo real (por ejemplo: crear cliente → abrir sesión → aprobar riesgo).",
      example:
        "Piensa en QA LAB como el banco de pruebas del taller: enciendes el motor antes de sacar el coche a la calle.",
    },
    {
      id: "tabs",
      target: "qa-lab-tabs",
      title: "Dos formas de probar",
      content:
        "«Prueba unitaria» comprueba UN endpoint (funcional + carga). «Journey» encadena VARIOS endpoints simulando un caso de negocio completo.\n\nEmpieza siempre por la prueba unitaria: es la más rápida para saber si algo está roto.",
      position: "bottom",
    },
    {
      id: "picker",
      target: "qa-lab-endpoint-picker",
      title: "Elige qué probar",
      content:
        "Aquí seleccionas el endpoint. El catálogo viene del backend, así que sólo aparecen endpoints reales y marcados como testeables desde el portal.",
      position: "bottom",
      waitForElement: true,
    },
    {
      id: "guide",
      target: "qa-lab-guide-link",
      title: "¿Dónde pedir ayuda?",
      content:
        "En cualquier momento tienes la Guía y el botón de tutorial (▶) de cada sección. No necesitas memorizar nada: la ayuda vive dentro de la herramienta.",
      position: "bottom",
      optional: true,
    },
  ],
};

const functional: TutorialDefinition = {
  id: "qa-lab-functional",
  module: "Laboratorio",
  tab: "Prueba unitaria",
  tool: "Prueba funcional",
  title: "Probar un endpoint (funcional)",
  description: "Ejecuta un endpoint real y comprueba que responde lo esperado.",
  level: "basic",
  version: 1,
  route: "/internal/qa/lab",
  estimatedMinutes: 5,
  goal: "Probar una API",
  steps: [
    {
      id: "what",
      title: "¿Qué es una prueba funcional?",
      content:
        "Comprueba que un endpoint hace lo correcto: que responde, con el código de estado correcto y con los datos esperados.\n\nEs la pregunta más básica de QA: «¿esto funciona?».",
    },
    {
      id: "pick",
      target: "qa-lab-endpoint-picker",
      title: "1 · Selecciona el endpoint",
      content:
        "Elige el endpoint a probar. Al seleccionarlo verás su método (GET/POST…), su nivel de riesgo y si requiere prueba de carga.",
      position: "bottom",
      requiredAction: {
        type: "element-appears",
        targetId: "qa-lab-functional-card",
      },
      waitForElement: true,
    },
    {
      id: "review",
      target: "qa-lab-functional-card",
      title: "2 · Revisa la configuración",
      content:
        "La tarjeta funcional arma la petición por ti (ruta, método, cuerpo de ejemplo). Los datos sensibles se muestran enmascarados: nunca verás tokens ni contraseñas en claro.",
      position: "left",
      waitForElement: true,
    },
    {
      id: "run",
      target: "qa-lab-run-functional",
      title: "3 · Ejecuta",
      content:
        "Pulsa Ejecutar. QA LAB envía la petición real contra el ambiente seleccionado y espera la respuesta.",
      position: "top",
      requiredAction: {
        type: "element-appears",
        targetId: "qa-lab-functional-result",
      },
      optional: true,
    },
    {
      id: "read",
      target: "qa-lab-functional-result",
      title: "4 · Interpreta el resultado",
      content:
        "Mira el código de estado y el tiempo de respuesta:\n\n200 → salió bien.\n401 → falta autenticación o credenciales inválidas.\n404 → la ruta no existe.\n500 → error interno del servidor (el problema está en backend, no en tu prueba).",
      example:
        "Si esperabas 200 y ves 401: revisa que tu sesión tenga permisos, o que el endpoint no requiera un token que caducó.",
      position: "left",
      waitForElement: true,
      relatedErrorCodes: ["HTTP_401", "HTTP_404", "HTTP_500"],
    },
    {
      id: "next",
      title: "¿Y ahora qué?",
      content:
        "Si pasó: prueba también la carga (pestaña stress) para saber si aguanta muchos usuarios.\n\nSi falló: usa la ayuda contextual del error para entender la causa y corregirla.",
    },
  ],
};

const stress: TutorialDefinition = {
  id: "qa-lab-stress",
  module: "Laboratorio",
  tab: "Prueba unitaria",
  tool: "Prueba de carga",
  title: "Medir la carga (stress)",
  description:
    "Comprueba cuántos usuarios simultáneos aguanta un endpoint sin degradarse.",
  level: "intermediate",
  version: 1,
  route: "/internal/qa/lab",
  estimatedMinutes: 6,
  goal: "Probar rendimiento bajo carga",
  steps: [
    {
      id: "what",
      title: "¿Para qué sirve el stress?",
      content:
        "Una API puede funcionar perfecta con un usuario y caerse con mil. La prueba de carga lanza muchas peticiones a la vez para ver si el endpoint se mantiene rápido y estable.",
      example:
        "Útil antes de una campaña: si esperas 500 clientes entrando a la vez, comprueba que el login aguanta 500 peticiones concurrentes.",
    },
    {
      id: "card",
      target: "qa-lab-stress-card",
      title: "Configura la carga",
      content:
        "Aquí defines los parámetros clave:\n\n• Usuarios virtuales (VUs): cuántas peticiones en paralelo.\n• Duración: cuánto tiempo mantienes la carga.\n• Umbral p95: el tiempo máximo aceptable para el 95% de las respuestas.",
      position: "left",
      waitForElement: true,
    },
    {
      id: "read",
      title: "Cómo leer el resultado",
      content:
        "Fíjate en el p95 y en el porcentaje de errores.\n\nSi el p95 supera tu umbral o aparecen errores 5xx bajo carga, el endpoint no aguanta ese volumen: hay que optimizar backend antes de publicar.",
      relatedErrorCodes: ["STRESS_THRESHOLD_EXCEEDED"],
    },
  ],
};

const journey: TutorialDefinition = {
  id: "qa-lab-journey",
  module: "Laboratorio",
  tab: "Journey (encadenado)",
  tool: "Journey",
  title: "Encadenar un flujo de negocio (journey)",
  description:
    "Simula un caso real encadenando varios endpoints y reutilizando datos entre pasos.",
  level: "advanced",
  version: 1,
  route: "/internal/qa/lab",
  estimatedMinutes: 7,
  goal: "Crear una prueba de interfaz/flujo",
  steps: [
    {
      id: "what",
      title: "¿Qué es un journey?",
      content:
        "Un journey encadena varios endpoints en orden, pasando datos de una respuesta a la siguiente. Reproduce lo que hace un usuario o un proceso completo, no una sola llamada.",
      example:
        "Journey «Alta de cliente»: 1) crear cliente → 2) tomar su id de la respuesta → 3) abrir sesión con ese id → 4) consultar su riesgo.",
    },
    {
      id: "panel",
      target: "qa-lab-journey-panel",
      title: "El editor de pasos",
      content:
        "Cada fila es un paso: eliges endpoint, defines el cuerpo y, si hace falta, tomas un valor de un paso anterior (una variable) para inyectarlo en el siguiente.",
      position: "top",
      waitForElement: true,
    },
    {
      id: "read",
      title: "Interpretar un journey",
      content:
        "El journey se detiene (o marca fallo) en el primer paso que no cumple. El resultado te dice EN QUÉ paso se rompió el flujo, que es justo lo que necesitas para reproducir un bug de negocio.",
    },
  ],
};

export const qaLabTutorials: readonly TutorialDefinition[] = [
  overview,
  functional,
  stress,
  journey,
];
