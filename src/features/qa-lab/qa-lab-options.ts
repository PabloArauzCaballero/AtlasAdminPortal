import type { Option } from "@/shared/lib/options";
import type { QaAuthMode } from "./types";

export { ENVIRONMENT_OPTIONS } from "@/features/qa-console/qa-options";

/** Con qué credencial se firma la petición de prueba, sin importar la sesión del portal. */
export const AUTH_MODE_OPTIONS: (Option & { value: QaAuthMode })[] = [
  {
    value: "session",
    label: "Sesión actual",
    description:
      "Firma con tu propia sesión del portal: prueba lo que tú puedes hacer.",
  },
  {
    value: "none",
    label: "Sin autenticación",
    description:
      "Sin cabecera Authorization: el endpoint protegido debería responder 401.",
  },
  {
    value: "invalid",
    label: "Token inválido",
    description:
      "Envía un token corrupto a propósito para comprobar que se rechaza.",
  },
  {
    value: "custom",
    label: "Token manual",
    description:
      "Pegas el token de otro actor para probar la matriz de permisos.",
  },
];
