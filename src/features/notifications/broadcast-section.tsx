"use client";

import { FormSelect } from "@/shared/components/ui/form-select";
import { AUDIENCE_OPTIONS } from "./notification-options";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { ErrorState, ForbiddenState } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { useSendBroadcastNotificationMutation } from "./hooks";
import {
  broadcastDefaults,
  broadcastFormToInput,
  broadcastSchema,
  type BroadcastForm,
} from "./broadcast-helpers";

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
    control,
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
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <Field
                label="Título"
                tooltip="Encabezado corto del aviso; es lo primero que se lee en la bandeja."
                error={errors.title?.message}
              >
                <Input {...register("title")} />
              </Field>
              <Field
                label="Prioridad"
                tooltip="Orden en la bandeja del destinatario: los de mayor número salen arriba."
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
            <Field
              label="Mensaje"
              tooltip="El texto completo del aviso tal como lo leerá cada destinatario."
              error={errors.body?.message}
            >
              <Textarea className="min-h-24" {...register("body")} />
            </Field>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <Field
                label="Audiencia"
                tooltip="A quién se envía; con los IDs vacíos llega a TODOS los activos de ese grupo."
              >
                <FormSelect
                  control={control}
                  name="audience"
                  options={AUDIENCE_OPTIONS}
                />
              </Field>
              <Field
                label="Categoría"
                tooltip="Grupo del aviso para que la app lo filtre. Ej.: system_alert"
              >
                <Input {...register("category")} />
              </Field>
              <Field
                label="Ícono (opcional)"
                tooltip="Nombre del icono que la app pinta junto al aviso. Ej.: bell"
              >
                <Input {...register("icon")} />
              </Field>
            </div>
            {audience !== "internal_users" ? (
              <Field
                label="IDs de customers (opcional)"
                tooltip="Para enviar sólo a algunos clientes; vacío lo manda a todos los activos."
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
                tooltip="Para enviar sólo a algunas personas del equipo; vacío lo manda a todas."
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
                {send.data.status === "queued"
                  ? "Aceptada — entrega en curso en segundo plano."
                  : "Enviada."}{" "}
                {send.data.targeted} destinatario(s) targeteados,{" "}
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
