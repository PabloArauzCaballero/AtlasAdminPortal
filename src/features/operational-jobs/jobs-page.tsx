"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListChecks } from "lucide-react";
import { useAuth } from "@/shared/auth/auth-context";
import { RoleGate } from "@/shared/auth/role-gate";
import {
  INTERNAL_PORTAL_ROLE_LIST,
  RUNTIME_JOB_ROLE_LIST,
} from "@/shared/auth/portal-roles";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { ForbiddenState } from "@/shared/components/ui/states";
import { RuntimeJobsPanel } from "@/features/runtime-jobs/runtime-jobs-page";
import { JobHistoryTab } from "./job-history-tab";

const HISTORY = "Historial";
const RUN_NOW = "Ejecutar ahora";
/** `?tab=ejecutar` es el destino de la ruta vieja «Jobs de runtime». */
const RUN_NOW_SLUG = "ejecutar";

/**
 * «Jobs»: una sola entrada para la tabla `system_job_runs`. «Historial» la lee
 * y «Ejecutar ahora» dispara los jobs que escriben en ella.
 *
 * Cada pestaña conserva el gate de su pantalla original, porque el backend
 * autoriza distinto: leer el historial (`InternalPortalController`) y disparar
 * un job (`RuntimeJobsController`, sólo admin, platform_admin y system).
 */
export function JobsPage() {
  const { hasAnyRole } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const canRead = hasAnyRole(INTERNAL_PORTAL_ROLE_LIST);
  const canRun = hasAnyRole(RUNTIME_JOB_ROLE_LIST);
  const tabs = [...(canRead ? [HISTORY] : []), ...(canRun ? [RUN_NOW] : [])];
  const wantsRun = params.get("tab") === RUN_NOW_SLUG;
  const active = (wantsRun && canRun) || !canRead ? RUN_NOW : HISTORY;

  const selectTab = useCallback(
    (tab: string) => {
      const query = new URLSearchParams(params.toString());
      if (tab === RUN_NOW) query.set("tab", RUN_NOW_SLUG);
      else query.delete("tab");
      const suffix = query.toString();
      router.replace(suffix ? `${pathname}?${suffix}` : pathname, {
        scroll: false,
      });
    },
    [params, pathname, router],
  );

  if (tabs.length === 0) return <ForbiddenState />;

  return (
    <>
      <PageHeader
        icon={ListChecks}
        eyebrow="Operaciones"
        title="Procesos automáticos"
        description="Los procesos que el sistema corre solo: cada vez que corrieron —cuándo, cuánto tardaron y si terminaron bien— y, para administración, el disparo manual."
      />
      {tabs.length > 1 ? (
        <DetailTabs tabs={tabs} active={active} onChange={selectTab} />
      ) : null}
      {active === HISTORY ? (
        <RoleGate roles={INTERNAL_PORTAL_ROLE_LIST}>
          <JobHistoryTab />
        </RoleGate>
      ) : (
        <RoleGate roles={RUNTIME_JOB_ROLE_LIST}>
          <RuntimeJobsPanel />
        </RoleGate>
      )}
    </>
  );
}
