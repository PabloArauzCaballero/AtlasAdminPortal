"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/shared/auth/auth-context";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Badge, MethodBadge, RiskBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { fecha } from "../async/labels";
import { FlowDetailDrawer } from "../flow-detail-drawer";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { useFlowReviewQueue, useReviewFlowMutation } from "./hooks";
import { ESTADO, ESTADO_AYUDA, MOTIVO } from "./labels";
import type {
  FlowReviewDecision,
  FlowReviewItem,
  FlowReviewStatus,
} from "./types";
import { FlowCatalogNotLoaded } from "../flow-catalog-not-loaded";

const ESTADOS: FlowReviewStatus[] = [
  "NEEDS_REVIEW",
  "APPROVED",
  "REJECTED",
  "AUTO_DETECTED",
];

/**
 * Lo que el análisis dedujo de un flujo, confirmado o rechazado por una persona.
 *
 * La cola es corta a propósito: riesgo alto con un análisis que no se puede dar por bueno solo, y lo ya
 * revisado cuyo código cambió desde entonces. Aprobar un flujo es aprobar ESE código, así que cuando
 * cambia vuelve aquí.
 */
export function FlowReviewPage() {
  return (
    <PermissionGate permissions={["systems.flows.read"]}>
      <AuthorizedFlowReviewPage />
    </PermissionGate>
  );
}

function AuthorizedFlowReviewPage() {
  const { hasPermission } = useAuth();
  const puedeRevisar = hasPermission("systems.flows.review");
  const [estado, setEstado] = useState<FlowReviewStatus>("NEEDS_REVIEW");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const query = useFlowReviewQueue({
    reviewStatus: estado,
    page,
    limit: 20,
    ...(q.trim() ? { q: q.trim() } : {}),
  });
  const decidir = useReviewFlowMutation();
  // La ficha del flujo, para que quien decide vea lo que aprueba: la cola sólo enseña ruta y motivos.
  const [abierto, setAbierto] = useState<string | null>(null);
  // Selección para decidir varios a la vez. Se guarda el flujo entero (no sólo el id) porque la
  // decisión exige su `depsHash` del momento en que se marcó, el mismo que ya ve esta tabla.
  const [seleccion, setSeleccion] = useState<Map<string, FlowReviewItem>>(
    new Map(),
  );
  const [masivo, setMasivo] = useState<{
    enCurso: boolean;
    resultado: { ok: number; fallidos: FlowReviewItem[] } | null;
  }>({ enCurso: false, resultado: null });
  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const seleccionEnPagina = items.filter((f) => seleccion.has(f.id)).length;
  const alternarUno = useCallback(
    (flujo: FlowReviewItem) =>
      setSeleccion((prev) => {
        const siguiente = new Map(prev);
        if (siguiente.has(flujo.id)) siguiente.delete(flujo.id);
        else siguiente.set(flujo.id, flujo);
        return siguiente;
      }),
    [],
  );
  const alternarPagina = useCallback(
    () =>
      setSeleccion((prev) => {
        const siguiente = new Map(prev);
        const todosMarcados =
          items.length > 0 && items.every((f) => siguiente.has(f.id));
        for (const flujo of items) {
          if (todosMarcados) siguiente.delete(flujo.id);
          else siguiente.set(flujo.id, flujo);
        }
        return siguiente;
      }),
    [items],
  );
  // Uno por uno, nunca en una sola petición: cada decisión valida su propio `depsHash`, así que un
  // 409 aislado (el código de ESE flujo cambió mientras se revisaba la cola) no debe tumbar al resto.
  const decidirMasivo = async (reviewStatus: FlowReviewDecision["reviewStatus"]) => {
    const flujos = [...seleccion.values()];
    if (!flujos.length) return;
    setMasivo({ enCurso: true, resultado: null });
    const fallidos: FlowReviewItem[] = [];
    let ok = 0;
    for (const flujo of flujos) {
      try {
        await decidir.mutateAsync({
          flowId: flujo.id,
          body: { reviewStatus, depsHash: flujo.depsHash },
        });
        ok += 1;
      } catch {
        fallidos.push(flujo);
      }
    }
    setMasivo({ enCurso: false, resultado: { ok, fallidos } });
    setSeleccion(new Map(fallidos.map((f) => [f.id, f])));
  };
  // Con la cola vacía el servidor dice `totalPages: 0`; bajar a la «página 0» pedía `page=0`, que el
  // servidor rechaza con 400. El suelo es la página 1.
  const totalPaginas = Math.max(1, query.data?.meta.totalPages ?? 1);
  // Al decidir el último elemento de la última página, esa página deja de existir: sin esto la tabla se
  // quedaba vacía («nada que revisar») mientras las anteriores seguían llenas.
  useEffect(() => {
    if (query.data && page > totalPaginas) setPage(totalPaginas);
  }, [page, query.data, totalPaginas]);

  const columns = useMemo<ColumnDef<FlowReviewItem>[]>(() => {
    const accion = (
      flujo: FlowReviewItem,
      reviewStatus: FlowReviewDecision["reviewStatus"],
      texto: string,
      variant?: "danger",
    ) => (
      <Button
        className="h-8 px-2 text-xs"
        variant={variant}
        disabled={!puedeRevisar || decidir.isPending}
        title={puedeRevisar ? undefined : "Requiere systems.flows.review"}
        onClick={() => {
          decidir.reset();
          decidir.mutate({
            flowId: flujo.id,
            body: { reviewStatus, depsHash: flujo.depsHash },
          });
        }}
      >
        {texto}
      </Button>
    );
    return [
      {
        header: () => (
          <input
            type="checkbox"
            aria-label="Seleccionar todos los de esta página"
            disabled={!puedeRevisar || items.length === 0}
            checked={
              items.length > 0 && items.every((f) => seleccion.has(f.id))
            }
            onChange={alternarPagina}
          />
        ),
        id: "seleccion",
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Seleccionar ${row.original.path}`}
            disabled={!puedeRevisar}
            checked={seleccion.has(row.original.id)}
            onChange={() => alternarUno(row.original)}
          />
        ),
      },
      {
        header: "Riesgo",
        accessorKey: "risk",
        cell: ({ row }) => <RiskBadge value={row.original.risk} />,
      },
      {
        header: "Flujo",
        accessorKey: "path",
        cell: ({ row }) => (
          <span className="flex flex-col gap-1">
            <span className="flex items-center gap-2">
              <MethodBadge method={row.original.httpMethod} />
              <span className="font-mono text-xs">{row.original.path}</span>
              <Button
                className="h-7 px-2 text-xs"
                onClick={() => setAbierto(row.original.id)}
              >
                Ver flujo
              </Button>
            </span>
            <span className="text-xs text-atlas-muted">
              {row.original.systemCode} · {row.original.module}
            </span>
          </span>
        ),
      },
      {
        header: "Por qué",
        accessorKey: "reasons",
        cell: ({ row }) => (
          <span className="flex flex-wrap gap-1">
            {row.original.reasons.map((motivo) => (
              <span key={motivo} title={MOTIVO[motivo]?.hint}>
                <Badge tone="warning">{MOTIVO[motivo]?.label ?? motivo}</Badge>
              </span>
            ))}
            {row.original.codeChangedSinceReview ? (
              <Badge tone="info">El código cambió tras revisarse</Badge>
            ) : null}
          </span>
        ),
      },
      {
        header: "Estado",
        accessorKey: "reviewStatus",
        cell: ({ row }) => {
          const etiqueta = ESTADO[row.original.reviewStatus];
          return (
            <span className="flex flex-col gap-1">
              <Badge tone={etiqueta?.tone ?? "muted"} dot>
                {etiqueta?.label ?? row.original.reviewStatus}
              </Badge>
              {row.original.reviewedAt ? (
                <span className="text-xs text-atlas-muted">
                  {row.original.reviewedBy ?? "—"} ·{" "}
                  {fecha(row.original.reviewedAt)}
                </span>
              ) : null}
            </span>
          );
        },
      },
      {
        header: "Decisión",
        id: "acciones",
        cell: ({ row }) => (
          <span className="flex flex-wrap gap-1">
            {accion(row.original, "APPROVED", "Aprobar")}
            {accion(row.original, "REJECTED", "Rechazar", "danger")}
            {row.original.reviewStatus !== "NEEDS_REVIEW"
              ? accion(row.original, "NEEDS_REVIEW", "Devolver a revisión")
              : null}
          </span>
        ),
      },
    ];
  }, [
    decidir,
    puedeRevisar,
    setAbierto,
    items,
    seleccion,
    alternarPagina,
    alternarUno,
  ]);

  return (
    <>
      <PageHeader
        icon={ClipboardCheck}
        eyebrow="Sistemas · Mapa de rutas"
        title="Revisión de análisis de flujos"
        description="Flujos de riesgo alto cuyo análisis no se puede dar por bueno solo, y los ya revisados cuyo código cambió. Aprobar un flujo es aprobar ESE código: si cambia, vuelve aquí."
      />
      <FlowCatalogNotLoaded />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por nombre, ruta o módulo…"
        searchTooltip="Busca en el servidor, sin distinguir mayúsculas, en el nombre de la operación, su ruta y su módulo."
        filters={[
          {
            name: "estado",
            label: "Estado de revisión",
            value: estado === "NEEDS_REVIEW" ? "" : estado,
            allLabel: ESTADO.NEEDS_REVIEW.label,
            tooltip:
              "Elige qué parte de la cola ves: lo que espera revisión, lo aprobado, lo rechazado o lo detectado sin pedir revisión. Sin elegir, la cola de pendientes.",
            options: ESTADOS.filter((valor) => valor !== "NEEDS_REVIEW").map(
              (valor) => ({
                value: valor,
                label: ESTADO[valor].label,
                description: ESTADO_AYUDA[valor],
              }),
            ),
          },
        ]}
        onFilterChange={(_name, valor) => {
          setEstado(valor ? (valor as FlowReviewStatus) : "NEEDS_REVIEW");
          setPage(1);
        }}
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setEstado("NEEDS_REVIEW");
          setPage(1);
        }}
      />
      {!puedeRevisar ? (
        <p className="mb-4 text-xs text-atlas-muted">
          Puedes ver la cola, pero decidir exige el permiso
          systems.flows.review.
        </p>
      ) : null}
      {seleccion.size > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-atlas-border bg-atlas-surface p-3">
          <span className="text-sm">
            {seleccion.size} seleccionado{seleccion.size === 1 ? "" : "s"}
            {seleccionEnPagina < seleccion.size
              ? ` (${seleccionEnPagina} en esta página)`
              : ""}
          </span>
          <Button
            className="h-8 px-3 text-xs"
            disabled={!puedeRevisar || masivo.enCurso}
            onClick={() => void decidirMasivo("APPROVED")}
          >
            Aprobar seleccionados
          </Button>
          <Button
            className="h-8 px-3 text-xs"
            variant="danger"
            disabled={!puedeRevisar || masivo.enCurso}
            onClick={() => void decidirMasivo("REJECTED")}
          >
            Rechazar seleccionados
          </Button>
          <Button
            className="h-8 px-3 text-xs"
            disabled={masivo.enCurso}
            onClick={() => setSeleccion(new Map())}
          >
            Limpiar selección
          </Button>
          {masivo.enCurso ? (
            <span className="text-xs text-atlas-muted">Aplicando…</span>
          ) : null}
        </div>
      ) : null}
      {masivo.resultado ? (
        <p className="mb-4 text-xs text-atlas-muted">
          {masivo.resultado.ok} decisión{masivo.resultado.ok === 1 ? "" : "es"}{" "}
          aplicada{masivo.resultado.ok === 1 ? "" : "s"}.
          {masivo.resultado.fallidos.length
            ? ` ${masivo.resultado.fallidos.length} quedaron marcados y sin aplicar (su código puede haber cambiado entre que se abrió la cola y se decidió) — siguen seleccionados, reintentá.`
            : ""}
        </p>
      ) : null}
      {decidir.error ? (
        <p className="mb-4 text-xs text-red-700">
          {isAtlasApiError(decidir.error)
            ? decidir.error.message
            : "No se pudo aplicar la decisión."}
        </p>
      ) : null}
      {query.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {query.error ? (
        <ErrorState
          description={
            isAtlasApiError(query.error)
              ? query.error.message
              : "No se pudo cargar la cola de revisión."
          }
          requestId={
            isAtlasApiError(query.error) ? query.error.requestId : undefined
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.data ? (
        <DataTable
          data={query.data.items}
          columns={columns}
          meta={query.data.meta}
          onPageChange={setPage}
          emptyTitle={
            q.trim()
              ? "Ningún flujo de la cola coincide con la búsqueda"
              : "Nada que revisar con este estado"
          }
          emptyDescription="La cola sólo recibe flujos de riesgo alto con análisis incierto y los revisados cuyo código cambió. Se llena al recargar el mapa de rutas."
        />
      ) : null}
      <FlowDetailDrawer flowId={abierto} onClose={() => setAbierto(null)} />
    </>
  );
}
