"use client";

import { useMemo, useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useNotificationTemplates } from "./hooks";
import { CHANNEL_OPTIONS } from "./notification-options";
import { buildTemplateColumns } from "./template-columns";
import { TemplateForm } from "./template-form";
import type { NotificationTemplate } from "./types";
import { usePageSize } from "@/shared/lib/page-size";

const POR_PAGINA = 12;

const ACTIVA_OPTIONS = [
  {
    value: "true",
    label: "Activas",
    description: "Las que Atlas usa hoy al generar mensajes.",
  },
  {
    value: "false",
    label: "Inactivas",
    description: "Apagadas: se conservan pero no generan mensajes.",
  },
];

/**
 * Las plantillas, paginadas y filtradas en el servidor.
 *
 * Antes se pedían `limit=100` de una vez y se pintaban todas: la plantilla 101 no aparecía en
 * ningún sitio y nada lo decía. Ahora hay pie de página con el total real, un buscador que viaja
 * como `q` (código, título y asunto) y los filtros de canal y activa que el servidor ya admitía.
 */
export function TemplatesSection() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("");
  const [active, setActive] = useState("");
  const templates = useNotificationTemplates({
    page,
    limit: usePageSize(POR_PAGINA),
    q: q.trim(),
    channel,
    active,
  });
  const [editing, setEditing] = useState<NotificationTemplate | "new" | null>(
    null,
  );

  const columns = useMemo(() => buildTemplateColumns(setEditing), []);
  const hayFiltros = q.trim() !== "" || channel !== "" || active !== "";

  return (
    <div className="space-y-4">
      <PermissionGate
        permissions={["notifications.templates.manage"]}
        fallback={null}
      >
        <Button variant="primary" onClick={() => setEditing("new")}>
          Nueva plantilla
        </Button>
      </PermissionGate>

      {editing ? (
        <TemplateForm
          template={editing === "new" ? null : editing}
          onDone={() => setEditing(null)}
        />
      ) : null}

      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código, título o asunto…"
        searchTooltip="Busca en el servidor, en todas las plantillas: coincide con parte del código, del título o del asunto de la plantilla."
        filters={[
          {
            name: "channel",
            label: "Canal",
            value: channel,
            options: CHANNEL_OPTIONS,
            tooltip: "Por qué vía sale el mensaje que genera la plantilla.",
          },
          {
            name: "active",
            label: "Activa",
            value: active,
            options: ACTIVA_OPTIONS,
            tooltip: "Si Atlas la usa hoy o quedó apagada.",
          },
        ]}
        onSearchChange={(valor) => {
          setQ(valor);
          setPage(1);
        }}
        onFilterChange={(nombre, valor) => {
          if (nombre === "channel") setChannel(valor);
          if (nombre === "active") setActive(valor);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setChannel("");
          setActive("");
          setPage(1);
        }}
      />

      {templates.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {templates.error ? (
        <ErrorState
          description={
            isAtlasApiError(templates.error)
              ? templates.error.message
              : "No se pudieron cargar las plantillas."
          }
          requestId={
            isAtlasApiError(templates.error)
              ? templates.error.requestId
              : undefined
          }
          onRetry={() => void templates.refetch()}
        />
      ) : null}
      {templates.data ? (
        <DataTable
          data={templates.data.items}
          columns={columns}
          meta={templates.data.meta ?? undefined}
          onPageChange={setPage}
          emptyTitle={
            hayFiltros
              ? "Ninguna plantilla coincide con la búsqueda."
              : "Todavía no hay plantillas."
          }
          emptyDescription={
            hayFiltros
              ? "Prueba con otra búsqueda o quita los filtros de canal y estado."
              : "Las plantillas se crean con «Nueva plantilla»."
          }
        />
      ) : null}
    </div>
  );
}
