import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let permissions: string[] = [];
let searchParams = new URLSearchParams();
const replace = vi.fn();

vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({ permissions, roles: [] }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  usePathname: () => "/internal/qa/aprender",
  useRouter: () => ({ replace, push: vi.fn() }),
  redirect: vi.fn(),
}));
vi.mock("@/features/qa-lab/guide/qa-lab-guide-page", () => ({
  QaLabGuide: () => <p>contenido de la guía</p>,
}));
vi.mock("@/features/qa-tutorials/tutorial-provider", () => ({
  useTutorial: () => ({ startPath: vi.fn(), start: vi.fn() }),
}));
vi.mock("@/features/qa-tutorials/tutorial-objective-launcher", () => ({
  TutorialObjectiveLauncher: () => null,
}));
vi.mock("@/features/qa-tutorials/tutorial-list-card", () => ({
  TutorialListCard: () => null,
}));

const { LearningCenterPage } =
  await import("@/features/qa-tutorials/learning-center-page");

beforeEach(() => {
  replace.mockReset();
  searchParams = new URLSearchParams();
});

describe("Aprender QA Lab: Recorridos y Guía de referencia", () => {
  it("?tab=guia abre la guía y conserva «Abrir el lab»", () => {
    permissions = ["systems.endpoints.read"];
    searchParams = new URLSearchParams("tab=guia");
    render(<LearningCenterPage />);
    expect(screen.getByText("contenido de la guía")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir el lab" })).toHaveAttribute(
      "href",
      "/internal/qa/lab",
    );
    fireEvent.click(screen.getByRole("button", { name: "Recorridos" }));
    expect(replace).toHaveBeenCalledWith("/internal/qa/aprender", {
      scroll: false,
    });
  });

  it("sin systems.endpoints.read (sólo systems.qa.read) no hay pestaña de guía, ni por URL", () => {
    permissions = ["systems.qa.read"];
    searchParams = new URLSearchParams("tab=guia");
    render(<LearningCenterPage />);
    expect(
      screen.queryByRole("button", { name: "Guía de referencia" }),
    ).toBeNull();
    expect(screen.queryByText("contenido de la guía")).toBeNull();
    expect(screen.getByText("Recorridos sugeridos")).toBeInTheDocument();
  });

  it("/internal/qa/guia redirige a la pestaña de la guía", async () => {
    const navigation = await import("next/navigation");
    const { default: GuideRoute } = await import("@/app/internal/qa/guia/page");
    GuideRoute();
    expect(navigation.redirect).toHaveBeenCalledWith(
      "/internal/qa/aprender?tab=guia",
    );
  });
});
