import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { KnowledgeArticlesSection } from "@/features/support/knowledge-articles-section";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import { elegirOpcion } from "../../shared/option-select-helpers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));

const request = vi.mocked(apiRequest);
const consultas: Array<Record<string, unknown>> = [];

const articulo = (pagina: number) => ({
  articleId: String(pagina),
  articleKey: `articulo-${pagina}`,
  audience: "CUSTOMER",
  status: "PUBLISHED",
  ownerTeam: "SUPPORT",
  currentVersionId: "10",
  isFaq: false,
  isFeatured: false,
  nextReviewAt: null,
  helpfulCount: 3,
  notHelpfulCount: 1,
  updatedAt: null,
  currentTitle: `Cómo recuperar el acceso ${pagina}`,
});

beforeEach(() => {
  consultas.length = 0;
  request.mockReset();
  request.mockImplementation(async (_path, options) => {
    const query = (options?.query ?? {}) as Record<string, unknown>;
    consultas.push(query);
    const pagina = Number(query.page ?? 1);
    return { items: [articulo(pagina)], page: pagina, pageSize: 20, total: 45 };
  });
});

describe("Base de conocimiento: artículos (#23)", () => {
  it("muestra el título de la versión vigente junto a la clave", async () => {
    renderWithProviders(<KnowledgeArticlesSection onNuevaVersion={vi.fn()} />);
    expect(
      await screen.findByText("Cómo recuperar el acceso 1"),
    ).toBeInTheDocument();
    expect(screen.getByText("articulo-1")).toBeInTheDocument();
  });

  it("el buscador viaja como search y promete clave o título, no otra cosa", async () => {
    renderWithProviders(<KnowledgeArticlesSection onNuevaVersion={vi.fn()} />);
    await screen.findByText("articulo-1");
    fireEvent.change(screen.getByRole("textbox", { name: /clave o título/i }), {
      target: { value: "recuperar" },
    });
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ search: "recuperar", page: 1 }),
    );
  });

  it("estado y audiencia viajan al servidor y pagina con el total real", async () => {
    renderWithProviders(<KnowledgeArticlesSection onNuevaVersion={vi.fn()} />);
    await screen.findByText("articulo-1");
    await elegirOpcion(
      screen.getByRole("combobox", { name: /^Estado/ }),
      "PUBLISHED",
    );
    await waitFor(() =>
      expect(consultas.at(-1)).toMatchObject({ status: "PUBLISHED" }),
    );
    await userEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(await screen.findByText("articulo-2")).toBeInTheDocument();
    expect(consultas.at(-1)).toMatchObject({ page: 2, status: "PUBLISHED" });
  });

  it("si falla se ve el error con reintentar", async () => {
    request.mockRejectedValueOnce(new Error("sin red"));
    renderWithProviders(<KnowledgeArticlesSection onNuevaVersion={vi.fn()} />);
    await userEvent.click(
      await screen.findByRole("button", { name: /reintentar/i }),
    );
    expect(await screen.findByText("articulo-1")).toBeInTheDocument();
  });
});
