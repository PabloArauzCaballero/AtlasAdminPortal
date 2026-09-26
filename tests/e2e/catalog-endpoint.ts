import { expect, type Page } from "@playwright/test";

type CatalogEndpoint = {
  endpointId: string;
  method: string;
  fullPath: string;
};

/** Resuelve el ID de la base QA actual, sin depender de secuencias de otra instalación. */
export async function findCatalogEndpointId(
  page: Page,
  method: string,
  search: string,
  pathMatches: (path: string) => boolean,
): Promise<string> {
  const response = await page.request.get(
    "http://localhost:3005/api/v1/systems/endpoints",
    {
      params: { q: search, limit: 100 },
      headers: { "x-tenant-id": process.env.TEST_TENANT_ID ?? "1" },
    },
  );
  expect(
    response.ok(),
    `catálogo de endpoints: HTTP ${response.status()}`,
  ).toBeTruthy();
  const payload = (await response.json()) as {
    data?: { items?: CatalogEndpoint[] };
  };
  const endpoint = payload.data?.items?.find(
    (item) => item.method === method && pathMatches(item.fullPath),
  );
  expect(endpoint, `${method} ${search} debe estar catalogado`).toBeDefined();
  return endpoint!.endpointId;
}
