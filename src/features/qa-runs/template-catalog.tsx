"use client";

import { useState } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { RunLaunchDialog } from "./run-launch-dialog";
import { useQaCapabilities, useQaTemplates } from "./run-hooks";
import { templateKeyOf } from "./run-launch-form";
import { errorProps } from "./run-status";
import { TemplateCard, type TemplateAction } from "./template-card";
import { TemplateDrawer } from "./template-drawers";
import type { QaTemplateSummary } from "./types";

/**
 * El catálogo de recorridos precargados. Es la entrada normal a las pruebas de N personas: cada
 * tarjeta ya es un journey listo (sin IDs que reemplazar) y «Ejecutar» abre el lanzamiento con
 * datos normales por defecto.
 */
export function TemplateCatalog({
  workflowCode,
  onLaunched,
}: Readonly<{
  workflowCode?: string;
  onLaunched: (runId: string) => void;
}>) {
  const templates = useQaTemplates(workflowCode);
  const capabilities = useQaCapabilities();
  const [open, setOpen] = useState<{
    action: TemplateAction;
    template: QaTemplateSummary;
  } | null>(null);
  const canRun = capabilities.data?.enabled === true;

  if (templates.isLoading) return <LoadingSkeleton rows={4} />;
  if (templates.error)
    return (
      <ErrorState
        title="No se pudo leer el catálogo de recorridos"
        {...errorProps(templates.error)}
        onRetry={() => void templates.refetch()}
      />
    );
  if (!templates.data || templates.data.length === 0)
    return (
      <EmptyState
        title="Sin recorridos precargados"
        description="El catálogo de QA todavía no publica plantillas de recorrido."
      />
    );

  return (
    <div className="space-y-3">
      {capabilities.data && !capabilities.data.enabled ? (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          Las corridas de QA están desactivadas en este entorno (
          {capabilities.data.deploymentEnvironment}): puedes revisar las
          plantillas, pero no ejecutarlas.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.data.map((template) => (
          <TemplateCard
            key={templateKeyOf(template)}
            template={template}
            canRun={canRun}
            onAction={(action, item) => setOpen({ action, template: item })}
          />
        ))}
      </div>
      {open && open.action !== "run" ? (
        <TemplateDrawer
          action={open.action}
          template={open.template}
          capabilities={capabilities.data}
          onClose={() => setOpen(null)}
        />
      ) : null}
      <RunLaunchDialog
        open={open?.action === "run"}
        workflowCode={workflowCode}
        templateKey={open ? templateKeyOf(open.template) : undefined}
        onClose={() => setOpen(null)}
        onLaunched={(runId) => {
          setOpen(null);
          onLaunched(runId);
        }}
      />
    </div>
  );
}
