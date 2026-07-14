"use client";

import { useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/input";
import { ErrorState, ForbiddenState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useSendBroadcastNotificationMutation } from "./hooks";
import type {
  BroadcastAudience,
  CreateBroadcastNotificationInput,
} from "./types";

const AUDIENCE_OPTIONS: { value: BroadcastAudience; label: string }[] = [
  { value: "customers", label: "Todos los customers" },
  { value: "internal_users", label: "Todos los usuarios internos" },
  { value: "both", label: "Customers + usuarios internos" },
];

function splitIds(value: string): string[] | undefined {
  const ids = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return ids.length > 0 ? ids : undefined;
}

const emptyForm: CreateBroadcastNotificationInput = {
  title: "",
  body: "",
  priority: 0,
  category: "custom_broadcast",
  icon: "",
  audience: "customers",
};

export function BroadcastSection() {
  return (
    <PermissionGate
      permissions={["notifications.messages.manage"]}
      fallback={
        <ForbiddenState message="Enviar notificaciones personalizadas requiere permiso de administración de mensajes (notifications.messages.manage)." />
      }
    >
      <BroadcastForm />
    </PermissionGate>
  );
}

function BroadcastForm() {
  const [form, setForm] = useState(emptyForm);
  const [customerIdsText, setCustomerIdsText] = useState("");
  const [internalUserIdsText, setInternalUserIdsText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const send = useSendBroadcastNotificationMutation();

  function patch(value: Partial<CreateBroadcastNotificationInput>) {
    setForm((current) => ({ ...current, ...value }));
  }

  const audienceLabel =
    AUDIENCE_OPTIONS.find((option) => option.value === form.audience)?.label ??
    form.audience;
  const canSubmit = form.title.trim().length > 0 && form.body.trim().length > 0;

  function submit() {
    const customerIds =
      form.audience === "internal_users"
        ? undefined
        : splitIds(customerIdsText);
    const internalUserIds =
      form.audience === "customers" ? undefined : splitIds(internalUserIdsText);
    send.mutate(
      {
        ...form,
        icon: form.icon?.trim() ? form.icon.trim() : undefined,
        customerIds,
        internalUserIds,
      },
      {
        onSuccess: () => setForm(emptyForm),
        onSettled: () => setConfirmOpen(false),
      },
    );
  }

  return (
    <div className="space-y-4">
      <BusinessContextNote>
        Esta notificación la redacta y dispara un administrador desde acá — a
        diferencia de la pestaña &quot;Mensajes&quot;, no depende de que ocurra
        un evento de negocio. Se entrega in-app de verdad (no es una
        simulación): crea un mensaje real por destinatario y queda visible en
        &quot;Mensajes&quot; con su propio historial de entrega.
      </BusinessContextNote>
      <Card>
        <CardHeader>
          <SectionHeader
            title="Enviar notificación personalizada"
            description="Si dejas los IDs vacíos, se envía a TODOS los activos de la audiencia elegida — revisa bien antes de confirmar."
            className="mb-0"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Título">
              <Input
                value={form.title}
                onChange={(event) => patch({ title: event.target.value })}
              />
            </Field>
            <Field
              label="Prioridad"
              hint="Entero, 0-100. Mayor = más importante."
            >
              <Input
                type="number"
                min={0}
                max={100}
                value={form.priority ?? 0}
                onChange={(event) =>
                  patch({ priority: Number(event.target.value) || 0 })
                }
              />
            </Field>
          </div>
          <Field label="Mensaje">
            <Textarea
              value={form.body}
              onChange={(event) => patch({ body: event.target.value })}
              className="min-h-24"
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Audiencia">
              <Select
                value={form.audience}
                onChange={(event) =>
                  patch({ audience: event.target.value as BroadcastAudience })
                }
              >
                {AUDIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Categoría">
              <Input
                value={form.category ?? ""}
                onChange={(event) => patch({ category: event.target.value })}
              />
            </Field>
            <Field label="Ícono (opcional)">
              <Input
                value={form.icon ?? ""}
                onChange={(event) => patch({ icon: event.target.value })}
              />
            </Field>
          </div>
          {form.audience !== "internal_users" ? (
            <Field
              label="IDs de customers (opcional)"
              hint="Separados por coma. Vacío = todos los customers activos del tenant."
            >
              <Input
                value={customerIdsText}
                onChange={(event) => setCustomerIdsText(event.target.value)}
                placeholder="12, 45, 90"
              />
            </Field>
          ) : null}
          {form.audience !== "customers" ? (
            <Field
              label="IDs de usuarios internos (opcional)"
              hint="Separados por coma. Vacío = todos los usuarios internos activos del tenant."
            >
              <Input
                value={internalUserIdsText}
                onChange={(event) => setInternalUserIdsText(event.target.value)}
                placeholder="3, 7"
              />
            </Field>
          ) : null}
          {send.error ? (
            <ErrorState
              description={
                isAtlasApiError(send.error)
                  ? send.error.message
                  : "No se pudo enviar la notificación."
              }
              requestId={
                isAtlasApiError(send.error) ? send.error.requestId : undefined
              }
            />
          ) : null}
          {send.isSuccess ? (
            <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              Enviada — {send.data.targeted} destinatario(s) targeteados,{" "}
              {send.data.created} mensaje(s) creados (referencia{" "}
              <code className="font-mono">{send.data.broadcastId}</code>).
            </p>
          ) : null}
          <Button
            variant="primary"
            disabled={!canSubmit || send.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            Enviar notificación
          </Button>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar envío de notificación"
        description={`Se enviará "${form.title || "(sin título)"}" a: ${audienceLabel}${
          customerIdsText || internalUserIdsText
            ? " (IDs específicos indicados)"
            : " (todos los activos — puede ser un número grande de destinatarios)"
        }. Esta acción crea mensajes reales y no se puede deshacer.`}
        confirmText="Enviar"
        isLoading={send.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => submit()}
      />
    </div>
  );
}
