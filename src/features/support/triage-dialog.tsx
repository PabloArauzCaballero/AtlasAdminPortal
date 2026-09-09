"use client";

import { useMemo, useState } from "react";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { Button } from "@/shared/components/ui/button";
import { Field, Select, Textarea } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import {
  useSupportCategories,
  useSupportCodes,
  useSupportQueues,
  useTriageCaseMutation,
} from "./hooks";
import type { SupportCategory } from "./types";

/**
 * Clasificar es lo que convierte una conversación en trabajo medible.
 *
 * El motivo sale del catálogo sembrado y NO se escribe a mano: «no me reconocen el pago» escrito de
 * veinte maneras no se puede contar ni enrutar. Si la lista llega vacía es porque el catálogo no
 * está sembrado en esta base —las migraciones crean las tablas vacías—, y la pantalla lo dice en
 * vez de ofrecer un desplegable sin opciones.
 *
 * La razón del movimiento es obligatoria (mínimo 4 caracteres en el backend) porque reclasificar
 * cambia cola, prioridad y el reloj de SLA: sin ella la historia del caso registra el cambio y no
 * quién decidió qué.
 */
export function TriageDialog({
  caseId,
  onClose,
}: Readonly<{ caseId: string; onClose: () => void }>) {
  const categorias = useSupportCategories();
  const colas = useSupportQueues();
  const codigos = useSupportCodes();
  const triage = useTriageCaseMutation(caseId);

  const [categoryCode, setCategoryCode] = useState("");
  const [priority, setPriority] = useState("");
  const [queueCode, setQueueCode] = useState("");
  const [reason, setReason] = useState("");

  const planas = useMemo(
    () => aplanar(categorias.data?.categories ?? []),
    [categorias.data],
  );
  const elegida = planas.find(
    (categoria) => categoria.categoryCode === categoryCode,
  );
  const listo = reason.trim().length >= 4;

  return (
    <DrawerPanel open title={`Clasificar el caso #${caseId}`} onClose={onClose}>
      {categorias.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {categorias.error ? (
        <ErrorState
          description={
            isAtlasApiError(categorias.error)
              ? categorias.error.message
              : "No se pudo cargar el catálogo de motivos."
          }
          onRetry={() => void categorias.refetch()}
        />
      ) : null}

      {categorias.data && planas.length === 0 ? (
        <ErrorState
          title="No hay motivos en el catálogo de esta base."
          description="Las migraciones crean las tablas de soporte vacías y las categorías llegan de la rama de semillas. Sin ellas no se puede clasificar aquí, y abrir un caso falla con SUPPORT_CATEGORY_NOT_FOUND."
        />
      ) : null}

      {categorias.data && planas.length > 0 ? (
        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!listo) return;
            triage.mutate(
              {
                categoryCode: categoryCode || undefined,
                priority: priority || undefined,
                queueCode: queueCode || undefined,
                reason: reason.trim(),
              },
              { onSuccess: onClose },
            );
          }}
        >
          <Field
            label="Motivo"
            hint={
              elegida
                ? `Sensibilidad ${elegida.sensitivity} · impacto ${elegida.defaultImpact} · urgencia ${elegida.defaultUrgency}`
                : "El motivo trae consigo cola, sensibilidad e impacto por defecto."
            }
          >
            <Select
              value={categoryCode}
              onChange={(event) => setCategoryCode(event.target.value)}
            >
              <option value="">Sin cambiar</option>
              {planas.map((categoria) => (
                <option
                  key={categoria.categoryCode}
                  value={categoria.categoryCode}
                >
                  {categoria.sangria}
                  {categoria.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Prioridad">
            <Select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              <option value="">Sin cambiar</option>
              {(codigos.data?.priorities ?? []).map((opcion) => (
                <option key={opcion.code} value={opcion.code}>
                  {opcion.code} — {opcion.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Cola">
            <Select
              value={queueCode}
              onChange={(event) => setQueueCode(event.target.value)}
            >
              <option value="">Sin cambiar</option>
              {(colas.data?.queues ?? []).map((cola) => (
                <option key={cola.queueCode} value={cola.queueCode}>
                  {cola.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Razón del cambio"
            hint="Queda en la historia del expediente. Obligatoria, mínimo 4 caracteres."
          >
            <Textarea
              className="min-h-20"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>

          {triage.error && isAtlasApiError(triage.error) ? (
            <ErrorState
              description={triage.error.message}
              requestId={triage.error.requestId}
            />
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!listo}
              isLoading={triage.isPending}
            >
              Clasificar
            </Button>
          </div>
        </form>
      ) : null}
    </DrawerPanel>
  );
}

type CategoriaPlana = SupportCategory & { sangria: string };

/**
 * El árbol se aplana con sangría en vez de con dos selectores encadenados.
 *
 * Con motivo y submotivo en dos desplegables, elegir uno de segundo nivel obliga a acertar primero
 * el padre; aquí el agente escribe tres letras y el navegador busca en toda la lista. La jerarquía
 * sigue siendo visible —el submotivo va sangrado— sin costar un paso.
 */
function aplanar(categorias: readonly SupportCategory[]): CategoriaPlana[] {
  return categorias.flatMap((categoria) => [
    { ...categoria, sangria: "" },
    ...(categoria.subcategories ?? []).map((hija) => ({
      ...hija,
      sangria: "    ",
    })),
  ]);
}
