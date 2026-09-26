"use client";

import { useState } from "react";
import {
  FileSearch,
  Fingerprint,
  Link2,
  RefreshCw,
  Share2,
} from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import {
  useCustomerDataset,
  useDigitalTrustCheckMutation,
  useDigitalTrustProfile,
  useFacebookConnectUrlMutation,
  useFacebookStatus,
} from "./hooks";
import type { CustomerDataset } from "./services";

/**
 * Lo que se OBTUVO del cliente: el paquete con el que se decidió y las dos señales sueltas.
 *
 * Separado de los dos pasos que lo producen (`customer-external-data-sections`) por el tope de
 * 300 líneas por fichero, y por el corte natural: arriba se pide, aquí se lee.
 */

const DATASETS: Array<{ key: CustomerDataset; label: string; hint: string }> = [
  {
    key: "observations",
    label: "Observaciones",
    hint: "Lo que devolvió cada proveedor, crudo.",
  },
  {
    key: "features",
    label: "Features",
    hint: "Las señales derivadas de esas observaciones.",
  },
  {
    key: "scoring-input",
    label: "Entrada de scoring",
    hint: "Lo que recibe el modelo.",
  },
  {
    key: "decision-package",
    label: "Paquete de decisión",
    hint: "Todo junto, tal y como se decidió.",
  },
];

export function ConQueSeDecidioCard({
  customerId,
}: Readonly<{ customerId: string }>) {
  const [dataset, setDataset] = useState<CustomerDataset>("decision-package");
  const datos = useCustomerDataset(customerId, dataset);

  return (
    <Card className="p-5">
      <SectionHeader
        icon={FileSearch}
        title="3 · Con qué se decidió"
        description="Las cuatro lecturas del mismo cliente, de la más cruda a la más elaborada."
      />
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
  );
}

export function SenalesSueltas({
  customerId,
}: Readonly<{ customerId: string }>) {
  const trust = useDigitalTrustProfile(customerId);
  const facebook = useFacebookStatus(customerId);
  const comprobarTrust = useDigitalTrustCheckMutation();
  const enlaceFacebook = useFacebookConnectUrlMutation();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <SectionHeader
          icon={Fingerprint}
          title="Confianza digital"
          description="Señales de identidad sintética, correo, IP y dispositivo."
        />
        {trust.data ? <JsonViewer value={trust.data} /> : null}
        <Button
          className="mt-3"
          disabled={comprobarTrust.isPending}
          isLoading={comprobarTrust.isPending}
          loadingText="Comprobando…"
          onClick={() => void comprobarTrust.mutateAsync({ customerId })}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Comprobar ahora
        </Button>
        {comprobarTrust.data ? (
          <JsonViewer value={comprobarTrust.data} title="Resultado" />
        ) : null}
      </Card>

      <Card className="p-5">
        <SectionHeader
          icon={Share2}
          title="Facebook"
          description="El enlace lo abre el CLIENTE: la vuelta de OAuth la recibe el backend, no esta pantalla."
        />
        {facebook.data ? <JsonViewer value={facebook.data} /> : null}
        <Button
          className="mt-3"
          disabled={enlaceFacebook.isPending}
          isLoading={enlaceFacebook.isPending}
          loadingText="Generando…"
          onClick={() => void enlaceFacebook.mutateAsync(customerId)}
        >
          <Link2 className="h-4 w-4" aria-hidden />
          Generar enlace de conexión
        </Button>
        {enlaceFacebook.data ? (
          <JsonViewer value={enlaceFacebook.data} title="Enlace" />
        ) : null}
      </Card>
    </div>
  );
}
