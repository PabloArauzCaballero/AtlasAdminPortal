/**
 * @file Ruta pública de un documento legal: `/legal/privacy_policy`, `/legal/terms_of_service`…
 * @business La URL que se pega en App Store Connect y en Google Play. Tiene que seguir viva y
 *   pública mientras la app lo esté: una tienda la revisa en cada revisión, no sólo la primera vez.
 * @system Pública a propósito — no pasa por el guardia de sesión del portal, que sólo cubre
 *   `/internal`. `force-dynamic` porque el documento vigente lo decide el backend en cada petición.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  DOCUMENT_LABELS,
  fetchDocument,
} from "@/features/legal/consent-documents";
import { LegalDocumentView } from "@/features/legal/legal-document-view";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ documentCode: string }> };

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { documentCode } = await params;
  const label = DOCUMENT_LABELS[documentCode] ?? "Documento legal";
  return { title: `${label} · ATLAS`, robots: { index: true, follow: true } };
}

export default async function LegalDocumentRoute({ params }: RouteParams) {
  const { documentCode } = await params;
  const document = await fetchDocument(documentCode);
  if (!document) notFound();
  return <LegalDocumentView document={document} />;
}
