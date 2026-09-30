import type { RbacDriftItem } from "./types";

const lista = (values: readonly string[] | undefined) =>
  (values ?? []).map((value) => `«${value}»`).join(", ");

/**
 * Qué le pasa a una persona, en una frase. Es lo que la pantalla enseña primero: el código de la
 * clase de desajuste no le dice nada a quien tiene que decidir.
 */
export function driftSentence(item: RbacDriftItem): string {
  const menu = lista(item.navPermissions);
  switch (item.severity) {
    case "PERMISO_FUERA_DEL_CATALOGO":
      if (!item.flowId)
        return `El menú pide ${lista(item.missingFromCatalog)}, un permiso que no existe en la base: nadie ve esta pantalla en el menú.`;
      return `La operación pide ${lista(item.missingFromCatalog)}, un permiso que no existe en la base: nadie puede usarla, ni un superadministrador.`;
    case "MENU_PERMISO_DISTINTO":
      return `El menú deja entrar con ${menu} pero la pantalla pide ${lista(item.missingFromMenu)}: quien entra verá «sin permiso».`;
    case "SIN_GUARDA":
      return `El menú pide ${menu || "un rol"}, pero la operación no pide ni permiso ni rol: cualquiera con sesión puede usarla.`;
    case "PUBLIC":
      return "La operación es pública a propósito: no pide inicio de sesión.";
    case "SOLO_ROL":
      return `La operación decide por rol (${item.roles.join(", ") || "—"}), no por el permiso del menú.`;
    default:
      return "Desajuste sin descripción.";
  }
}

/** Qué hacer con cada clase, para quien lo tenga que pedir. */
export function driftAction(item: RbacDriftItem): string {
  switch (item.severity) {
    case "PERMISO_FUERA_DEL_CATALOGO":
      return "Pedir al equipo técnico que cargue el permiso en la base y lo asigne a los roles que lo necesitan.";
    case "MENU_PERMISO_DISTINTO":
      return "Igualar el permiso del menú con el de la operación, o dar los dos a los mismos roles.";
    case "SIN_GUARDA":
      return "Pedir que la operación exija el permiso del menú.";
    default:
      return "Nada, si es a propósito.";
  }
}
