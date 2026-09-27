import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
vi.mock("@/shared/api/client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

import {
  createKnowledgeArticle,
  createKnowledgeVersion,
  knowledgeErrorMessage,
  getKnowledgeArticle,
  getKnowledgeVersion,
  listKnowledgeArticles,
  listKnowledgeVersions,
  transitionKnowledgeVersion,
} from "@/features/support/knowledge-services";
import {
  linkCase,
  sweepSupportSla,
  verifyChannelIntegrity,
} from "@/features/support/services";
import { AtlasApiError } from "@/shared/api/errors";

/**
 * Las ocho rutas de soporte que existían sin llamador. Lo que se fija es el CONTRATO con el
 * servidor: método, ruta, cuerpo y la clave de idempotencia, que es lo que evita que un doble clic
 * cree dos versiones iguales.
 */
beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockResolvedValue({});
});

function llamada() {
  const [path, options] = apiRequest.mock.calls[0] as [
    string,
    { method?: string; body?: unknown; headers?: Record<string, string> },
  ];
  return { path, options };
}

describe("base de conocimiento", () => {
  it("crea el artículo con la clave de idempotencia que le da el formulario", async () => {
    const body = {
      articleKey: "no-me-llega-el-codigo",
      audience: "AUTHENTICATED_CONSUMER" as const,
      ownerTeam: "support",
      isFaq: true,
      isFeatured: false,
      reviewCycleDays: 180,
    };
    await createKnowledgeArticle(body, "knowledge-article-1");
    const { path, options } = llamada();
    expect(path).toBe("/admin/support/knowledge/articles");
    expect(options.method).toBe("POST");
    expect(options.body).toEqual(body);
    expect(options.headers?.["x-idempotency-key"]).toBe("knowledge-article-1");
  });

  it("crea la versión bajo su artículo", async () => {
    await createKnowledgeVersion(
      "7",
      {
        locale: "es-BO",
        title: "No me llega el código",
        bodyMarkdown:
          "Revisa que el número esté bien escrito y espera un minuto.",
        tags: [],
        canonicalQueryTerms: ["sms"],
        escalateWhen: "Si tras tres intentos no llega.",
        changeReason: "Primera versión",
      },
      "knowledge-version-1",
    );
    const { path, options } = llamada();
    expect(path).toBe("/admin/support/knowledge/articles/7/versions");
    expect(options.method).toBe("POST");
    expect(options.headers?.["x-idempotency-key"]).toBe("knowledge-version-1");
  });

  it.each([
    ["submit-review", "/admin/support/knowledge/versions/42/submit-review"],
    ["approve", "/admin/support/knowledge/versions/42/approve"],
    ["publish", "/admin/support/knowledge/versions/42/publish"],
  ] as const)("%s va a su ruta", async (accion, ruta) => {
    await transitionKnowledgeVersion("42", accion, "revisado");
    const { path, options } = llamada();
    expect(path).toBe(ruta);
    expect(options.method).toBe("POST");
    expect((options.body as { note?: string }).note).toBe("revisado");
  });

  it("publicar pide retirar la versión anterior de forma explícita", async () => {
    await transitionKnowledgeVersion("42", "publish");
    expect(llamada().options.body).toEqual({ retirePrevious: true });
  });

  it("aprobar sin nota no manda campos vacíos", async () => {
    await transitionKnowledgeVersion("42", "approve");
    expect(llamada().options.body).toEqual({});
  });

  it("lista artículos por las lecturas del personal, sin mandar filtros vacíos", async () => {
    await listKnowledgeArticles({
      status: "",
      audience: "INTERNAL_SUPPORT",
      search: "",
      page: 2,
      pageSize: 20,
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/admin/support/knowledge/articles",
      { query: { audience: "INTERNAL_SUPPORT", page: 2, pageSize: 20 } },
    );
  });

  it("la cola de versiones filtra por estado en el servidor", async () => {
    await listKnowledgeVersions({ status: "IN_REVIEW", page: 1, pageSize: 20 });
    expect(apiRequest).toHaveBeenCalledWith(
      "/admin/support/knowledge/versions",
      { query: { status: "IN_REVIEW", page: 1, pageSize: 20 } },
    );
  });

  it("lee la ficha del artículo y la de la versión", async () => {
    await getKnowledgeArticle("7");
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/admin/support/knowledge/articles/7",
    );
    await getKnowledgeVersion("42");
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/admin/support/knowledge/versions/42",
    );
  });

  it("ya no usa las rutas de ayuda de la app", async () => {
    await listKnowledgeArticles({ page: 1, pageSize: 20 });
    const rutas = apiRequest.mock.calls.map((call) => String(call[0]));
    expect(rutas.some((ruta) => ruta.startsWith("/mobile/"))).toBe(false);
  });
});

describe("knowledgeErrorMessage", () => {
  const error = (status: number, code: string) =>
    new AtlasApiError({ status, code, message: "texto del servidor" });

  it("explica la segregación de funciones en vez del código", () => {
    expect(
      knowledgeErrorMessage(error(403, "KNOWLEDGE_SELF_APPROVAL_FORBIDDEN")),
    ).toMatch(/no puede aprobarla/);
    expect(
      knowledgeErrorMessage(error(403, "KNOWLEDGE_DOMAIN_APPROVER_REQUIRED")),
    ).toMatch(/riesgo o cumplimiento/);
  });

  it("un 403 sin código conocido habla del rol; otro error deja el texto del servidor", () => {
    expect(knowledgeErrorMessage(error(403, "FORBIDDEN"))).toMatch(/rol/);
    expect(knowledgeErrorMessage(error(500, "INTERNAL"))).toBe(
      "texto del servidor",
    );
    expect(knowledgeErrorMessage(new Error("x"))).toMatch(/Inténtalo/);
  });
});

describe("herramientas de la mesa", () => {
  it("vincula casos con clave de idempotencia", async () => {
    await linkCase("10", { linkedCaseId: "11", linkType: "DUPLICATE_OF" });
    const { path, options } = llamada();
    expect(path).toBe("/internal/support/cases/10/links");
    expect(options.method).toBe("POST");
    expect(options.body).toEqual({
      linkedCaseId: "11",
      linkType: "DUPLICATE_OF",
    });
    expect(options.headers?.["x-idempotency-key"]).toMatch(/^support-link-/);
  });

  it("la integridad es una lectura", async () => {
    await verifyChannelIntegrity("5");
    expect(apiRequest).toHaveBeenCalledWith(
      "/internal/support/desk/channels/5/integrity",
    );
  });

  it("el barrido de plazos es un POST sin cuerpo", async () => {
    await sweepSupportSla();
    const { path, options } = llamada();
    expect(path).toBe("/internal/support/desk/sla/sweep");
    expect(options.method).toBe("POST");
    expect(options.body).toEqual({});
  });
});
