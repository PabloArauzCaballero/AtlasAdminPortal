import { expect, test as setup } from "@playwright/test";
import {
  INTERNAL_STORAGE_STATE,
  loginAsInternalUser,
  motivoParaSaltar,
} from "./internal-session";

setup.setTimeout(240_000);
setup.describe.configure({ retries: 0 });

/**
 * Un ÚNICO login para toda la suite, guardado como estado de sesión.
 *
 * `POST /internal/auth/login` está limitado a 10 intentos por minuto — es un endpoint público de
 * autenticación y ese techo es deliberado. Con un login por prueba, la cuarta empezaba a recibir
 * 429 y el fallo aparecía como un timeout esperando la navegación, que se lee como «el portal está
 * roto» y no lo estaba. Autenticar una vez y reutilizar las cookies respeta el límite y, de paso,
 * hace que cada prueba mida lo suyo y no el formulario de login.
 */
setup("autenticar en el portal interno", async ({ page }) => {
  const motivo = motivoParaSaltar();
  setup.skip(Boolean(motivo), motivo);

  await loginAsInternalUser(page);
  await expect(page).toHaveURL(/\/internal/);

  // El catálogo técnico nace vacío en una base recién migrada. Poblarlo por la ruta real
  // de gobierno permite probar endpoints, herramientas, datos y QA LAB contra el API.
  if (process.env.ALLOW_E2E_CATALOG_REFRESH === "true") {
    const response = await page.request.post(
      "http://localhost:3005/api/v1/systems/endpoints/catalog-seed/refresh",
      {
        headers: {
          "x-tenant-id": process.env.TEST_TENANT_ID ?? "1",
          "x-atlas-product": "admin-portal",
          origin: new URL(page.url()).origin,
        },
        data: {
          includeTools: true,
          includeDataEntities: true,
          includeEndpointSeeds: true,
        },
        timeout: 180_000,
      },
    );
    const outcome = (await response.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string };
    };
    expect(
      response.ok(),
      `seed de catálogo: HTTP ${response.status()} ${outcome.error?.code ?? "sin código"}: ${outcome.error?.message ?? "sin detalle"}`,
    ).toBeTruthy();

    // El escaneo de fuentes sólo infiere rutas. OpenAPI añade los campos de entrada que
    // necesita el generador de QA LAB para construir casos válidos e inválidos.
    const discovery = await page.request.post(
      "http://localhost:3005/api/v1/systems/endpoints/discover",
      {
        headers: {
          "x-tenant-id": process.env.TEST_TENANT_ID ?? "1",
          "x-atlas-product": "admin-portal",
          origin: new URL(page.url()).origin,
        },
        data: { mode: "OPENAPI_CONTRACT", persist: true },
        timeout: 180_000,
      },
    );
    const discoveryOutcome = (await discovery.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string };
    };
    expect(
      discovery.ok(),
      `contratos OpenAPI: HTTP ${discovery.status()} ${discoveryOutcome.error?.code ?? "sin código"}: ${discoveryOutcome.error?.message ?? "sin detalle"}`,
    ).toBeTruthy();

    // La federación sigue siendo la real del backend: sólo los dos productores remotos son
    // manifiestos de contrato versionados y servidos en este runner aislado.
    const federation = await page.request.post(
      "http://localhost:3005/api/v1/systems/blocks/federate",
      {
        headers: {
          "x-tenant-id": process.env.TEST_TENANT_ID ?? "1",
          "x-atlas-product": "admin-portal",
          origin: new URL(page.url()).origin,
        },
        data: {},
        timeout: 60_000,
      },
    );
    const federationBody = (await federation.json().catch(() => ({}))) as {
      data?: Array<{ systemCode: string; status: string }>;
      error?: { code?: string; message?: string };
    };
    expect(
      federation.ok(),
      `federación QA: HTTP ${federation.status()} ${federationBody.error?.code ?? "sin código"}: ${federationBody.error?.message ?? "sin detalle"}`,
    ).toBeTruthy();
    for (const code of ["DECISION_ENGINE", "ERP_BACKEND"]) {
      expect(
        federationBody.data?.find((item) => item.systemCode === code)?.status,
        `federación de ${code}`,
      ).toBe("OK");
    }
  }
  await page.context().storageState({ path: INTERNAL_STORAGE_STATE });
});
