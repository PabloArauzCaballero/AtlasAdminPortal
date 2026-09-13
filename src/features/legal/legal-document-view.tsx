/**
 * @file Presentación de un documento legal como página pública.
 * @business Es lo que ve un revisor de Apple o Google y cualquier persona que pulse «política de
 *   privacidad» desde la app. No lleva la navegación del portal interno: quien llega aquí no es un
 *   operador, y enseñarle el menú de operaciones sería filtrar la forma del sistema sin motivo.
 * @system Sin dependencias de Markdown. El cuerpo que publica el backend usa sólo encabezados `##`
 *   y párrafos —el mismo subconjunto que pinta la app móvil en `consent-row.tsx`—, así que añadir un
 *   parser completo sería arrastrar una dependencia y su superficie de seguridad para nada.
 */
import type { ConsentDocument } from "./consent-documents";

/**
 * Parte el Markdown en bloques y pinta encabezados y párrafos.
 *
 * Se renderiza como TEXTO, nunca como HTML. El cuerpo viene de la base de datos y esta página es
 * pública: inyectarlo como HTML crudo convertiría cualquier edición del documento legal en un XSS.
 * Por eso el texto se pasa como hijo de React, que lo escapa.
 */
function renderMarkdown(markdown: string) {
  return markdown
    .split("\n\n")
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block, index) => {
      if (block.startsWith("## ")) {
        return (
          <h2 key={index} style={styles.heading}>
            {block.slice(3)}
          </h2>
        );
      }
      /* Los saltos sueltos dentro de un párrafo son del formato del fichero, no del texto. */
      return (
        <p key={index} style={styles.paragraph}>
          {block.replaceAll("\n", " ").replaceAll("**", "")}
        </p>
      );
    });
}

export function LegalDocumentView({ document }: { document: ConsentDocument }) {
  const body = document.bodyMarkdown?.trim() ?? "";

  return (
    <main style={styles.page}>
      <article style={styles.sheet}>
        <p style={styles.brand}>ATLAS</p>
        <h1 style={styles.title}>{document.title}</h1>
        {document.summary ? (
          <p style={styles.summary}>{document.summary}</p>
        ) : null}
        <p style={styles.version}>
          Versión {document.versionCode} · idioma {document.language}
        </p>
        <hr style={styles.rule} />
        {body.length > 0 ? (
          renderMarkdown(body)
        ) : (
          <p style={styles.paragraph}>
            Este documento no tiene texto publicado todavía.
          </p>
        )}
        <hr style={styles.rule} />
        <p style={styles.footer}>
          Para ejercer tus derechos sobre tus datos, escribe a{" "}
          <a href="mailto:privacidad@atlas.bo" style={styles.link}>
            privacidad@atlas.bo
          </a>
          .
        </p>
      </article>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#061426",
    color: "#e8eef7",
    padding: "32px 16px",
    fontFamily: "var(--font-ui), system-ui, -apple-system, sans-serif",
  },
  sheet: { maxWidth: "720px", margin: "0 auto", lineHeight: 1.65 },
  brand: {
    margin: 0,
    letterSpacing: "0.18em",
    fontSize: "12px",
    color: "#2be0a8",
    fontWeight: 600,
  },
  title: { margin: "8px 0 0", fontSize: "28px", lineHeight: 1.25 },
  summary: { margin: "12px 0 0", fontSize: "17px", color: "#b9c7d9" },
  version: { margin: "16px 0 0", fontSize: "13px", color: "#7f92a8" },
  rule: { border: 0, borderTop: "1px solid #1b2c44", margin: "24px 0" },
  heading: { margin: "28px 0 8px", fontSize: "19px" },
  paragraph: { margin: "0 0 14px", fontSize: "16px", color: "#cdd8e6" },
  footer: { margin: 0, fontSize: "14px", color: "#7f92a8" },
  link: { color: "#2be0a8" },
} as const;
