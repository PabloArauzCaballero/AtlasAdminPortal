import type { TutorialDefinition } from "../types";

/** Recorridos de perfiles de stress backend-driven (`/internal/qa/stress`). */

const stressProfile: TutorialDefinition = {
  id: "qa-stress-profile",
  module: "Carga",
  tab: "Perfiles",
  tool: "Perfil de carga",
  title: "Crear un perfil de carga",
  description:
    "Define un perfil de carga reutilizable y encólalo en seco; qué hace hoy la cola y qué no.",
  level: "advanced",
  version: 2,
  route: "/internal/qa/stress",
  estimatedMinutes: 6,
  goal: "Uso avanzado de carga",
  steps: [
    {
      id: "what",
      title: "¿Qué es un perfil de carga?",
      content:
        "A diferencia de la carga rápida del Lab (que corre en tu navegador), un perfil es una configuración de carga GUARDADA: la operación objetivo, las peticiones por segundo, la duración, cuántas a la vez y los topes (errores tolerados y p95 máximo). Sirve para repetir la misma prueba con los mismos números.",
      example:
        "Perfil «Login — pico de campaña»: 50 peticiones por segundo durante 120 s, 20 a la vez, p95 máximo 800 ms.",
    },
    {
      id: "new",
      target: "qa-stress-new",
      title: "Nuevo perfil",
      content:
        "Crea el perfil con el botón «Nuevo perfil». Cada campo tiene su ayuda (ⓘ): no necesitas saber de antemano qué es un p95.",
      example:
        "El p95 es el tiempo por debajo del cual queda el 95 % de las peticiones: con «P95 máximo (ms)» 800, si una de cada veinte tarda más, la corrida no aprueba.",
      position: "bottom",
      waitForElement: true,
      optional: true,
    },
    {
      id: "dryrun",
      title: "Encolar: primero en seco",
      content:
        "Desde el detalle de un perfil, «Encolar simulación» registra el plan SIN generar carga: sirve para validar la configuración.\n\nImportante: encolar deja la corrida «en cola», y sólo se ejecuta si el servicio de carga está encendido en este entorno (la pantalla avisa cuando está apagado). Para medir al momento usa la pestaña «Carga» del Lab.",
      example:
        "Si al encolar ves que el plan suma 10.000 peticiones por un cero de más, lo corriges antes de que exista un ejecutor que lo lance.",
      relatedErrorCodes: ["STRESS_CONFIG_INVALID"],
    },
    {
      id: "read",
      title: "Qué verás en el historial de corridas",
      content:
        "La lista de corridas muestra lo encolado con su estado. Las corridas «completadas» con p95 y errores que aparezcan allí pueden venir de datos de demostración cargados de antemano, no de una carga que hayas lanzado.",
      example:
        "Tu corrida recién encolada aparece como «queued» y se queda así: es lo esperado mientras no haya ejecutor.",
    },
  ],
};

export const qaStressTutorials: readonly TutorialDefinition[] = [stressProfile];
