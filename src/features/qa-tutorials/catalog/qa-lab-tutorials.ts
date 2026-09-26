import type { TutorialDefinition } from "../types";
import { decisionTreeTutorial } from "./qa-lab-tree-tutorial";
import { functionalTutorial } from "./qa-lab-functional-tutorial";

/**
 * Recorridos del Laboratorio de testing (`/internal/qa/lab`).
 *
 * Reglas del catálogo (aprendidas de los recorridos que «no hacían el tour»):
 * - Cada paso que necesita una pestaña la ABRE con `nextRoute` (las pestañas
 *   del Lab viven en la URL). Nunca se espera a que el usuario adivine.
 * - Un paso con `requiredAction` lleva SIEMPRE un `hint` en imperativo que dice
 *   qué botón pulsar y dónde.
 * - No se combina `nextRoute` con `element-appears` en el mismo paso: la
 *   navegación haría aparecer el elemento y el paso se daría por hecho solo.
 */

const LAB = "/internal/qa/lab";
const UNIT = `${LAB}?tab=unitaria`;

const overview: TutorialDefinition = {
  id: "qa-lab-overview",
  module: "Laboratorio",
  tool: "Panorama",
  title: "Primeros pasos en QA LAB",
  description:
    "Qué es QA LAB y cómo se relacionan las operaciones, las pruebas funcionales, las de carga y los recorridos.",
  level: "basic",
  version: 3,
  route: LAB,
  estimatedMinutes: 4,
  goal: "Entender la plataforma desde cero",
  steps: [
    {
      id: "welcome",
      title: "Bienvenido a QA LAB",
      content:
        "QA LAB te deja comprobar que la API del negocio funciona antes de publicar un cambio.\n\nSin escribir código puedes: probar una operación (¿responde bien?), medir cuánto aguanta bajo carga, y encadenar varias para simular un flujo real. Los datos de persona los inventa el generador de datos de prueba: no hace falta escribirlos.",
      example:
        "Piensa en QA LAB como el banco de pruebas del taller: enciendes el motor antes de sacar el coche a la calle.",
      nextRoute: UNIT,
    },
    {
      id: "tabs",
      target: "qa-lab-tabs",
      title: "Tres formas de mirar una prueba",
      content:
        "«Prueba unitaria» comprueba UNA operación. «Journey» encadena VARIAS simulando un caso de negocio. «Árbol de decisión» dibuja el recorrido real del cliente.\n\nEmpieza siempre por la prueba unitaria: es la más rápida para saber si algo está roto.",
      example:
        "¿Se cae el login? → Prueba unitaria de la operación de login. ¿Falla el alta completa de un cliente? → Journey que encadena crear cliente + sesión + riesgo.",
      position: "bottom",
    },
    {
      id: "picker",
      target: "qa-lab-endpoint-picker",
      title: "Aquí eliges qué probar",
      content:
        "Busca la operación por ruta, módulo o acción, y pulsa «Probar» en su fila. El catálogo viene del backend: sólo aparecen operaciones reales.",
      example:
        "Escribe «login» para filtrar las operaciones de autenticación, o «health» para la de salud del servicio.",
      position: "top",
      waitForElement: true,
    },
    {
      id: "guide",
      target: "qa-lab-guide-link",
      title: "¿Dónde pedir ayuda?",
      content:
        "En cualquier momento tienes la Guía y el botón «Tutorial» de cada pestaña. No necesitas memorizar nada: la ayuda vive dentro de la herramienta.",
      example:
        "¿Te pierdes en mitad de una prueba? Pulsa «Tutorial» arriba y retomas justo donde lo dejaste.",
      position: "bottom",
      optional: true,
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
    "Comprueba cuántas peticiones seguidas aguanta una operación sin degradarse.",
  level: "intermediate",
  version: 3,
  route: LAB,
  estimatedMinutes: 6,
  goal: "Probar rendimiento bajo carga",
  steps: [
    {
      id: "what",
      title: "¿Para qué sirve el stress?",
      content:
        "Una API puede funcionar perfecta con un usuario y caerse con mil. La prueba de carga lanza muchas peticiones desde tu navegador para ver si la operación se mantiene rápida y estable. No se guarda en ningún historial: descarga el registro si lo necesitas.",
      example:
        "Útil antes de una campaña: si esperas muchos clientes entrando a la vez, comprueba que el login aguanta ese ritmo.",
      nextRoute: UNIT,
    },
    {
      id: "pick",
      target: "qa-lab-endpoint-picker",
      title: "Primero, elige una operación",
      content:
        "La prueba de carga se hace sobre una operación concreta. Elígela en la tabla pulsando «Probar» en su fila.",
      example:
        "Para practicar, escribe «health» y elige GET /api/v1/health: es inofensiva y responde rápido.",
      position: "top",
      requiredAction: {
        type: "element-appears",
        targetId: "qa-lab-endpoint-selected",
      },
      validation: {
        hint: "pulsa el botón «Probar» de cualquier fila de la tabla.",
      },
    },
    {
      id: "card",
      target: "qa-lab-stress-card",
      title: "Configura la carga",
      content:
        "Esta es la pestaña «Carga». Los campos que importan, con el nombre que ves en pantalla:\n\n• «Peticiones por segundo»: el ritmo que se intenta sostener.\n• «Peticiones a la vez»: cuántas pueden esperar respuesta al mismo tiempo.\n• «Duración (s)» y «Subida gradual (s)»: cuánto dura y cuánto tarda en llegar al ritmo pedido.\n• «Errores tolerados (%)» y «Tope del p95 (ms)»: los umbrales para aprobar. El p95 es el tiempo por debajo del cual queda el 95 % de las peticiones.\n• «Datos distintos por petición»: cada petición lleva una persona distinta del generador; úsalo en operaciones de alta.\n\nUna carga real que cambia datos fuera de tu máquina pide escribir «EJECUTAR».",
      example:
        "5 peticiones por segundo, 5 a la vez, durante 30 s y tope del p95 de 2000 ms (los valores por defecto) es un sondeo seguro para empezar.",
      position: "top",
      nextRoute: `${UNIT}&sub=carga`,
      waitForElement: true,
    },
    {
      id: "read",
      title: "Cómo leer el resultado",
      content:
        "El gráfico de abajo es un EJEMPLO animado. El de tu prueba se dibuja cuando la carga TERMINA, no mientras corre: un punto por segundo, la línea sólida es el p95 de ese segundo y la punteada la media; un punto rojo es un segundo en el que hubo errores.\n\nNo hay línea de umbral: el resumen de arriba dice si el p95 y los errores quedaron dentro de tus topes.",
      example:
        "Unos pocos puntos altos aislados son normales; muchos puntos rojos seguidos significan que la operación no aguanta ese ritmo.",
      demo: "latency",
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
  version: 3,
  route: LAB,
  estimatedMinutes: 7,
  goal: "Crear una prueba de interfaz/flujo",
  steps: [
    {
      id: "what",
      title: "¿Qué es un journey?",
      content:
        "Un journey encadena varias operaciones en orden, pasando datos de una respuesta a la siguiente. Reproduce lo que hace un usuario o un proceso completo, no una sola llamada.",
      example:
        "Journey «Alta de cliente»: 1) crear cliente → 2) tomar su id de la respuesta → 3) abrir sesión con ese id → 4) consultar su riesgo.",
      nextRoute: `${LAB}?tab=journey`,
    },
    {
      id: "panel",
      target: "qa-lab-journey-panel",
      title: "Recorridos precargados y editor de pasos",
      content:
        "Esta es la pestaña «Journey». Arriba están los recorridos listos: «Ejecutar» lanza N personas en el servidor, cada una con su cuenta. Abajo, plegado, el editor de pasos arma a mano UN recorrido para diagnosticarlo: eliges la operación, defines los datos y tomas valores de un paso anterior para el siguiente. Las personas del editor salen del generador de datos con la semilla elegida.",
      example:
        "El paso 1 crea un cliente y guarda `customerId` de la respuesta; el paso 2 lo reutiliza como `{{customerId}}` en la ruta de la sesión.",
      position: "top",
      waitForElement: true,
    },
    {
      id: "read",
      title: "Interpretar un journey",
      content:
        "El journey se detiene (o marca fallo) en el primer paso que no cumple. El resultado te dice EN QUÉ paso se rompió el flujo, que es justo lo que necesitas para reproducir un bug de negocio.",
      example:
        "Si el paso 3 (sesión) falla con 404, el cliente del paso 1 no se creó: el bug está aguas arriba, no en la sesión.",
    },
  ],
};

export const qaLabTutorials: readonly TutorialDefinition[] = [
  overview,
  functionalTutorial,
  stress,
  journey,
  decisionTreeTutorial,
];
