"use client";

import Link from "next/link";
import { ExternalLink, FolderTree } from "lucide-react";
import { usePartnerFolder } from "./hooks";

/**
 * El enlace a los documentos del comercio.
 *
 * El cajón enseña el estado del expediente, pero los documentos —poder, matrícula, carnet del
 * representante— no vienen en esa lectura: viven en Archivos, en la carpeta del comercio. Sin este
 * enlace, quien verifica tenía que ir a buscarla a mano o, peor, decidir sin haberla abierto.
 */
export function PartnerFolderLink({
  partnerId,
}: Readonly<{ partnerId: string }>) {
  const carpeta = usePartnerFolder(partnerId);
  if (carpeta.isLoading) return null;

  const expedienteId = carpeta.data?.expedienteId;
  return (
    <p className="flex flex-wrap items-center gap-2 rounded-lg border border-atlas-border bg-atlas-soft px-3 py-2 text-xs text-atlas-muted">
      <FolderTree className="h-4 w-4 shrink-0 text-atlas-info" aria-hidden />
      {expedienteId ? (
        <>
          <span>Los documentos del comercio están en Archivos.</span>
          <Link
            href={`/internal/files/${encodeURIComponent(expedienteId)}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 font-medium text-atlas-accent underline"
          >
            Ver documentos en Archivos
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </>
      ) : (
        <span>
          {carpeta.error
            ? "No se pudo comprobar la carpeta de documentos del comercio en Archivos."
            : "Este comercio no tiene carpeta de documentos en Archivos, o tu usuario no tiene acceso a ella."}
        </span>
      )}
    </p>
  );
}
