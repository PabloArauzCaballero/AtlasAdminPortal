import { describe, expect, it } from "vitest";
import {
  broadcastDefaults,
  broadcastFormToInput,
  broadcastSchema,
  isBroadcastComplete,
  resolveBroadcastRecipients,
  splitIds,
  toBroadcastInput,
} from "@/features/notifications/broadcast-helpers";
import type { CreateBroadcastNotificationInput } from "@/features/notifications/types";

describe("splitIds", () => {
  it("parsea una lista separada por coma", () => {
    expect(splitIds("12, 45, 90")).toEqual(["12", "45", "90"]);
  });

  it("descarta espacios y entradas vacías", () => {
    expect(splitIds(" 1 , , 2 ,")).toEqual(["1", "2"]);
  });

  it("una cadena vacía es undefined (= todos), no []", () => {
    expect(splitIds("")).toBeUndefined();
    expect(splitIds("   ")).toBeUndefined();
  });
});

describe("resolveBroadcastRecipients · a quién se envía", () => {
  it("audiencia customers: ignora los IDs de usuarios internos", () => {
    const r = resolveBroadcastRecipients("customers", "1,2", "9,9");
    expect(r.customerIds).toEqual(["1", "2"]);
    expect(r.internalUserIds).toBeUndefined();
  });

  it("audiencia internal_users: ignora los IDs de customers", () => {
    const r = resolveBroadcastRecipients("internal_users", "1,2", "9");
    expect(r.customerIds).toBeUndefined();
    expect(r.internalUserIds).toEqual(["9"]);
  });

  it("audiencia both: respeta ambas listas", () => {
    const r = resolveBroadcastRecipients("both", "1", "9");
    expect(r.customerIds).toEqual(["1"]);
    expect(r.internalUserIds).toEqual(["9"]);
  });

  it("listas vacías quedan undefined (= todos los activos de la audiencia)", () => {
    const r = resolveBroadcastRecipients("both", "", "");
    expect(r.customerIds).toBeUndefined();
    expect(r.internalUserIds).toBeUndefined();
  });
});

describe("toBroadcastInput", () => {
  const base: CreateBroadcastNotificationInput = {
    title: "Aviso",
    body: "Cuerpo",
    priority: 5,
    category: "custom_broadcast",
    icon: "  bell  ",
    audience: "internal_users",
  };

  it("recorta el ícono y descarta el ícono vacío", () => {
    expect(toBroadcastInput(base, "", "").icon).toBe("bell");
    expect(
      toBroadcastInput({ ...base, icon: "   " }, "", "").icon,
    ).toBeUndefined();
  });

  it("no filtra IDs de customers a una audiencia internal_users", () => {
    // El punto de riesgo: los IDs de customers escritos no deben viajar.
    const input = toBroadcastInput(base, "1,2,3", "");
    expect(input.customerIds).toBeUndefined();
  });
});

describe("broadcastSchema", () => {
  it("exige título y mensaje", () => {
    expect(broadcastSchema.safeParse(broadcastDefaults).success).toBe(false);
    expect(
      broadcastSchema.safeParse({
        ...broadcastDefaults,
        title: "Aviso",
        body: "Cuerpo",
      }).success,
    ).toBe(true);
  });

  it("rechaza prioridad fuera de 0-100", () => {
    const base = { ...broadcastDefaults, title: "a", body: "b" };
    expect(broadcastSchema.safeParse({ ...base, priority: 200 }).success).toBe(
      false,
    );
  });
});

describe("broadcastFormToInput", () => {
  it("traduce el formulario al payload y respeta la audiencia", () => {
    const input = broadcastFormToInput({
      ...broadcastDefaults,
      title: "Aviso",
      body: "Cuerpo",
      audience: "internal_users",
      customerIdsText: "1,2,3",
      internalUserIdsText: "9",
    });
    // Los IDs de customers NO viajan a una audiencia internal_users.
    expect(input.customerIds).toBeUndefined();
    expect(input.internalUserIds).toEqual(["9"]);
    expect(input.title).toBe("Aviso");
  });
});

describe("isBroadcastComplete", () => {
  it("exige título y cuerpo con contenido", () => {
    const base: CreateBroadcastNotificationInput = {
      title: "",
      body: "",
      audience: "customers",
    };
    expect(isBroadcastComplete(base)).toBe(false);
    expect(isBroadcastComplete({ ...base, title: "x" })).toBe(false);
    expect(isBroadcastComplete({ ...base, title: "x", body: "y" })).toBe(true);
    expect(isBroadcastComplete({ ...base, title: "  ", body: "  " })).toBe(
      false,
    );
  });
});
