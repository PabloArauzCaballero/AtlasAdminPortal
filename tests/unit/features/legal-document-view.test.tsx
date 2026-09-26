import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ConsentDocument } from "@/features/legal/consent-documents";
import { LegalDocumentView } from "@/features/legal/legal-document-view";

/**
 * La página legal pública.
 *
 * Es la única pantalla del portal que puede abrir cualquiera sin sesión, y su contenido sale de la
 * base de datos. Las dos reglas que se prueban aquí son por eso: que el texto se pinte escapado —no
 * como HTML— y que un documento sin cuerpo no salga en blanco, porque una política de privacidad
 * vacía es indistinguible de una que no existe para quien la revisa.
 */

function documento(overrides: Partial<ConsentDocument> = {}): ConsentDocument {
  return {
    documentCode: "privacy_policy",
    versionCode: "v1",
    language: "es",
    title: "Política de privacidad",
    summary: "Qué guardamos y para qué.",
    bodyMarkdown: "## Qué guardamos\n\nTus datos de identidad\ny contacto.",
    contentUrl: null,
    ...overrides,
  };
}

describe("LegalDocumentView", () => {
  it("pinta el título, el resumen y la versión", () => {
    render(<LegalDocumentView document={documento()} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Política de privacidad" }),
    ).toBeTruthy();
    expect(screen.getByText("Qué guardamos y para qué.")).toBeTruthy();
    expect(screen.getByText(/Versión v1/)).toBeTruthy();
  });

  it("convierte los encabezados `##` en encabezados reales", () => {
    render(<LegalDocumentView document={documento()} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Qué guardamos" }),
    ).toBeTruthy();
  });

  it("une los saltos de línea sueltos dentro de un párrafo", () => {
    render(<LegalDocumentView document={documento()} />);

    /* El salto viene del ancho del fichero, no del texto: partir la frase sería inventar formato. */
    expect(screen.getByText("Tus datos de identidad y contacto.")).toBeTruthy();
  });

  it("escapa el HTML del documento en vez de ejecutarlo", () => {
    const { container } = render(
      <LegalDocumentView
        document={documento({
          bodyMarkdown: "<img src=x onerror=alert(1)>\n\n## <b>ojo</b>",
        })}
      />,
    );

    /*
      Quien edita un documento legal en la base no debería poder inyectar script en una página
      pública. React escapa el texto porque se pasa como hijo; la prueba fija esa garantía para que
      nadie la cambie por `dangerouslySetInnerHTML` buscando "que se vea el formato".
    */
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "<b>ojo</b>" }),
    ).toBeTruthy();
  });

  it("no deja la página en blanco si el documento no tiene cuerpo", () => {
    render(<LegalDocumentView document={documento({ bodyMarkdown: null })} />);

    expect(screen.getByText(/no tiene texto publicado/)).toBeTruthy();
  });
});
