"use client";

import { useState } from "react";
import { Calculator, Send, ShieldCheck, ShieldOff } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import {
  useCreateRequestMutation,
  useCustomerConsents,
  useGrantConsentMutation,
  usePreviewRequestMutation,
  useRevokeConsentMutation,
} from "./hooks";

/**
 * Los dos pasos que PIDEN datos externos de un cliente: consentir y consultar.
 *
 * El orden no es decorativo —sin consentimiento no se consulta—, y por eso comparten el propósito
 * y el proveedor: se consulta lo mismo que se consintió. Lo que se obtiene se lee en
 * `customer-external-data-evidencia`.
 *
 * Cada tarjeta lleva su relleno (`p-5`): `Card` es sólo el marco. Sin él, el contenido se pegaba
 * al filo y, en las esquinas, se salía por fuera del radio.
 */

export function ConsentimientosCard({
  customerId,
  proposito,
  onProposito,
  proveedor,
  onProveedor,
}: Readonly<{
  customerId: string;
  proposito: string;
  onProposito: (valor: string) => void;
  proveedor: string;
  onProveedor: (valor: string) => void;
}>) {
  const [consentIdARevocar, setConsentIdARevocar] = useState("");
  const consents = useCustomerConsents(customerId);
  const otorgar = useGrantConsentMutation();
  const revocar = useRevokeConsentMutation();

  return (
    <Card className="p-5">
      <SectionHeader
        icon={ShieldCheck}
        title="1 · Consentimientos"
        description="Sin consentimiento vigente no se consulta a un proveedor. Revocar no borra lo ya obtenido: corta lo que venga a partir de ahora."
      />
      {consents.isLoading ? <LoadingSkeleton rows={2} /> : null}
      {consents.data ? <JsonViewer value={consents.data} /> : null}
      {consents.error ? (
        <p className="text-sm text-atlas-muted">
          {isAtlasApiError(consents.error)
            ? consents.error.message
            : "No se pudieron leer los consentimientos."}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
        <Field label="Propósito">
          <Input
            value={proposito}
            onChange={(evento) => onProposito(evento.target.value)}
            placeholder="onboarding"
          />
        </Field>
        <Field label="Proveedor" hint="Vacío = para todos.">
          <Input
            value={proveedor}
            onChange={(evento) => onProveedor(evento.target.value)}
            placeholder="SEGIP"
          />
        </Field>
        {/*
         * El botón se alinea con la CAJA del campo, no con el bloque: `Field` cierra con una
         * línea de pista debajo del input, así que `items-end` lo dejaba a la altura de esa
         * pista, un renglón por debajo de los dos campos de al lado.
         */}
        <div className="flex items-start gap-2 md:mt-[26px]">
          <Button
            disabled={!proposito || otorgar.isPending}
            isLoading={otorgar.isPending}
            loadingText="Registrando…"
            onClick={() =>
              void otorgar.mutateAsync({
                customerId,
                purpose: proposito,
                ...(proveedor ? { providerCode: proveedor } : {}),
                accepted: true,
              })
            }
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Registrar consentimiento
          </Button>
        </div>
      </div>
      {otorgar.data ? (
        <JsonViewer value={otorgar.data} title="Consentimiento registrado" />
      ) : null}
      <div className="mt-3">
        <Field
          label="Revocar un consentimiento"
          hint="El identificador sale de la lista de arriba. Revocar corta lo que venga a partir de ahora; lo ya obtenido se conserva porque con ello se decidió."
        >
          <div className="flex gap-2">
            <Input
              value={consentIdARevocar}
              onChange={(evento) => setConsentIdARevocar(evento.target.value)}
              placeholder="consentId"
            />
            <Button
              variant="danger"
              disabled={!consentIdARevocar || revocar.isPending}
              isLoading={revocar.isPending}
              loadingText="Revocando…"
              onClick={() => void revocar.mutateAsync(consentIdARevocar)}
            >
              <ShieldOff className="h-4 w-4" aria-hidden />
              Revocar
            </Button>
          </div>
        </Field>
      </div>
    </Card>
  );
}

export function ConsultarProveedorCard({
  customerId,
  proposito,
  onProposito,
  proveedor,
  onProveedor,
}: Readonly<{
  customerId: string;
  proposito: string;
  onProposito: (valor: string) => void;
  proveedor: string;
  onProveedor: (valor: string) => void;
}>) {
  const [queryType, setQueryType] = useState("");
  const [etapa, setEtapa] = useState("ONBOARDING");
  const previa = usePreviewRequestMutation();
  const pedir = useCreateRequestMutation();

  const cuerpoPeticion = {
    customerId,
    providerCode: proveedor,
    queryType,
    purpose: proposito || "onboarding",
    decisionStage: etapa,
    input: {},
  };
  const listaParaPedir = Boolean(customerId && proveedor && queryType);

  return (
    <Card className="p-5">
      <SectionHeader
        icon={Send}
        title="2 · Consultar a un proveedor"
        description="La vista previa dice qué política aplica y qué costaría, sin llamar al proveedor. Es lo que separa una consulta gobernada de una factura sorpresa."
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Proveedor">
          <Input
            value={proveedor}
            onChange={(evento) => onProveedor(evento.target.value)}
          />
        </Field>
        <Field label="Tipo de consulta">
          <Input
            value={queryType}
            onChange={(evento) => setQueryType(evento.target.value)}
            placeholder="IDENTITY_VERIFICATION"
          />
        </Field>
        <Field label="Etapa de decisión">
          <Select
            value={etapa}
            onChange={(evento) => setEtapa(evento.target.value)}
          >
            <option value="ONBOARDING">ONBOARDING</option>
            <option value="UNDERWRITING">UNDERWRITING</option>
            <option value="MONITORING">MONITORING</option>
            <option value="COLLECTIONS">COLLECTIONS</option>
          </Select>
        </Field>
        {/* Propósito y proveedor son los MISMOS que los del paso 1: se consulta con el propósito
            que se consintió, o no se consulta. Tenerlos separados invitaba a que no coincidieran. */}
        <Field label="Propósito" hint="Por defecto, «onboarding».">
          <Input
            value={proposito}
            onChange={(evento) => onProposito(evento.target.value)}
            placeholder="onboarding"
          />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          disabled={!listaParaPedir || previa.isPending}
          isLoading={previa.isPending}
          loadingText="Estimando…"
          onClick={() => void previa.mutateAsync(cuerpoPeticion)}
        >
          <Calculator className="h-4 w-4" aria-hidden />
          Ver qué costaría
        </Button>
        <Button
          variant="primary"
          disabled={!listaParaPedir || pedir.isPending}
          isLoading={pedir.isPending}
          loadingText="Consultando…"
          onClick={() => void pedir.mutateAsync(cuerpoPeticion)}
        >
          <Send className="h-4 w-4" aria-hidden />
          Consultar
        </Button>
      </div>
      {previa.data ? (
        <JsonViewer
          value={previa.data}
          title="Vista previa (no se consultó nada)"
        />
      ) : null}
      {pedir.data ? (
        <JsonViewer value={pedir.data} title="Resultado de la consulta" />
      ) : null}
    </Card>
  );
}
