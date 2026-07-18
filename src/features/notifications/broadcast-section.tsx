"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import {
  broadcastDefaults,
  broadcastFormToInput,
  broadcastSchema,
  type BroadcastForm,
} from "./broadcast-helpers";
import type { BroadcastAudience } from "./types";

const AUDIENCE_OPTIONS: { value: BroadcastAudience; label: string }[] = [
  { value: "customers", label: "Todos los customers" },
  { value: "internal_users", label: "Todos los usuarios internos" },
  { value: "both", label: "Customers + usuarios internos" },
];

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const send = useSendBroadcastNotificationMutation();
  const {
    register,
    handleSubmit,
    watch,
    getValues,
    reset,
    formState: { errors },
  } = useForm<BroadcastForm>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: broadcastDefaults,
  });

  const audience = watch("audience");
  const [title, customerIdsText, internalUserIdsText] = watch([
    "title",
    "customerIdsText",
    "internalUserIdsText",
  ]);
  const audienceLabel =
    AUDIENCE_OPTIONS.find((option) => option.value === audience)?.label ??
    audience;

  // El botón "Enviar" solo abre la confirmación si el formulario es válido:
  // `handleSubmit` no corre el callback si el esquema falla.
  const openConfirm = handleSubmit(() => setConfirmOpen(true));

  function sendBroadcast() {
    send.mutate(broadcastFormToInput(getValues()), {
      onSuccess: () => reset(broadcastDefaults),
      onSettled: () => setConfirmOpen(false),
    });
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
        <CardContent>
          <form onSubmit={openConfirm} noValidate className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Título" error={errors.title?.message}>
                <Input {...register("title")} />
              </Field>
              <Field
                label="Prioridad"
                hint="Entero, 0-100. Mayor = más importante."
                error={errors.priority?.message}
              >
                <Input
                  type="number"
                  min={0}
                  max={100}
                  {...register("priority", { valueAsNumber: true })}
                />
              </Field>
            </div>
            <Field label="Mensaje" error={errors.body?.message}>
              <Textarea className="min-h-24" {...register("body")} />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Audiencia">
                <Select {...register("audience")}>
                  {AUDIENCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Categoría">
                <Input {...register("category")} />
              </Field>
              <Field label="Ícono (opcional)">
                <Input {...register("icon")} />
              </Field>
            </div>
            {audience !== "internal_users" ? (
              <Field
                label="IDs de customers (opcional)"
                hint="Separados por coma. Vacío = todos los customers activos del tenant."
              >
                <Input
                  placeholder="12, 45, 90"
                  {...register("customerIdsText")}
                />
              </Field>
            ) : null}
            {audience !== "customers" ? (
              <Field
                label="IDs de usuarios internos (opcional)"
                hint="Separados por coma. Vacío = todos los usuarios internos activos del tenant."
              >
                <Input
                  placeholder="3, 7"
                  {...register("internalUserIdsText")}
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
            <Button type="submit" variant="primary" disabled={send.isPending}>
              Enviar notificación
            </Button>
          </form>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar envío de notificación"
        description={`Se enviará "${title || "(sin título)"}" a: ${audienceLabel}${
          customerIdsText || internalUserIdsText
            ? " (IDs específicos indicados)"
            : " (todos los activos — puede ser un número grande de destinatarios)"
        }. Esta acción crea mensajes reales y no se puede deshacer.`}
        confirmText="Enviar"
        isLoading={send.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={sendBroadcast}
      />
    </div>
  );
}
