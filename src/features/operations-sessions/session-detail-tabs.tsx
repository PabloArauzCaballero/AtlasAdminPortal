"use client";

import { useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import {
  buildAuditTrailColumns,
  buildCustomerActionColumns,
  buildCustomerObservationColumns,
  buildGpsObservationColumns,
} from "./activity-columns";
import {
  buildDeviceRiskEventColumns,
  buildDeviceSnapshotColumns,
} from "./device-columns";
import {
  buildAuthEventColumns,
  buildPermissionColumns,
} from "./identity-columns";
import {
  buildIpReputationColumns,
  buildSimObservationColumns,
} from "./network-columns";
import { SessionOverviewSection } from "./session-overview-section";
import type { SessionInvestigationSummary } from "./types";

const TABS = [
  "Resumen",
  "Dispositivo",
  "Red e IP",
  "SIM",
  "Autenticación",
  "Permisos",
  "Riesgo del dispositivo",
  "Ubicación",
  "Acciones",
  "Observaciones",
  "Auditoría",
] as const;

type Tab = (typeof TABS)[number];

function TabContent({
  tab,
  summary,
}: Readonly<{ tab: Tab; summary: SessionInvestigationSummary }>) {
  switch (tab) {
    case "Resumen":
      return <SessionOverviewSection summary={summary} />;
    case "Dispositivo":
      return (
        <DataTable
          data={summary.deviceSnapshots}
          columns={buildDeviceSnapshotColumns()}
          emptyTitle="Sin snapshots del dispositivo."
          emptyDescription="La sesión no registró telemetría del dispositivo (VPN, root, emulador)."
        />
      );
    case "Red e IP":
      return (
        <DataTable
          data={summary.ipReputation}
          columns={buildIpReputationColumns()}
          emptyTitle="Sin observaciones de reputación de IP."
          emptyDescription="No se consultó la reputación de la IP de esta sesión."
        />
      );
    case "SIM":
      return (
        <DataTable
          data={summary.simObservations}
          columns={buildSimObservationColumns()}
          emptyTitle="Sin observaciones de SIM."
          emptyDescription="La sesión no registró datos de la línea telefónica."
        />
      );
    case "Autenticación":
      return (
        <DataTable
          data={summary.authEvents}
          columns={buildAuthEventColumns()}
          emptyTitle="Sin eventos de autenticación."
          emptyDescription="La sesión no registró intentos de login ni logout."
        />
      );
    case "Permisos":
      return (
        <DataTable
          data={summary.permissions}
          columns={buildPermissionColumns()}
          emptyTitle="Sin eventos de permisos."
          emptyDescription="La app no solicitó permisos durante esta sesión."
        />
      );
    case "Riesgo del dispositivo":
      return (
        <DataTable
          data={summary.deviceRiskEvents}
          columns={buildDeviceRiskEventColumns()}
          emptyTitle="Sin eventos de riesgo del dispositivo."
          emptyDescription={
            summary.session.deviceId
              ? "El dispositivo de esta sesión no tiene cambios de riesgo registrados."
              : "La sesión no tiene dispositivo asociado: estos eventos cuelgan del dispositivo, no de la sesión."
          }
        />
      );
    case "Ubicación":
      return (
        <DataTable
          data={summary.gpsObservations}
          columns={buildGpsObservationColumns()}
          emptyTitle="Sin observaciones de GPS."
          emptyDescription="La sesión no registró capturas de ubicación."
        />
      );
    case "Acciones":
      return (
        <DataTable
          data={summary.customerActions}
          columns={buildCustomerActionColumns()}
          emptyTitle="Sin acciones registradas."
          emptyDescription="La sesión no registró navegación ni eventos de la app."
        />
      );
    case "Observaciones":
      return (
        <DataTable
          data={summary.customerObservations}
          columns={buildCustomerObservationColumns()}
          emptyTitle="Sin observaciones del cliente."
          emptyDescription="La sesión no derivó observaciones sobre el cliente."
        />
      );
    case "Auditoría":
      return (
        <DataTable
          data={summary.auditTrail}
          columns={buildAuditTrailColumns()}
          emptyTitle="Sin traza de auditoría."
          emptyDescription="No hay acciones internas registradas sobre esta sesión."
        />
      );
    default:
      return null;
  }
}

/** Contador para la etiqueta de la pestaña; `Resumen` no lista nada. */
function tabCount(
  tab: Tab,
  summary: SessionInvestigationSummary,
): number | null {
  const counts: Record<Exclude<Tab, "Resumen">, number> = {
    Dispositivo: summary.deviceSnapshots.length,
    "Red e IP": summary.ipReputation.length,
    SIM: summary.simObservations.length,
    Autenticación: summary.authEvents.length,
    Permisos: summary.permissions.length,
    "Riesgo del dispositivo": summary.deviceRiskEvents.length,
    Ubicación: summary.gpsObservations.length,
    Acciones: summary.customerActions.length,
    Observaciones: summary.customerObservations.length,
    Auditoría: summary.auditTrail.length,
  };
  if (tab === "Resumen") return null;
  return counts[tab];
}

export function SessionDetailTabs({
  summary,
}: Readonly<{ summary: SessionInvestigationSummary }>) {
  const [active, setActive] = useState<Tab>("Resumen");

  // La etiqueta lleva el contador, así que hay que mapear de vuelta al Tab crudo.
  const labels = TABS.map((tab) => {
    const count = tabCount(tab, summary);
    return count === null ? tab : `${tab} (${count})`;
  });
  const activeLabel = labels[TABS.indexOf(active)];

  return (
    <>
      <DetailTabs
        tabs={labels}
        active={activeLabel}
        onChange={(label) => setActive(TABS[labels.indexOf(label)])}
      />
      <TabContent tab={active} summary={summary} />
    </>
  );
}
