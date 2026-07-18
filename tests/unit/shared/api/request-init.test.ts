import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildRequestInit, buildUrl } from "@/shared/api/request-init";
import type { InternalSession } from "@/shared/auth/types";
import { makeSession, makeUser } from "../../../helpers/session-fixtures";

function headersOf(init: RequestInit): Record<string, string> {
  return init.headers as Record<string, string>;
}

function sessionWithTenant(tenantId: string): InternalSession {
  return makeSession({ user: makeUser({ tenantId }) });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.atlas.internal/api/v1");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildUrl · unión de base y path", () => {
  it("no duplica el prefijo /api/v1 cuando lo traen la base y el path", () => {
    // Es el bug clásico de esta función: `.../api/v1/api/v1/internal/things`
    // devuelve 404 en todas las vistas a la vez.
    expect(buildUrl("/api/v1/internal/things")).toBe(
      "https://api.atlas.internal/api/v1/internal/things",
    );
  });

  it("añade /api/v1 cuando no lo trae ni la base ni el path", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.atlas.internal");

    expect(buildUrl("/internal/things")).toBe(
      "https://api.atlas.internal/api/v1/internal/things",
    );
  });

  it("usa el prefijo del path cuando la base no lo trae", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.atlas.internal");

    expect(buildUrl("/api/v1/internal/things")).toBe(
      "https://api.atlas.internal/api/v1/internal/things",
    );
  });

  it("concatena tal cual cuando solo la base trae el prefijo", () => {
    expect(buildUrl("/internal/things")).toBe(
      "https://api.atlas.internal/api/v1/internal/things",
    );
  });

  it("acepta un path sin barra inicial", () => {
    expect(buildUrl("internal/things")).toBe(
      "https://api.atlas.internal/api/v1/internal/things",
    );
  });

  it("tolera barras de más al final de la base", () => {
    // Un `.env` con `NEXT_PUBLIC_API_BASE_URL=https://host/api/v1/` no debe
    // producir una URL con doble barra.
    vi.stubEnv(
      "NEXT_PUBLIC_API_BASE_URL",
      "https://api.atlas.internal/api/v1//",
    );

    expect(buildUrl("/internal/things")).toBe(
      "https://api.atlas.internal/api/v1/internal/things",
    );
  });

  it("tolera espacios alrededor de la base configurada", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_BASE_URL",
      "  https://api.atlas.internal/api/v1  ",
    );

    expect(buildUrl("/internal/things")).toBe(
      "https://api.atlas.internal/api/v1/internal/things",
    );
  });

  it("reconoce el prefijo /api/v1 sin importar mayúsculas", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.atlas.internal/API/V1");

    expect(buildUrl("/API/V1/internal/things")).toBe(
      "https://api.atlas.internal/API/V1/internal/things",
    );
  });

  it("no confunde un path que solo empieza parecido a /api/v1", () => {
    // `/api/v10/...` NO es el prefijo versionado: recortarlo rompería la ruta.
    expect(buildUrl("/api/v10/things")).toBe(
      "https://api.atlas.internal/api/v1/api/v10/things",
    );
  });

  it("pide la raíz cuando el path es exactamente el prefijo", () => {
    expect(buildUrl("/api/v1")).toBe("https://api.atlas.internal/api/v1/");
  });
});

describe("buildUrl · query string", () => {
  it("añade los params a la URL", () => {
    expect(buildUrl("/internal/things", { page: 2, size: 20 })).toBe(
      "https://api.atlas.internal/api/v1/internal/things?page=2&size=20",
    );
  });

  it("omite null, undefined y cadena vacía", () => {
    // Mandar `?status=` filtraría por cadena vacía en el backend en vez de no
    // filtrar: un select en "Todos" dejaría la tabla vacía.
    expect(
      buildUrl("/internal/things", {
        page: 1,
        status: "",
        owner: null,
        tag: undefined,
      }),
    ).toBe("https://api.atlas.internal/api/v1/internal/things?page=1");
  });

  it("conserva el cero y el false, que son filtros válidos", () => {
    // Ambos son falsy: un guard con `!value` los borraría y cambiaría la query.
    expect(buildUrl("/internal/things", { page: 0, archived: false })).toBe(
      "https://api.atlas.internal/api/v1/internal/things?page=0&archived=false",
    );
  });

  it("no añade `?` cuando no hay query", () => {
    expect(buildUrl("/internal/things")).not.toContain("?");
    expect(buildUrl("/internal/things", {})).not.toContain("?");
  });

  it("escapa los valores en vez de romper la URL", () => {
    const url = buildUrl("/internal/search", { q: "a&b=c d" });

    expect(url).toContain("q=a%26b%3Dc+d");
    expect(new URL(url).searchParams.get("q")).toBe("a&b=c d");
  });

  it("escapa unicode y acentos", () => {
    const url = buildUrl("/internal/search", { q: "ámbito ñandú" });

    expect(new URL(url).searchParams.get("q")).toBe("ámbito ñandú");
  });
});

describe("buildRequestInit · cabeceras", () => {
  it("pide siempre JSON", () => {
    const init = buildRequestInit({}, null);

    expect(headersOf(init).Accept).toBe("application/json");
  });

  it("manda el Authorization cuando hay token de sesión", () => {
    const init = buildRequestInit({}, makeSession({ accessToken: "tok_1" }));

    expect(headersOf(init).Authorization).toBe("Bearer tok_1");
  });

  it("omite el Authorization cuando la petición pide skipAuth", () => {
    // El login manda credenciales: adjuntar un token viejo puede hacer que el
    // backend responda 401 por el token en vez de evaluar el login.
    const init = buildRequestInit({ skipAuth: true }, makeSession());

    expect(headersOf(init).Authorization).toBeUndefined();
  });

  it("omite el Authorization en una sesión de cookie (sin accessToken)", () => {
    const init = buildRequestInit({}, makeSession({ accessToken: undefined }));

    expect(headersOf(init).Authorization).toBeUndefined();
  });

  it("no manda Authorization si no hay sesión", () => {
    const init = buildRequestInit({}, null);

    expect(headersOf(init).Authorization).toBeUndefined();
  });
});

describe("buildRequestInit · tenant", () => {
  it("usa el tenant de la sesión", () => {
    const init = buildRequestInit({}, sessionWithTenant("acme"));

    expect(headersOf(init)["x-tenant-id"]).toBe("acme");
  });

  it("el tenant explícito de la petición gana al de la sesión", () => {
    // El login manda el tenant del formulario, cuando aún no hay sesión válida.
    const init = buildRequestInit(
      { tenantId: "otro" },
      sessionWithTenant("acme"),
    );

    expect(headersOf(init)["x-tenant-id"]).toBe("otro");
  });

  it("cae al tenant por defecto del entorno cuando no hay sesión", () => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_TENANT_ID", "demo");

    const init = buildRequestInit({}, null);

    expect(headersOf(init)["x-tenant-id"]).toBe("demo");
  });

  it("omite la cabecera si no hay tenant por ningún lado", () => {
    // Mandar `x-tenant-id: undefined` como texto sería peor que no mandarla.
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_TENANT_ID", "");

    const init = buildRequestInit({}, null);

    expect("x-tenant-id" in headersOf(init)).toBe(false);
  });
});

describe("buildRequestInit · CSRF", () => {
  const csrfSession = makeSession({ csrfToken: "csrf_1" });

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_INTERNAL_CSRF_HEADER_NAME", "x-csrf-token");
  });

  it("manda el token en los métodos que mutan", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const init = buildRequestInit({ method }, csrfSession);
      expect(headersOf(init)["x-csrf-token"], method).toBe("csrf_1");
    }
  });

  it("no manda el token en los métodos de solo lectura", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      const init = buildRequestInit({ method }, csrfSession);
      expect(headersOf(init)["x-csrf-token"], method).toBeUndefined();
    }
  });

  it("trata la petición sin método como GET", () => {
    const init = buildRequestInit({}, csrfSession);

    expect(headersOf(init)["x-csrf-token"]).toBeUndefined();
  });

  it("reconoce el método en minúsculas", () => {
    // `fetch` acepta "post": si aquí se comparara sin normalizar, la petición
    // saldría sin CSRF y el backend la rechazaría con un 403 desconcertante.
    const init = buildRequestInit({ method: "post" }, csrfSession);

    expect(headersOf(init)["x-csrf-token"]).toBe("csrf_1");
  });

  it("no manda nada si la cabecera CSRF no está configurada", () => {
    vi.stubEnv("NEXT_PUBLIC_INTERNAL_CSRF_HEADER_NAME", "");

    const init = buildRequestInit({ method: "POST" }, csrfSession);

    expect(headersOf(init)["x-csrf-token"]).toBeUndefined();
  });

  it("no manda nada si la sesión no trae csrfToken", () => {
    const init = buildRequestInit({ method: "POST" }, makeSession());

    expect(headersOf(init)["x-csrf-token"]).toBeUndefined();
  });
});

describe("buildRequestInit · cuerpo", () => {
  it("serializa un objeto a JSON y pone el Content-Type", () => {
    const init = buildRequestInit({ method: "POST", body: { a: 1 } }, null);

    expect(init.body).toBe('{"a":1}');
    expect(headersOf(init)["Content-Type"]).toBe("application/json");
  });

  it("manda un cuerpo string tal cual, sin volver a serializarlo", () => {
    // Doble serialización mandaría `"\"{\\\"a\\\":1}\""` al backend.
    const init = buildRequestInit({ method: "POST", body: '{"a":1}' }, null);

    expect(init.body).toBe('{"a":1}');
  });

  it("respeta un Content-Type explícito", () => {
    const init = buildRequestInit(
      {
        method: "POST",
        body: "a=1",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
      null,
    );

    expect(headersOf(init)["Content-Type"]).toBe(
      "application/x-www-form-urlencoded",
    );
  });

  it("no pone cuerpo ni Content-Type si no hay body", () => {
    const init = buildRequestInit({ method: "GET" }, null);

    expect(init.body).toBeUndefined();
    expect(headersOf(init)["Content-Type"]).toBeUndefined();
  });

  it("serializa un body null explícito en vez de ignorarlo", () => {
    // `null` es un JSON válido y distinto de "sin cuerpo": el guard es
    // `!== undefined`, no `!= null`.
    const init = buildRequestInit({ method: "POST", body: null }, null);

    expect(init.body).toBe("null");
  });
});

describe("buildRequestInit · opciones de transporte", () => {
  it("desactiva la caché del navegador", () => {
    // Un catálogo cacheado mostraría estado viejo tras una mutación.
    expect(buildRequestInit({}, null).cache).toBe("no-store");
  });

  it("manda las cookies por defecto (sesión HttpOnly)", () => {
    expect(buildRequestInit({}, null).credentials).toBe("include");
  });

  it("respeta un modo de credenciales explícito", () => {
    expect(buildRequestInit({ credentials: "omit" }, null).credentials).toBe(
      "omit",
    );
  });

  it("propaga la señal de cancelación al init", () => {
    // Sin esto, TanStack Query no podría cancelar la petición al desmontar.
    const controller = new AbortController();

    const init = buildRequestInit({ signal: controller.signal }, null);

    expect(init.signal).toBe(controller.signal);
  });

  it("propaga el método y el resto de opciones estándar", () => {
    const init = buildRequestInit(
      { method: "PATCH", redirect: "manual", keepalive: true },
      null,
    );

    expect(init.method).toBe("PATCH");
    expect(init.redirect).toBe("manual");
    expect(init.keepalive).toBe(true);
  });

  it("no filtra las opciones internas al init del fetch", () => {
    // `skipAuth`/`skipRefresh`/`query`/`tenantId` son del cliente, no de fetch:
    // colarlas en el init es basura que el navegador ignora hoy pero que puede
    // chocar con una opción futura del estándar.
    const init = buildRequestInit(
      { skipAuth: true, skipRefresh: true, tenantId: "acme", query: { a: 1 } },
      null,
    ) as Record<string, unknown>;

    expect(init.skipAuth).toBeUndefined();
    expect(init.skipRefresh).toBeUndefined();
    expect(init.tenantId).toBeUndefined();
    expect(init.query).toBeUndefined();
  });
});
