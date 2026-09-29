"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useReviewTargetMutation } from "@/features/systems/hooks";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { useAuth } from "@/shared/auth/auth-context";
import { Button } from "@/shared/components/ui/button";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { PageHeader } from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { ErrorState } from "@/shared/components/ui/states";
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
import { REVIEW_FAMILIES } from "./review-families";
import {
  ReviewFamilySection,
  type ReviewFilters,
} from "./review-family-section";
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
  const [type, setType] = useState("all");
  const [filters, setFilters] = useState<ReviewFilters>({
    q: "",
    reviewStatus: "NEEDS_REVIEW",
  });
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(
    null,
  );
  const queryClient = useQueryClient();
  const reviewMutation = useReviewTargetMutation();
  const { hasPermission } = useAuth();
  const canReview = hasPermission("systems.reviewQueue.resolve");

  const columns = useMemo(
    () => ({
      endpoints: buildEndpointColumns(setPendingReview, canReview),
      data_entities: buildEntityColumns(setPendingReview, canReview),
      data_impacts: buildDataImpactColumns(setPendingReview, canReview),
      field_impacts: buildFieldImpactColumns(setPendingReview, canReview),
      tool_requirements: buildToolColumns(setPendingReview, canReview),
      data_column_impacts: buildColumnReviewColumns(
        setPendingReview,
        canReview,
      ),
    }),
    [canReview],
  );
  const visible = REVIEW_FAMILIES.filter(
    (family) => type === "all" || family.type === type,
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

  return (
    <>
      <PageHeader
        icon={ClipboardCheck}
        eyebrow="Sistemas"
        title="Revisión del catálogo"
        description="Confirma o descarta lo que el escáner detectó: rutas, tablas, columnas, impactos y herramientas. Cada decisión guarda su motivo."
        actions={
          <Button
            onClick={() =>
              void queryClient.invalidateQueries({
                queryKey: ["systems", "review-queue"],
              })
            }
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />
      <BusinessContextNote>
        El catálogo de rutas y tablas se llena automáticamente escaneando el
        código, y eso puede equivocarse. Aquí una persona confirma o corrige
        esas detecciones antes de que QA, gobierno o reportes confíen en ellas.
        No es la revisión de análisis de flujos (esa es otra cola).
      </BusinessContextNote>
      <FilterBar
        search={filters.q}
        searchPlaceholder="Buscar ruta, tabla, columna, campo o herramienta…"
        searchTooltip="Busca en el servidor, sin distinguir mayúsculas, en las seis familias: rutas (código, ruta, módulo, método), tablas (nombre, entidad, esquema, módulo), columnas, campos y herramientas (código, nombre, proveedor). En los impactos busca por la ruta o la tabla a la que apuntan."
        filters={[
          {
            name: "type",
            label: "Tipo",
            value: type,
            options: typeOptions,
            tooltip:
              "Qué familia de detecciones enseñar; «Todos» pinta las seis.",
          },
          {
            name: "reviewStatus",
            label: "Estado revisión",
            value: filters.reviewStatus,
            options: reviewOptions,
            tooltip: "En qué punto de la revisión está cada detección.",
          },
        ]}
        onSearchChange={(value) =>
          setFilters((current) => ({ ...current, q: value }))
        }
        onFilterChange={(name, value) => {
          if (name === "type") setType(value || "all");
          if (name === "reviewStatus")
            setFilters((current) => ({
              ...current,
              reviewStatus: value || "NEEDS_REVIEW",
            }));
        }}
        onClear={() => {
          setType("all");
          setFilters({ q: "", reviewStatus: "NEEDS_REVIEW" });
        }}
      />
      <div className="space-y-6">
        {visible.map((family) => (
          <ReviewFamilySection
            key={family.type}
            family={family}
            filters={filters}
            columns={columns[family.type] as ColumnDef<unknown>[]}
          />
        ))}
      </div>
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
                : "No se pudo guardar la decisión."
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
