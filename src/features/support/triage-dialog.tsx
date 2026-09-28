"use client";

import { codeOptions, queueOptions, SIN_CAMBIAR } from "./support-options";
import { impacto, prioridad, sensibilidad, urgencia } from "./labels";
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
 * está sembrado en esta base —las migraciones crean las tablas vacías—, y la pantalla lo dice (en
 * palabras de quien opera) en vez de ofrecer un desplegable sin opciones.
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
          title="Todavía no hay motivos para clasificar."
          description="La lista de motivos de soporte de este entorno está vacía, así que aquí no se puede clasificar ni los clientes pueden abrir casos nuevos. Pide a un administrador que cargue el catálogo de motivos."
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
            tooltip="De qué trata el caso; el motivo trae su cola, sensibilidad e impacto por defecto."
            hint={
              elegida
                ? undefined
                : "El motivo trae consigo cola, sensibilidad e impacto por defecto."
            }
          >
            <Select
              name="motivo"
              options={[
                SIN_CAMBIAR,
                ...planas.map((categoria) => ({
                  value: categoria.categoryCode,
                  label: `${categoria.sangria}${categoria.label}`,
                  description: descripcionMotivo(categoria),
                })),
              ]}
              value={categoryCode}
              onChange={setCategoryCode}
            />
          </Field>

          <Field
            label="Prioridad"
            tooltip="Urgencia con la que se atiende; cambia el orden en la bandeja y el plazo de respuesta."
          >
            <Select
              name="prioridad"
              options={[
                SIN_CAMBIAR,
                ...codeOptions(
                  codigos.data?.priorities ?? [],
                  (codigo) => prioridad(codigo).label,
                ),
              ]}
              value={priority}
              onChange={setPriority}
            />
          </Field>

          <Field
            label="Cola"
            tooltip="Equipo que atenderá el caso; sólo cámbialo si el motivo lo mandó a la cola equivocada."
          >
            <Select
              name="cola"
              options={[
                SIN_CAMBIAR,
                ...queueOptions(colas.data?.queues ?? [], "queueCode"),
              ]}
              value={queueCode}
              onChange={setQueueCode}
            />
          </Field>

          <Field
            label="Razón del cambio"
            tooltip="Por qué reclasificas; así quien vea la historia entiende el cambio de cola o prioridad."
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

/** «Sensible · afecta a una persona · urgencia alta», y si pide especialista, también. */
function descripcionMotivo(categoria: SupportCategory): string {
  const partes = [
    `Sensibilidad ${sensibilidad(categoria.sensitivity).toLowerCase()}`,
    `afecta a ${impacto(categoria.defaultImpact)}`,
    `urgencia ${urgencia(categoria.defaultUrgency)}`,
  ];
  if (categoria.requiresSpecialist) partes.push("lo atiende un especialista");
  return categoria.description
    ? `${categoria.description} · ${partes.join(" · ")}`
    : partes.join(" · ");
}
