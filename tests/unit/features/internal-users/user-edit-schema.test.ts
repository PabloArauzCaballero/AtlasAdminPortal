import { describe, expect, it } from "vitest";
import {
  buildUpdatePayload,
  editUserDefaults,
  editUserSchema,
} from "@/features/internal-users/user-edit-schema";
import type { InternalUserListItem } from "@/features/internal-users/types";

function user(
  overrides: Partial<InternalUserListItem> = {},
): InternalUserListItem {
  return {
    id: "u1",
    email: "u@atlas.internal",
    fullName: "Nombre Original",
    status: "active",
    department: "RISK",
    jobTitle: "Analista",
    mustChangePassword: false,
    roles: [],
    permissions: [],
    ...overrides,
  };
}

describe("editUserSchema", () => {
  it("exige un motivo de al menos 8 caracteres", () => {
    const result = editUserSchema.safeParse({
      ...editUserDefaults(user()),
      reason: "corto",
    });
    expect(result.success).toBe(false);
  });

  it("acepta el formulario con un motivo válido", () => {
    const result = editUserSchema.safeParse({
      ...editUserDefaults(user()),
      reason: "Motivo suficientemente largo",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un nombre demasiado corto", () => {
    const result = editUserSchema.safeParse({
      ...editUserDefaults(user()),
      fullName: "ab",
      reason: "Motivo suficientemente largo",
    });
    expect(result.success).toBe(false);
  });
});

describe("editUserDefaults", () => {
  it("cae a OPERATIONS si el departamento del backend no está en la lista", () => {
    expect(editUserDefaults(user({ department: "MARKETING" })).department).toBe(
      "OPERATIONS",
    );
  });

  it("cae a active si el status es desconocido", () => {
    expect(editUserDefaults(user({ status: "zombie" })).status).toBe("active");
  });

  it("convierte jobTitle null en cadena vacía", () => {
    expect(editUserDefaults(user({ jobTitle: null })).jobTitle).toBe("");
  });
});

describe("buildUpdatePayload · diff", () => {
  const base = user();

  it("no manda ningún campo del perfil si nada cambió", () => {
    const payload = buildUpdatePayload(
      { ...editUserDefaults(base), reason: "Sin cambios reales" },
      base,
    );
    expect(payload.fullName).toBeUndefined();
    expect(payload.department).toBeUndefined();
    expect(payload.jobTitle).toBeUndefined();
    expect(payload.status).toBeUndefined();
    expect(payload.mustChangePassword).toBeUndefined();
    // El motivo SIEMPRE va: es el porqué del cambio.
    expect(payload.reason).toBe("Sin cambios reales");
  });

  it("manda solo el campo que cambió", () => {
    const payload = buildUpdatePayload(
      {
        ...editUserDefaults(base),
        fullName: "Nombre Nuevo",
        reason: "Corrección de nombre",
      },
      base,
    );
    expect(payload.fullName).toBe("Nombre Nuevo");
    expect(payload.department).toBeUndefined();
    expect(payload.status).toBeUndefined();
  });

  it("detecta el cambio de estado (desactivación)", () => {
    const payload = buildUpdatePayload(
      {
        ...editUserDefaults(base),
        status: "suspended",
        reason: "Suspensión por incidente",
      },
      base,
    );
    expect(payload.status).toBe("suspended");
  });

  it("detecta el toggle de mustChangePassword", () => {
    const payload = buildUpdatePayload(
      {
        ...editUserDefaults(base),
        mustChangePassword: true,
        reason: "Forzar rotación de credencial",
      },
      base,
    );
    expect(payload.mustChangePassword).toBe(true);
  });

  it("trata jobTitle null del usuario como '' para el diff", () => {
    const payload = buildUpdatePayload(
      {
        ...editUserDefaults(user({ jobTitle: null })),
        reason: "Sin tocar cargo",
      },
      user({ jobTitle: null }),
    );
    expect(payload.jobTitle).toBeUndefined();
  });
});
