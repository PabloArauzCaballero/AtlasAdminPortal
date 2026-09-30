import { describe, expect, it } from "vitest";
import { plainExcerpt } from "@/features/consent-documents/consent-document-columns";

const CONTACTOS = `## Qué autoriza

Que Atlas lea la ficha de cada contacto: nombres, teléfonos, correos, empresas.

## Para qué la usamos

- Verificar que eres quien dices ser.
- **Detectar** solicitudes distintas que se hacen pasar por ti.`;

describe("extracto del texto de un consentimiento", () => {
  it("quita las marcas de Markdown y junta las líneas", () => {
    const extracto = plainExcerpt(CONTACTOS, 1000);
    expect(extracto).not.toMatch(/##|\*\*|^- /m);
    expect(extracto).not.toContain("\n");
    expect(extracto.startsWith("Qué autoriza Que Atlas lea la ficha")).toBe(
      true,
    );
    expect(extracto).toContain("Detectar solicitudes distintas");
  });

  it("recorta con puntos suspensivos y no inventa texto si no hay cuerpo", () => {
    expect(plainExcerpt(CONTACTOS, 20).endsWith("…")).toBe(true);
    expect(plainExcerpt(CONTACTOS, 20).length).toBeLessThanOrEqual(21);
    expect(plainExcerpt(null)).toBe("");
  });
});
