import { describe, expect, it } from "vitest";
import { createQaPinoLogger } from "@/features/qa-lab/pino-log";

describe("createQaPinoLogger · gate de nivel", () => {
  it("por defecto acepta debug", () => {
    const logger = createQaPinoLogger("ep");
    logger.child("transport").debug("e", "m");
    expect(logger.entries()).toHaveLength(1);
  });

  it("con minLevel info descarta los debug por muestra", () => {
    const logger = createQaPinoLogger("ep", { minLevel: "info" });
    const transport = logger.child("transport");

    for (let index = 0; index < 5_000; index += 1) {
      transport.debug("stress.sample", "muestra", { index });
    }

    expect(logger.entries()).toHaveLength(0);
  });

  it("con minLevel info conserva warn y error", () => {
    const logger = createQaPinoLogger("ep", { minLevel: "info" });
    const transport = logger.child("transport");

    transport.debug("d", "descartado");
    transport.info("i", "conservado");
    transport.warn("w", "conservado");
    transport.error("e", "conservado");

    expect(logger.entries().map((entry) => entry.event)).toEqual([
      "i",
      "w",
      "e",
    ]);
  });
});

describe("createQaPinoLogger · tope de entradas", () => {
  it("trunca y deja constancia en vez de crecer sin límite", () => {
    const logger = createQaPinoLogger("ep");
    const transport = logger.child("transport");

    for (let index = 0; index < 5_000; index += 1) {
      transport.info("stress.sample", "muestra", { index });
    }

    const entries = logger.entries();
    // 2.000 de tope + 1 aviso de truncado.
    expect(entries).toHaveLength(2_001);
    expect(entries.at(-1)?.event).toBe("log.truncated");
  });

  it("el aviso de truncado se emite una sola vez", () => {
    const logger = createQaPinoLogger("ep");
    const transport = logger.child("transport");

    for (let index = 0; index < 6_000; index += 1) {
      transport.info("e", "m");
    }

    const truncations = logger
      .entries()
      .filter((entry) => entry.event === "log.truncated");
    expect(truncations).toHaveLength(1);
  });
});
