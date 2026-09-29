import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tutorialCatalog } from "@/features/qa-tutorials/catalog";
import { learningPaths } from "@/features/qa-tutorials/learning-paths";
import { elegirOpcion } from "../../shared/option-select-helpers";

const start = vi.fn();
const startPath = vi.fn();
const done = new Set<string>();
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/features/qa-tutorials/tutorial-provider", () => ({
  useTutorial: () => ({
    start,
    startPath,
    statusFor: (id: string) => (done.has(id) ? "completed" : "not-started"),
    percentFor: () => 0,
  }),
}));
vi.mock("@/features/qa-tutorials/tutorial-objective-launcher", () => ({
  TutorialObjectiveLauncher: () => <p>lanzador por objetivo</p>,
}));

const { LearningPaths } =
  await import("@/features/qa-tutorials/learning-paths-tab");

beforeEach(() => {
  start.mockReset();
  startPath.mockReset();
  done.clear();
});

const tutorialsTable = () =>
  within(
    screen.getByRole("region", { name: "Todos los tutoriales" }),
  ).getByRole("table");

describe("Recorridos de aprendizaje · tablas homogéneas", () => {
  it("los recorridos sugeridos y los tutoriales son dos tablas con cabeceras", () => {
    render(<LearningPaths />);
    const paths = within(
      screen.getByRole("region", { name: "Recorridos sugeridos" }),
    ).getByRole("table");
    expect(
      within(paths)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Recorrido", "Tutoriales", "Orden", "Acciones"]);
    expect(within(paths).getAllByRole("row")).toHaveLength(
      learningPaths.length + 1,
    );
    expect(
      within(tutorialsTable())
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual([
      "Tutorial",
      "Pantalla",
      "Nivel",
      "Duración",
      "Estado",
      "Acciones",
    ]);
    expect(within(tutorialsTable()).getAllByRole("row")).toHaveLength(
      tutorialCatalog.length + 1,
    );
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("«Empezar recorrido» y «Iniciar tutorial» actúan sobre su propia fila", async () => {
    render(<LearningPaths />);
    await userEvent.click(
      screen.getByRole("button", {
        name: `Empezar recorrido ${learningPaths[0].title}`,
      }),
    );
    expect(startPath).toHaveBeenCalledWith(learningPaths[0].id);

    const target = tutorialCatalog[1];
    const row = within(tutorialsTable())
      .getByText(target.title)
      .closest("tr") as HTMLElement;
    await userEvent.click(
      within(row).getByRole("button", { name: "Iniciar tutorial" }),
    );
    expect(start).toHaveBeenCalledWith(target.id);
    expect(
      within(row).getByRole("link", { name: `Ir a ${target.tool}` }),
    ).toHaveAttribute("href", target.route);
  });

  it("el buscador recorta los tutoriales por título, descripción, herramienta u objetivo", async () => {
    render(<LearningPaths />);
    const target = tutorialCatalog[0];
    fireEvent.change(screen.getByLabelText("Buscar tutorial…"), {
      target: { value: target.title },
    });
    await waitFor(() =>
      expect(within(tutorialsTable()).getAllByRole("row").length).toBeLessThan(
        tutorialCatalog.length + 1,
      ),
    );
    expect(
      within(tutorialsTable()).getByText(target.title),
    ).toBeInTheDocument();
  });

  it("el filtro de pantalla deja sólo los tutoriales de ese módulo", async () => {
    render(<LearningPaths />);
    const module = tutorialCatalog[0].module;
    await elegirOpcion(
      screen.getByRole("combobox", { name: "Pantalla" }),
      module,
    );
    const expected = tutorialCatalog.filter((t) => t.module === module).length;
    await waitFor(() =>
      expect(within(tutorialsTable()).getAllByRole("row")).toHaveLength(
        expected + 1,
      ),
    );
  });

  it("el filtro de estado usa tu avance: sólo los completados", async () => {
    done.add(tutorialCatalog[2].id);
    render(<LearningPaths />);
    await elegirOpcion(
      screen.getByRole("combobox", { name: "Estado" }),
      "completed",
    );
    await waitFor(() =>
      expect(within(tutorialsTable()).getAllByRole("row")).toHaveLength(2),
    );
    expect(
      within(tutorialsTable()).getByText(tutorialCatalog[2].title),
    ).toBeInTheDocument();
    expect(
      within(tutorialsTable()).getByRole("button", {
        name: "Repetir tutorial",
      }),
    ).toBeInTheDocument();
  });

  it("sin coincidencias dice que ningún tutorial coincide, y «Limpiar» los devuelve", async () => {
    render(<LearningPaths />);
    fireEvent.change(screen.getByLabelText("Buscar tutorial…"), {
      target: { value: "zzz-nada" },
    });
    expect(
      await screen.findByText("Ningún tutorial coincide con la búsqueda."),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getAllByRole("button", { name: /Limpiar/ })[1],
    );
    await waitFor(() =>
      expect(within(tutorialsTable()).getAllByRole("row")).toHaveLength(
        tutorialCatalog.length + 1,
      ),
    );
  });

  it("el buscador de recorridos encuentra por el título de un tutorial", async () => {
    render(<LearningPaths />);
    fireEvent.change(screen.getByLabelText("Buscar recorrido…"), {
      target: { value: "zzz-nada" },
    });
    expect(
      await screen.findByText("Ningún recorrido coincide con la búsqueda."),
    ).toBeInTheDocument();
  });
});
