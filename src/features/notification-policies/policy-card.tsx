"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { useSaveNotificationPolicy } from "./hooks";
import type { NotificationPolicy } from "./types";

/**
 * Una política de aviso, en lectura o en edición.
 *
 * Vive aparte de la página por la misma razón que `EntryCard` en «Contenido de la app»: la página
 * agrupa por categoría y lista, la tarjeta guarda. Juntas pasaban del tope de 300 líneas del
 * repositorio, que es justo el punto donde deja de verse de un vistazo qué campo se está tocando.
 */

/** Cómo se llama el canal para quien administra: `push` no dice nada, «el teléfono» sí. */
const CHANNEL_LABEL: Record<string, string> = {
  push: "Notificación del teléfono",
  email: "Correo",
  sms: "SMS",
  whatsapp: "WhatsApp",
  in_app: "Dentro de la app",
};

export function PolicyCard({
  policy,
  editing,
  onEdit,
  onClose,
}: Readonly<{
  policy: NotificationPolicy;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
}>) {
  const mutation = useSaveNotificationPolicy();
  const [label, setLabel] = useState(policy.label);
  const [description, setDescription] = useState(policy.description ?? "");
  const [isMandatory, setIsMandatory] = useState(policy.isMandatory);
  const [mandatoryReason, setMandatoryReason] = useState(
    policy.mandatoryReason ?? "",
  );
  const [defaultEnabled, setDefaultEnabled] = useState(policy.defaultEnabled);
  const [isActive, setIsActive] = useState(policy.isActive);

  // El backend lo rechaza igualmente, pero deshabilitar el botón explica por qué antes de intentarlo.
  const missingReason = isMandatory && mandatoryReason.trim().length === 0;

  const save = () => {
    mutation.mutate(
      {
        eventCode: policy.eventCode,
        channel: policy.channel,
        label,
        description: description || null,
        category: policy.category,
        icon: policy.icon,
        isMandatory,
        // Un aviso obligatorio no puede arrancar apagado: sería obligatorio y silencioso a la vez.
        defaultEnabled: isMandatory ? true : defaultEnabled,
        mandatoryReason: isMandatory ? mandatoryReason : null,
        displayOrder: policy.displayOrder,
        isActive,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Card testId={`notification-policy-${policy.eventCode}-${policy.channel}`}>
      <CardContent>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-atlas-text">
              {policy.label}
            </h3>
            <p className="mt-1 font-mono text-xs text-atlas-muted">
              {policy.eventCode} ·{" "}
              {CHANNEL_LABEL[policy.channel] ?? policy.channel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {policy.isMandatory ? (
              <Badge tone="warning" icon={Lock}>
                irrenunciable
              </Badge>
            ) : null}
            <Badge tone={policy.isActive ? "success" : "muted"}>
              {policy.isActive ? "activo" : "inactivo"}
            </Badge>
            {!editing ? (
              <Button
                variant="secondary"
                onClick={onEdit}
                data-testid={`edit-${policy.eventCode}-${policy.channel}`}
              >
                Editar
              </Button>
            ) : null}
          </div>
        </div>

        {!editing ? (
          <>
            {policy.description ? (
              <p className="mt-3 text-sm leading-6 text-atlas-text">
                {policy.description}
              </p>
            ) : null}
            {policy.mandatoryReason ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                <span className="font-medium">Motivo que ve el cliente:</span>{" "}
                {policy.mandatoryReason}
              </p>
            ) : null}
          </>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <Field label="Nombre en la app">
              <Input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                data-testid={`label-${policy.eventCode}-${policy.channel}`}
              />
            </Field>

            <Field label="Explicación">
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                data-testid={`description-${policy.eventCode}-${policy.channel}`}
              />
            </Field>

            <label className="flex items-center gap-2 text-sm text-atlas-text">
              <input
                type="checkbox"
                checked={isMandatory}
                onChange={(event) => setIsMandatory(event.target.checked)}
                data-testid={`mandatory-${policy.eventCode}-${policy.channel}`}
                className="h-4 w-4 rounded border-slate-300 accent-atlas-accent"
              />
              El cliente no puede apagarlo
            </label>

            {isMandatory ? (
              <Field
                label="Motivo que verá el cliente junto al candado"
                hint="La app lo enseña bajo el interruptor bloqueado: sin él, «no puedes apagarlo» se lee como abuso."
                error={
                  missingReason
                    ? "Un aviso irrenunciable necesita explicar por qué no se puede apagar."
                    : undefined
                }
              >
                <Textarea
                  value={mandatoryReason}
                  onChange={(event) => setMandatoryReason(event.target.value)}
                  rows={2}
                  data-testid={`reason-${policy.eventCode}-${policy.channel}`}
                />
              </Field>
            ) : (
              <label className="flex items-center gap-2 text-sm text-atlas-text">
                <input
                  type="checkbox"
                  checked={defaultEnabled}
                  onChange={(event) => setDefaultEnabled(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-atlas-accent"
                />
                Encendido por defecto para quien no lo haya tocado
              </label>
            )}

            <label className="flex items-center gap-2 text-sm text-atlas-text">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-atlas-accent"
              />
              Aparece en la pantalla de preferencias
            </label>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={save}
                isLoading={mutation.isPending}
                loadingText="Guardando…"
                disabled={label.trim().length < 2 || missingReason}
                data-testid={`save-${policy.eventCode}-${policy.channel}`}
              >
                Guardar
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
            </div>

            {mutation.error ? (
              <p className="text-xs font-medium text-red-600">
                No pudimos guardar. Revisa los datos e intenta otra vez.
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
