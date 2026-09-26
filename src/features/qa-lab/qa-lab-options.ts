import type { Option } from "@/shared/lib/options";
import type { QaAuthMode } from "./types";

/**
 * Contra qué API corre la prueba. «Este mismo portal» va primero porque es el único que funciona
 * igual desde cualquier navegador: los demás dependen de dónde esté abierto el portal.
 */
export const ENVIRONMENT_OPTIONS: Option[] = [
  {
    value: "PORTAL",
    label: "Este mismo portal",
    description:
      "La misma API que usa este portal. Es la opción correcta en un portal desplegado.",
  },
  {
    value: "LOCAL",
    label: "Tu máquina (localhost:3005)",
    description:
      "Un backend levantado en tu propio ordenador. Sólo sirve si abriste el portal en tu máquina.",
  },
  {
    value: "STAGING",
    label: "Pruebas compartido",
    description:
      "El entorno de pruebas configurado para el portal; si no hay uno propio, la misma API del portal.",
  },
  {
    value: "PRODUCTION_READONLY",
    label: "Producción (sólo previsualizar)",
    description:
      "Producción: el laboratorio sólo deja previsualizar la petición, nunca enviarla.",
  },
];

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
