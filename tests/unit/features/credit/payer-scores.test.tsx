import { HttpResponse, http } from "msw";
import { screen } from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { CustomerPayerScores, payerScoresView } =
  await import("@/features/credit/payer-scores");
const { API_BASE, server } = await import("../../../helpers/mock-server");
const { renderWithProviders } =
  await import("../../../helpers/render-with-providers");

/**
 * Puntaje y Calificación en la ficha del cliente, con los nombres de la app (2026-10-06): el Puntaje son puntos
 * ganados pagando; la Calificación va de 1 a 100.
 */
const URL = `${API_BASE}/customers/900/progress`;
const PROGRESO = {
  customerId: "900",
  score: 42,
  tier: { label: "En construcción", index: 2, of: 5 },
  rating: { value: 42, scale: { min: 1, max: 100 } },
  points: { value: 1250, currentStreak: 3, bestStreak: 5 },
  experience: { xp: 1250, currentStreak: 3, bestStreak: 5 },
};

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE));
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

describe("CustomerPayerScores", () => {
  it("enseña el puntaje en puntos y la calificación de 1 a 100, por separado", async () => {
    server.use(http.get(URL, () => HttpResponse.json({ data: PROGRESO })));
    renderWithProviders(<CustomerPayerScores customerId="900" />);
    expect(await screen.findByText("1.250 puntos")).toBeTruthy();
    expect(screen.getByText("42 de 100")).toBeTruthy();
    expect(screen.getByText("3 (mejor: 5)")).toBeTruthy();
    expect(screen.getByText("En construcción · 2 de 5")).toBeTruthy();
  });

  it("si falla, lo dice y deja reintentar", async () => {
    server.use(
      http.get(URL, () =>
        HttpResponse.json(
          { error: { code: "INTERNAL", message: "x" } },
          { status: 500 },
        ),
      ),
    );
    renderWithProviders(<CustomerPayerScores customerId="900" />);
    expect(
      await screen.findByRole("button", { name: /reintentar/i }),
    ).toBeTruthy();
  });
});

describe("payerScoresView con un backend anterior (sin rating ni points)", () => {
  it("deriva la calificación acotada a 1-100 y los puntos de la experiencia", () => {
    const { rating: _r, points: _p, ...viejo } = PROGRESO;
    expect(payerScoresView({ ...viejo, score: 0 }).calificacion).toBe(1);
    expect(payerScoresView({ ...viejo, score: 140 }).calificacion).toBe(100);
    expect(payerScoresView(viejo).puntos.value).toBe(1250);
  });
});
