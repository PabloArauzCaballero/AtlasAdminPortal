"use client";

import { useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UploadCloud } from "lucide-react";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badges";
import { AtlasApiError } from "@/shared/api/errors";
import { MOTIVO_DE_RECHAZO, subirArchivo } from "./upload";

type Estado =
  "pendiente" | "hash" | "subida" | "verificacion" | "listo" | "error";

type EnCurso = { archivo: File; estado: Estado; mensaje?: string };

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
        await subirArchivo({
          expedienteId,
          parentId,
          archivo,
          onProgreso: (fase) => {
            actualizar(indice, { estado: fase });
          },
        });
        actualizar(indice, { estado: "listo" });
      } catch (error) {
        actualizar(indice, { estado: "error", mensaje: explicar(error) });
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
    >
      <div className="w-[32rem] max-w-full space-y-4 p-5">
        <h2 id={tituloId} className="text-base font-semibold text-atlas-text">
          Añadir archivos
        </h2>
        <p className="text-xs text-slate-500">
          Se comprueba en el servidor que lo guardado sea exactamente lo que
          elegiste, y queda registrado quién lo subió.
        </p>

        <input
          ref={entrada}
          type="file"
          multiple
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
                  {TEXTO_DE_ESTADO[item.estado]}
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

/** El código del backend en palabras; si no lo reconoce, se enseña lo que dijo el servidor. */
function explicar(error: unknown): string {
  if (error instanceof AtlasApiError) {
    return MOTIVO_DE_RECHAZO[error.code] ?? error.message;
  }
  return error instanceof Error
    ? error.message
    : "No se pudo subir el archivo.";
}
