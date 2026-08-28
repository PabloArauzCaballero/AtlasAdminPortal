"use client";

import { useState } from "react";
import { DatabaseZap } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Field, Input, Select } from "@/shared/components/ui/input";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import {
  useCreateRequestMutation,
  useCustomerConsents,
  useCustomerDataset,
  useDigitalTrustCheckMutation,
  useDigitalTrustProfile,
  useFacebookConnectUrlMutation,
  useFacebookStatus,
  useGrantConsentMutation,
  usePreviewRequestMutation,
  useProvidersHealth,
  useRevokeConsentMutation,
} from "./hooks";
import type { CustomerDataset } from "./services";

const DATASETS: Array<{ key: CustomerDataset; label: string; hint: string }> = [
  { key: "observations", label: "Observaciones", hint: "Lo que devolvió cada proveedor, crudo." },
  { key: "features", label: "Features", hint: "Las señales derivadas de esas observaciones." },
  { key: "scoring-input", label: "Entrada de scoring", hint: "Lo que recibe el modelo." },
  { key: "decision-package", label: "Paquete de decisión", hint: "Todo junto, tal y como se decidió." },
];

/**
 * Datos externos de un cliente.
 *
 * La mitad que faltaba del módulo de proveedores: la gobernanza del proveedor ya tenía consola
 * («Proveedores externos»), pero lo del CLIENTE —qué consintió, qué se le consultó, qué se obtuvo y
 * con qué se decidió— no se podía ver desde ningún sitio.
 *
 * El orden de la pantalla es el orden real del proceso, y no es decorativo: **sin consentimiento no
 * se consulta**, y la vista previa existe para saber qué cuesta antes de gastar. Poner el resultado
 * primero invitaría a pedir datos y preguntar después.
 */
export function CustomerExternalDataPage() {
  return (
    <RoleGate roles={INTERNAL_PORTAL_ROLE_LIST}>
      <AuthorizedCustomerExternalDataPage />
    </RoleGate>
  );
}

function AuthorizedCustomerExternalDataPage() {
  const [entrada, setEntrada] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [dataset, setDataset] = useState<CustomerDataset>("decision-package");
  const [proposito, setProposito] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [queryType, setQueryType] = useState("");
  const [etapa, setEtapa] = useState("ONBOARDING");
  const [consentIdARevocar, setConsentIdARevocar] = useState("");

  const consents = useCustomerConsents(customerId);
  const datos = useCustomerDataset(customerId, dataset);
  const salud = useProvidersHealth();
  const trust = useDigitalTrustProfile(customerId);
  const facebook = useFacebookStatus(customerId);

  const otorgar = useGrantConsentMutation();
  const revocar = useRevokeConsentMutation();
  const previa = usePreviewRequestMutation();
  const pedir = useCreateRequestMutation();
  const comprobarTrust = useDigitalTrustCheckMutation();
  const enlaceFacebook = useFacebookConnectUrlMutation();

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
    <>
      <PageHeader
        icon={DatabaseZap}
        eyebrow="Evidencia externa"
        title="Datos externos del cliente"
        description="Qué consintió, qué se le consultó a cada proveedor y con qué evidencia se decidió. La gobernanza del proveedor —costos, cortes, SLA— vive en «Proveedores externos»."
      />

      <Card className="mb-6">
        <Field label="Identificador del cliente" hint="El customerId interno.">
          <div className="flex gap-2">
            <Input value={entrada} onChange={(e) => setEntrada(e.target.value)} />
            <Button variant="primary" onClick={() => setCustomerId(entrada.trim())}>
              Abrir cliente
            </Button>
          </div>
        </Field>
      </Card>

      {customerId ? (
        <div className="space-y-6">
          <Card>
            <h2 className="mb-1 text-base font-semibold text-atlas-text">
              1 · Consentimientos
            </h2>
            <p className="mb-4 text-sm text-atlas-muted">
              Sin consentimiento vigente no se consulta a un proveedor. Revocar no borra lo ya
              obtenido: corta lo que venga a partir de ahora.
            </p>
            {consents.isLoading ? <LoadingSkeleton rows={2} /> : null}
            {consents.data ? <JsonViewer value={consents.data} /> : null}
            {consents.error ? (
              <p className="text-sm text-atlas-muted">
                {isAtlasApiError(consents.error)
                  ? consents.error.message
                  : "No se pudieron leer los consentimientos."}
              </p>
            ) : null}
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <Field label="Propósito">
                <Input
                  value={proposito}
                  onChange={(e) => setProposito(e.target.value)}
                  placeholder="onboarding"
                />
              </Field>
              <Field label="Proveedor" hint="Vacío = para todos.">
                <Input
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  placeholder="SEGIP"
                />
              </Field>
              <div className="flex items-end gap-2">
                <Button
                  disabled={!proposito || otorgar.isPending}
                  onClick={() =>
                    void otorgar.mutateAsync({
                      customerId,
                      purpose: proposito,
                      ...(proveedor ? { providerCode: proveedor } : {}),
                      accepted: true,
                    })
                  }
                >
                  Registrar consentimiento
                </Button>
              </div>
            </div>
            {otorgar.data ? <JsonViewer value={otorgar.data} title="Consentimiento registrado" /> : null}
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
                    onClick={() => void revocar.mutateAsync(consentIdARevocar)}
                  >
                    Revocar
                  </Button>
                </div>
              </Field>
            </div>
          </Card>

          <Card>
            <h2 className="mb-1 text-base font-semibold text-atlas-text">
              2 · Consultar a un proveedor
            </h2>
            <p className="mb-4 text-sm text-atlas-muted">
              La vista previa dice qué política aplica y qué costaría, sin llamar al proveedor. Es lo
              que separa una consulta gobernada de una factura sorpresa.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Proveedor">
                <Input value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
              </Field>
              <Field label="Tipo de consulta">
                <Input
                  value={queryType}
                  onChange={(e) => setQueryType(e.target.value)}
                  placeholder="IDENTITY_VERIFICATION"
                />
              </Field>
              <Field label="Etapa de decisión">
                <Select value={etapa} onChange={(e) => setEtapa(e.target.value)}>
                  <option value="ONBOARDING">ONBOARDING</option>
                  <option value="UNDERWRITING">UNDERWRITING</option>
                  <option value="MONITORING">MONITORING</option>
                  <option value="COLLECTIONS">COLLECTIONS</option>
                </Select>
              </Field>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                disabled={!listaParaPedir || previa.isPending}
                onClick={() => void previa.mutateAsync(cuerpoPeticion)}
              >
                Ver qué costaría
              </Button>
              <Button
                variant="primary"
                disabled={!listaParaPedir || pedir.isPending}
                onClick={() => void pedir.mutateAsync(cuerpoPeticion)}
              >
                Consultar
              </Button>
            </div>
            {previa.data ? <JsonViewer value={previa.data} title="Vista previa (no se consultó nada)" /> : null}
            {pedir.data ? <JsonViewer value={pedir.data} title="Resultado de la consulta" /> : null}
          </Card>

          <Card>
            <h2 className="mb-1 text-base font-semibold text-atlas-text">
              3 · Con qué se decidió
            </h2>
            <p className="mb-4 text-sm text-atlas-muted">
              Las cuatro lecturas del mismo cliente, de la más cruda a la más elaborada.
            </p>
            <nav className="mb-3 flex flex-wrap gap-2">
              {DATASETS.map((item) => (
                <Button
                  key={item.key}
                  variant={item.key === dataset ? "primary" : "secondary"}
                  onClick={() => setDataset(item.key)}
                >
                  {item.label}
                </Button>
              ))}
            </nav>
            <p className="mb-3 text-xs text-atlas-muted">
              {DATASETS.find((item) => item.key === dataset)?.hint}
            </p>
            {datos.isLoading ? <LoadingSkeleton rows={3} /> : null}
            {datos.data ? <JsonViewer value={datos.data} /> : null}
            {datos.error ? (
              <p className="text-sm text-atlas-muted">
                {isAtlasApiError(datos.error)
                  ? datos.error.message
                  : "Este cliente todavía no tiene ese conjunto."}
              </p>
            ) : null}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-1 text-base font-semibold text-atlas-text">
                Confianza digital
              </h2>
              <p className="mb-4 text-sm text-atlas-muted">
                Señales de identidad sintética, correo, IP y dispositivo.
              </p>
              {trust.data ? <JsonViewer value={trust.data} /> : null}
              <Button
                className="mt-3"
                disabled={comprobarTrust.isPending}
                onClick={() => void comprobarTrust.mutateAsync({ customerId })}
              >
                Comprobar ahora
              </Button>
              {comprobarTrust.data ? <JsonViewer value={comprobarTrust.data} title="Resultado" /> : null}
            </Card>

            <Card>
              <h2 className="mb-1 text-base font-semibold text-atlas-text">
                Facebook
              </h2>
              <p className="mb-4 text-sm text-atlas-muted">
                El enlace lo abre el CLIENTE: la vuelta de OAuth la recibe el backend, no esta
                pantalla.
              </p>
              {facebook.data ? <JsonViewer value={facebook.data} /> : null}
              <Button
                className="mt-3"
                disabled={enlaceFacebook.isPending}
                onClick={() => void enlaceFacebook.mutateAsync(customerId)}
              >
                Generar enlace de conexión
              </Button>
              {enlaceFacebook.data ? <JsonViewer value={enlaceFacebook.data} title="Enlace" /> : null}
            </Card>
          </div>
        </div>
      ) : null}

      <Card className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-atlas-text">
          Salud de proveedores
        </h2>
        {salud.isLoading ? <LoadingSkeleton rows={2} /> : null}
        {salud.data ? <JsonViewer value={salud.data} /> : null}
      </Card>
    </>
  );
}
