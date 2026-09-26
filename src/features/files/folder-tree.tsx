"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { useNodos } from "./hooks";
import { IconoDeNodo } from "./node-icon";
import type { Nodo } from "./types";
import { Tooltip } from "@/shared/components/ui/tooltip";

/**
 * El árbol del expediente, con carga PEREZOSA y con los archivos a la vista.
 *
 * Cada rama pide sus hijos sólo cuando alguien la abre. Traer el árbol completo de una vez sería
 * más simple y es exactamente lo que no se puede hacer aquí: un expediente con subcarpetas del
 * Motor por cada ejecución crece sin techo, y cargarlo entero para enseñar cuatro carpetas de
 * primer nivel retrasa la pantalla por lo que nadie está mirando.
 *
 * ## Por qué el árbol enseña también los archivos
 *
 * Antes sólo pintaba carpetas, y abrir una obligaba a mirar a la derecha para saber qué había
 * dentro. Con carpeta y archivo en la misma rama —cada uno con su icono y su nombre— el panel
 * lateral responde solo la pregunta que se le hace: qué hay aquí. Y no cuesta una petición más:
 * los hijos de una carpeta ya venían todos en la misma respuesta, y se estaban descartando.
 */
export function ArbolDeCarpetas({
  expedienteId,
  carpetaActual,
  archivoActual,
  onSeleccionar,
  onAbrirArchivo,
}: Readonly<{
  expedienteId: string;
  carpetaActual: string | null;
  archivoActual?: string | null;
  onSeleccionar: (nodo: Nodo | null) => void;
  onAbrirArchivo?: (nodo: Nodo) => void;
}>) {
  return (
    <nav aria-label="Contenido del expediente" className="text-sm">
      <button
        type="button"
        onClick={() => onSeleccionar(null)}
        className={cn(
          "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-slate-100",
          carpetaActual === null && "bg-slate-100 font-medium text-atlas-text",
        )}
      >
        <IconoDeNodo
          nodo={{ tipo: "carpeta" } as Nodo}
          abierta
          className="text-atlas-info"
        />
        Expediente
      </button>
      <Rama
        expedienteId={expedienteId}
        parentId={null}
        nivel={0}
        carpetaActual={carpetaActual}
        archivoActual={archivoActual ?? null}
        onSeleccionar={onSeleccionar}
        onAbrirArchivo={onAbrirArchivo}
      />
    </nav>
  );
}

type PropsDeRama = {
  expedienteId: string;
  parentId: string | null;
  nivel: number;
  carpetaActual: string | null;
  archivoActual: string | null;
  onSeleccionar: (nodo: Nodo) => void;
  onAbrirArchivo?: (nodo: Nodo) => void;
};

function Rama({
  expedienteId,
  parentId,
  nivel,
  carpetaActual,
  archivoActual,
  onSeleccionar,
  onAbrirArchivo,
}: Readonly<PropsDeRama>) {
  const { data, isLoading } = useNodos(expedienteId, parentId);
  const vivos = (data ?? []).filter((nodo) => !nodo.borradoEn);
  // Carpetas primero y luego archivos, como en cualquier explorador: la jerarquía se recorre
  // antes que el contenido.
  const carpetas = vivos.filter((nodo) => nodo.tipo === "carpeta");
  const archivos = vivos.filter((nodo) => nodo.tipo === "archivo");

  if (isLoading) {
    return (
      <p
        className="px-2 py-1 text-xs text-slate-400"
        style={{ paddingLeft: `${String(nivel * 12 + 28)}px` }}
      >
        Cargando…
      </p>
    );
  }
  if (vivos.length === 0) return null;

  return (
    <ul className="list-none">
      {carpetas.map((carpeta) => (
        <RamaCarpeta
          key={carpeta.nodoId}
          expedienteId={expedienteId}
          carpeta={carpeta}
          nivel={nivel}
          carpetaActual={carpetaActual}
          archivoActual={archivoActual}
          onSeleccionar={onSeleccionar}
          onAbrirArchivo={onAbrirArchivo}
        />
      ))}
      {archivos.map((archivo) => (
        <HojaDeArchivo
          key={archivo.nodoId}
          archivo={archivo}
          nivel={nivel}
          activo={archivoActual === archivo.nodoId}
          onAbrir={onAbrirArchivo}
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
  archivoActual,
  onSeleccionar,
  onAbrirArchivo,
}: Readonly<{
  expedienteId: string;
  carpeta: Nodo;
  nivel: number;
  carpetaActual: string | null;
  archivoActual: string | null;
  onSeleccionar: (nodo: Nodo) => void;
  onAbrirArchivo?: (nodo: Nodo) => void;
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
        <Tooltip text="Despliega o pliega esta rama del expediente. No abre la carpeta ni cambia la lista de la derecha.">
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
        </Tooltip>
        <button
          type="button"
          onClick={() => {
            // Un clic en la carpeta la abre en la lista Y despliega su rama: en un explorador esas
            // dos cosas son el mismo gesto, y tenerlas separadas obligaba a dar dos clics.
            setAbierta(true);
            onSeleccionar(carpeta);
          }}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 text-left text-atlas-text"
        >
          <IconoDeNodo nodo={carpeta} abierta={abierta} />
          <span className="truncate">{carpeta.nombre}</span>
        </button>
      </div>
      {/* Los hijos se montan sólo con la rama abierta: es lo que hace perezosa la carga. */}
      {abierta ? (
        <Rama
          expedienteId={expedienteId}
          parentId={carpeta.nodoId}
          nivel={nivel + 1}
          carpetaActual={carpetaActual}
          archivoActual={archivoActual}
          onSeleccionar={onSeleccionar}
          onAbrirArchivo={onAbrirArchivo}
        />
      ) : null}
    </li>
  );
}

/**
 * Un archivo en el árbol.
 *
 * Se alinea con el nombre de las carpetas hermanas —no con su flecha—, porque no tiene nada que
 * desplegar y un hueco a la izquierda del icono haría parecer que sí.
 */
function HojaDeArchivo({
  archivo,
  nivel,
  activo,
  onAbrir,
}: Readonly<{
  archivo: Nodo;
  nivel: number;
  activo: boolean;
  onAbrir?: (nodo: Nodo) => void;
}>) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onAbrir?.(archivo)}
        title={archivo.nombre}
        className={cn(
          "flex w-full min-w-0 items-center gap-2 rounded py-1.5 pr-2 text-left text-atlas-text hover:bg-slate-100",
          activo && "bg-slate-100 font-medium",
        )}
        style={{ paddingLeft: `${String(nivel * 12 + 32)}px` }}
      >
        <IconoDeNodo nodo={archivo} />
        <span className="truncate">{archivo.nombre}</span>
      </button>
    </li>
  );
}
