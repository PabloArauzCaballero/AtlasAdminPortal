"use client";

import { useEffect, useState } from "react";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime } from "@/shared/lib/format";
import {
  conTipo,
  esAbrible,
  tipoDelBlob,
} from "@/features/files/tipo-de-archivo";
import { useEvidenceDocumentContent } from "./hooks";
import { documentContentErrorText } from "./identity-review-rules";
import type { EvidenceDocument } from "./types";

const ROTULOS: Record<string, string> = {
  identity_front: "Carnet · frente",
  identity_back: "Carnet · dorso",
  selfie: "Selfie",
  bank_statement: "Extracto bancario",
};

/**
 * Un documento de evidencia de identidad (carnet, selfie, extracto), pintado desde un blob local.
 *
 * Sólo PDF e imágenes rasterizadas se pintan o se abren en otra pestaña. El tipo lo declaró quien
 * subió el archivo —un cliente—, así que cualquier otro (HTML, SVG, XML…) se re-rotula para que
 * el navegador lo DESCARGUE en vez de pintarlo en el origen del portal (ADM-05, auditoría
 * 2026-10-09).
 */
export function VistaDeDocumento({
  customerId,
  documento,
}: Readonly<{ customerId: string; documento: EvidenceDocument }>) {
  const contenido = useEvidenceDocumentContent(
    customerId,
    documento.documentId,
  );
  const [url, setUrl] = useState<string | null>(null);
  const tipo = documento.mimeType || contenido.data?.contentType || "";

  useEffect(() => {
    if (!contenido.data) {
      setUrl(null);
      return;
    }
    // El tipo lo declaró quien subió el archivo: se re-rotula para que un HTML o un SVG nunca se
    // abra como documento en el origen del portal; se descarga (ADM-05).
    const blob = conTipo(contenido.data.blob, tipoDelBlob(tipo));
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [contenido.data, tipo]);

  const abrible = esAbrible(tipo);
  const esImagen = abrible && tipo.toLowerCase().startsWith("image/");
  return (
    <figure className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
      <figcaption className="text-xs font-medium text-slate-700 dark:text-slate-300">
        {ROTULOS[documento.documentType] ?? documento.documentType}
      </figcaption>
      <div className="mt-2 flex min-h-32 items-center justify-center overflow-hidden rounded bg-slate-50 dark:bg-slate-900">
        {contenido.isLoading ? <LoadingSkeleton rows={1} /> : null}
        {contenido.error ? (
          <span className="p-2 text-xs text-rose-700">
            {documentContentErrorText(contenido.error)}
          </span>
        ) : null}
        {url && esImagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={ROTULOS[documento.documentType] ?? documento.documentType}
            className="max-h-64 w-auto"
          />
        ) : null}
        {url && abrible && !esImagen ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs underline"
          >
            Abrir documento
          </a>
        ) : null}
        {url && !abrible ? (
          <a
            href={url}
            download={`evidencia-${documento.documentId}`}
            className="text-xs underline"
          >
            Descargar documento
          </a>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        {formatDateTime(documento.uploadedAt)} ·{" "}
        {documento.sha256
          ? `sha256 ${documento.sha256.slice(0, 12)}…`
          : "sin hash"}
      </p>
    </figure>
  );
}
