"use client";

import { useState } from "react";
import { Activity, DatabaseZap, Search } from "lucide-react";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Field, Input } from "@/shared/components/ui/input";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import { useProvidersHealth } from "./hooks";
import {
  ConQueSeDecidioCard,
  SenalesSueltas,
} from "./customer-external-data-evidencia";
import {
  ConsentimientosCard,
  ConsultarProveedorCard,
} from "./customer-external-data-sections";

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
  // El propósito y el proveedor los comparten el paso 1 y el paso 2: se consiente PARA algo y
  // ANTE alguien, y luego se consulta eso mismo. Tenerlos que reescribir entre un paso y el
  // siguiente es cómo se acaba consultando con un propósito distinto del consentido.
  const [proposito, setProposito] = useState("");
  const [proveedor, setProveedor] = useState("");
  const salud = useProvidersHealth();

  return (
    <>
      <PageHeader
        icon={DatabaseZap}
        eyebrow="Evidencia externa"
        title="Datos externos del cliente"
        description="Qué consintió, qué se le consultó a cada proveedor y con qué evidencia se decidió. La gobernanza del proveedor —costos, cortes, SLA— vive en «Proveedores externos»."
      />

      <Card className="mb-6 p-5">
        <Field label="Identificador del cliente" hint="El customerId interno.">
          <div className="flex gap-2">
            <Input
              value={entrada}
              onChange={(evento) => setEntrada(evento.target.value)}
              placeholder="customerId"
            />
            <Button
              variant="primary"
              onClick={() => setCustomerId(entrada.trim())}
            >
              <Search className="h-4 w-4" aria-hidden />
              Abrir cliente
            </Button>
          </div>
        </Field>
      </Card>

      {customerId ? (
        <div className="space-y-6">
          <ConsentimientosCard
            customerId={customerId}
            proposito={proposito}
            onProposito={setProposito}
            proveedor={proveedor}
            onProveedor={setProveedor}
          />
          <ConsultarProveedorCard
            customerId={customerId}
            proposito={proposito}
            onProposito={setProposito}
            proveedor={proveedor}
            onProveedor={setProveedor}
          />
          <ConQueSeDecidioCard customerId={customerId} />
          <SenalesSueltas customerId={customerId} />
        </div>
      ) : null}

      <Card className="mt-6 p-5">
        <SectionHeader
          icon={Activity}
          title="Salud de proveedores"
          description="La misma sonda que alimenta el catálogo. Un proveedor caído explica una consulta que no vuelve."
        />
        {salud.isLoading ? <LoadingSkeleton rows={2} /> : null}
        {salud.data ? <JsonViewer value={salud.data} /> : null}
      </Card>
    </>
  );
}
