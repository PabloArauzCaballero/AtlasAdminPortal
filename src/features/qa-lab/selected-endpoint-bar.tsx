"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  ExternalLink,
  ShieldAlert,
  Siren,
  UserCog,
  Zap,
} from "lucide-react";
import type { EndpointItem } from "@/features/systems/types";
import {
  MethodBadge,
  RiskBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";

/**
 * El endpoint elegido, en una barra de una línea.
 *
 * Antes, con un endpoint seleccionado la pantalla seguía mostrando ENTERA la tabla de los 404
 * endpoints del catálogo —diez filas, buscador y paginador— por encima de los formularios de
 * prueba. Elegir algo no cambiaba nada en pantalla salvo añadir contenido debajo, así que había que
 * desplazarse una pantalla completa para llegar a lo que se venía a hacer. Aquí la selección
 * SUSTITUYE al selector, y volver a él es un botón.
 */
export function SelectedEndpointBar({
  endpoint,
  onChange,
}: Readonly<{ endpoint: EndpointItem; onChange: () => void }>) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-atlas-border bg-white p-3.5 shadow-card">
      <MethodBadge method={endpoint.method} />
      <code className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-atlas-text">
        {endpoint.fullPath || endpoint.routePath}
      </code>
      <RiskBadge value={endpoint.riskLevel} />
      <StatusBadge value={endpoint.status} />
      {endpoint.isDestructive ? (
        <Badge tone="critical">
          <Siren className="h-3 w-3" aria-hidden />
          Destructivo
        </Badge>
      ) : null}
      {endpoint.requiresStressTest ? (
        <Badge tone="warning">
          <Zap className="h-3 w-3" aria-hidden />
          Exige carga
        </Badge>
      ) : null}
      {endpoint.containsPii ? (
        <Badge tone="pii">
          <ShieldAlert className="h-3 w-3" aria-hidden />
          PII
        </Badge>
      ) : null}
      {endpoint.isTestableFromPortal ? null : (
        <Badge tone="muted">
          <UserCog className="h-3 w-3" aria-hidden />
          No marcado como testeable
        </Badge>
      )}
      <div className="ml-auto flex items-center gap-2">
        <Link href={`/internal/systems/endpoints/${endpoint.endpointId}`}>
          <Button variant="ghost">
            <ExternalLink className="h-4 w-4" aria-hidden />
            Ficha
          </Button>
        </Link>
        <Button onClick={onChange}>
          <ArrowLeftRight className="h-4 w-4" aria-hidden />
          Cambiar endpoint
        </Button>
      </div>
    </div>
  );
}
