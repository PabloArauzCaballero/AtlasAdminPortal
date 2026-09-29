"use client";

import { useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Pagination } from "@/shared/components/data-table/pagination";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { safeText } from "@/shared/lib/format";
import { useNotificationTemplates } from "./hooks";
import { NotificationChannelBadge } from "./notification-columns";
import { CHANNEL_OPTIONS } from "./notification-options";
import { TemplateForm } from "./template-form";
import type { NotificationTemplate } from "./types";

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
    limit: POR_PAGINA,
    q: q.trim(),
    channel,
    active,
  });
  const [editing, setEditing] = useState<NotificationTemplate | "new" | null>(
    null,
  );

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
        searchTooltip="Busca en el servidor, en todas las plantillas: coincide con parte del código, de la plantilla del título o de la del asunto."
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
      {templates.data && templates.data.items.length === 0 ? (
        <EmptyState
          title="Ninguna plantilla coincide."
          description="Prueba con otra búsqueda o quita los filtros de canal y estado."
        />
      ) : null}
      {templates.data && templates.data.items.length > 0 ? (
        <>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {templates.data.items.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => setEditing(template)}
              />
            ))}
          </div>
          {templates.data.meta ? (
            <Pagination meta={templates.data.meta} onPageChange={setPage} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function TemplateCard({
  template,
  onEdit,
}: Readonly<{ template: NotificationTemplate; onEdit: () => void }>) {
  return (
    <article className="flex flex-col rounded-xl border border-atlas-border bg-white p-4 shadow-subtle">
      <div className="flex items-start justify-between gap-2">
        <code className="font-mono text-sm font-semibold text-atlas-text">
          {template.code}
        </code>
        <Badge tone={template.isActive ? "success" : "muted"}>
          {template.isActive ? "activa" : "inactiva"}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <NotificationChannelBadge value={template.channel} />
        <Badge tone="muted">{template.locale}</Badge>
        <Badge tone="muted">v{template.version}</Badge>
        {template.category ? (
          <Badge tone="muted">{template.category}</Badge>
        ) : null}
      </div>
      <p className="mt-3 text-xs leading-5 text-atlas-muted">
        {safeText(template.titleTemplate)}
      </p>
      <p className="mt-1 line-clamp-2 text-xs text-atlas-text">
        {template.bodyTemplate}
      </p>
      <PermissionGate
        permissions={["notifications.templates.manage"]}
        fallback={null}
      >
        <Button className="mt-3 self-start" onClick={onEdit}>
          Editar
        </Button>
      </PermissionGate>
    </article>
  );
}
