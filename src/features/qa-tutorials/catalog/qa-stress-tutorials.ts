import type { TutorialDefinition } from "../types";

/** Recorridos de perfiles de stress backend-driven (`/internal/qa/stress`). */

const stressProfile: TutorialDefinition = {
  id: "qa-stress-profile",
  module: "Stress",
  tab: "Perfiles",
  tool: "Perfil de stress",
  title: "Crear un perfil de stress",
  description:
    "Define un perfil de carga reutilizable y lánzalo en seco (dry-run) antes de correrlo de verdad.",
  level: "advanced",
  version: 1,
  route: "/internal/qa/stress",
  estimatedMinutes: 6,
  goal: "Uso avanzado de carga",
  steps: [
    {
      id: "what",
      title: "¿Qué es un perfil de stress?",
      content:
        "A diferencia del stress rápido del Lab, un perfil es una configuración de carga guardada y ejecutada por el backend: usuarios virtuales, escalado (ramp), duración y umbrales. Sirve para repetir la misma prueba de carga de forma consistente.",
    },
    {
      id: "new",
      target: "qa-stress-new",
      title: "Nuevo perfil",
      content:
        "Crea el perfil con «Nuevo perfil de stress». Todos los valores tienen ayuda contextual: no necesitas saber de antemano qué es un p95 o un ramp-up.",
      position: "bottom",
      waitForElement: true,
      optional: true,
    },
    {
      id: "dryrun",
      title: "Dry-run primero",
      content:
        "Antes de una corrida real, usa el dry-run: valida la configuración y estima el impacto SIN generar carga real. Es la barrera de seguridad que evita reventar un ambiente por un parámetro mal puesto.",
      example:
        "Si el dry-run avisa de 10.000 VUs por un cero de más, lo corriges antes de tumbar el servidor.",
      relatedErrorCodes: ["STRESS_CONFIG_INVALID"],
    },
    {
      id: "read",
      title: "Leer el historial",
      content:
        "Cada corrida queda en «Historial de stress runs» con su p95, throughput y errores. Compara corridas entre sí para ver si un cambio mejoró o empeoró el rendimiento.",
    },
  ],
};

export const qaStressTutorials: readonly TutorialDefinition[] = [stressProfile];
