"use client";

import { useState } from "react";
import { BellRing } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { PolicyCard } from "./policy-card";
import { useNotificationPolicies } from "./hooks";
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
        icon={BellRing}
        eyebrow="Gobierno y calidad"
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
              <h2 className="text-xs font-semibold uppercase tracking-wide text-atlas-muted">
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
            <EmptyState
              title="No hay políticas configuradas"
              description="La pantalla de avisos de la app saldrá vacía hasta que se defina al menos una."
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
