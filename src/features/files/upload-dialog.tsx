"use client";

import { useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UploadCloud } from "lucide-react";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badges";
import { AtlasApiError } from "@/shared/api/errors";
import { explicarError } from "./errores";
import {
  ErrorDelAlmacen,
  LIMITES_DE_SUBIDA,
  TIPOS_ADMITIDOS,
  subirArchivo,
} from "./upload";

type Estado =
  "pendiente" | "hash" | "subida" | "verificacion" | "listo" | "error";

type EnCurso = {
  archivo: File;
  estado: Estado;
  mensaje?: string;
  /** Dónde quedó guardado, tal como lo devolvió el servidor. */
  ruta?: string;
};

const TEXTO_DE_ESTADO: Record<Estado, string> = {
  pendiente: "En espera",
  hash: "Calculando la huella",
  subida: "Subiendo",
  verificacion: "Comprobando en el servidor",
  listo: "Guardado",
  error: "No se guardó",
};

/**
 * Subir archivos a una carpeta del expediente.
 *
 * Los archivos van de UNO EN UNO aunque se elijan varios: cada subida consume un permiso firmado
 * y termina con una verificación en el servidor que descarga el objeto. Lanzarlas en paralelo
 * multiplicaría esa verificación por el número de archivos contra el mismo almacén, y el fallo de
 * una arrastraría a las demás sin poder decir cuál falló.
 */
export function DialogoDeSubida({
  expedienteId,
  parentId,
  abierto,
  onCerrar,
}: Readonly<{
  expedienteId: string;
  parentId: string | null;
  abierto: boolean;
  onCerrar: () => void;
}>) {
  const tituloId = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const cliente = useQueryClient();
  const [cola, setCola] = useState<EnCurso[]>([]);
  const [subiendo, setSubiendo] = useState(false);

  const actualizar = (indice: number, cambios: Partial<EnCurso>) => {
    setCola((anterior) =>
      anterior.map((item, posicion) =>
        posicion === indice ? { ...item, ...cambios } : item,
      ),
    );
  };

  const procesar = async (archivos: File[]) => {
    setCola(
      archivos.map((archivo) => ({ archivo, estado: "pendiente" as const })),
    );
    setSubiendo(true);
    for (const [indice, archivo] of archivos.entries()) {
      try {
        const nodo = await subirArchivo({
          expedienteId,
          parentId,
          archivo,
          onProgreso: (fase) => {
            actualizar(indice, { estado: fase });
          },
        });
        actualizar(indice, { estado: "listo", ruta: nodo.ruta });
      } catch (error) {
        actualizar(indice, {
          estado: "error",
          mensaje: explicarRechazo(error),
        });
      }
    }
    setSubiendo(false);
    // Se invalida una sola vez al final: una invalidación por archivo repinta la tabla entera
    // mientras las demás subidas siguen en curso.
    void cliente.invalidateQueries({
      queryKey: ["expedientes", "nodos", expedienteId],
    });
  };

  return (
    <DialogShell
      open={abierto}
      labelledBy={tituloId}
      onClose={onCerrar}
      closeOnBackdrop={!subiendo}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="atlas-scrollbar max-h-full w-[32rem] max-w-full animate-scale-in overflow-auto rounded-xl border border-atlas-border bg-white shadow-card"
    >
      <div className="space-y-4 p-5">
        <h2 id={tituloId} className="text-base font-semibold text-atlas-text">
          Añadir archivos
        </h2>
        <p className="text-xs text-slate-500">
          Se comprueba en el servidor que lo guardado sea exactamente lo que
          elegiste, y queda registrado quién lo subió.
        </p>
        <p className="text-sm text-atlas-text">
          {LIMITES_DE_SUBIDA}
          {parentId === null
            ? " Desde la raíz del expediente, lo que subas se guarda en la carpeta «otros»."
            : null}
        </p>

        <input
          ref={entrada}
          type="file"
          multiple
          accept={TIPOS_ADMITIDOS}
          aria-label="Archivos para añadir"
          className="hidden"
          onChange={(evento) => {
            const archivos = Array.from(evento.target.files ?? []);
            if (archivos.length > 0) void procesar(archivos);
            evento.target.value = "";
          }}
        />

        <Button
          variant="secondary"
          disabled={subiendo}
          onClick={() => entrada.current?.click()}
        >
          <UploadCloud className="mr-1.5 h-4 w-4" aria-hidden />
          Elegir archivos
        </Button>

        {cola.length > 0 ? (
          <ul className="space-y-1" aria-live="polite">
            {cola.map((item, indice) => (
              <li
                key={`${item.archivo.name}-${String(indice)}`}
                className="flex items-center justify-between gap-3 rounded border border-slate-200 px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-atlas-text">
                  {item.archivo.name}
                </span>
                <Badge
                  tone={
                    item.estado === "listo"
                      ? "success"
                      : item.estado === "error"
                        ? "critical"
                        : "info"
                  }
                >
                  {item.estado === "listo" && item.ruta
                    ? `Guardado en ${carpetaDe(item.ruta)}`
                    : TEXTO_DE_ESTADO[item.estado]}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}

        {cola
          .filter((item) => item.mensaje)
          .map((item, indice) => (
            <p key={`error-${String(indice)}`} className="text-xs text-red-700">
              {item.archivo.name}: {item.mensaje}
            </p>
          ))}

        <div className="flex justify-end">
          <Button variant="primary" disabled={subiendo} onClick={onCerrar}>
            {cola.length > 0 && !subiendo ? "Terminar" : "Cerrar"}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}

/** La carpeta que contiene esta ruta, para decir dónde quedó el archivo. */
export function carpetaDe(ruta: string): string {
  const corte = ruta.lastIndexOf("/");
  return corte > 0 ? ruta.slice(0, corte) : "la raíz";
}

/**
 * El rechazo en palabras de quien opera. Nunca el código en mayúsculas del backend: ver
 * `explicarError`, que busca el motivo tanto en `code` como en `message`.
 */
export function explicarRechazo(error: unknown): string {
  if (error instanceof AtlasApiError)
    return explicarError(
      error,
      "No se pudo subir el archivo. Inténtalo de nuevo.",
    );
  return error instanceof ErrorDelAlmacen
    ? error.message
    : "No se pudo subir el archivo. Inténtalo de nuevo.";
}
