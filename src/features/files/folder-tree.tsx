"use client";

import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { useNodos } from "./hooks";
import type { Nodo } from "./types";

/**
 * El árbol de carpetas, con carga PEREZOSA.
 *
 * Cada rama pide sus hijos sólo cuando alguien la abre. Traer el árbol completo de una vez sería
 * más simple y es exactamente lo que no se puede hacer aquí: un expediente con subcarpetas del
 * Motor por cada ejecución crece sin techo, y cargarlo entero para enseñar cuatro carpetas de
 * primer nivel retrasa la pantalla por lo que nadie está mirando.
 */
export function ArbolDeCarpetas({
  expedienteId,
  carpetaActual,
  onSeleccionar,
}: Readonly<{
  expedienteId: string;
  carpetaActual: string | null;
  onSeleccionar: (nodo: Nodo | null) => void;
}>) {
  return (
    <nav aria-label="Carpetas del expediente" className="text-sm">
      <button
        type="button"
        onClick={() => onSeleccionar(null)}
        className={cn(
          "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-slate-100",
          carpetaActual === null && "bg-slate-100 font-medium text-atlas-text",
        )}
      >
        <FolderOpen className="h-4 w-4 text-atlas-info" aria-hidden />
        Expediente
      </button>
      <Rama
        expedienteId={expedienteId}
        parentId={null}
        nivel={0}
        carpetaActual={carpetaActual}
        onSeleccionar={onSeleccionar}
      />
    </nav>
  );
}

function Rama({
  expedienteId,
  parentId,
  nivel,
  carpetaActual,
  onSeleccionar,
}: Readonly<{
  expedienteId: string;
  parentId: string | null;
  nivel: number;
  carpetaActual: string | null;
  onSeleccionar: (nodo: Nodo) => void;
}>) {
  const { data } = useNodos(expedienteId, parentId);
  const carpetas = (data ?? []).filter(
    (nodo) => nodo.tipo === "carpeta" && !nodo.borradoEn,
  );
  if (carpetas.length === 0) return null;

  return (
    <ul className="list-none">
      {carpetas.map((carpeta) => (
        <RamaCarpeta
          key={carpeta.nodoId}
          expedienteId={expedienteId}
          carpeta={carpeta}
          nivel={nivel}
          carpetaActual={carpetaActual}
          onSeleccionar={onSeleccionar}
        />
      ))}
    </ul>
  );
}

function RamaCarpeta({
  expedienteId,
  carpeta,
  nivel,
  carpetaActual,
  onSeleccionar,
}: Readonly<{
  expedienteId: string;
  carpeta: Nodo;
  nivel: number;
  carpetaActual: string | null;
  onSeleccionar: (nodo: Nodo) => void;
}>) {
  const [abierta, setAbierta] = useState(nivel === 0);

  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-1 rounded hover:bg-slate-100",
          carpetaActual === carpeta.nodoId && "bg-slate-100",
        )}
        style={{ paddingLeft: `${String(nivel * 12 + 8)}px` }}
      >
        <button
          type="button"
          onClick={() => setAbierta((valor) => !valor)}
          aria-label={
            abierta
              ? `Contraer ${carpeta.nombre}`
              : `Expandir ${carpeta.nombre}`
          }
          aria-expanded={abierta}
          className="p-1 text-slate-400 hover:text-slate-600"
        >
          {abierta ? (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={() => onSeleccionar(carpeta)}
          className="flex flex-1 items-center gap-2 py-1.5 pr-2 text-left text-atlas-text"
        >
          <Folder className="h-4 w-4 text-atlas-info" aria-hidden />
          {carpeta.nombre}
        </button>
      </div>
      {/* Los hijos se montan sólo con la rama abierta: es lo que hace perezosa la carga. */}
      {abierta ? (
        <Rama
          expedienteId={expedienteId}
          parentId={carpeta.nodoId}
          nivel={nivel + 1}
          carpetaActual={carpetaActual}
          onSeleccionar={onSeleccionar}
        />
      ) : null}
    </li>
  );
}
