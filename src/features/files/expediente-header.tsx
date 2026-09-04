"use client";

import Link from "next/link";
import { FolderTree, ShieldCheck, ShieldOff } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { formatDateTimeBO } from "@/shared/i18n/bolivia-format";
import { formatearTamano } from "./node-columns";
import type { Expediente } from "./types";

/**
 * La cabecera del expediente: lo que hay que saber ANTES de abrir un archivo.
 *
 * Las tres afirmaciones que se hacen aquí cambian cómo se lee todo lo de abajo:
 *
 *  - si está CONGELADO, lo que se ve es lo que había al enviarse y nadie lo pudo alterar después;
 *  - si tiene MANIFIESTO, esa afirmación está firmada y se puede comprobar;
 *  - si está PURGADO, faltan bytes a propósito y no es un fallo del almacén.
 *
 * Decirlo en el detalle de cada archivo llegaría tarde: la conclusión sobre el caso ya se habría
 * formado.
 */
export function CabeceraDeExpediente({
  expediente,
  acciones,
}: Readonly<{ expediente: Expediente; acciones?: React.ReactNode }>) {
  const congelado =
    expediente.estado === "enviado" || expediente.estado === "cerrado";

  return (
    <>
      <PageHeader
        icon={FolderTree}
        eyebrow="Archivos"
        title={
          expediente.customerCode ?? `Expediente ${expediente.expedienteId}`
        }
        description="Todo lo que se subió, se generó o se revisó sobre esta persona, en un solo sitio."
        actions={acciones}
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone={expediente.estado === "purgado" ? "critical" : "info"}>
          {expediente.estado}
        </Badge>
        {congelado ? (
          <Badge tone="muted">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Congelado{" "}
            {expediente.enviadoEn
              ? `el ${formatDateTimeBO(expediente.enviadoEn)}`
              : ""}
          </Badge>
        ) : null}
        {expediente.manifestPresente ? (
          <Badge tone="success">Manifiesto firmado</Badge>
        ) : (
          <Badge tone="warning">
            <ShieldOff className="h-3.5 w-3.5" aria-hidden />
            Sin manifiesto
          </Badge>
        )}
        <Badge tone="default">{expediente.nodosTotal ?? 0} archivos</Badge>
        <Badge tone="default">{formatearTamano(expediente.bytesTotal)}</Badge>
        {expediente.retencionHasta ? (
          <Badge tone="muted">
            Se conserva hasta {formatDateTimeBO(expediente.retencionHasta)}
          </Badge>
        ) : null}
        {expediente.subjectType === "customer" ? (
          <Link
            href={`/internal/operations/customers/${encodeURIComponent(expediente.subjectId)}/investigation-summary`}
            className="text-sm font-medium text-atlas-accent underline"
          >
            Ver la investigación del cliente
          </Link>
        ) : null}
      </div>
      {expediente.estado === "purgado" ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Este expediente se purgó
          {expediente.purgadoEn
            ? ` el ${formatDateTimeBO(expediente.purgadoEn)}`
            : ""}
          . Las fichas quedan para poder demostrar qué había; los bytes ya no
          están y no se pueden recuperar.
        </p>
      ) : null}
    </>
  );
}
