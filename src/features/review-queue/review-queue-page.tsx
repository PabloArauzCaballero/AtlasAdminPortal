"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import {
  useReviewQueue,
  useReviewTargetMutation,
} from "@/features/systems/hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { useAuth } from "@/shared/auth/auth-context";
import { Button } from "@/shared/components/ui/button";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { PageHeader } from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  buildDataImpactColumns,
  buildEndpointColumns,
  buildEntityColumns,
  buildFieldImpactColumns,
  buildToolColumns,
} from "./review-columns";
import { buildColumnReviewColumns } from "./review-column-columns";
import { ReviewDecisionDialog } from "./review-decision-dialog";
import { reviewOptions, typeOptions } from "./review-options";
import { ReviewTableCard } from "./review-table-card";
import type { ReviewDecisionInput } from "@/features/systems/types";
import type { PendingReview } from "./types";

export function ReviewQueuePage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["systems.reviewQueue.read"]}>
      <AuthorizedReviewQueuePage />
    </PermissionGate>
  );
}

function AuthorizedReviewQueuePage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState("all");
  const [module, setModule] = useState("");
  const [reviewStatus, setReviewStatus] = useState("NEEDS_REVIEW");
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(
    null,
  );
  const queue = useReviewQueue({ page, limit: 10, type, module, reviewStatus });
  const reviewMutation = useReviewTargetMutation();
  const { hasPermission } = useAuth();
  const canReview = hasPermission("systems.reviewQueue.resolve");

  const columns = useMemo(
    () => ({
      endpoints: buildEndpointColumns(setPendingReview, canReview),
      entities: buildEntityColumns(setPendingReview, canReview),
      dataImpacts: buildDataImpactColumns(setPendingReview, canReview),
      fieldImpacts: buildFieldImpactColumns(setPendingReview, canReview),
      tools: buildToolColumns(setPendingReview, canReview),
      dataColumns: buildColumnReviewColumns(setPendingReview, canReview),
    }),
    [canReview],
  );

  function confirmReview(body: ReviewDecisionInput) {
    if (!pendingReview) return;
    reviewMutation.mutate(
      {
        targetType: pendingReview.targetType,
        targetId: pendingReview.targetId,
        body,
      },
      { onSuccess: () => setPendingReview(null) },
    );
  }
  const dataColumns = queue.data?.dataColumnImpacts ?? { items: [], total: 0 };

  return (
    <>
      <PageHeader
        icon={ClipboardCheck}
        eyebrow="Cola de revisión"
        title="Cola de revisión"
        description="Confirma o descarta lo que el escáner detectó: rutas, tablas, columnas, impactos y herramientas. Cada decisión guarda su motivo."
        actions={
          <Button
            onClick={() => void queue.refetch()}
            isLoading={queue.isFetching}
            loadingText="Actualizando…"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />
      <BusinessContextNote>
        El catálogo de endpoints y tablas se llena automáticamente escaneando el
        código (auto-detectado), pero eso puede equivocarse. Esta cola existe
        para que una persona confirme o corrija esas detecciones antes de que el
        resto de la plataforma (QA, gobierno, reportes) confíe ciegamente en
        datos sin revisar.
      </BusinessContextNote>
      <FilterBar
        search={module}
        searchPlaceholder="Filtrar por módulo…"
        filters={[
          { name: "type", label: "Tipo", value: type, options: typeOptions },
          {
            name: "reviewStatus",
            label: "Estado revisión",
            value: reviewStatus,
            options: reviewOptions,
          },
        ]}
        onSearchChange={(value) => {
          setModule(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "type") setType(value);
          if (name === "reviewStatus") setReviewStatus(value);
          setPage(1);
        }}
        onClear={() => {
          setType("all");
          setModule("");
          setReviewStatus("NEEDS_REVIEW");
          setPage(1);
        }}
      />
      {queue.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {queue.error ? (
        <ErrorState
          description={
            isAtlasApiError(queue.error)
              ? queue.error.message
              : "No se pudo cargar cola de revisión."
          }
          requestId={
            isAtlasApiError(queue.error) ? queue.error.requestId : undefined
          }
          onRetry={() => void queue.refetch()}
        />
      ) : null}
      {queue.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Endpoints" value={queue.data.endpoints.total} />
            <MetricCard label="Tablas" value={queue.data.dataEntities.total} />
            <MetricCard label="Columnas" value={dataColumns.total} />
            <MetricCard
              label="Impactos tabla"
              value={queue.data.dataEntityImpacts.total}
            />
            <MetricCard
              label="Impactos campo"
              value={queue.data.fieldImpacts.total}
            />
            <MetricCard
              label="Herramientas"
              value={queue.data.toolRequirements.total}
            />
          </section>
          <ReviewTableCard
            title="Endpoints"
            data={queue.data.endpoints.items}
            columns={columns.endpoints}
            onPageChange={setPage}
          />
          <ReviewTableCard
            title="Tablas / data entities"
            data={queue.data.dataEntities.items}
            columns={columns.entities}
            onPageChange={setPage}
          />
          <ReviewTableCard
            title="Columnas de datos"
            data={dataColumns.items}
            columns={columns.dataColumns}
            onPageChange={setPage}
          />
          <ReviewTableCard
            title="Impactos endpoint-tabla"
            data={queue.data.dataEntityImpacts.items}
            columns={columns.dataImpacts}
            onPageChange={setPage}
          />
          <ReviewTableCard
            title="Impactos endpoint-campo"
            data={queue.data.fieldImpacts.items}
            columns={columns.fieldImpacts}
            onPageChange={setPage}
          />
          <ReviewTableCard
            title="Requerimientos de herramientas"
            data={queue.data.toolRequirements.items}
            columns={columns.tools}
            onPageChange={setPage}
          />
        </div>
      ) : null}
      <ReviewDecisionDialog
        pending={pendingReview}
        isLoading={reviewMutation.isPending}
        onCancel={() => setPendingReview(null)}
        onConfirm={confirmReview}
      />
      {reviewMutation.error ? (
        <div className="mt-4">
          <ErrorState
            description={
              isAtlasApiError(reviewMutation.error)
                ? reviewMutation.error.message
                : "No se pudo actualizar revisión."
            }
            requestId={
              isAtlasApiError(reviewMutation.error)
                ? reviewMutation.error.requestId
                : undefined
            }
          />
        </div>
      ) : null}
    </>
  );
}
