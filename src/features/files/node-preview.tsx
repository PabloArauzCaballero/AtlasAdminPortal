"use client";

import { Download, TriangleAlert } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { EmptyState, LoadingSkeleton } from "@/shared/components/ui/states";
import { useContactos, useContenido } from "./hooks";
import type { Nodo } from "./types";

/**
 * La vista previa de un archivo del expediente.
 *
 * Todo se pinta desde un BLOB local, nunca apuntando el `src` a la API: una etiqueta `<img>` o un
 * `<iframe>` sólo tienen una dirección y no pueden mandar `Authorization`, así que el backend
 * respondería 401 y lo que se vería es una imagen rota. Es el mismo motivo por el que existe
 * `apiDownload`.
 */
export function VistaPreviaDeNodo({
  expedienteId,
  nodo,
  onDescargar,
}: Readonly<{ expedienteId: string; nodo: Nodo; onDescargar: () => void }>) {
  // El nodo de contactos no tiene bytes: se compone desde la base al abrirlo.
  const esContactos = nodo.clase === "contactos";
  const contenido = useContenido(expedienteId, esContactos ? null : nodo);
  const contactos = useContactos(expedienteId, esContactos);

  if (nodo.tipo === "carpeta") {
    return (
      <EmptyState
        title="Es una carpeta."
        description="Ábrela para ver lo que contiene."
      />
    );
  }

  if (nodo.objetoAusente) {
    return (
      <EmptyState
        title="El archivo ya no está en el almacén."
        description="La ficha existe pero el objeto no. No es lo mismo que «el cliente no lo subió»: alguien tiene que averiguar cuándo desapareció."
      />
    );
  }

  if (esContactos) {
    if (contactos.isLoading) return <LoadingSkeleton rows={4} />;
    if (contactos.error)
      return <EmptyState title="No se pudieron traer los contactos." />;
    return (
      <div className="space-y-2">
        {contactos.data?.enmascarado ? (
          <p className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            <TriangleAlert
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden
            />
            Teléfonos y nombres van enmascarados. Verlos completos exige el
            permiso de revelado y deja constancia de quién lo pidió y por qué.
          </p>
        ) : null}
        <pre className="max-h-[28rem] overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-700">
          {JSON.stringify(contactos.data, null, 2)}
        </pre>
      </div>
    );
  }

  if (contenido.isLoading) return <LoadingSkeleton rows={4} />;
  if (contenido.error) {
    return (
      <EmptyState
        title="No se pudo abrir el archivo."
        description="Puede ser un problema del almacén. Vuelve a intentarlo antes de decidir sobre el caso."
      />
    );
  }

  const url = contenido.data?.url;
  const tipo = contenido.data?.contentType ?? nodo.mimeType ?? "";
  if (!url) return null;

  return (
    <div className="space-y-3">
      {tipo.startsWith("image/") ? (
        /*
         * `<img>` y no `next/image` a propósito: el origen es un `blob:` local que ya vino
         * autenticado. El optimizador de Next necesita una URL que su servidor pueda volver a
         * pedir, y eso aquí significaría hacer pasar la foto del carnet de una persona por un
         * cacheado intermedio. No hay ancho de banda que ganar: el archivo ya está en memoria.
         */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={nodo.nombre}
          className="max-h-[28rem] w-full rounded border border-slate-200 object-contain"
        />
      ) : tipo.includes("pdf") ? (
        <iframe
          src={url}
          title={nodo.nombre}
          className="h-[28rem] w-full rounded border border-slate-200"
        />
      ) : tipo.includes("json") || tipo.startsWith("text/") ? (
        <VistaDeTexto url={url} />
      ) : (
        <EmptyState
          title="Este tipo de archivo no se puede previsualizar."
          description="Descárgalo para abrirlo con el programa que corresponda."
        />
      )}
      <Button variant="secondary" onClick={onDescargar}>
        <Download className="mr-1.5 h-4 w-4" aria-hidden />
        Descargar
      </Button>
    </div>
  );
}

/** Texto y JSON se leen del propio blob: ya está en memoria, no hace falta pedirlo otra vez. */
function VistaDeTexto({ url }: Readonly<{ url: string }>) {
  return (
    <iframe
      src={url}
      title="Contenido del archivo"
      className="h-[28rem] w-full rounded border border-slate-200 bg-white"
    />
  );
}
