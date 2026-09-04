"use client";

import Link from "next/link";
import { FolderTree } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { formatDateTimeBO } from "@/shared/i18n/bolivia-format";
import { useExpedientePorCliente } from "./hooks";
import { formatearTamano } from "./node-columns";

/**
 * El expediente del cliente, dentro de la pantalla donde se decide su caso.
 *
 * ## Por qué aquí y no sólo en «Archivos»
 *
 * Quien decide un caso en revisión humana estaba mirando datos derivados —puntajes, parecidos,
 * conteos— sin un camino al MATERIAL del que salieron. Para ver el carnet había que salir a otra
 * herramienta y buscar al cliente otra vez, así que en la práctica se decidía sin abrirlo. Esta
 * tarjeta es ese camino, y dice de antemano las dos cosas que cambian cómo se lee lo de al lado:
 * si el expediente está congelado (lo que se ve es lo que había al enviarse) y si tiene manifiesto
 * (esa afirmación está firmada).
 *
 * ## Por qué es una consulta aparte y no un campo del resumen
 *
 * Porque el permiso no es el mismo. El resumen de investigación lo ve quien lleva el caso; el
 * expediente exige `expedientes.leer` y se acota por carpeta. Metido en el mismo DTO, el backend
 * tendría que decidir dos autorizaciones en una respuesta, y un 403 del expediente tumbaría toda
 * la investigación. Separado, quien no alcanza simplemente no ve la tarjeta.
 */
export function TarjetaDeExpediente({
  customerId,
}: Readonly<{ customerId: string }>) {
  const expediente = useExpedientePorCliente(customerId);

  // Silencio deliberado: sin permiso, sin expediente todavía, o mientras carga, no hay nada útil
  // que decir y un bloque de error en mitad de la investigación no ayuda a decidir.
  if (!expediente.data) return null;
  const datos = expediente.data;

  return (
    <section className="rounded-2xl border border-atlas-border bg-white shadow-subtle">
      <div className="flex items-center justify-between gap-3 border-b border-atlas-border bg-slate-50/70 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-atlas-text">
          <FolderTree className="h-4 w-4 text-atlas-info" aria-hidden />
          Expediente del cliente
        </h2>
        <Link
          href={`/internal/files/${datos.expedienteId}`}
          className="text-sm font-medium text-atlas-accent underline"
        >
          Abrir los archivos
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2 p-5">
        <Badge tone={datos.estado === "purgado" ? "critical" : "info"}>
          {datos.estado}
        </Badge>
        {datos.manifestPresente ? (
          <Badge tone="success">Manifiesto firmado</Badge>
        ) : (
          <Badge tone="warning">Sin manifiesto</Badge>
        )}
        <Badge tone="default">{datos.nodosTotal ?? 0} archivos</Badge>
        <Badge tone="default">{formatearTamano(datos.bytesTotal)}</Badge>
        {datos.enviadoEn ? (
          <span className="text-xs text-atlas-muted">
            Congelado el {formatDateTimeBO(datos.enviadoEn)}
          </span>
        ) : (
          <span className="text-xs text-atlas-muted">
            Todavía abierto: el cliente puede seguir subiendo documentos.
          </span>
        )}
      </div>
    </section>
  );
}
