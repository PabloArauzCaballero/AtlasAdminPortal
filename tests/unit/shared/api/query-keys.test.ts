import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";
import { queryKeys } from "@/shared/api/query-keys";

/**
 * Materializa TODAS las entradas de `queryKeys` pasando el MISMO valor a cada
 * argumento. Es deliberadamente estricto: así dos factorías cuyos segmentos
 * estáticos coinciden quedan expuestas aunque en producción se las llame con
 * tipos distintos (objeto de params vs id string).
 */
function materializeAll(): Array<[string, readonly unknown[]]> {
  const entries: Array<[string, readonly unknown[]]> = [];

  for (const [name, value] of Object.entries(queryKeys)) {
    if (Array.isArray(value)) {
      entries.push([name, value]);
      continue;
    }
    if (typeof value !== "function") continue;

    const factory = value as (...args: unknown[]) => readonly unknown[];
    const args = Array.from({ length: factory.length }, () => "X");
    entries.push([name, factory(...args)]);
  }

  return entries;
}

function findCollisions(): string[] {
  const seen = new Map<string, string>();
  const collisions: string[] = [];

  for (const [name, key] of materializeAll()) {
    const serialized = JSON.stringify(key);
    const previous = seen.get(serialized);
    if (previous) collisions.push(`${previous} <-> ${name}`);
    seen.set(serialized, name);
  }

  return collisions.sort();
}

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

function seed(queryKey: readonly unknown[]) {
  queryClient.setQueryData(queryKey, { seeded: true });
}

function isStale(queryKey: readonly unknown[]) {
  return queryClient.getQueryState(queryKey)?.isInvalidated === true;
}

describe("queryKeys · determinismo", () => {
  it("la misma entrada produce siempre la misma clave", () => {
    // Si alguien colara un Date.now()/uuid en una clave, cada render abriría
    // una entrada de caché nueva y la vista refetchearía en bucle.
    expect(queryKeys.endpoint("ep_1")).toEqual(queryKeys.endpoint("ep_1"));
    expect(queryKeys.endpoints({ page: 2 })).toEqual(
      queryKeys.endpoints({ page: 2 }),
    );
    expect(queryKeys.tableImpact("public", "customers")).toEqual(
      queryKeys.tableImpact("public", "customers"),
    );
  });

  it("params distintos producen claves distintas", () => {
    // Sin esto, cambiar de página reutilizaría la caché de la página anterior.
    expect(queryKeys.endpoints({ page: 1 })).not.toEqual(
      queryKeys.endpoints({ page: 2 }),
    );
    expect(queryKeys.endpoint("ep_1")).not.toEqual(queryKeys.endpoint("ep_2"));
  });

  it("los dos argumentos de una clave compuesta no se confunden entre sí", () => {
    // `tableImpact(schema, table)` debe distinguir ("a","b") de ("b","a"):
    // si no, el impacto de `ventas.clientes` se serviría para `clientes.ventas`.
    expect(queryKeys.tableImpact("a", "b")).not.toEqual(
      queryKeys.tableImpact("b", "a"),
    );
    expect(queryKeys.catalogVersion("a", "b")).not.toEqual(
      queryKeys.catalogVersion("b", "a"),
    );
  });

  it("la explicación de un risk assessment no colisiona con el assessment", () => {
    // Comparten prefijo a propósito (invalidación), pero son recursos distintos.
    expect(queryKeys.riskAssessment("run_1")).not.toEqual(
      queryKeys.riskAssessmentExplanation("run_1"),
    );
  });
});

describe("queryKeys · colisiones entre recursos", () => {
  /**
   * Colisiones latentes conocidas, NO corregidas a propósito.
   *
   * En los cuatro casos el listado y el detalle comparten segmentos estáticos
   * (`["internal-users", x]` para ambos), así que solo se distinguen por el
   * TIPO del argumento en runtime: los hooks pasan un objeto de params al
   * listado y un id string al detalle, y por eso hoy no colisionan de verdad
   * (ver `useInternalUsers`, `useJobRuns`, `useDataExports`).
   *
   * Es una invariante frágil sostenida por convención, no por el diseño de la
   * clave: el día que alguien llame `internalUsers("acme")` el listado pisará
   * el detalle del usuario "acme" sin ningún error visible. Añadir un
   * discriminador (`"list"`/`"detail"`) es una decisión de arquitectura que
   * cambia la semántica de invalidación de todos los hooks implicados, así que
   * se documenta aquí y se deja para una fase posterior.
   */
  const KNOWN_LATENT_COLLISIONS = [
    "dataExports <-> dataExport",
    "internalRoles <-> internalRole",
    "internalUsers <-> internalUser",
    "jobRuns <-> jobRun",
  ].sort();

  it("no aparecen colisiones nuevas más allá de las cuatro conocidas", () => {
    // Dos recursos con la misma clave comparten entrada de caché: el detalle de
    // uno pisaría los datos del otro y la UI mostraría el payload equivocado.
    expect(findCollisions()).toEqual(KNOWN_LATENT_COLLISIONS);
  });

  it("el barrido de colisiones recorre el catálogo entero", () => {
    // Guardarraíl: si `materializeAll` dejara de materializar entradas, el test
    // de arriba pasaría en vacío sin comprobar nada.
    expect(materializeAll().length).toBeGreaterThan(70);
  });

  it("listado y detalle de internal-users no colisionan con el uso real", () => {
    // La convención que hoy sostiene la invariante frágil descrita arriba.
    expect(queryKeys.internalUsers({ page: 1 })).not.toEqual(
      queryKeys.internalUser("usr_1"),
    );
  });

  it("toda clave empieza por un string identificando la raíz del dominio", () => {
    // TanStack invalida por prefijo: una clave cuyo primer elemento fuese un
    // objeto (p.ej. params) no se podría invalidar por dominio.
    for (const [name, key] of materializeAll()) {
      expect(typeof key[0], `"${name}" no tiene raíz string`).toBe("string");
    }
  });
});

/**
 * Contratos de invalidación por prefijo. Cada fila es "raíz -> claves que deben
 * colgar de ella". Una clave con la raíz equivocada NO rompe ningún tipo ni
 * ningún fetch: simplemente deja de invalidarse cuando la mutación de su
 * dominio invalida la raíz, y el operador ve datos viejos sin ningún error.
 */
const invalidationContracts: Array<[string, Array<readonly unknown[]>]> = [
  [
    "systems",
    [
      queryKeys.dashboard,
      queryKeys.toolsHealth,
      queryKeys.endpoints({ page: 1 }),
      queryKeys.endpoint("ep_1"),
      queryKeys.endpointImpact("ep_1"),
      queryKeys.dataEntities({ page: 1 }),
      queryKeys.dataEntity("de_1"),
      queryKeys.tableImpact("public", "customers"),
      queryKeys.testSuites({ page: 1 }),
      queryKeys.testSuite("ts_1"),
      queryKeys.testRuns({ page: 1 }),
      queryKeys.testRun("tr_1"),
      queryKeys.actionLogs({ page: 1 }),
      queryKeys.actionLogsByRequest("req_1"),
      queryKeys.mongoLogs({ page: 1 }),
      queryKeys.tools({ page: 1 }),
      queryKeys.tool("tool_1"),
      queryKeys.domains({ page: 1 }),
      queryKeys.domain("IDENTITY"),
      queryKeys.reviewQueue({ page: 1 }),
      queryKeys.stressProfiles({ page: 1 }),
      queryKeys.stressProfile("sp_1"),
      queryKeys.stressMatrix({ page: 1 }),
      queryKeys.stressRuns({ page: 1 }),
    ],
  ],
  [
    "schema",
    [
      queryKeys.schemaVersions({ page: 1 }),
      queryKeys.schemaVersion("v1"),
      queryKeys.schemaTables({ versionId: "v1" }),
      queryKeys.schemaTable("t1"),
      queryKeys.schemaChangeLog({ page: 1 }),
    ],
  ],
  [
    "operations",
    [
      queryKeys.operationCatalogs({ page: 1 }),
      queryKeys.catalogVersion("MOTIVOS", "v1"),
      queryKeys.definitions({ page: 1 }),
      queryKeys.dataGovernancePolicies,
      queryKeys.currentRiskPolicy,
      queryKeys.riskAssessment("run_1"),
      queryKeys.riskAssessmentExplanation("run_1"),
      queryKeys.dataQualityIssues({ page: 1 }),
      queryKeys.workQueue({ page: 1 }),
      queryKeys.investigationSummary("cus_1"),
      queryKeys.sessionInvestigationSummary("ses_1"),
      queryKeys.customerAuditFeed("cus_1"),
      queryKeys.customerAuditEvents("cus_1", { page: 1 }),
    ],
  ],
  [
    "external-providers",
    [
      queryKeys.externalProviders,
      queryKeys.externalProvidersHealth,
      queryKeys.providerCostPolicies("BURO"),
      queryKeys.externalProvidersReport("usage"),
    ],
  ],
  [
    "notifications",
    [
      queryKeys.notificationMessages({ page: 1 }),
      queryKeys.notificationMessage("msg_1"),
      queryKeys.notificationTemplates({ page: 1 }),
      queryKeys.notificationPreferences("cus_1"),
    ],
  ],
  [
    "my-notifications",
    [
      queryKeys.myNotifications({ page: 1 }),
      queryKeys.myNotificationsUnreadCount,
    ],
  ],
];

describe("queryKeys · invalidación por prefijo", () => {
  it.each(invalidationContracts)(
    "invalidar la raíz `%s` alcanza a todas sus claves",
    async (root, keys) => {
      keys.forEach(seed);

      await queryClient.invalidateQueries({ queryKey: [root] });

      for (const key of keys) {
        expect(isStale(key), `${JSON.stringify(key)} quedó sin invalidar`).toBe(
          true,
        );
      }
    },
  );

  it("invalidar una raíz no toca los dominios vecinos", async () => {
    // El complemento del test anterior: sin esto, meter todo bajo una raíz
    // común lo haría pasar y destruiría la caché entera en cada mutación.
    const foreign = queryKeys.endpoints({ page: 1 });
    seed(foreign);
    seed(queryKeys.schemaVersions({ page: 1 }));

    await queryClient.invalidateQueries({ queryKey: ["schema"] });

    expect(isStale(foreign)).toBe(false);
  });

  it("invalidar `systems` no refetchea el perfil del operador", async () => {
    // `me` cuelga de `internal-auth`: si compartiera raíz con el catálogo,
    // cualquier refresco de systems refetchearía el perfil sin necesidad.
    seed(queryKeys.me);

    await queryClient.invalidateQueries({ queryKey: ["systems"] });

    expect(isStale(queryKeys.me)).toBe(false);
  });

  it("las dos mitades de data-quality cuelgan de raíces distintas", () => {
    // Pinning de una inconsistencia conocida: las reglas viven bajo `internal`
    // y los issues bajo `operations`, así que ejecutar una regla debe invalidar
    // AMBAS raíces (ver `cache-invalidation.test.tsx`). Si alguien unifica las
    // raíces, este test cae y hay que revisar esos hooks.
    expect(queryKeys.dataQualityRules({ page: 1 })[0]).toBe("internal");
    expect(queryKeys.dataQualityIssues({ page: 1 })[0]).toBe("operations");
  });

  it("invalidar el detalle de un reporte alcanza a sus snapshots", async () => {
    // `reportSnapshots` cuelga de la clave del reporte a propósito: tras
    // regenerar un snapshot basta invalidar el reporte.
    const snapshots = queryKeys.reportSnapshots("rep_1", { page: 1 });
    seed(snapshots);

    await queryClient.invalidateQueries({
      queryKey: queryKeys.report("rep_1"),
    });

    expect(isStale(snapshots)).toBe(true);
  });

  it("los snapshots de un reporte no se invalidan al tocar otro reporte", async () => {
    const snapshots = queryKeys.reportSnapshots("rep_1", { page: 1 });
    seed(snapshots);

    await queryClient.invalidateQueries({
      queryKey: queryKeys.report("rep_2"),
    });

    expect(isStale(snapshots)).toBe(false);
  });
});

describe("queryKeys · externalProvidersReport", () => {
  it("dos reportes distintos no comparten caché", () => {
    expect(queryKeys.externalProvidersReport("usage")).not.toEqual(
      queryKeys.externalProvidersReport("cost"),
    );
  });

  it("omitir los params equivale a pasar null, no a acortar la clave", () => {
    // La longitud fija importa: una clave de 3 elementos y otra de 4 se
    // comportan distinto ante `invalidateQueries` con `exact: true`.
    expect(queryKeys.externalProvidersReport("usage")).toEqual(
      queryKeys.externalProvidersReport("usage", null),
    );
    expect(queryKeys.externalProvidersReport("usage")).toHaveLength(4);
  });

  it("los params del reporte forman parte de la clave", () => {
    expect(
      queryKeys.externalProvidersReport("usage", { from: "2026-01" }),
    ).not.toEqual(
      queryKeys.externalProvidersReport("usage", { from: "2026-02" }),
    );
  });
});
