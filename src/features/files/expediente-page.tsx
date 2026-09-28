"use client";

import { useMemo, useState } from "react";
import { FolderPlus, Trash2, UploadCloud, X } from "lucide-react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { ArbolDeCarpetas } from "./folder-tree";
import { CabeceraDeExpediente } from "./expediente-header";
import { DialogoDeCompartir } from "./share-dialog";
import { DialogoDeSubida } from "./upload-dialog";
import { PanelDeNodo } from "./node-detail-panel";
import { DialogoDeVaciarPapelera } from "./purge-dialog";
import { textosDelSujeto } from "./sujeto";
import { buildNodeColumns } from "./node-columns";
import { useExpediente, useMutacionesDelArbol, useNodos } from "./hooks";
import { alcanza, type Nodo } from "./types";

export function ExpedientePage({
  expedienteId,
}: Readonly<{ expedienteId: string }>) {
  return (
    <PermissionGate permissions={["expedientes.leer"]}>
      <ExpedienteAutorizado expedienteId={expedienteId} />
    </PermissionGate>
  );
}

function ExpedienteAutorizado({
  expedienteId,
}: Readonly<{ expedienteId: string }>) {
  const expediente = useExpediente(expedienteId);
  const [carpeta, setCarpeta] = useState<Nodo | null>(null);
  const [q, setQ] = useState("");
  const [seleccionado, setSeleccionado] = useState<Nodo | null>(null);
  const [compartiendo, setCompartiendo] = useState<Nodo | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [porBorrar, setPorBorrar] = useState<Nodo | null>(null);
  const [verPapelera, setVerPapelera] = useState(false);
  const [vaciando, setVaciando] = useState(false);

  const nodos = useNodos(expedienteId, carpeta?.nodoId ?? null, {
    q: q.trim() || undefined,
    incluirPapelera: verPapelera,
  });
  const {
    crearCarpeta,
    renombrar,
    borrar,
    restaurar,
    purgar,
    error,
    limpiarError,
  } = useMutacionesDelArbol(expedienteId);

  const columns = useMemo(
    () =>
      buildNodeColumns(
        (nodo) => {
          // Una carpeta se ABRE; un archivo se INSPECCIONA. Es el mismo clic porque es el mismo
          // gesto para quien mira: «enséñame esto».
          if (nodo.tipo === "carpeta") {
            setCarpeta(nodo);
            setQ("");
          } else {
            setSeleccionado(nodo);
          }
        },
        {
          onRenombrar: (nodo) => {
            const nombre = window.prompt("Nuevo nombre", nodo.nombre);
            if (nombre && nombre !== nodo.nombre)
              renombrar.mutate({ nodoId: nodo.nodoId, nombre });
          },
          onBorrar: setPorBorrar,
          onRestaurar: (nodo) => {
            restaurar.mutate(nodo.nodoId);
          },
        },
      ),
    [renombrar, restaurar],
  );

  if (expediente.isLoading) return <LoadingSkeleton />;
  if (expediente.error || !expediente.data) {
    return (
      <ErrorState
        title="No se pudo abrir el expediente."
        description="Puede que no exista o que tu acceso no alcance hasta él."
        onRetry={() => void expediente.refetch()}
      />
    );
  }

  const puedeEscribir = alcanza(expediente.data.nivelEfectivo, "escribir");
  const filas = nodos.data ?? [];

  return (
    <>
      <CabeceraDeExpediente
        expediente={expediente.data}
        acciones={
          puedeEscribir ? (
            <span className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setSubiendo(true)}>
                <UploadCloud className="mr-1.5 h-4 w-4" aria-hidden />
                Añadir archivos
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const nombre = window.prompt("Nombre de la carpeta");
                  if (nombre)
                    crearCarpeta.mutate({
                      parentId: carpeta?.nodoId ?? null,
                      nombre,
                    });
                }}
              >
                <FolderPlus className="mr-1.5 h-4 w-4" aria-hidden />
                Nueva carpeta
              </Button>
            </span>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
        <aside className="rounded-xl border border-atlas-border bg-white p-2 shadow-subtle">
          <ArbolDeCarpetas
            expedienteId={expedienteId}
            carpetaActual={carpeta?.nodoId ?? null}
            archivoActual={seleccionado?.nodoId ?? null}
            onSeleccionar={(nodo) => {
              setCarpeta(nodo);
              setQ("");
            }}
            onAbrirArchivo={setSeleccionado}
          />
        </aside>

        <section className="min-w-0">
          <FilterBar
            search={q}
            searchPlaceholder="Buscar en todo el expediente…"
            onSearchChange={setQ}
            onClear={() => setQ("")}
          />
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-atlas-muted">
              {q.trim()
                ? "Resultados de la búsqueda en todo el expediente."
                : `Estás en ${carpeta ? carpeta.ruta : "la raíz del expediente"}.`}
            </p>
            <span className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => setVerPapelera((valor) => !valor)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
                {verPapelera ? "Ocultar la papelera" : "Ver la papelera"}
              </Button>
              {verPapelera && puedeEscribir ? (
                <Button
                  variant="danger"
                  onClick={() => {
                    limpiarError();
                    setVaciando(true);
                  }}
                >
                  Vaciar la papelera
                </Button>
              ) : null}
            </span>
          </div>
          {error && !vaciando ? (
            <p
              role="alert"
              className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
              <button
                type="button"
                onClick={limpiarError}
                aria-label="Cerrar el aviso"
                className="shrink-0 rounded p-0.5 hover:bg-red-100"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </p>
          ) : null}
          {nodos.isLoading ? (
            <LoadingSkeleton rows={6} />
          ) : (
            <DataTable
              data={filas}
              columns={columns}
              emptyTitle={
                q.trim() ? "Nada coincide." : "Esta carpeta está vacía."
              }
              emptyDescription={
                q.trim()
                  ? "Prueba con parte del nombre del archivo."
                  : textosDelSujeto(expediente.data.subjectType).carpetaVacia
              }
            />
          )}
        </section>
      </div>

      <PanelDeNodo
        expedienteId={expedienteId}
        nodo={seleccionado}
        onCerrar={() => setSeleccionado(null)}
        onCompartir={setCompartiendo}
      />
      {compartiendo ? (
        <DialogoDeCompartir
          expedienteId={expedienteId}
          nodo={compartiendo}
          abierto
          onCerrar={() => setCompartiendo(null)}
        />
      ) : null}
      <DialogoDeSubida
        expedienteId={expedienteId}
        parentId={carpeta?.nodoId ?? null}
        abierto={subiendo}
        onCerrar={() => setSubiendo(false)}
      />
      <DialogoDeVaciarPapelera
        abierto={vaciando}
        enCurso={purgar.isPending}
        error={vaciando ? error : null}
        onConfirmar={(motivo) =>
          purgar.mutate(motivo, { onSuccess: () => setVaciando(false) })
        }
        onCancelar={() => {
          setVaciando(false);
          limpiarError();
        }}
      />
      <ConfirmDialog
        open={Boolean(porBorrar)}
        title="Mover a la papelera"
        description="El archivo deja de aparecer en el expediente pero no se borra todavía: se conserva un tiempo por si hizo falta, y queda registrado quién lo quitó."
        confirmText="Mover a la papelera"
        isLoading={borrar.isPending}
        onConfirm={() => {
          if (porBorrar)
            borrar.mutate(porBorrar.nodoId, {
              onSettled: () => setPorBorrar(null),
            });
        }}
        onCancel={() => setPorBorrar(null)}
      />
    </>
  );
}
