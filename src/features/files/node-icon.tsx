"use client";

import {
  File,
  FileJson,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/cn";
import type { Nodo } from "./types";

/**
 * El icono de un nodo, en un solo sitio.
 *
 * La tabla y el árbol lateral enseñan lo mismo y deben enseñarlo igual: si un PDF sale con un
 * icono en la lista y con otro en el panel de la izquierda, quien mira duda de si son el mismo
 * archivo. Antes vivía dentro de las columnas de la tabla, donde el árbol no podía alcanzarlo.
 */
export function IconoDeNodo({
  nodo,
  abierta = false,
  className,
}: Readonly<{ nodo: Nodo; abierta?: boolean; className?: string }>) {
  const clase = cn("h-4 w-4 shrink-0", className);
  if (nodo.tipo === "carpeta") {
    return abierta ? (
      <FolderOpen className={cn(clase, "text-atlas-info")} aria-hidden />
    ) : (
      <Folder className={cn(clase, "text-atlas-info")} aria-hidden />
    );
  }

  const tipo = nodo.mimeType ?? "";
  if (tipo.startsWith("image/"))
    return <ImageIcon className={cn(clase, "text-violet-500")} aria-hidden />;
  if (tipo.includes("pdf"))
    return <FileText className={cn(clase, "text-red-500")} aria-hidden />;
  if (tipo.includes("json") || tipo.includes("xml"))
    return <FileJson className={cn(clase, "text-amber-600")} aria-hidden />;
  if (tipo.includes("csv") || tipo.includes("sheet") || tipo.includes("excel"))
    return (
      <FileSpreadsheet className={cn(clase, "text-emerald-600")} aria-hidden />
    );
  if (tipo.startsWith("text/"))
    return <FileText className={cn(clase, "text-slate-500")} aria-hidden />;
  return <File className={cn(clase, "text-slate-500")} aria-hidden />;
}
