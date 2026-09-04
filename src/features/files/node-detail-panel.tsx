"use client";

import { useState } from "react";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { EmptyState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTimeBO } from "@/shared/i18n/bolivia-format";
import { useActividad, useConcesiones } from "./hooks";
import { descargarNodo } from "./services";
import { VistaPreviaDeNodo } from "./node-preview";
import { formatearTamano } from "./node-columns";
import { alcanza, type Nodo } from "./types";

const PESTANAS = [
  "Vista previa",
  "Detalles",
  "Quién lo ve",
  "Historial",
] as const;

/**
 * Todo lo que se sabe de un archivo, en un solo panel.
 *
 * Las cuatro pestañas responden las cuatro preguntas que se hacen de verdad al revisar un caso:
 * qué es, de dónde salió, quién más lo ve y qué le ha pasado. Están separadas porque el historial
 * y las concesiones se piden a la API y no hay razón para traerlos mientras alguien sólo mira la
 * imagen — que es lo que ocurre casi siempre.
 */
export function PanelDeNodo({
  expedienteId,
  nodo,
  onCerrar,
  onCompartir,
}: Readonly<{
  expedienteId: string;
  nodo: Nodo | null;
  onCerrar: () => void;
  onCompartir: (nodo: Nodo) => void;
}>) {
  const [pestana, setPestana] = useState<string>(PESTANAS[0]);

  if (!nodo) return null;

  return (
    <DrawerPanel open title={nodo.nombre} onClose={onCerrar}>
      <DetailTabs tabs={[...PESTANAS]} active={pestana} onChange={setPestana} />
      {pestana === "Vista previa" ? (
        <VistaPreviaDeNodo
          expedienteId={expedienteId}
          nodo={nodo}
          onDescargar={() => {
            void guardarEnDisco(expedienteId, nodo);
          }}
        />
      ) : null}
      {pestana === "Detalles" ? <Detalles nodo={nodo} /> : null}
      {pestana === "Quién lo ve" ? (
        <Concesiones
          expedienteId={expedienteId}
          nodo={nodo}
          onCompartir={onCompartir}
        />
      ) : null}
      {pestana === "Historial" ? (
        <Historial expedienteId={expedienteId} nodo={nodo} />
      ) : null}
    </DrawerPanel>
  );
}

/**
 * Guardar el archivo en el disco de quien lo pide.
 *
 * El enlace se fabrica sobre un blob que ya vino autenticado; un `<a href>` directo a la API no
 * llevaría la credencial y bajaría un JSON de error con nombre de imagen.
 */
async function guardarEnDisco(expedienteId: string, nodo: Nodo): Promise<void> {
  const archivo = await descargarNodo(expedienteId, nodo);
  const url = URL.createObjectURL(archivo.blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo.nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

function Fila({
  etiqueta,
  valor,
}: Readonly<{ etiqueta: string; valor: React.ReactNode }>) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 border-b border-slate-100 py-2 text-sm last:border-0">
      <dt className="text-slate-500">{etiqueta}</dt>
      <dd className="min-w-0 break-words text-atlas-text">{valor}</dd>
    </div>
  );
}

function Detalles({ nodo }: Readonly<{ nodo: Nodo }>) {
  return (
    <dl className="rounded-lg border border-slate-200 px-4 py-1">
      <Fila
        etiqueta="Tipo"
        valor={
          nodo.tipo === "carpeta" ? "Carpeta" : (nodo.mimeType ?? "Archivo")
        }
      />
      <Fila
        etiqueta="Dónde está"
        valor={<code className="text-xs">{nodo.ruta || "/"}</code>}
      />
      <Fila
        etiqueta="Tamaño"
        valor={nodo.tipo === "carpeta" ? "—" : formatearTamano(nodo.sizeBytes)}
      />
      {/*
       * El SHA-256 se enseña entero y copiable a propósito: es lo que permite afirmar, meses
       * después y ante quien lo discuta, que el archivo que se está mirando es byte a byte el que
       * subió la persona. Truncado no sirve para eso.
       */}
      <Fila
        etiqueta="Huella (SHA-256)"
        valor={
          nodo.sha256 ? (
            <code className="select-all text-xs">{nodo.sha256}</code>
          ) : (
            "—"
          )
        }
      />
      <Fila etiqueta="Añadido" valor={formatDateTimeBO(nodo.creadoEn)} />
      <Fila
        etiqueta="Última modificación"
        valor={formatDateTimeBO(nodo.actualizadoEn)}
      />
      <Fila
        etiqueta="Estado"
        valor={
          <span className="flex flex-wrap gap-1.5">
            {nodo.inmutable ? (
              <Badge tone="muted">Congelado</Badge>
            ) : (
              <Badge tone="default">Editable</Badge>
            )}
            {nodo.borradoEn ? (
              <Badge tone="warning">En la papelera</Badge>
            ) : null}
            {nodo.objetoAusente ? (
              <Badge tone="critical">Sin objeto en el almacén</Badge>
            ) : null}
          </span>
        }
      />
      {nodo.evidenceDocumentId ? (
        <Fila
          etiqueta="Documento de evidencia"
          valor={nodo.evidenceDocumentId}
        />
      ) : null}
      {nodo.engineRequestId ? (
        <Fila etiqueta="Ejecución del Motor" valor={nodo.engineRequestId} />
      ) : null}
    </dl>
  );
}

function Concesiones({
  expedienteId,
  nodo,
  onCompartir,
}: Readonly<{
  expedienteId: string;
  nodo: Nodo;
  onCompartir: (nodo: Nodo) => void;
}>) {
  const concesiones = useConcesiones(expedienteId, nodo.nodoId);
  const puedeCompartir = alcanza(nodo.nivelEfectivo, "compartir");

  if (concesiones.isLoading) return <LoadingSkeleton rows={3} />;

  return (
    <div className="space-y-3">
      {(concesiones.data ?? []).length === 0 ? (
        <EmptyState
          title="Nadie tiene acceso concedido aquí."
          description="Quien lo ve, lo ve por su rol o porque lo heredó de una carpeta de más arriba."
        />
      ) : (
        <ul className="space-y-1">
          {(concesiones.data ?? []).map((concesion) => (
            <li
              key={concesion.id}
              className="rounded border border-slate-200 px-3 py-2 text-sm"
            >
              <span className="font-medium text-atlas-text">
                {concesion.principalId}
              </span>{" "}
              <Badge tone="info">{concesion.nivel}</Badge>
              <p className="mt-1 text-xs text-slate-500">
                {concesion.heredadaDe
                  ? `Heredado de ${concesion.heredadaDe}. `
                  : ""}
                {concesion.motivo ?? "Sin motivo registrado."}
              </p>
            </li>
          ))}
        </ul>
      )}
      {puedeCompartir ? (
        <Button variant="secondary" onClick={() => onCompartir(nodo)}>
          Gestionar el acceso
        </Button>
      ) : (
        <p className="text-xs text-slate-500">
          Tu nivel aquí no alcanza para cambiar quién lo ve.
        </p>
      )}
    </div>
  );
}

/**
 * Lo que le ha pasado a este archivo.
 *
 * Incluye las LECTURAS, no sólo los cambios. En un expediente con la cara y el carnet de una
 * persona, «quién lo abrió» es tan relevante como «quién lo movió», y es lo que se pide cuando
 * alguien reclama por el uso de sus datos.
 */
function Historial({
  expedienteId,
  nodo,
}: Readonly<{ expedienteId: string; nodo: Nodo }>) {
  const actividad = useActividad(expedienteId, {
    page: 1,
    pageSize: 50,
    nodoId: nodo.nodoId,
  });

  if (actividad.isLoading) return <LoadingSkeleton rows={4} />;
  const filas = actividad.data?.items ?? [];
  if (filas.length === 0)
    return <EmptyState title="Sin movimientos registrados." />;

  return (
    <ol className="space-y-2">
      {filas.map((evento) => (
        <li
          key={evento.actividadId}
          className="border-l-2 border-slate-200 pl-3 text-sm"
        >
          <p className="text-atlas-text">
            <span className="font-medium">{evento.accion}</span>{" "}
            <span className="text-slate-500">
              · {evento.actorTipo}
              {evento.actorId ? ` ${evento.actorId}` : ""}
            </span>
          </p>
          <p className="text-xs text-slate-500">
            {formatDateTimeBO(evento.ocurridoEn)}
          </p>
        </li>
      ))}
    </ol>
  );
}
