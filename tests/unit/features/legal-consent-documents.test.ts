import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rawFetch = vi.hoisted(() => vi.fn());
vi.mock("@/shared/api/transport", () => ({ rawFetch }));

import {
  fetchActiveDocuments,
  fetchDocument,
} from "@/features/legal/consent-documents";

/**
 * La lectura pública de documentos legales.
 *
 * Lo que se prueba aquí no es "que traiga una lista": es que la página que un revisor de Apple o de
 * Google abre NUNCA reviente. Un 500 en la política de privacidad se lee como que la política no
 * existe, y eso es un rechazo de la tienda — un fallo caro y difícil de atribuir después.
 */

const ORIGEN = "http://atlas-backend:3005";

function respuesta(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as unknown as Response;
}

const DOCUMENTO = {
  documentCode: "privacy_policy",
  versionCode: "v1",
  language: "es",
  title: "Política de privacidad",
  summary: "Qué guardamos y para qué.",
  bodyMarkdown: "## Qué guardamos\n\nTus datos.",
  contentUrl: null,
};

beforeEach(() => {
  rawFetch.mockReset();
  process.env.INTERNAL_API_ORIGIN = ORIGEN;
  delete process.env.ATLAS_PUBLIC_LEGAL_TENANT_ID;
});

afterEach(() => {
  delete process.env.INTERNAL_API_ORIGIN;
});

describe("lectura de documentos legales vigentes", () => {
  it("pide el origen INTERNO, no la base pública del navegador", async () => {
    rawFetch.mockResolvedValue(respuesta({ data: [DOCUMENTO] }));

    await fetchActiveDocuments("es");

    /*
      `NEXT_PUBLIC_API_BASE_URL` vale "/api/v1" en producción. Si esta llamada lo usara, el fetch de
      servidor no tendría contra qué resolver la ruta relativa y la página caería siempre.
    */
    const [url] = rawFetch.mock.calls[0] as [string];
    expect(url).toBe(`${ORIGEN}/api/v1/consent-documents/active?language=es`);
  });

  it("manda el tenant, sin el cual el backend responde 400", async () => {
    rawFetch.mockResolvedValue(respuesta({ data: [DOCUMENTO] }));

    await fetchActiveDocuments();

    const [, init] = rawFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["x-tenant-id"]).toBe("1");
  });

  it("devuelve lista vacía —no lanza— cuando el backend está caído", async () => {
    rawFetch.mockRejectedValue(new Error("ENOTFOUND atlas-backend"));

    await expect(fetchActiveDocuments()).resolves.toEqual([]);
  });

  it("devuelve lista vacía cuando el backend responde con error", async () => {
    rawFetch.mockResolvedValue(respuesta({ message: "boom" }, false));

    await expect(fetchActiveDocuments()).resolves.toEqual([]);
  });

  it("tolera un cuerpo que no trae lista en `data`", async () => {
    rawFetch.mockResolvedValue(respuesta({ data: { nope: true } }));

    await expect(fetchActiveDocuments()).resolves.toEqual([]);
  });

  it("selecciona el documento por código y devuelve null si no está publicado", async () => {
    rawFetch.mockResolvedValue(respuesta({ data: [DOCUMENTO] }));
    await expect(fetchDocument("privacy_policy")).resolves.toMatchObject({
      versionCode: "v1",
    });

    rawFetch.mockResolvedValue(respuesta({ data: [DOCUMENTO] }));
    await expect(fetchDocument("terms_of_service")).resolves.toBeNull();
  });

  it("escapa el idioma en la consulta", async () => {
    rawFetch.mockResolvedValue(respuesta({ data: [] }));

    await fetchActiveDocuments("es BO&x=1");

    const [url] = rawFetch.mock.calls[0] as [string];
    expect(url).toContain("language=es%20BO%26x%3D1");
  });
});
