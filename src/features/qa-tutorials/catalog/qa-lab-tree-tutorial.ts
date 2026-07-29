import type { TutorialDefinition } from "../types";

/**
 * Recorrido de la pestaña «Árbol de decisión» del Laboratorio. Explica el
 * dibujo antes que la herramienta: qué es una bifurcación, qué significa que un
 * dato viaje entre pasos y qué se rompe cuando uno responde mal.
 */
export const decisionTreeTutorial: TutorialDefinition = {
  id: "qa-lab-decision-tree",
  module: "Laboratorio",
  tab: "Árbol de decisión",
  tool: "Árbol de decisión",
  title: "Leer el árbol de decisión de un recorrido",
  description:
    "Ve el journey como lo que es: una cadena de decisiones. Qué pasa en cada bifurcación y qué se rompe aguas abajo cuando un paso responde mal.",
  level: "intermediate",
  version: 1,
  route: "/internal/qa/lab",
  estimatedMinutes: 6,
  goal: "Entender qué se rompe si un paso falla",
  steps: [
    {
      id: "what",
      title: "Un recorrido es una cadena de decisiones",
      content:
        "Un journey no es una lista de llamadas: en cada paso hay una pregunta («¿respondió lo esperado?») y un dato que se pasa al siguiente.\n\nEl árbol dibuja esas dos cosas. Mirándolo sabes, sin ejecutar nada, qué parte del negocio se cae si un endpoint concreto se rompe.",
      example:
        "Alta de cliente: si el paso que crea el cliente devuelve 500, nunca se extrae su identificador — y los pasos de sesión y riesgo salen con el hueco sin rellenar.",
      demo: "decision-tree",
    },
    {
      id: "open",
      target: "qa-lab-tabs",
      title: "Abre la pestaña «Árbol de decisión»",
      content:
        "Es la tercera pestaña del Lab. Dibuja exactamente la secuencia que tengas en «Journey (encadenado)»: no hay que copiar nada, las dos pestañas comparten el mismo recorrido.",
      example:
        "Edita un paso en la pestaña Journey, vuelve al árbol y el dibujo ya refleja el cambio.",
      position: "bottom",
      requiredAction: {
        type: "element-appears",
        targetId: "qa-lab-tree-panel",
      },
      validation: {
        hint: "Pulsa «Árbol de decisión» para continuar…",
      },
    },
    {
      id: "map",
      target: "qa-lab-tree-diagram",
      title: "Cómo se lee el dibujo",
      content:
        "Cada caja es un paso: su método, su ruta y las etiquetas de lo que usa y lo que deja.\n\nDebajo de cada caja hay un rombo — la decisión. Si el estado HTTP entra en los esperados, el recorrido baja por la rama verde «sí». Si no, se va por la roja «no», y a la derecha se lee la consecuencia concreta.",
      example:
        "«¿responde 200 · 201?» → sí baja al siguiente paso; no dispara «Se pierde customerId: el paso 3 sale con el marcador sin resolver».",
      position: "right",
      waitForElement: true,
    },
    {
      id: "flow",
      target: "qa-lab-tree-diagram",
      title: "Las curvas de la izquierda son datos",
      content:
        "Cada curva es una variable que un paso extrae de su respuesta y otro consume como {{variable}}. Es lo que convierte pasos sueltos en un flujo de negocio.\n\nSi una curva sale roja y punteada, ese dato no llegará: o el paso que lo produce falló, o nadie lo extrae.",
      example:
        "La curva «customerId» va del paso que crea el cliente al que consulta su riesgo: son dependientes, no independientes.",
      position: "right",
      waitForElement: true,
    },
    {
      id: "play",
      target: "qa-lab-tree-controls",
      title: "Reproduce el recorrido",
      content:
        "«Reproducir recorrido» evalúa los pasos uno a uno, como haría el runner.\n\nEl selector dry-run / ejecución real importa: en dry-run el runner NO extrae variables, así que todo lo encadenado aparece en riesgo. Es el comportamiento real, no un fallo del dibujo.",
      example:
        "¿Ya corriste el journey? Pulsa «Cargar la última corrida» y el árbol se pinta con los estados HTTP reales de esa ejecución.",
      position: "bottom",
      waitForElement: true,
    },
    {
      id: "simulate",
      target: "qa-lab-tree-detail",
      title: "Simula un fallo antes de que ocurra",
      content:
        "Pulsa un paso del árbol y su ficha aparece aquí: de dónde le llegan los datos, qué deja para los siguientes y qué se rompería si respondiera mal.\n\nCon «Simular que este paso falla» marcas la rama «no» y ves el efecto dominó pintado: rojo el que falla, ámbar los que se ejecutan igual pero con datos sin resolver.",
      example:
        "Antes de publicar un cambio en el endpoint de alta, simula su fallo: si se tiñen tres pasos, ese endpoint es crítico y merece prueba de carga además de funcional.",
      position: "left",
      waitForElement: true,
    },
    {
      id: "read",
      title: "Ojo con el matiz: nadie se detiene",
      content:
        "El runner no aborta el recorrido en el primer fallo: sigue ejecutando los pasos siguientes. Lo que se rompe es el DATO.\n\nPor eso el árbol distingue dos cosas: «falla» (el estado HTTP no era el esperado) y «en riesgo» (se ejecuta, pero con un {{marcador}} que nadie resolvió). Un paso en riesgo suele terminar en 400 o 404 confusos: la causa raíz está arriba.",
      example:
        "Si ves un 404 en el paso 3 y el paso 1 falló, no investigues el 3: arregla el 1 y vuelve a correr.",
    },
    {
      id: "next",
      title: "Para qué te sirve esto",
      content:
        "El árbol responde tres preguntas de negocio: qué endpoints son críticos (los que alimentan a muchos), dónde empieza un fallo en cascada, y qué pasos escriben de verdad en el ambiente.\n\nÚsalo antes de ejecutar un journey real y después de una corrida fallida.",
      example:
        "Los pasos marcados «escribe» o «destructivo» son los que no conviene lanzar fuera de LOCAL sin dry-run previo.",
      optional: true,
    },
  ],
};
