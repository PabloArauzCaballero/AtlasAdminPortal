import axe, { type RunOptions } from "axe-core";

/**
 * Reglas desactivadas para tests de componentes aislados sobre jsdom:
 * - color-contrast: jsdom no calcula layout ni color, daría falsos positivos.
 * - region: un componente suelto no vive dentro de un landmark; eso se valida a
 *   nivel de página (E2E), no aquí.
 */
const COMPONENT_OPTIONS: RunOptions = {
  rules: {
    "color-contrast": { enabled: false },
    region: { enabled: false },
  },
};

/** Devuelve las violaciones de accesibilidad (vacío = sin problemas). */
export async function findA11yViolations(
  container: Element,
): Promise<string[]> {
  const { violations } = await axe.run(container, COMPONENT_OPTIONS);
  return violations.map((v) => `${v.id} (${v.impact}): ${v.help}`);
}
