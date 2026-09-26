/**
 * @file Índice de los documentos legales vigentes.
 * @business Una sola dirección que recordar (`/legal`) desde la que se llega a todos. La app enlaza
 *   al documento concreto; una persona que llega de fuera no sabe el código y necesita esta lista.
 * @system Si el backend no responde, la página se sigue sirviendo con un aviso en vez de un 500:
 *   ver el porqué en `fetchActiveDocuments`.
 */
import type { Metadata } from "next";
import Link from "next/link";
import {
  DOCUMENT_LABELS,
  fetchActiveDocuments,
} from "@/features/legal/consent-documents";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Documentos legales · ATLAS",
  description:
    "Política de privacidad, términos y condiciones y autorizaciones de ATLAS.",
};

export default async function LegalIndexRoute() {
  const documents = await fetchActiveDocuments();

  return (
    <main style={styles.page}>
      <div style={styles.sheet}>
        <p style={styles.brand}>ATLAS</p>
        <h1 style={styles.title}>Documentos legales</h1>
        <p style={styles.summary}>
          Estos son los textos vigentes que aceptas al usar Atlas. Son los
          mismos que la app te muestra durante el alta.
        </p>
        {documents.length === 0 ? (
          <p style={styles.summary}>
            Los documentos no están disponibles en este momento. Vuelve a
            intentarlo en unos minutos.
          </p>
        ) : (
          <ul style={styles.list}>
            {documents.map((document) => (
              <li key={document.documentCode} style={styles.item}>
                <Link
                  href={`/legal/${document.documentCode}`}
                  style={styles.link}
                >
                  {DOCUMENT_LABELS[document.documentCode] ?? document.title}
                </Link>
                {document.summary ? (
                  <p style={styles.itemSummary}>{document.summary}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
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
  title: { margin: "8px 0 0", fontSize: "28px" },
  summary: { margin: "12px 0 0", fontSize: "16px", color: "#b9c7d9" },
  list: { listStyle: "none", padding: 0, margin: "28px 0 0" },
  item: { padding: "16px 0", borderTop: "1px solid #1b2c44" },
  itemSummary: { margin: "6px 0 0", fontSize: "15px", color: "#8ea0b6" },
  link: { color: "#2be0a8", fontSize: "18px", textDecoration: "none" },
} as const;
