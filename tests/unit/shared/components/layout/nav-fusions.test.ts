import { describe, expect, it } from "vitest";
import { navGroups } from "@/shared/components/layout/internal-shell/nav-config";
import { assistScreenFor } from "@/features/assist/screen-label";

/**
 * Las pantallas fusionadas salen del menú: una entrada por pantalla, no una por cada vista del
 * mismo dato. Las rutas viejas siguen existiendo como redirecciones, pero ningún enlace del menú
 * apunta a ellas.
 */
const hrefs = navGroups.flatMap((group) =>
  group.items.map((item) => item.href),
);

describe("menú tras las fusiones de metadatos y linaje", () => {
  it("Linaje es una sola entrada, la pantalla con pestañas", () => {
    const linaje = navGroups
      .flatMap((group) => group.items)
      .filter((item) => item.href.startsWith("/internal/lineage"));
    expect(linaje.map((item) => [item.label, item.href])).toEqual([
      ["Linaje", "/internal/lineage"],
    ]);
  });

  it("ninguna entrada apunta a una ruta retirada", () => {
    for (const retirada of [
      "/internal/lineage/official",
      "/internal/lineage/impact",
      "/internal/business-metadata/glossary",
      "/internal/governance/pii",
      "/internal/exports",
    ]) {
      expect(hrefs).not.toContain(retirada);
    }
  });

  it("Dominios y glosario es una sola entrada y su pestaña conserva el permiso", () => {
    const item = navGroups
      .flatMap((group) => group.items)
      .find((entry) => entry.href === "/internal/business-metadata/domains");
    expect(item?.label).toBe("Dominios y glosario");
    expect(item?.tabs?.[0]).toMatchObject({
      href: "/internal/business-metadata/domains",
      permissions: ["businessMetadata.read"],
    });
  });

  it("el asistente nombra la pantalla nueva", () => {
    expect(assistScreenFor("/internal/lineage")).toContain("Linaje");
    expect(assistScreenFor("/internal/business-metadata/domains")).toContain(
      "Dominios y glosario",
    );
  });
});

describe("menú tras la fusión de Operaciones (2026-10-07)", () => {
  const operaciones = navGroups.find((group) => group.label === "Operaciones");

  it("Operaciones es el primer grupo y tiene ocho entradas", () => {
    expect(navGroups[0]?.label).toBe("Operaciones");
    expect(operaciones?.items.map((item) => item.label)).toEqual([
      "Cola de trabajo",
      "Comercios",
      "Préstamos y cartera",
      "Productos de crédito",
      "Archivos",
      "Soporte",
      "Notificaciones",
      "Procesos",
    ]);
  });

  it("cada fusión conserva las rutas de sus pantallas como pestañas", () => {
    const pestañas = Object.fromEntries(
      (operaciones?.items ?? [])
        .filter((item) => item.tabs)
        .map((item) => [item.label, item.tabs?.map((tab) => tab.href)]),
    );
    expect(pestañas).toEqual({
      "Cola de trabajo": [
        "/internal/operations/work-queue",
        "/internal/operations/pending-contacts",
        "/internal/operations/payment-claims",
      ],
      Comercios: ["/internal/operations/partners", "/internal/merchant-users"],
      "Préstamos y cartera": [
        "/internal/operations/loans",
        "/internal/operations/portfolio",
      ],
      Soporte: [
        "/internal/support",
        "/internal/support/knowledge",
        "/internal/support/agents",
      ],
      Notificaciones: [
        "/internal/notifications",
        "/internal/notifications/campaigns",
      ],
    });
  });

  it("ninguna ruta se queda sin entrada: las que salieron de Operaciones están en otro grupo", () => {
    const grupoDe = (href: string) =>
      navGroups.find((group) =>
        group.items.some(
          (item) =>
            item.href === href || item.tabs?.some((tab) => tab.href === href),
        ),
      )?.label;
    expect(grupoDe("/internal/views")).toBe("QA y reportes");
    expect(grupoDe("/internal/events")).toBe("Sistemas");
    expect(grupoDe("/internal/jobs")).toBe("Sistemas");
    expect(grupoDe("/internal/operations/credit/products")).toBe("Operaciones");
    expect(navGroups.some((group) => group.label === "Crédito")).toBe(false);
  });

  it("una pestaña no pertenece a dos entradas", () => {
    const todas = navGroups.flatMap((group) =>
      group.items.flatMap((item) => item.tabs?.map((tab) => tab.href) ?? []),
    );
    expect(new Set(todas).size).toBe(todas.length);
  });

  it("el asistente nombra la pestaña en la que está la persona", () => {
    expect(assistScreenFor("/internal/operations/payment-claims")).toBe(
      "Operaciones › Cola de trabajo › Avisos de pago",
    );
    expect(assistScreenFor("/internal/merchant-users")).toBe(
      "Operaciones › Comercios › Usuarios",
    );
  });
});

/** Las 64 rutas que el menú listaba antes del recorte (origin/dev, bc491a1). */
const RUTAS_DEL_MENU_ANTERIOR = `
  /internal/audit
  /internal/business-metadata/definitions
  /internal/business-metadata/domains
  /internal/data-catalog/tables
  /internal/data-quality/issues
  /internal/data-quality/rules
  /internal/events
  /internal/external-data
  /internal/external-providers
  /internal/external-providers/audits
  /internal/external-providers/requests
  /internal/files
  /internal/flows
  /internal/flows/gate
  /internal/flows/pending-work
  /internal/flows/rbac-drift
  /internal/flows/review
  /internal/governance
  /internal/governance/policies
  /internal/governance/privacy-requests
  /internal/jobs
  /internal/lineage
  /internal/merchant-users
  /internal/notifications
  /internal/notifications/campaigns
  /internal/operations/catalogs
  /internal/operations/credit/products
  /internal/operations/loans
  /internal/operations/partners
  /internal/operations/payment-claims
  /internal/operations/pending-contacts
  /internal/operations/portfolio
  /internal/operations/work-queue
  /internal/procesos
  /internal/qa/aprender
  /internal/qa/lab
  /internal/qa/runs
  /internal/qa/stress
  /internal/qa/suites
  /internal/release-readiness
  /internal/reports
  /internal/review-queue
  /internal/risk-policy/current
  /internal/schema/change-log
  /internal/schema/versions
  /internal/security/session
  /internal/settings/app-content
  /internal/settings/catalog-sync
  /internal/settings/consent-documents
  /internal/settings/decision-artifacts
  /internal/settings/notification-policies
  /internal/settings/partner-contracts
  /internal/settings/permissions
  /internal/settings/profile
  /internal/settings/roles
  /internal/settings/users
  /internal/support
  /internal/support/agents
  /internal/support/knowledge
  /internal/systems/decision-engine/artifacts
  /internal/systems/endpoints
  /internal/systems/network-health
  /internal/systems/tools
  /internal/views
`
  .trim()
  .split(/\s+/);

describe("menú completo tras el recorte (2026-10-07)", () => {
  const entradas = navGroups.flatMap((group) => group.items);

  it("siete grupos y treinta y cinco entradas", () => {
    expect(navGroups.map((group) => group.label)).toEqual([
      "Operaciones",
      "Datos",
      "Gobierno",
      "Proveedores externos",
      "Sistemas",
      "QA y reportes",
      "Administración",
    ]);
    expect(entradas).toHaveLength(35);
  });

  it("ninguna pantalla que estaba en el menú se quedó sin camino", () => {
    const alcanzables = new Set([
      ...entradas.flatMap((item) =>
        item.tabs ? item.tabs.map((tab) => tab.href) : [item.href],
      ),
      // «Mi cuenta», desde el nombre al pie de la barra.
      "/internal/settings/profile",
      "/internal/security/session",
    ]);
    for (const ruta of RUTAS_DEL_MENU_ANTERIOR) {
      expect(alcanzables.has(ruta), ruta).toBe(true);
    }
  });

  it("una ruta no aparece dos veces en el menú", () => {
    const todas = entradas.flatMap((item) =>
      item.tabs ? item.tabs.map((tab) => tab.href) : [item.href],
    );
    expect(new Set(todas).size).toBe(todas.length);
  });

  it("la entrada de una fusión apunta a su primera pestaña", () => {
    for (const item of entradas.filter((entry) => entry.tabs)) {
      expect(item.tabs?.[0]?.href, item.label).toBe(item.href);
      expect(item.permissions, item.label).toEqual([]);
      expect(item.roles, item.label).toBeUndefined();
    }
  });
});
