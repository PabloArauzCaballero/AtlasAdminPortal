"use client";

import { useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { safeText } from "@/shared/lib/format";
import { useNotificationTemplates } from "./hooks";
import { NotificationChannelBadge } from "./notification-columns";
import { TemplateForm } from "./template-form";
import type { NotificationTemplate } from "./types";

export function TemplatesSection() {
  const templates = useNotificationTemplates({ page: 1, limit: 100 });
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.data.items.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => setEditing(template)}
            />
          ))}
        </div>
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
