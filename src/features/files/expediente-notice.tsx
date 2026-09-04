"use client";

import Link from "next/link";
import { FolderTree } from "lucide-react";
import { useExpedientePorCliente } from "./hooks";

/**
 * El recordatorio de que hay material sin mirar, dentro del formulario de decisión.
 *
 * ## Qué problema resuelve
 *
 * Se puede decidir un caso sin haber abierto un solo documento del cliente. Nada lo impide y nada
 * lo señala: el formulario pide una decisión y unas notas, y el carnet vive en otra pantalla. Este
 * aviso pone el expediente a un clic EN EL MOMENTO de decidir, que es el único momento en que
 * importa — enseñarlo antes o después es enseñarlo cuando ya nadie lo va a abrir.
 *
 * No bloquea ni obliga: quien decide sabe cuándo el documento es irrelevante para lo que decide.
 * Lo que no puede pasar es que no lo mire por no saber que estaba.
 */
export function AvisoDeExpediente({
  customerId,
}: Readonly<{ customerId: string | null }>) {
  const expediente = useExpedientePorCliente(
    customerId ?? "",
    Boolean(customerId),
  );

  if (!customerId || !expediente.data) return null;
  const datos = expediente.data;

  return (
    <p className="flex flex-wrap items-center gap-2 rounded-lg border border-atlas-border bg-atlas-soft px-3 py-2 text-xs text-atlas-muted">
      <FolderTree className="h-4 w-4 shrink-0 text-atlas-info" aria-hidden />
      <span>
        Este cliente tiene {datos.nodosTotal ?? 0} archivos en su expediente
        {datos.enviadoEn ? ", congelados al enviarse la solicitud" : ""}.
      </span>
      <Link
        href={`/internal/files/${datos.expedienteId}`}
        target="_blank"
        className="font-medium text-atlas-accent underline"
      >
        Verlos antes de decidir
      </Link>
    </p>
  );
}
