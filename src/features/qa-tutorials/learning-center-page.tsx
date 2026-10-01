"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { QaLabGuide } from "@/features/qa-lab/guide/qa-lab-guide-page";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/layout/page-header";
import { LearningPaths } from "./learning-paths-tab";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { useAuth } from "@/shared/auth/auth-context";

const PATHS_TAB = "Recorridos";
const GUIDE_TAB = "Guía de referencia";
/** `?tab=guia` es el destino de la ruta vieja «Guía QA Lab». */
const GUIDE_SLUG = "guia";
/** Mismos permisos que tenía cada pantalla antes de unirlas. */
const PATHS_PERMISSIONS = ["systems.endpoints.read", "systems.qa.read"];
const GUIDE_PERMISSIONS = ["systems.endpoints.read"];

/**
 * «Aprender QA Lab»: los recorridos guiados y la guía de referencia, antes dos
 * ítems del menú («Centro de aprendizaje» y «Guía QA Lab»).
 */
export function LearningCenterPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { permissions } = useAuth();
  // La guía pide un permiso más estrecho que los recorridos: sin él, ni pestaña.
  const canReadGuide = GUIDE_PERMISSIONS.some((permission) =>
    permissions.includes(permission),
  );
  const active =
    canReadGuide && params.get("tab") === GUIDE_SLUG ? GUIDE_TAB : PATHS_TAB;
  const selectTab = (tab: string) => {
    router.replace(
      tab === GUIDE_TAB ? `${pathname}?tab=${GUIDE_SLUG}` : pathname,
      { scroll: false },
    );
  };
  return (
    <PermissionGate permissions={PATHS_PERMISSIONS}>
      <PageHeader
        eyebrow="Consola de pruebas"
        title="Aprender el laboratorio QA"
        description="Aprende QA LAB paso a paso con recorridos guiados sobre las pantallas reales, o consulta la guía de referencia: cómo probar la API como si fueras el negocio y qué barreras impiden romper producción."
        actions={
          <Link href="/internal/qa/lab">
            <Button variant="primary">Abrir el lab</Button>
          </Link>
        }
      />
      <DetailTabs
        tabs={canReadGuide ? [PATHS_TAB, GUIDE_TAB] : [PATHS_TAB]}
        active={active}
        onChange={selectTab}
      />
      {active === GUIDE_TAB ? (
        <PermissionGate permissions={GUIDE_PERMISSIONS}>
          <QaLabGuide />
        </PermissionGate>
      ) : (
        <PermissionGate permissions={PATHS_PERMISSIONS}>
          <LearningPaths />
        </PermissionGate>
      )}
    </PermissionGate>
  );
}
