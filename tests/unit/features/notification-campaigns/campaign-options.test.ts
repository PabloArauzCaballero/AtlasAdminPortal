import { describe, expect, it } from "vitest";
import {
  allowedActions,
  describeRule,
} from "@/features/notification-campaigns/campaign-options";

describe("campaign-options", () => {
  it("cada estado ofrece sólo las palancas que el servidor acepta", () => {
    expect(allowedActions("running")).toEqual(["pause", "cancel"]);
    expect(allowedActions("paused")).toEqual(["resume", "cancel"]);
    expect(allowedActions("scheduled")).toEqual(["cancel"]);
    expect(allowedActions("draft")).toEqual(["cancel"]);
    expect(allowedActions("completed")).toEqual([]);
    expect(allowedActions("cancelled")).toEqual([]);
    expect(allowedActions("failed")).toEqual([]);
  });

  it("lee una regla de audiencia en palabras", () => {
    expect(
      describeRule({
        attribute: "city",
        operator: "in",
        value: ["La Paz", "El Alto"],
      }),
    ).toBe("Ciudad es uno de La Paz, El Alto");
    expect(
      describeRule({ attribute: "hasActiveLoan", operator: "is_false" }),
    ).toBe("No: tiene un crédito activo");
    expect(
      describeRule({
        attribute: "daysSinceSignup",
        operator: "gte",
        value: 30,
      }),
    ).toBe("Días desde el alta al menos 30");
  });
});
