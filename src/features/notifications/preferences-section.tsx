"use client";

import { CHANNEL_OPTIONS } from "./notification-options";
import { useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  useCustomerPreferences,
  useUpdateCustomerPreferencesMutation,
} from "./hooks";
import { PreferencesTable } from "./preferences-table";
import type { NotificationChannel, PreferenceInput } from "./types";

const emptyDraft: PreferenceInput = {
  eventCode: "",
  channel: "in_app",
  isEnabled: true,
  isRequired: false,
};

export function PreferencesSection() {
  const [customerIdInput, setCustomerIdInput] = useState("");
  const [customerId, setCustomerId] = useState("");

  return (
    <div className="space-y-4">
      <BusinessContextNote>
        Preferencias de notificación de un cliente puntual (qué eventos recibe
        por qué canal). No hay un directorio de clientes en este portal: se
        busca por ID, obtenido desde otra pantalla (revisión manual, caso de
        fraude, ticket de soporte).
      </BusinessContextNote>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Field
            label="ID de cliente"
            tooltip="Número del cliente cuyas preferencias quieres ver; lo sacas de su caso o ticket."
          >
            <Input
              value={customerIdInput}
              onChange={(event) => setCustomerIdInput(event.target.value)}
              placeholder="Ej: 1024"
              inputMode="numeric"
            />
          </Field>
        </div>
        <Button
          variant="primary"
          disabled={!customerIdInput.trim()}
          onClick={() => setCustomerId(customerIdInput.trim())}
        >
          Cargar preferencias
        </Button>
      </div>
      {customerId ? <PreferencesEditor customerId={customerId} /> : null}
    </div>
  );
}

function PreferencesEditor({ customerId }: Readonly<{ customerId: string }>) {
  const preferences = useCustomerPreferences(customerId);
  const update = useUpdateCustomerPreferencesMutation(customerId);
  const [draft, setDraft] = useState<PreferenceInput>(emptyDraft);

  if (preferences.isLoading) return <LoadingSkeleton rows={4} />;
  if (preferences.error) {
    return (
      <ErrorState
        description={
          isAtlasApiError(preferences.error)
            ? preferences.error.message
            : `No se pudieron cargar las preferencias del cliente #${customerId}.`
        }
        requestId={
          isAtlasApiError(preferences.error)
            ? preferences.error.requestId
            : undefined
        }
        onRetry={() => void preferences.refetch()}
      />
    );
  }

  const items = preferences.data ?? [];

  function toggleEnabled(eventCode: string, channel: NotificationChannel) {
    const current = items.find(
      (item) => item.eventCode === eventCode && item.channel === channel,
    );
    if (!current || current.isRequired) return;
    update.mutate({
      preferences: [
        {
          eventCode,
          channel,
          isEnabled: !current.isEnabled,
          isRequired: current.isRequired,
        },
      ],
    });
  }

  function addDraft() {
    if (!draft.eventCode.trim()) return;
    update.mutate(
      { preferences: [{ ...draft, eventCode: draft.eventCode.trim() }] },
      { onSuccess: () => setDraft(emptyDraft) },
    );
  }

  return (
    <div className="space-y-4">
      {update.error ? (
        <ErrorState
          title="No se pudo guardar la preferencia"
          description={
            isAtlasApiError(update.error)
              ? update.error.message
              : "Error inesperado."
          }
          requestId={
            isAtlasApiError(update.error) ? update.error.requestId : undefined
          }
        />
      ) : null}
      <PreferencesTable
        items={items}
        customerId={customerId}
        pending={update.isPending}
        onToggle={(item) => toggleEnabled(item.eventCode, item.channel)}
      />
      <PermissionGate
        permissions={["notifications.messages.manage"]}
        fallback={null}
      >
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-atlas-border p-4">
          <div className="w-52">
            <Field
              label="Evento"
              tooltip="Código del evento de negocio que dispara el aviso. Ej.: risk_assessment_completed"
            >
              <Input
                value={draft.eventCode}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    eventCode: event.target.value,
                  }))
                }
                placeholder="Ej: risk_assessment_completed"
                className="font-mono text-xs"
              />
            </Field>
          </div>
          <div className="w-40">
            <Field
              label="Canal"
              tooltip="Vía por la que el cliente quiere o no recibir ese evento."
            >
              <Select
                name="canal"
                options={CHANNEL_OPTIONS}
                value={draft.channel}
                onChange={(valor) =>
                  setDraft((current) => ({
                    ...current,
                    channel: valor as NotificationChannel,
                  }))
                }
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 pb-2.5 text-sm text-atlas-text">
            <input
              type="checkbox"
              checked={draft.isEnabled}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  isEnabled: event.target.checked,
                }))
              }
            />
            Activo
          </label>
          <Button
            variant="primary"
            isLoading={update.isPending}
            loadingText="Guardando…"
            disabled={!draft.eventCode.trim()}
            onClick={addDraft}
          >
            Agregar preferencia
          </Button>
        </div>
      </PermissionGate>
    </div>
  );
}
