"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/input";
import { ErrorState } from "@/shared/components/ui/states";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  useCreateNotificationTemplateMutation,
  useUpdateNotificationTemplateMutation,
} from "./hooks";
import type {
  CreateNotificationTemplateInput,
  NotificationTemplate,
} from "./types";

const CHANNELS = ["in_app", "push", "email", "sms", "whatsapp", "phone"];

export function TemplateForm({
  template,
  onDone,
}: Readonly<{ template: NotificationTemplate | null; onDone: () => void }>) {
  const [form, setForm] = useState<CreateNotificationTemplateInput>({
    code: template?.code ?? "",
    channel: template?.channel ?? "in_app",
    locale: template?.locale ?? "es-BO",
    titleTemplate: template?.titleTemplate ?? "",
    subjectTemplate: template?.subjectTemplate ?? "",
    bodyTemplate: template?.bodyTemplate ?? "",
    category: template?.category ?? "",
    icon: template?.icon ?? "",
    isActive: template?.isActive ?? true,
    version: template?.version ?? 1,
  });
  const [payloadSchemaText, setPayloadSchemaText] = useState(
    template?.payloadSchema
      ? JSON.stringify(template.payloadSchema, null, 2)
      : "",
  );
  const [error, setError] = useState<string | null>(null);
  const create = useCreateNotificationTemplateMutation();
  const update = useUpdateNotificationTemplateMutation(template?.id ?? "");
  const mutation = template ? update : create;

  function patch(value: Partial<CreateNotificationTemplateInput>) {
    setForm((current) => ({ ...current, ...value }));
  }

  function submit() {
    let payloadSchema: Record<string, unknown> | null = null;
    if (payloadSchemaText.trim()) {
      try {
        payloadSchema = JSON.parse(payloadSchemaText) as Record<
          string,
          unknown
        >;
      } catch {
        setError("El esquema de payload debe ser JSON válido.");
        return;
      }
    }
    setError(null);
    // El backend exige category/icon no-vacíos cuando vienen presentes (min(1)); un input vacío
    // significa "sin valor", no "string vacío" — se omite para que el schema los trate como
    // ausentes en vez de rechazarlos con 400.
    mutation.mutate(
      {
        ...form,
        payloadSchema,
        category: form.category?.trim() ? form.category.trim() : undefined,
        icon: form.icon?.trim() ? form.icon.trim() : undefined,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title={
            template ? `Editar plantilla ${template.code}` : "Nueva plantilla"
          }
          description="Las plantillas definen cómo se renderiza cada mensaje por canal. bodyTemplate acepta {{variables}} resueltas desde el payload del evento."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label="Código"
            hint="Identificador único, ej: onboarding_welcome."
          >
            <Input
              value={form.code}
              disabled={Boolean(template)}
              onChange={(event) => patch({ code: event.target.value })}
              className="font-mono"
            />
          </Field>
          <Field label="Canal">
            <Select
              value={form.channel}
              onChange={(event) =>
                patch({
                  channel: event.target
                    .value as CreateNotificationTemplateInput["channel"],
                })
              }
            >
              {CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Locale">
            <Input
              value={form.locale}
              onChange={(event) => patch({ locale: event.target.value })}
            />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Título" hint="Usado en push/in-app.">
            <Input
              value={form.titleTemplate ?? ""}
              onChange={(event) => patch({ titleTemplate: event.target.value })}
            />
          </Field>
          <Field label="Asunto" hint="Usado en email.">
            <Input
              value={form.subjectTemplate ?? ""}
              onChange={(event) =>
                patch({ subjectTemplate: event.target.value })
              }
            />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Categoría"
            hint="Agrupa notificaciones para un futuro frontend (ej: system_alert, billing, kyc)."
          >
            <Input
              value={form.category ?? ""}
              onChange={(event) => patch({ category: event.target.value })}
            />
          </Field>
          <Field
            label="Ícono"
            hint="Identificador libre, ej: bell, alert-triangle."
          >
            <Input
              value={form.icon ?? ""}
              onChange={(event) => patch({ icon: event.target.value })}
            />
          </Field>
        </div>
        <Field
          label="Cuerpo del mensaje"
          hint="Texto renderizado al destinatario. Usa {{variable}} para interpolar el payload del evento."
        >
          <Textarea
            value={form.bodyTemplate}
            onChange={(event) => patch({ bodyTemplate: event.target.value })}
            className="min-h-28 font-mono text-sm"
          />
        </Field>
        <Field
          label="Esquema de payload (JSON, opcional)"
          hint='Documenta qué variables espera el template, ej: { "customerId": "number|optional" }'
        >
          <Textarea
            value={payloadSchemaText}
            onChange={(event) => setPayloadSchemaText(event.target.value)}
            className="min-h-24 font-mono text-xs"
          />
        </Field>
        <label className="flex w-fit items-center gap-2 text-sm text-atlas-text">
          <input
            type="checkbox"
            checked={form.isActive ?? true}
            onChange={(event) => patch({ isActive: event.target.checked })}
          />
          Plantilla activa
        </label>
        {error ? (
          <ErrorState title="Formulario inválido" description={error} />
        ) : null}
        {mutation.error ? (
          <ErrorState
            description={
              isAtlasApiError(mutation.error)
                ? mutation.error.message
                : "No se pudo guardar la plantilla."
            }
          />
        ) : null}
        <div className="flex gap-2">
          <Button
            variant="primary"
            isLoading={mutation.isPending}
            loadingText="Guardando…"
            onClick={submit}
          >
            {template ? "Guardar cambios" : "Crear plantilla"}
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
