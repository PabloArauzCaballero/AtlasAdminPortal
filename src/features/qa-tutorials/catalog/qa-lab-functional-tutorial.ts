import type { TutorialDefinition } from "../types";

const LAB = "/internal/qa/lab";
const FUNCTIONAL = `${LAB}?tab=unitaria&sub=funcional`;

/**
 * «Probar una operación (funcional)». Los nombres entre comillas son los que se ven en pantalla:
 * si cambias un botón, cambia también su `hint` aquí (el usuario busca el texto literal).
 */
export const functionalTutorial: TutorialDefinition = {
  id: "qa-lab-functional",
  module: "Laboratorio",
  tab: "Prueba unitaria",
  tool: "Prueba funcional",
  title: "Probar una operación (funcional)",
  description:
    "Genera datos de prueba, envía una operación real y comprueba que responde lo esperado.",
  level: "basic",
  version: 3,
  route: LAB,
  estimatedMinutes: 6,
  goal: "Probar una API",
  steps: [
    {
      id: "what",
      title: "¿Qué es una prueba funcional?",
      content:
        "Comprueba que una operación hace lo correcto: que responde, con el código esperado y con los datos esperados.\n\nEs la pregunta más básica de QA: «¿esto funciona?».",
      example:
        'Probar GET /api/v1/health espera un 200 con {status:"ok"}. Si devuelve 500, el servicio está caído.',
      nextRoute: FUNCTIONAL,
    },
    {
      id: "pick",
      target: "qa-lab-endpoint-picker",
      title: "Elige la operación",
      content:
        "Busca la operación en la tabla y pulsa «Probar» en su fila. Al elegirla aparece abajo la tarjeta de prueba con su método, su nivel de riesgo y los datos de entrada ya rellenos.",
      example:
        "Escribe «health» en el buscador y elige la fila GET /api/v1/health («Salud del servidor»): no necesita sesión y no cambia nada.",
      position: "top",
      requiredAction: {
        type: "element-appears",
        targetId: "qa-lab-functional-card",
      },
      validation: {
        hint: "escribe «health» en el buscador y pulsa el botón «Probar» de la fila GET /api/v1/health.",
      },
    },
    {
      id: "generate",
      target: "qa-lab-sample-bar",
      title: "Generar datos de prueba",
      content:
        "Los datos de persona (nombre, correo, teléfono, carnet, dirección, dispositivo, ingresos) los inventa el generador del simulador de proveedores; aquí no hay datos escritos a mano.\n\n• «Clase de caso»: válidos, en el límite o inválidos (deben rechazarse).\n• «Personas de prueba»: una semilla con nombre repite SIEMPRE las mismas personas; «Personas nuevas» crea un lote que nunca se usó (lo necesitas en operaciones de alta, que rechazan a alguien que ya existe). La semilla queda escrita para copiarla y repetir.\n• «Ajustar los datos generados»: edad, departamento, ingresos, riesgo del dispositivo, montos.\n\nPulsa «Generar 3 casos» y elige un caso para cargarlo en los datos de entrada.",
      example:
        "La consulta de salud no lleva datos de entrada, así que no hay nada que generar. En «Iniciar alta de cliente», con «Personas nuevas» cada corrida registra a alguien distinto; con «Base» la segunda responde que ya existe.",
      position: "top",
      waitForElement: true,
      optional: true,
    },
    {
      id: "review",
      target: "qa-lab-functional-card",
      title: "Revisa la configuración",
      content:
        "La tarjeta arma la petición por ti: dirección, método y datos de entrada (el primer caso válido de la semilla elegida). «Ambiente» dice contra qué API va; en un portal desplegado, «Este mismo portal».\n\nSi la operación tiene ejemplo, «Usar el ejemplo: …» lo carga con los datos generados. En el resultado, tu credencial y tus cookies aparecen recortadas; lo que escribas en los datos de entrada se envía y se muestra tal cual.",
      example:
        "«Escenario de prueba» → «Sin identificarse» quita tu sesión y cambia «HTTP esperados» a 401: si la operación responde 401, la prueba pasa.",
      position: "top",
      waitForElement: true,
    },
    {
      id: "run",
      target: "qa-lab-run-functional",
      title: "Envía la prueba",
      content:
        "Con «Sólo previsualizar (no envía nada)» marcado, el botón «Previsualizar petición» enseña la petición sin enviarla. Desmarcado, «Enviar petición real» la manda contra el ambiente elegido y espera la respuesta.",
      example:
        "Empieza previsualizando; cuando la dirección y los datos se vean bien, desmarca la casilla y envía de verdad.",
      position: "top",
      requiredAction: {
        type: "element-appears",
        targetId: "qa-lab-functional-result",
      },
      validation: {
        hint: "pulsa el botón resaltado («Previsualizar petición» o «Enviar petición real») y confirma en la ventana que aparece. Si prefieres no hacerlo ahora, pulsa «Omitir paso».",
      },
      optional: true,
    },
    {
      id: "read",
      target: "qa-lab-functional-result",
      title: "Interpreta el resultado",
      content:
        "Mira el código y el tiempo de respuesta:\n\n200 → salió bien.\n401 → falta identificarse o la credencial no vale.\n404 → la ruta no existe (o el registro, si escribiste un número en «Datos de la ruta»).\n500 → error interno del servidor: el problema está en el servidor, no en tu prueba.\n\nEsta prueba no se guarda en ningún historial: si quieres conservarla, descarga el registro.",
      example:
        "Si esperabas 200 y ves 401: revisa que tu sesión tenga permiso, o que no hayas dejado «Sin identificarse» en el escenario.",
      position: "top",
      waitForElement: true,
      optional: true,
      relatedErrorCodes: ["HTTP_401", "HTTP_404", "HTTP_500"],
    },
    {
      id: "next",
      title: "¿Y ahora qué?",
      content:
        "Si pasó: prueba también la carga (pestaña «Carga») para saber si aguanta muchas peticiones.\n\nSi falló: usa la ayuda contextual del error para entender la causa y corregirla.",
      example:
        "Una operación que responde 200 con una petición pero 503 con 300 a la vez pasa la funcional y falla la de carga: ambas importan.",
    },
  ],
};
