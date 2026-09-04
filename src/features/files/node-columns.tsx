"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  File,
  FileJson,
  FileText,
  Folder,
  Image as ImageIcon,
  Lock,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatDateTimeBO } from "@/shared/i18n/bolivia-format";
import { alcanza, type Nodo, type OrigenNodo } from "./types";

export type AccionesDeFila = {
  onRenombrar: (nodo: Nodo) => void;
  onBorrar: (nodo: Nodo) => void;
  onRestaurar: (nodo: Nodo) => void;
};

/**
 * Cómo se lee una fila del expediente.
 *
 * Tres cosas se codifican en FORMA además de en texto, porque son las que cambian lo que alguien
 * puede hacer con el archivo y hay que verlas sin leer la fila entera:
 *
 *  - el ORIGEN (quién lo puso ahí) distingue lo que subió el cliente de lo que dejó el Motor y de
 *    lo que añadió un operador; sin esa distinción, un documento generado parece aportado;
 *  - el CANDADO dice que está congelado, y por qué no hay acciones;
 *  - el AVISO dice que el objeto ya no está en el almacén, que no es lo mismo que «no lo subió».
 */
const ETIQUETA_ORIGEN: Record<
  OrigenNodo,
  { texto: string; tono: "info" | "muted" | "default" }
> = {
  onboarding: { texto: "Lo subió el cliente", tono: "info" },
  motor: { texto: "Lo vio el Motor", tono: "muted" },
  portal: { texto: "Lo añadió un operador", tono: "default" },
  sistema: { texto: "Generado", tono: "muted" },
};

function IconoDeNodo({ nodo }: Readonly<{ nodo: Nodo }>) {
  if (nodo.tipo === "carpeta")
    return <Folder className="h-4 w-4 text-atlas-info" aria-hidden />;
  const tipo = nodo.mimeType ?? "";
  if (tipo.startsWith("image/"))
    return <ImageIcon className="h-4 w-4 text-slate-500" aria-hidden />;
  if (tipo.includes("pdf"))
    return <FileText className="h-4 w-4 text-slate-500" aria-hidden />;
  if (tipo.includes("json"))
    return <FileJson className="h-4 w-4 text-slate-500" aria-hidden />;
  return <File className="h-4 w-4 text-slate-500" aria-hidden />;
}

/** Bytes en la unidad que una persona lee, con el número alineado por columna. */
export function formatearTamano(bytes: string | null): string {
  const valor = Number(bytes ?? 0);
  if (!Number.isFinite(valor) || valor <= 0) return "—";
  if (valor < 1024) return `${String(valor)} B`;
  if (valor < 1024 * 1024) return `${(valor / 1024).toFixed(1)} kB`;
  return `${(valor / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildNodeColumns(
  onAbrir: (nodo: Nodo) => void,
  acciones?: AccionesDeFila,
): ColumnDef<Nodo>[] {
  const columnas: ColumnDef<Nodo>[] = [
    {
      accessorKey: "nombre",
      header: "Nombre",
      cell: ({ row }) => {
        const nodo = row.original;
        return (
          <button
            type="button"
            onClick={() => onAbrir(nodo)}
            className="flex items-center gap-2 text-left font-medium text-atlas-text hover:underline"
          >
            <IconoDeNodo nodo={nodo} />
            <span
              className={nodo.borradoEn ? "line-through opacity-60" : undefined}
            >
              {nodo.nombre}
            </span>
            {nodo.inmutable ? (
              <Lock
                className="h-3.5 w-3.5 text-slate-400"
                aria-label="Congelado al enviarse el expediente"
              />
            ) : null}
            {nodo.objetoAusente ? (
              <TriangleAlert
                className="h-3.5 w-3.5 text-amber-500"
                aria-label="El archivo ya no está en el almacén"
              />
            ) : null}
          </button>
        );
      },
    },
    {
      accessorKey: "origen",
      header: "Origen",
      cell: ({ row }) => {
        const etiqueta = ETIQUETA_ORIGEN[row.original.origen];
        return <Badge tone={etiqueta.tono}>{etiqueta.texto}</Badge>;
      },
    },
    {
      accessorKey: "sizeBytes",
      header: "Tamaño",
      cell: ({ row }) => (
        <span className="tabular-nums text-slate-600">
          {row.original.tipo === "carpeta"
            ? "—"
            : formatearTamano(row.original.sizeBytes)}
        </span>
      ),
    },
    {
      accessorKey: "actualizadoEn",
      header: "Modificado",
      cell: ({ row }) => (
        <span className="text-slate-600">
          {formatDateTimeBO(row.original.actualizadoEn)}
        </span>
      ),
    },
  ];

  if (!acciones) return columnas;

  columnas.push({
    id: "acciones",
    header: "",
    cell: ({ row }) => {
      const nodo = row.original;
      // Un nodo congelado no ofrece acciones que el backend va a rechazar: enseñar un botón que
      // siempre falla enseña a desconfiar de todos los botones.
      if (nodo.borradoEn) {
        return (
          <Button variant="ghost" onClick={() => acciones.onRestaurar(nodo)}>
            Restaurar
          </Button>
        );
      }
      if (nodo.inmutable || !alcanza(nodo.nivelEfectivo, "escribir"))
        return null;
      return (
        <span className="flex justify-end gap-1">
          <Button variant="ghost" onClick={() => acciones.onRenombrar(nodo)}>
            Renombrar
          </Button>
          <Button variant="ghost" onClick={() => acciones.onBorrar(nodo)}>
            A la papelera
          </Button>
        </span>
      );
    },
  });
  return columnas;
}
