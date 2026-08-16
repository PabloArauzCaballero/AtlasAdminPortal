"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { ActionLog } from "@/features/systems/types";
import { CopyableCode } from "@/shared/components/ui/copy-button";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import {
  MethodBadge,
  ModuleBadge,
  PiiBadge,
  RiskBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { formatDateTime, formatNumber } from "@/shared/lib/format";

/**
 * Un evento de auditoría, entero y en lenguaje de quien lo lee.
 *
 * **Por qué un panel y no más columnas.** La tabla tiene que caber en una
 * pantalla y responder «qué pasó»; el evento tiene veinte campos y responde
 * «qué pasó exactamente». Meterlos todos en la tabla obliga a desplazarse en
 * horizontal para leer una sola fila, que es la peor forma de leer una fila.
 *
 * **Los identificadores técnicos NO desaparecen: se apartan.** Un `requestId`
 * en la columna principal no dice nada a quien audita, pero es justo lo que hace
 * falta para abrir un ticket o buscar en los registros. Aquí van agrupados,
 * en monoespaciada y con botón de copiar — que es la operación real que alguien
 * hace con ellos.
 */
export function AuditEventDrawer({
  evento,
  onClose,
}: Readonly<{ evento: ActionLog | null; onClose: () => void }>) {
  return (
    <DrawerPanel
      open={evento !== null}
      title="Detalle del evento"
      onClose={onClose}
    >
      {evento ? <Cuerpo evento={evento} /> : null}
    </DrawerPanel>
  );
}

function Cuerpo({ evento }: Readonly<{ evento: ActionLog }>) {
  return (
    <div className="space-y-6">
      <section>
        <Titulo>Qué ocurrió</Titulo>
        <Datos>
          <Dato etiqueta="Acción">
            {evento.actionName ?? <Sin>No declarada</Sin>}
          </Dato>
          <Dato etiqueta="Método">
            <MethodBadge method={evento.method} />
          </Dato>
          <Dato etiqueta="Ruta">
            <code className="break-all font-mono text-xs">
              {evento.routeTemplate ?? evento.resolvedUrlSanitized ?? "—"}
            </code>
          </Dato>
          <Dato etiqueta="Módulo">
            <ModuleBadge value={evento.module} />
          </Dato>
          <Dato etiqueta="Resultado">
            <StatusBadge
              value={
                evento.responseStatusCode === null
                  ? null
                  : String(evento.responseStatusCode)
              }
            />
          </Dato>
          <Dato etiqueta="Duración">
            {evento.durationMs === null ? (
              <Sin>No medida</Sin>
            ) : (
              `${formatNumber(evento.durationMs)} ms`
            )}
          </Dato>
        </Datos>
      </section>

      <section>
        <Titulo>Quién y cuándo</Titulo>
        <Datos>
          <Dato etiqueta="Actor">
            {evento.actorRole ?? evento.actorType ?? <Sin>No identificado</Sin>}
          </Dato>
          <Dato etiqueta="Tipo de actor">
            {evento.actorType ?? <Sin>No declarado</Sin>}
          </Dato>
          <Dato etiqueta="Fecha y hora">
            {evento.occurredAt ? (
              formatDateTime(evento.occurredAt)
            ) : (
              <Sin>Sin sello de tiempo</Sin>
            )}
          </Dato>
          <Dato etiqueta="Origen (IP)">
            {evento.ipAddress ?? <Sin>No registrada</Sin>}
          </Dato>
        </Datos>
      </section>

      <section>
        <Titulo>Sobre qué actuó</Titulo>
        <Datos>
          <Dato etiqueta="Entidad">
            {evento.targetType ?? <Sin>No declarada</Sin>}
          </Dato>
          <Dato etiqueta="Registro">
            {evento.targetId ? (
              <CopyableCode value={evento.targetId} />
            ) : (
              <Sin>No declarado</Sin>
            )}
          </Dato>
          <Dato etiqueta="Cliente">
            {evento.customerId ? (
              /* El identificador se enseña, pero enlazado a la ficha: es la
                 única forma de convertir un número en una persona sin obligar a
                 buscarla a mano en otra pestaña. */
              <Link
                className="font-mono text-xs text-blue-700 underline"
                href={`/internal/operations/customers/${encodeURIComponent(evento.customerId)}`}
              >
                {evento.customerId}
              </Link>
            ) : (
              <Sin>No aplica</Sin>
            )}
          </Dato>
        </Datos>
      </section>

      <section>
        <Titulo>Clasificación</Titulo>
        <Datos>
          <Dato etiqueta="Riesgo">
            <RiskBadge value={evento.riskLevel} />
          </Dato>
          <Dato etiqueta="Datos personales">
            <PiiBadge value={evento.containsPii} />
          </Dato>
        </Datos>
      </section>

      <CambiosDeDatos />

      <section>
        <Titulo>Información técnica</Titulo>
        <div className="space-y-2 rounded-lg border border-atlas-border bg-atlas-soft/40 p-3">
          <Tecnico etiqueta="Request ID" valor={evento.requestId} />
          <Tecnico etiqueta="Correlation ID" valor={evento.correlationId} />
          <Tecnico etiqueta="Action log ID" valor={evento.actionLogId} />
          <Tecnico etiqueta="Endpoint catalog ID" valor={evento.endpointCatalogId} />
          <Tecnico etiqueta="Actor user ID" valor={evento.actorUserId} />
        </div>
        <p className="mt-2 text-[0.6875rem] leading-4 text-atlas-muted">
          Estos identificadores no describen el evento: sirven para rastrearlo en
          los registros del servidor o para adjuntarlos a una incidencia.
        </p>
      </section>
    </div>
  );
}

/**
 * Los valores anteriores y posteriores de un cambio, y por qué no están.
 *
 * La bitácora de cambios (`data_change_logs`) guarda `old_values_hash` y
 * `new_values_hash`: **huellas, no valores**. Es una decisión deliberada de
 * privacidad —la bitácora demuestra que hubo un cambio y permite verificar un
 * valor propuesto, sin duplicar datos personales en una tabla que casi todo el
 * mundo puede leer—.
 *
 * Así que aquí no puede haber un «Antes → Después» de valores. Enseñar uno
 * exigiría copiar esos datos a la bitácora, que es exactamente lo que el diseño
 * evita. Lo que sí se puede hacer —y es lo que falta— es decirlo, en vez de
 * dejar un hueco que se lee como «este evento no cambió nada».
 */
function CambiosDeDatos() {
  return (
    <section>
      <Titulo>Cambios sobre el registro</Titulo>
      <div className="flex items-start gap-2.5 rounded-lg border border-atlas-border bg-white p-3">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-atlas-muted"
          aria-hidden="true"
        />
        <div className="text-xs leading-5 text-atlas-muted">
          <p className="font-medium text-atlas-text">
            Los valores anterior y posterior no se conservan.
          </p>
          <p className="mt-1">
            La bitácora de cambios guarda una huella criptográfica de cada
            versión, no su contenido: prueba que el registro cambió y permite
            verificar un valor concreto, sin duplicar datos personales fuera de
            su tabla de origen. Para reconstruir el valor exacto hay que ir al
            registro afectado.
          </p>
        </div>
      </div>
    </section>
  );
}

function Titulo({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <h3 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-atlas-muted">
      {children}
    </h3>
  );
}

function Datos({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
      {children}
    </dl>
  );
}

function Dato({
  etiqueta,
  children,
}: Readonly<{ etiqueta: string; children: React.ReactNode }>) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] text-atlas-muted">{etiqueta}</dt>
      <dd className="mt-0.5 break-words text-sm text-atlas-text">{children}</dd>
    </div>
  );
}

/** Un hueco declarado. «—» no distingue «no aplica» de «no se registró». */
function Sin({ children }: Readonly<{ children: React.ReactNode }>) {
  return <span className="text-atlas-muted">{children}</span>;
}

function Tecnico({
  etiqueta,
  valor,
}: Readonly<{ etiqueta: string; valor: string | null }>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-[0.6875rem] text-atlas-muted">{etiqueta}</span>
      {valor ? (
        <CopyableCode value={valor} />
      ) : (
        <span className="text-xs text-atlas-muted">—</span>
      )}
    </div>
  );
}
