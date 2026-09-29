"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { RunLaunchDialog } from "./run-launch-dialog";
import { useQaCapabilities, useQaTemplates } from "./run-hooks";
import { templateKeyOf } from "./run-launch-form";
import { disabledMessage, errorProps } from "./run-status";
import { buildTemplateColumns, type TemplateAction } from "./template-columns";
import { TemplateDrawer } from "./template-drawers";
import { filterTemplates, TEMPLATE_STATUS_OPTIONS } from "./template-filter";
import type { QaTemplateSummary } from "./types";

/**
 * El catálogo de recorridos precargados. Es la entrada normal a las pruebas de N personas: cada
 * fila ya es un journey listo (sin IDs que reemplazar) y «Ejecutar» abre el lanzamiento con
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
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const all = useMemo(() => templates.data ?? [], [templates.data]);
  const visible = useMemo(
    () => filterTemplates(all, q, status),
    [all, q, status],
  );
  const columns = useMemo(
    () =>
      buildTemplateColumns({
        canRun,
        onAction: (action, item) => setOpen({ action, template: item }),
      }),
    [canRun],
  );

  return (
    <div className="space-y-3">
      {capabilities.data && !capabilities.data.enabled ? (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {disabledMessage(capabilities.data)} Puedes revisar las plantillas,
          pero no ejecutarlas.
        </p>
      ) : null}
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por nombre, código o descripción…"
        searchTooltip="Recorre el catálogo completo de recorridos, que llega entero del servidor: coincide con parte del nombre, del código, de la descripción, del flujo o del desenlace esperado."
        filters={[
          {
            name: "status",
            label: "Estado",
            tooltip:
              "Si el recorrido se puede ejecutar ya (Lista), le falta algo del entorno (Bloqueada) o está en preparación (Borrador).",
            value: status,
            options: TEMPLATE_STATUS_OPTIONS,
          },
        ]}
        onSearchChange={setQ}
        onFilterChange={(_name, value) => setStatus(value)}
        onClear={() => {
          setQ("");
          setStatus("");
        }}
      />
      {templates.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {templates.error ? (
        <ErrorState
          title="No se pudo leer el catálogo de recorridos"
          {...errorProps(templates.error)}
          onRetry={() => void templates.refetch()}
        />
      ) : null}
      {templates.data ? (
        <DataTable
          data={visible}
          columns={columns}
          emptyTitle={
            all.length === 0
              ? "Sin recorridos precargados"
              : "Ningún recorrido coincide con la búsqueda."
          }
          emptyDescription={
            all.length === 0
              ? "El catálogo de QA todavía no publica plantillas de recorrido."
              : "Cambia el texto o quita el filtro de estado."
          }
        />
      ) : null}
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
