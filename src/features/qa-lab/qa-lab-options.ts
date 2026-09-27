import type { Option } from "@/shared/lib/options";
import type { QaAuthMode } from "./types";

export { ENVIRONMENT_OPTIONS } from "@/features/qa-console/qa-options";

/** Con qué credencial se firma la petición de prueba, sin importar la sesión del portal. */
export const AUTH_MODE_OPTIONS: (Option & { value: QaAuthMode })[] = [
  {
    value: "session",
    label: "Tu sesión",
    description:
      "Firma con tu propia sesión del portal: prueba lo que tú puedes hacer.",
  },
  {
    value: "none",
    label: "Sin identificarse",
    description:
      "Ni token ni cookie de sesión: una operación protegida debería responder 401.",
  },
  {
    value: "invalid",
    label: "Credencial falsa",
    description:
      "Envía un token corrupto a propósito (y sin cookie) para comprobar que se rechaza con 401.",
  },
  {
    value: "custom",
    label: "Token de otro actor",
    description:
      "Pegas el token de otro actor (cliente, comercio…) para probar qué puede hacer; tu cookie no viaja.",
  },
];
