"use client";

import { useMemo, useState } from "react";
import { useReorderTestStepsMutation } from "@/features/systems/qa-authoring-hooks";
import type { TestStep } from "@/features/systems/types";
import { isAtlasApiError } from "@/shared/api/errors";
import { useAuth } from "@/shared/auth/auth-context";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Button } from "@/shared/components/ui/button";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { ErrorState } from "@/shared/components/ui/states";
import { buildReorderPayload } from "./reorder-steps";
import { StepForm } from "./step-form";
import { buildStepColumns } from "./step-columns";

export function SuiteStepsSection({
  suiteId,
  steps,
}: Readonly<{ suiteId: string; steps: TestStep[] }>) {
  const { hasPermission } = useAuth();
  const reorder = useReorderTestStepsMutation(suiteId);
  const [editing, setEditing] = useState<TestStep | null>(null);
  const [creating, setCreating] = useState(false);

  // El backend restringe la autoría a system_admin/platform_admin/qa_engineer;
  // `systems.qa.execute` es el permiso del catálogo más cercano a "operar QA".
  // Si el rol no alcanza, el backend responde 403.
  const canAuthor = hasPermission("systems.qa.execute");

  const nextStepOrder =
    steps.reduce((max, step) => Math.max(max, step.stepOrder), 0) + 1;

  const columns = useMemo(
    () =>
      buildStepColumns({
        onEdit: canAuthor ? (step) => setEditing(step) : undefined,
        onMove: canAuthor
          ? (step, direction) =>
              reorder.mutate({
                steps: buildReorderPayload(steps, step, direction),
              })
          : undefined,
        isMoving: reorder.isPending,
        totalSteps: steps.length,
      }),
    [canAuthor, reorder, steps],
  );

  return (
    <div className="space-y-4">
      {canAuthor ? (
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => setCreating(true)}>
            Agregar paso
          </Button>
        </div>
      ) : null}

      {reorder.error ? (
        <ErrorState
          description={
            isAtlasApiError(reorder.error)
              ? reorder.error.message
              : "No se pudo reordenar los pasos."
          }
          requestId={
            isAtlasApiError(reorder.error) ? reorder.error.requestId : undefined
          }
        />
      ) : null}

      <DataTable
        data={steps}
        columns={columns}
        emptyTitle="La suite todavía no tiene pasos."
        emptyDescription="Una suite sin pasos se ejecuta sin validar nada. Agrega el primero."
      />

      <DrawerPanel
        open={creating}
        title="Nuevo paso"
        onClose={() => setCreating(false)}
      >
        <StepForm
          suiteId={suiteId}
          nextStepOrder={nextStepOrder}
          onSaved={() => setCreating(false)}
        />
      </DrawerPanel>

      <DrawerPanel
        open={editing !== null}
        title={`Editar paso ${editing?.name ?? ""}`}
        onClose={() => setEditing(null)}
      >
        {/* `key` fuerza remontar el formulario al cambiar de paso: sin él, RHF
            conserva los defaultValues del paso anterior y se guardaría la
            edición en el paso equivocado. */}
        {editing ? (
          <StepForm
            key={editing.stepId}
            suiteId={suiteId}
            step={editing}
            nextStepOrder={editing.stepOrder}
            onSaved={() => setEditing(null)}
          />
        ) : null}
      </DrawerPanel>
    </div>
  );
}
