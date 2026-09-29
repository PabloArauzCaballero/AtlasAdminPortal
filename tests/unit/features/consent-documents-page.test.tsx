import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { ConsentDocumentsPage } from "@/features/consent-documents/consent-documents-page";
import type { ConsentDocument } from "@/features/consent-documents/types";
import { renderWithProviders } from "../../helpers/render-with-providers";
import { elegirOpcion } from "../shared/option-select-helpers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));

let permisos: string[] = ["governance.policies.manage"];
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({
    permissions: permisos,
    hasPermission: (permiso: string) => permisos.includes(permiso),
  }),
}));

const request = vi.mocked(apiRequest);
const document: ConsentDocument = {
  id: "document-1",
  documentCode: "privacy_policy",
  versionCode: "v1",
  language: "es",
  title: "Política de privacidad",
  summary: "Qué guardamos y para qué.",
  bodyMarkdown: "Texto vigente.",
  contentUrl: null,
  requiresExplicitAction: true,
  effectiveFrom: "2026-09-01",
  effectiveUntil: null,
  status: "published",
};

function listado(
  items: ConsentDocument[],
  total = items.length,
  summary = { total, published: total, draft: 0, retired: 0 },
) {
  return {
    items,
    meta: {
      page: 1,
      limit: 20,
      total,
      totalPages: Math.ceil(total / 20) || 1,
    },
    summary,
  };
}

async function openEditor() {
  await screen.findByText("Política de privacidad");
  fireEvent.click(screen.getByTestId("edit-privacy_policy"));
  fireEvent.change(screen.getByTestId("title-privacy_policy"), {
    target: { value: "Política actualizada" },
  });
  fireEvent.click(screen.getByTestId("save-privacy_policy"));
}

describe("ConsentDocumentsPage", () => {
  beforeEach(() => {
    request.mockReset();
    permisos = ["governance.policies.manage"];
  });

  it("si la carga falla ofrece reintentar, y reintentar vuelve a pedir la lista", async () => {
    request
      .mockRejectedValueOnce(new Error("sin red"))
      .mockResolvedValue({ items: [document] });
    renderWithProviders(<ConsentDocumentsPage />);

    fireEvent.click(await screen.findByRole("button", { name: /reintentar/i }));

    expect(
      await screen.findByText("Política de privacidad"),
    ).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("sin documentos lo dice, en vez de dejar la pantalla en blanco", async () => {
    request.mockResolvedValue({ items: [] });
    renderWithProviders(<ConsentDocumentsPage />);

    expect(
      await screen.findByText("Todavía no hay documentos publicados"),
    ).toBeInTheDocument();
  });

  it("muestra el estado en palabras, no el código de la base", async () => {
    request.mockResolvedValue({ items: [document] });
    renderWithProviders(<ConsentDocumentsPage />);

    expect(await screen.findByText("Vigente")).toBeInTheDocument();
    expect(screen.queryByText("published")).not.toBeInTheDocument();
  });

  it("sin governance.policies.manage no ofrece corregir un texto que el servidor rechazaría", async () => {
    permisos = ["governance.policies.read"];
    request.mockResolvedValue({ items: [document] });
    renderWithProviders(<ConsentDocumentsPage />);

    await screen.findByText("Política de privacidad");
    expect(screen.queryByTestId("edit-privacy_policy")).not.toBeInTheDocument();
  });

  it("conserva el borrador y el texto vigente si el servidor rechaza la edición", async () => {
    request.mockImplementation((path, options) =>
      options?.method === "PATCH"
        ? Promise.reject(new Error("Conflicto de versión"))
        : Promise.resolve({ items: [document] }),
    );
    renderWithProviders(<ConsentDocumentsPage />);

    await openEditor();

    expect(await screen.findByText(/No pudimos guardar/)).toBeInTheDocument();
    expect(screen.getByText("Política de privacidad")).toBeInTheDocument();
    expect(screen.getByTestId("title-privacy_policy")).toHaveValue(
      "Política actualizada",
    );
  });

  it("refresca el texto visible solo después de que el servidor confirma la edición", async () => {
    let vigente = document;
    request.mockImplementation((path, options) => {
      if (options?.method === "PATCH") {
        vigente = { ...vigente, title: "Política actualizada" };
        return Promise.resolve({});
      }
      return Promise.resolve({ items: [vigente] });
    });
    renderWithProviders(<ConsentDocumentsPage />);

    await openEditor();

    await waitFor(() =>
      expect(screen.getByText("Política actualizada")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("edit-privacy_policy")).toBeInTheDocument();
  });

  it("los documentos son una tabla con cabeceras y Editar texto en la columna de acciones", async () => {
    request.mockResolvedValue(listado([document]));
    renderWithProviders(<ConsentDocumentsPage />);

    const tabla = await screen.findByRole("table");
    for (const cabecera of [
      "Documento",
      "Versión",
      "Idioma",
      "Estado",
      "Vigencia",
      "Resumen",
      "Texto",
      "Acciones",
    ]) {
      expect(
        within(tabla).getByRole("columnheader", { name: cabecera }),
      ).toBeInTheDocument();
    }
    const fila = within(tabla)
      .getByText("Política de privacidad")
      .closest("tr");
    expect(
      within(fila as HTMLElement).getByTestId("edit-privacy_policy"),
    ).toBeInTheDocument();
    expect(within(fila as HTMLElement).getByText("v1")).toBeInTheDocument();
  });

  it("el buscador, el estado y la página viajan al servidor y las cifras salen del resumen", async () => {
    const consultas: Array<Record<string, unknown>> = [];
    request.mockImplementation((_path, options) => {
      consultas.push((options?.query ?? {}) as Record<string, unknown>);
      return Promise.resolve(
        listado([document], 45, {
          total: 45,
          published: 30,
          draft: 5,
          retired: 10,
        }),
      );
    });
    renderWithProviders(<ConsentDocumentsPage />);
    await screen.findByRole("table");
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("Retirados")).toBeInTheDocument();

    fireEvent.change(
      screen.getByRole("textbox", { name: /código, título o resumen/i }),
      { target: { value: "priva" } },
    );
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ q: "priva", page: 1 }),
    );
    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Estado/ }),
      "retired",
    );
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ status: "retired", q: "priva" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ page: 2, status: "retired" }),
    );
  });

  it("sin coincidencias dice que nada coincide, distinto de «no hay documentos»", async () => {
    request.mockResolvedValue(listado([]));
    renderWithProviders(<ConsentDocumentsPage />);
    await screen.findByText("Todavía no hay documentos publicados");
    fireEvent.change(
      screen.getByRole("textbox", { name: /código, título o resumen/i }),
      { target: { value: "zzz" } },
    );
    expect(
      await screen.findByText("Ningún documento coincide con la búsqueda."),
    ).toBeInTheDocument();
  });
});
