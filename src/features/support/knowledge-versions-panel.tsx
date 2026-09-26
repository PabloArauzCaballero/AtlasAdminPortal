"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  type AtlasColumnMeta,
} from "@/shared/components/data-table/data-table";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Field, Input } from "@/shared/components/ui/input";
import { formatDateTime } from "@/shared/lib/format";
import type { VersionAction } from "./knowledge-services";
import {
  ACCIONES,
  KnowledgeTransitionDialog,
  siguienteAccion,
} from "./knowledge-transition-dialog";
import {
  ESTADO_VERSION,
  type TrackedVersion,
  type VersionTransition,
} from "./knowledge-types";

type Pendiente = { versionId: string; action: VersionAction };

/**
 * Las versiones en curso: redactar, enviar a revisión, aprobar y publicar.
 *
 * La lista es LOCAL (este navegador) porque el servidor no expone borradores ni revisiones
 * pendientes. Quien aprueba no tiene la versión en su lista: la abre por el número que le pasa
 * quien la redactó. El servidor sigue siendo el que decide: si el estado guardado aquí quedó viejo,
 * la acción responde con el motivo y la pantalla lo enseña.
 */
export function KnowledgeVersionsPanel({
  versiones,
  onRegistrar,
  onOlvidar,
}: Readonly<{
  versiones: TrackedVersion[];
  onRegistrar: (version: TrackedVersion) => void;
  onOlvidar: (versionId: string) => void;
}>) {
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [numero, setNumero] = useState("");
  const numeroOk = /^[1-9][0-9]*$/.test(numero.trim());

  const columnas = useMemo<ColumnDef<TrackedVersion>[]>(
    () => [
      {
        header: "Versión",
        accessorKey: "title",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="max-w-[36ch] truncate text-sm text-atlas-text">
              {row.original.title}
            </p>
            <p className="font-mono text-[0.6875rem] text-atlas-muted">
              #{row.original.versionId} · {row.original.articleKey}
            </p>
          </div>
        ),
      },
      {
        header: "Estado",
        accessorKey: "status",
        cell: ({ row }) => {
          const estado = ESTADO_VERSION[row.original.status];
          return estado ? (
            <Badge tone={estado.tone}>{estado.label}</Badge>
          ) : (
            <Badge tone="muted">{row.original.status}</Badge>
          );
        },
      },
      {
        header: "Último cambio aquí",
        accessorKey: "updatedAt",
        cell: ({ row }) => formatDateTime(row.original.updatedAt),
      },
      {
        header: "Acción",
        id: "accion",
        meta: { pinRight: true } satisfies AtlasColumnMeta,
        cell: ({ row }) => {
          const accion = siguienteAccion(row.original.status);
          return (
            <div className="flex justify-end gap-2">
              {accion ? (
                <Button
                  className="h-8 px-2 text-xs"
                  onClick={() =>
                    setPendiente({
                      versionId: row.original.versionId,
                      action: accion,
                    })
                  }
                >
                  {ACCIONES[accion].boton}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => onOlvidar(row.original.versionId)}
              >
                Quitar de la lista
              </Button>
            </div>
          );
        },
      },
    ],
    [onOlvidar],
  );

  const alTerminar = (resultado: VersionTransition) => {
    const previa = versiones.find((v) => v.versionId === resultado.versionId);
    onRegistrar({
      versionId: resultado.versionId,
      articleId: resultado.articleId ?? previa?.articleId ?? "",
      articleKey: previa?.articleKey ?? "—",
      title: previa?.title ?? `Versión #${resultado.versionId}`,
      status: resultado.status,
      updatedAt: new Date().toISOString(),
    });
    setPendiente(null);
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-atlas-text">
        Versiones en curso
      </h2>
      <DataTable
        data={versiones}
        columns={columnas}
        emptyTitle="No hay versiones en curso en este navegador."
        emptyDescription="Aparecen aquí las que redactes o muevas desde esta pantalla. Si te pidieron aprobar una, ábrela por su número aquí debajo."
      />

      <form
        noValidate
        className="grid gap-3 rounded-xl border border-atlas-border bg-white p-4 shadow-subtle sm:grid-cols-[minmax(0,16rem)_1fr] sm:items-end"
        onSubmit={(event) => event.preventDefault()}
      >
        <Field
          label="Número de versión"
          tooltip="El número que te pasó quien redactó la versión, para revisarla, aprobarla o publicarla."
          hint="Sólo dígitos, por ejemplo 42."
        >
          <Input
            inputMode="numeric"
            value={numero}
            onChange={(event) => setNumero(event.target.value)}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ACCIONES) as VersionAction[]).map((accion) => (
            <Button
              key={accion}
              type="button"
              variant="secondary"
              disabled={!numeroOk}
              onClick={() =>
                setPendiente({ versionId: numero.trim(), action: accion })
              }
            >
              {ACCIONES[accion].boton}
            </Button>
          ))}
        </div>
      </form>

      {pendiente ? (
        <KnowledgeTransitionDialog
          versionId={pendiente.versionId}
          action={pendiente.action}
          onClose={() => setPendiente(null)}
          onDone={alTerminar}
        />
      ) : null}
    </section>
  );
}
