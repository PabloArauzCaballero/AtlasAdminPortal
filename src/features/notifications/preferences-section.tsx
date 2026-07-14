"use client";

import { useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  useCustomerPreferences,
  useUpdateCustomerPreferencesMutation,
} from "./hooks";
import { NotificationChannelBadge } from "./notification-columns";
import type { NotificationChannel, PreferenceInput } from "./types";

const CHANNELS: NotificationChannel[] = [
  "in_app",
  "push",
  "email",
  "sms",
  "whatsapp",
  "phone",
];

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
          <Field label="ID de cliente">
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
      {items.length === 0 ? (
        <p className="text-sm text-atlas-muted">
          El cliente #{customerId} no tiene preferencias registradas todavía.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-atlas-border bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-atlas-muted">
              <tr>
                <th className="px-4 py-2.5 text-left">Evento</th>
                <th className="px-4 py-2.5 text-left">Canal</th>
                <th className="px-4 py-2.5 text-left">Obligatorio</th>
                <th className="px-4 py-2.5 text-left">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {item.eventCode}
                  </td>
                  <td className="px-4 py-2.5">
                    <NotificationChannelBadge value={item.channel} />
                  </td>
                  <td className="px-4 py-2.5">
                    {item.isRequired ? (
                      <Badge tone="warning">Obligatorio</Badge>
                    ) : (
                      <span className="text-atlas-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <PermissionGate
                      permissions={["notifications.messages.manage"]}
                      fallback={
                        <Badge tone={item.isEnabled ? "success" : "muted"}>
                          {item.isEnabled ? "Activo" : "Inactivo"}
                        </Badge>
                      }
                    >
                      <button
                        type="button"
                        disabled={item.isRequired || update.isPending}
                        title={
                          item.isRequired
                            ? "Este evento es obligatorio y no se puede desactivar."
                            : undefined
                        }
                        onClick={() =>
                          toggleEnabled(item.eventCode, item.channel)
                        }
                        className="rounded-full px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <Badge tone={item.isEnabled ? "success" : "muted"}>
                          {item.isEnabled ? "Activo" : "Inactivo"}
                        </Badge>
                      </button>
                    </PermissionGate>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <PermissionGate
        permissions={["notifications.messages.manage"]}
        fallback={null}
      >
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-atlas-border p-4">
          <div className="w-52">
            <Field label="Evento">
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
            <Field label="Canal">
              <Select
                value={draft.channel}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    channel: event.target.value as NotificationChannel,
                  }))
                }
              >
                {CHANNELS.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </Select>
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
