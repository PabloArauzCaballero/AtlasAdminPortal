"use client";

import { useId, useMemo, useState } from "react";
import { FileSignature } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { DialogShell } from "@/shared/components/ui/dialog-shell";
import { Field, Input, Textarea } from "@/shared/components/ui/input";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import {
  useContractTemplates,
  usePublishContractTemplate,
  useSetDefaultContractTemplate,
} from "./hooks";
import type { PartnerContractTemplate } from "./types";

/**
 * El contrato bajo el que se afilia un comercio.
 *
 * ## Qué faltaba
 *
 * La verificación del expediente comprobaba matrícula, representante, QR y correo —todo lo que
 * prueba que el comercio EXISTE y es quien dice— y nada comprobaba que hubiera un contrato. Se
 * habilitaba a cobrar a un comercio con el que no se había pactado por escrito ni la comisión, ni
 * los plazos de liquidación, ni qué pasa con una devolución.
 *
 * ## Qué es y qué NO es
 *
 * El texto POR DEFECTO del inquilino: el que rige cuando a un comercio nadie le negoció uno propio.
 * Un contrato particular es un término comercial y se lleva en el ERP, igual que la comisión.
 *
 * ## Por qué no hay botón de editar
 *
 * No es un descuido. Un contrato es la evidencia de a qué se comprometió alguien un día concreto:
 * editarlo en sitio borraría el texto que un comercio aceptó de verdad y dejaría su expediente
 * afirmando algo que ya no se puede comprobar. Publicar crea una versión y archiva la anterior, y
 * las archivadas se siguen viendo porque son la prueba de qué regía cada día.
 */
export function PartnerContractsPage() {
  return (
    <RoleGate roles={INTERNAL_PORTAL_ROLE_LIST}>
      <AuthorizedPartnerContractsPage />
    </RoleGate>
  );
}

function AuthorizedPartnerContractsPage() {
  const [publicando, setPublicando] = useState(false);
  const [porDefecto, setPorDefecto] = useState<PartnerContractTemplate | null>(
    null,
  );

  const plantillas = useContractTemplates();
  const marcar = useSetDefaultContractTemplate();

  const items = useMemo(() => plantillas.data?.items ?? [], [plantillas.data]);
  const vigente = useMemo(
    () => items.find((item) => item.isDefault && item.status === "active"),
    [items],
  );

  return (
    <>
      <PageHeader
        icon={FileSignature}
        eyebrow="Comercios"
        title="Contrato de afiliación"
        description="El texto bajo el que opera un comercio al que nadie le negoció uno propio. Se publica por versiones; el anterior se archiva y se conserva."
      />
      <BusinessContextNote>
        Verificar que un comercio existe no es lo mismo que tener algo firmado
        con él. Sin contrato vigente se habilita a cobrar a alguien con quien no
        se pactó por escrito la comisión, los plazos de liquidación ni qué pasa
        con una devolución. Un contrato negociado con un comercio concreto no se
        fija aquí: es un término comercial y se lleva en el ERP.
      </BusinessContextNote>

      {plantillas.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {plantillas.error ? (
        <ErrorState
          description={
            isAtlasApiError(plantillas.error)
              ? plantillas.error.message
              : "No se pudo leer el contrato de afiliación."
          }
          requestId={
            isAtlasApiError(plantillas.error)
              ? plantillas.error.requestId
              : undefined
          }
          onRetry={() => void plantillas.refetch()}
        />
      ) : null}

      {plantillas.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <MetricCard
              label="Contrato vigente"
              value={vigente ? `v${vigente.version}` : "Ninguno"}
              hint={vigente?.name ?? "Sin contrato, el Motor lo sabrá"}
              tone={vigente ? "success" : "critical"}
            />
            <MetricCard
              label="Versiones publicadas"
              value={formatNumber(items.length)}
            />
            <MetricCard
              label="En vigor desde"
              value={
                vigente?.effectiveFrom
                  ? formatDateTime(vigente.effectiveFrom)
                  : "—"
              }
            />
          </section>

          {!vigente ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              No hay contrato de afiliación vigente. La verificación del
              expediente se lo dice al Motor, que puede negarse a habilitar a un
              comercio en lugar de aprobarlo por omisión.
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setPublicando(true)}>
              Publicar una versión
            </Button>
          </div>

          {items.length === 0 ? (
            <Card className="p-5">
              <p className="text-sm text-atlas-muted">
                Todavía no se publicó ninguna versión.
              </p>
            </Card>
          ) : null}

          {items.map((plantilla) => (
            <TarjetaContrato
              key={plantilla.templateId}
              plantilla={plantilla}
              onMarcar={() => setPorDefecto(plantilla)}
            />
          ))}
        </div>
      ) : null}

      <DialogoPublicar
        open={publicando}
        codigoSugerido={vigente?.templateCode ?? "AFILIACION"}
        onClose={() => setPublicando(false)}
      />

      <ConfirmDialog
        open={porDefecto !== null}
        title="Marcar como contrato vigente"
        description={`A partir de ahora, los comercios sin contrato negociado se afilian bajo la versión ${porDefecto?.version ?? ""}. El anterior deja de regir, pero se conserva.`}
        confirmText="Marcar"
        isLoading={marcar.isPending}
        onCancel={() => setPorDefecto(null)}
        onConfirm={() => {
          if (!porDefecto) return;
          void marcar
            .mutateAsync(porDefecto.templateId)
            .finally(() => setPorDefecto(null));
        }}
      />
    </>
  );
}

function TarjetaContrato({
  plantilla,
  onMarcar,
}: Readonly<{ plantilla: PartnerContractTemplate; onMarcar: () => void }>) {
  const archivada = plantilla.status !== "active";
  return (
    <Card className="p-5" testId={`contrato-${plantilla.templateId}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-atlas-text">
            {`${plantilla.name} · v${plantilla.version}`}
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-wide text-atlas-muted">
            {plantilla.templateCode}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {plantilla.isDefault ? (
            <StatusBadge value="VIGENTE" />
          ) : (
            <StatusBadge value={plantilla.status} />
          )}
          {/* Revivir un texto archivado desharía la retirada de quien tuvo un motivo para retirarlo. */}
          {!plantilla.isDefault && !archivada ? (
            <Button className="h-8 px-2 text-xs" onClick={onMarcar}>
              Marcar como vigente
            </Button>
          ) : null}
        </div>
      </div>
      <p className="mb-3 text-xs text-atlas-muted">
        {plantilla.effectiveFrom
          ? `En vigor desde ${formatDateTime(plantilla.effectiveFrom)}`
          : "Sin fecha de vigencia"}
      </p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-atlas-soft p-3 text-xs text-atlas-text">
        {plantilla.body}
      </pre>
    </Card>
  );
}

function DialogoPublicar({
  open,
  codigoSugerido,
  onClose,
}: Readonly<{ open: boolean; codigoSugerido: string; onClose: () => void }>) {
  const titleId = useId();
  const publicar = usePublishContractTemplate();
  const [templateCode, setTemplateCode] = useState(codigoSugerido);
  const [name, setName] = useState("Contrato de afiliación de comercios");
  const [body, setBody] = useState("");

  if (!open) return null;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    await publicar.mutateAsync({
      templateCode: templateCode.trim().toUpperCase(),
      name: name.trim(),
      body,
      makeDefault: true,
    });
    onClose();
  }

  return (
    <DialogShell
      open
      labelledBy={titleId}
      onClose={onClose}
      overlayClassName="flex items-center justify-center p-4"
      panelClassName="w-full max-w-2xl rounded-lg border border-atlas-border bg-white p-5 shadow-subtle"
    >
      <form onSubmit={(evento) => void enviar(evento)} className="space-y-4">
        <h2 id={titleId} className="text-lg font-semibold text-atlas-text">
          Publicar una versión del contrato
        </h2>
        <p className="text-sm text-atlas-muted">
          Se crea una versión nueva y la anterior se archiva. El texto publicado
          NO se podrá editar: para corregirlo se publica otra versión, y la
          anterior queda como prueba de qué regía hasta hoy.
        </p>

        <Field
          label="Código del contrato"
          hint="En mayúsculas y sin espacios. Identifica el MISMO contrato entre versiones, así que no cambia al publicar una nueva."
        >
          <Input
            required
            value={templateCode}
            onChange={(evento) => setTemplateCode(evento.target.value)}
          />
        </Field>
        <Field label="Nombre">
          <Input
            required
            value={name}
            onChange={(evento) => setName(evento.target.value)}
          />
        </Field>
        <Field
          label="Texto del contrato"
          hint="Al menos 50 caracteres. Es lo que el comercio acepta al afiliarse."
        >
          <Textarea
            required
            rows={12}
            value={body}
            onChange={(evento) => setBody(evento.target.value)}
          />
        </Field>

        {publicar.error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {isAtlasApiError(publicar.error)
              ? publicar.error.message
              : "No se pudo publicar la versión."}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={publicar.isPending}>
            Publicar
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
