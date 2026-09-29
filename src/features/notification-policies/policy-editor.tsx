"use client";

import { useState } from "react";
import { apiErrorText } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { useSaveNotificationPolicy } from "./hooks";
import { CHANNEL_LABEL } from "./policy-labels";
import type { NotificationPolicy } from "./types";

/**
 * El formulario de una política, encima de la tabla mientras se edita.
 *
 * Vive aparte de la página por la misma razón que `EntryEditor` en «Contenido de la app»: la página
 * filtra y lista, el formulario guarda. Juntos pasaban del tope de 300 líneas del repositorio.
 */
export function PolicyEditor({
  policy,
  onClose,
}: Readonly<{ policy: NotificationPolicy; onClose: () => void }>) {
  const mutation = useSaveNotificationPolicy();
  const [label, setLabel] = useState(policy.label);
  const [description, setDescription] = useState(policy.description ?? "");
  const [isMandatory, setIsMandatory] = useState(policy.isMandatory);
  const [mandatoryReason, setMandatoryReason] = useState(
    policy.mandatoryReason ?? "",
  );
  const [defaultEnabled, setDefaultEnabled] = useState(policy.defaultEnabled);
  const [isActive, setIsActive] = useState(policy.isActive);
  const id = `${policy.eventCode}-${policy.channel}`;

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
    <Card testId={`notification-policy-${id}`}>
      <CardContent>
        <h3 className="text-base font-semibold text-atlas-text">
          Editar «{policy.label}»
        </h3>
        <p className="mt-1 font-mono text-xs text-atlas-muted">
          {policy.eventCode} · {CHANNEL_LABEL[policy.channel] ?? policy.channel}
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <Field
            label="Nombre en la app"
            tooltip="Cómo se llama este aviso en los ajustes de la app del cliente."
          >
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              data-testid={`label-${id}`}
            />
          </Field>

          <Field
            label="Explicación"
            tooltip="Una frase para el cliente sobre qué le avisa y cuándo le llega."
          >
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              data-testid={`description-${id}`}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-atlas-text">
            <input
              type="checkbox"
              checked={isMandatory}
              onChange={(event) => setIsMandatory(event.target.checked)}
              data-testid={`mandatory-${id}`}
              className="h-4 w-4 rounded border-slate-300 accent-atlas-accent"
            />
            El cliente no puede apagarlo
          </label>

          {isMandatory ? (
            <Field
              label="Motivo que verá el cliente junto al candado"
              tooltip="Por qué no se puede apagar, p. ej. obligación regulatoria de avisar cobros."
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
                data-testid={`reason-${id}`}
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
              data-testid={`save-${id}`}
            >
              Guardar
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>

          {mutation.error ? (
            <p role="alert" className="text-xs font-medium text-red-600">
              {apiErrorText(
                mutation.error,
                "No pudimos guardar. Revisa los datos e intenta otra vez.",
              )}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
