import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * El botón «Descubrir endpoints» tiene que pedir el modo que funciona en un despliegue: la imagen no trae
 * `src/` y SOURCE_SCAN respondía 503 en TEST. Se comprueba sobre el fuente de la pantalla porque la acción
 * vive tras un diálogo de confirmación y lo que importa aquí es el cuerpo que se manda.
 */
describe("Sincronización de catálogo · descubrir endpoints", () => {
  const fuente = readFileSync(
    "src/features/settings/catalog-sync-page.tsx",
    "utf8",
  );

  it("manda OPENAPI_CONTRACT y no SOURCE_SCAN", () => {
    expect(fuente).toContain('mode: "OPENAPI_CONTRACT", persist: true');
    expect(fuente).not.toContain('mode: "SOURCE_SCAN"');
  });
});
