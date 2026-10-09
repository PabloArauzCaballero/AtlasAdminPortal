"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { EmptyState, LoadingSkeleton } from "@/shared/components/ui/states";
import { BloqueDeTexto } from "./bloque-de-texto";
import { VistaDeContactos } from "./contactos-preview";
import { explicarError } from "./errores";
import { useContenido } from "./hooks";
import { esAbrible, esTexto } from "./tipo-de-archivo";
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

  if (esContactos) return <VistaDeContactos expedienteId={expedienteId} />;

  if (contenido.isLoading) return <LoadingSkeleton rows={4} />;
  if (contenido.error) {
    return (
      <EmptyState
        title="No se pudo abrir el archivo."
        description={`${explicarError(contenido.error, "No sabemos todavía por qué.")} Vuelve a intentarlo antes de decidir sobre el caso.`}
        action={
          <Button variant="secondary" onClick={() => void contenido.refetch()}>
            Reintentar
          </Button>
        }
      />
    );
  }

  if (!contenido.data) return null;
  const url = contenido.data.url;
  // Ya viene normalizado de `useContenido`, que es también quien rotuló el blob con él.
  const tipo = contenido.data.contentType;
  // Sólo PDF e imágenes rasterizadas se pintan o se abren aparte (ADM-05): un HTML o un SVG que
  // subió un cliente, abierto como `blob:` en una pestaña, se ejecutaría en el origen del portal.
  const abrible = esAbrible(tipo);

  return (
    <div className="space-y-3">
      {abrible && tipo.startsWith("image/") ? (
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
      ) : abrible ? (
        <iframe
          src={url}
          title={nodo.nombre}
          className="h-[28rem] w-full rounded border border-slate-200"
        />
      ) : esTexto(tipo) ? (
        <VistaDeTexto blob={contenido.data?.blob ?? null} />
      ) : (
        <EmptyState
          title="Este tipo de archivo no se puede previsualizar."
          description="Descárgalo para abrirlo con el programa que corresponda."
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={onDescargar}>
          <Download className="mr-1.5 h-4 w-4" aria-hidden />
          Descargar
        </Button>
        {/*
         * Abrir en una pestaña aparte es la salida cuando el visor incrustado no da la talla —un
         * PDF de cien páginas dentro de un panel de 28rem—. El enlace apunta al mismo blob local,
         * así que no hay una segunda descarga ni una URL que sobreviva a la sesión. Sólo para PDF e
         * imágenes: cualquier otro tipo se descarga (el blob ya va rotulado para eso).
         */}
        {abrible ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-atlas-border px-3 py-1.5 text-sm text-atlas-text hover:bg-atlas-soft"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Abrir en otra pestaña
          </a>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Texto y JSON se leen del propio blob y se pintan aquí.
 *
 * Antes iban en un `<iframe src={blob}>`, que el navegador no sabe seleccionar ni buscar y que la
 * política de contenido bloqueaba. En un `<pre>` el contenido se puede leer, seleccionar y copiar,
 * que es todo lo que se hace con el JSON de una decisión.
 */
function VistaDeTexto({ blob }: Readonly<{ blob: Blob | null }>) {
  const [texto, setTexto] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) return;
    let vigente = true;
    void blob.text().then((valor) => {
      if (vigente) setTexto(valor);
    });
    return () => {
      vigente = false;
    };
  }, [blob]);

  if (texto === null) return <LoadingSkeleton rows={4} />;
  return <BloqueDeTexto texto={texto} />;
}
