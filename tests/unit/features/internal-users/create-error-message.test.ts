import { describe, expect, it, vi } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { createErrorMessage } =
  await import("@/features/internal-users/user-create-form");

describe("createErrorMessage", () => {
  it("traduce el correo repetido en vez de enseñar el código", () => {
    const error = new AtlasApiError({
      status: 409,
      code: "CONFLICT",
      message: "INTERNAL_USER_EMAIL_ALREADY_EXISTS",
    });
    const texto = createErrorMessage(error);
    expect(texto).not.toContain("INTERNAL_USER");
    expect(texto).toMatch(/ya existe una cuenta interna con ese correo/i);
  });

  it("deja pasar los mensajes que ya están en lenguaje de usuario", () => {
    const error = new AtlasApiError({
      status: 403,
      code: "FORBIDDEN",
      message: "Uno o más roles internos no están activos.",
    });
    expect(createErrorMessage(error)).toBe(
      "Uno o más roles internos no están activos.",
    );
  });

  it("un fallo sin respuesta del servidor da un texto genérico", () => {
    expect(createErrorMessage(new Error("red"))).toBe(
      "No se pudo crear el usuario.",
    );
  });
});
