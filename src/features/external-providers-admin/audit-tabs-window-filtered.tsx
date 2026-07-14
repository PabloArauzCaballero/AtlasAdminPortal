"use client";

import { useState } from "react";
import { Field, Input } from "@/shared/components/ui/input";
import {
  useIdempotencyAudit,
  useRetentionPreview,
  useSanitizationAudit,
} from "./hooks";
import { ReportView } from "./report-view";

export function IdempotencyAuditTab() {
  const [days, setDays] = useState(30);
  const [limit, setLimit] = useState(5000);
  const query = useIdempotencyAudit({ days, limit });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Ventana (días)">
          <Input
            type="number"
            min={1}
            max={366}
            value={days}
            onChange={(event) => setDays(Number(event.target.value) || 30)}
          />
        </Field>
        <Field label="Límite">
          <Input
            type="number"
            min={1}
            max={10000}
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value) || 5000)}
          />
        </Field>
      </div>
      <ReportView query={query} title="Auditoría de idempotencia" />
    </div>
  );
}

export function RetentionPreviewTab() {
  const [days, setDays] = useState(90);
  const [limit, setLimit] = useState(100);
  const query = useRetentionPreview({ days, limit });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Más antiguo que (días)">
          <Input
            type="number"
            min={1}
            max={3650}
            value={days}
            onChange={(event) => setDays(Number(event.target.value) || 90)}
          />
        </Field>
        <Field label="Límite de candidatos">
          <Input
            type="number"
            min={1}
            max={500}
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value) || 100)}
          />
        </Field>
      </div>
      <ReportView query={query} title="Vista previa de purga por retención" />
    </div>
  );
}

export function SanitizationAuditTab() {
  const [limit, setLimit] = useState(100);
  const query = useSanitizationAudit({ limit });

  return (
    <div className="space-y-4">
      <Field label="Límite de muestra" hint="Máximo 500.">
        <Input
          type="number"
          min={1}
          max={500}
          value={limit}
          onChange={(event) => setLimit(Number(event.target.value) || 100)}
        />
      </Field>
      <ReportView query={query} title="Auditoría de sanitización" />
    </div>
  );
}
