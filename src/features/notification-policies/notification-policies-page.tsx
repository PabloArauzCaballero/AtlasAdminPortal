"use client";

import { useState } from "react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { useNotificationPolicies, useSaveNotificationPolicy } from "./hooks";
import type { NotificationPolicy } from "./types";

/**
 * Qué avisos existen, cómo se llaman y cuáles no se pueden apagar.
 *
 * ## Por qué esta pantalla tenía que existir
 *
 * La app tenía una pantalla de «preferencias de avisos» que en la práctica no configuraba nada: la
 * lista salía vacía para quien nunca la había tocado, porque sólo enseñaba las filas ya guardadas —y
 * no había ninguna hasta que alguien guardara alguna—. Y lo más grave: el flag que marca un aviso
 * como irrenunciable llegaba EN LA PETICIÓN DEL CLIENTE. Bastaba mandarlo en `false` para poder
 * silenciar el aviso de mora, que es exactamente el que no se puede silenciar.
 *
 * Ahora ese flag se declara aquí, del lado del servidor, y el cliente sólo puede decir encendido o
 * apagado.
 *
 * ## Por qué el motivo es obligatorio
 *
 * Porque la app lo enseña junto al candado. Un interruptor bloqueado sin explicación se lee como
 * abuso; con el motivo delante, «no puedes apagarlo» se convierte en «no te conviene apagarlo, y por
 * esto». El backend rechaza guardar un aviso obligatorio sin él.
 */
const CHANNEL_LABEL: Record<string, string> = {
  push: "Notificación del teléfono",
  email: "Correo",
  sms: "SMS",
  whatsapp: "WhatsApp",
  in_app: "Dentro de la app",
};

const CATEGORY_LABEL: Record<string, string> = {
  pagos: "Pagos",
  credito: "Crédito",
  seguridad: "Seguridad",
  novedades: "Novedades",
  general: "General",
};

export function NotificationPoliciesPage() {
  const policies = useNotificationPolicies();
  const [editing, setEditing] = useState<string | null>(null);

  const grouped = new Map<string, NotificationPolicy[]>();
  for (const policy of policies.data?.data ?? []) {
    const bucket = grouped.get(policy.category) ?? [];
    bucket.push(policy);
    grouped.set(policy.category, bucket);
  }

  return (
    <>
      <PageHeader
        eyebrow="Configuración"
        title="Políticas de notificación"
        description="Qué avisos manda Atlas, cómo se llaman en la app del cliente y cuáles son irrenunciables."
      />

      {policies.isLoading ? <LoadingSkeleton rows={5} /> : null}

      {policies.error ? (
        <ErrorState
          title="No pudimos cargar las políticas"
          description="Reintenta en unos segundos."
        />
      ) : null}

      {policies.data ? (
        <div
          className="flex flex-col gap-6"
          data-testid="notification-policies-list"
        >
          {[...grouped.entries()].map(([category, items]) => (
            <div key={category} className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {CATEGORY_LABEL[category] ?? category}
              </h2>
              {items.map((policy) => (
                <PolicyCard
                  key={policy.policyId}
                  policy={policy}
                  editing={editing === policy.policyId}
                  onEdit={() => setEditing(policy.policyId)}
                  onClose={() => setEditing(null)}
                />
              ))}
            </div>
          ))}
          {policies.data.data.length === 0 ? (
            <p className="text-sm text-slate-400">
              No hay políticas configuradas. La pantalla de avisos de la app
              saldrá vacía hasta que se defina al menos una.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function PolicyCard({
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
    <section
      className="rounded-xl border border-slate-700 bg-slate-900/60 p-5"
      data-testid={`notification-policy-${policy.eventCode}-${policy.channel}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            {policy.label}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {policy.eventCode} ·{" "}
            {CHANNEL_LABEL[policy.channel] ?? policy.channel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {policy.isMandatory ? (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300">
              irrenunciable
            </span>
          ) : null}
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              policy.isActive
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-slate-500/15 text-slate-300"
            }`}
          >
            {policy.isActive ? "activo" : "inactivo"}
          </span>
          {!editing ? (
            <Button
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
            <p className="mt-3 text-sm text-slate-300">{policy.description}</p>
          ) : null}
          {policy.mandatoryReason ? (
            <p className="mt-2 text-xs text-amber-200/80">
              Motivo que ve el cliente: {policy.mandatoryReason}
            </p>
          ) : null}
        </>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Nombre en la app
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              data-testid={`label-${policy.eventCode}-${policy.channel}`}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Explicación
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              data-testid={`description-${policy.eventCode}-${policy.channel}`}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={isMandatory}
              onChange={(event) => setIsMandatory(event.target.checked)}
              data-testid={`mandatory-${policy.eventCode}-${policy.channel}`}
            />
            El cliente no puede apagarlo
          </label>

          {isMandatory ? (
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Motivo que verá el cliente junto al candado
              <textarea
                value={mandatoryReason}
                onChange={(event) => setMandatoryReason(event.target.value)}
                rows={2}
                data-testid={`reason-${policy.eventCode}-${policy.channel}`}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          ) : (
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={defaultEnabled}
                onChange={(event) => setDefaultEnabled(event.target.checked)}
              />
              Encendido por defecto para quien no lo haya tocado
            </label>
          )}

          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Aparece en la pantalla de preferencias
          </label>

          <div className="flex items-center gap-2">
            <Button
              onClick={save}
              disabled={
                mutation.isPending || label.trim().length < 2 || missingReason
              }
              data-testid={`save-${policy.eventCode}-${policy.channel}`}
            >
              {mutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
            <Button onClick={onClose}>Cancelar</Button>
          </div>

          {missingReason ? (
            <p className="text-xs text-amber-300">
              Un aviso irrenunciable necesita explicar por qué no se puede
              apagar.
            </p>
          ) : null}

          {mutation.error ? (
            <p className="text-xs text-rose-300">
              No pudimos guardar. Revisa los datos e intenta otra vez.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
