"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useAuth } from "@/shared/auth/auth-context";
import {
  DataTable,
  type AtlasColumnMeta,
} from "@/shared/components/data-table/data-table";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Field, Select } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import type { Option } from "@/shared/lib/options";
import { formatDateTime } from "@/shared/lib/format";
import { useKnowledgeVersions } from "./knowledge-hooks";
import {
  knowledgeErrorMessage,
  type VersionAction,
} from "./knowledge-services";
import {
  ACCIONES,
  KnowledgeTransitionDialog,
  siguienteAccion,
} from "./knowledge-transition-dialog";
import {
  ESTADO_VERSION,
  isOwnVersion,
  type KnowledgeVersionRow,
} from "./knowledge-types";

const POR_PAGINA = 20;

export const COLA_OPTIONS: Option[] = [
  {
    value: "IN_REVIEW",
    label: "Esperan aprobación",
    description:
      "Enviadas a revisión: las aprueba alguien distinto de quien las redactó.",
  },
  {
    value: "APPROVED",
    label: "Listas para publicar",
    description:
      "Ya aprobadas; al publicarlas pasan a ser la respuesta oficial.",
  },
  {
    value: "DRAFT",
    label: "Borradores",
    description: "Todavía en redacción; su autor las envía a revisión.",
  },
];

type Pendiente = { versionId: string; action: VersionAction };

/**
 * La cola de trabajo de la base de conocimiento: borradores, revisiones y aprobadas.
 *
 * Viene del servidor, así que quien redacta y quien aprueba ven la MISMA cola. Una versión propia en
 * revisión se marca «la redactaste tú» y no ofrece aprobar: el servidor la rechazaría, y ofrecer un
 * botón que siempre falla enseña a desconfiar de los botones.
 */
export function KnowledgeVersionsPanel() {
  const { user } = useAuth();
  const [status, setStatus] = useState("IN_REVIEW");
  const [page, setPage] = useState(1);
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const versiones = useKnowledgeVersions({
    status,
    page,
    pageSize: POR_PAGINA,
  });

  const columnas = useMemo<ColumnDef<KnowledgeVersionRow>[]>(
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
              #{row.original.versionId} · artículo #{row.original.articleId} · v
              {row.original.versionNumber}
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
        header: "Redactada por",
        id: "autor",
        cell: ({ row }) =>
          isOwnVersion(row.original, user?.id) ? (
            <Badge tone="info">La redactaste tú</Badge>
          ) : (
            <span className="font-mono text-xs">
              #{row.original.createdByInternalUserId ?? "—"}
            </span>
          ),
      },
      {
        header: "Último cambio",
        accessorKey: "updatedAt",
        cell: ({ row }) => formatDateTime(row.original.updatedAt),
      },
      {
        header: "Acción",
        id: "accion",
        meta: { pinRight: true } satisfies AtlasColumnMeta,
        cell: ({ row }) => {
          const accion = siguienteAccion(row.original.status);
          if (!accion) return null;
          if (accion === "approve" && isOwnVersion(row.original, user?.id))
            return (
              <span className="text-xs text-atlas-muted">
                La aprueba otra persona
              </span>
            );
          return (
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
          );
        },
      },
    ],
    [user?.id],
  );

  const datos = versiones.data;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-sm font-semibold text-atlas-text">
          Versiones en curso
        </h2>
        <div className="w-full sm:w-72">
          <Field
            label="Cola"
            tooltip="Qué versiones ver según el paso en que están: por aprobar, por publicar o en borrador."
          >
            <Select
              name="cola-versiones"
              options={COLA_OPTIONS}
              value={status}
              onChange={(valor) => {
                setStatus(valor);
                setPage(1);
              }}
            />
          </Field>
        </div>
      </div>

      {versiones.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {versiones.error ? (
        <ErrorState
          title="No se pudo cargar la cola de versiones."
          description={knowledgeErrorMessage(versiones.error)}
          onRetry={() => void versiones.refetch()}
        />
      ) : null}
      {datos ? (
        <DataTable
          data={datos.items}
          columns={columnas}
          meta={{
            page: datos.page,
            limit: datos.pageSize,
            total: datos.total,
            totalPages: Math.max(1, Math.ceil(datos.total / datos.pageSize)),
          }}
          onPageChange={setPage}
          emptyTitle="No hay versiones en esta cola."
          emptyDescription="Cuando alguien redacte, envíe a revisión o apruebe una versión, aparecerá en la cola que corresponda."
        />
      ) : null}

      {pendiente ? (
        <KnowledgeTransitionDialog
          versionId={pendiente.versionId}
          action={pendiente.action}
          onClose={() => setPendiente(null)}
          onDone={() => setPendiente(null)}
        />
      ) : null}
    </section>
  );
}
