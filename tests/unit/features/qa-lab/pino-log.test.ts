import { describe, expect, it } from "vitest";
import {
  buildPinoLogFileName,
  createQaPinoLogger,
  toSafeLogData,
} from "@/features/qa-lab/pino-log";

const REAL_ACCESS_TOKEN = "real-session-token-do-not-leak";

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

describe("toSafeLogData", () => {
  /**
   * El log se descarga como fichero y se adjunta a tickets: unas cabeceras
   * volcadas en crudo son exactamente la fuga de sesión que persigue el módulo.
   */
  it("redacta la Authorization al volcar unas cabeceras", () => {
    const safe = toSafeLogData(
      new Headers({ Authorization: `Bearer ${REAL_ACCESS_TOKEN}` }),
    );
    expect(JSON.stringify(safe)).not.toContain(REAL_ACCESS_TOKEN);
  });

  it("conserva las cabeceras inocuas del volcado", () => {
    const safe = toSafeLogData(
      new Headers({ "x-trace-id": "trace-1" }),
    ) as Record<string, string>;
    expect(safe["x-trace-id"]).toBe("trace-1");
  });

  /**
   * Un Error serializa a "{}" con JSON.stringify: sin este caso el log diría
   * que hubo un fallo pero no cuál.
   */
  it("un Error conserva nombre y mensaje en vez de serializar a {}", () => {
    expect(toSafeLogData(new TypeError("Failed to fetch"))).toEqual({
      name: "TypeError",
      message: "Failed to fetch",
    });
  });

  it("no arrastra el stack del Error al log", () => {
    expect(JSON.stringify(toSafeLogData(new Error("x")))).not.toContain(
      "stack",
    );
  });

  it("sanea los secretos de un payload cualquiera", () => {
    const safe = toSafeLogData({ password: "hunter2", visible: "ok" });
    expect(safe).toEqual({ password: "[redacted]", visible: "ok" });
  });
});

describe("createQaPinoLogger · formato de salida", () => {
  it("cada línea es un JSON independiente, como espera pino", () => {
    const logger = createQaPinoLogger("ep");
    logger.child("transport").info("stress.sample", "muestra", { index: 1 });

    const lines = logger.lines();
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({
      event: "stress.sample",
      layer: "transport",
      msg: "muestra",
      level: 30,
    });
  });

  it("todas las entradas comparten el runId del logger", () => {
    const logger = createQaPinoLogger("ep");
    logger.child("a").info("e", "m");
    logger.child("b").warn("e", "m");
    expect(logger.entries().map((entry) => entry.runId)).toEqual([
      logger.runId,
      logger.runId,
    ]);
  });

  /**
   * `entries()` devuelve copia: si expusiera el array interno, quien lo lea
   * podría vaciarlo o mutarlo y llevarse el log del run por delante.
   */
  it("entries() devuelve una copia, no el array interno", () => {
    const logger = createQaPinoLogger("ep");
    logger.child("transport").info("e", "m");
    logger.entries().length = 0;
    expect(logger.entries()).toHaveLength(1);
  });

  it("una entrada sin datos no arrastra la clave data", () => {
    const logger = createQaPinoLogger("ep");
    logger.child("transport").info("e", "m");
    expect("data" in logger.entries()[0]).toBe(false);
  });

  it("el runId limpia caracteres que romperían el nombre de fichero", () => {
    const logger = createQaPinoLogger("ep/../../etc/passwd");
    expect(logger.runId).not.toContain("/");
  });

  it("una semilla sin caracteres usables no deja el runId huérfano", () => {
    expect(createQaPinoLogger("///").runId.startsWith("qa-")).toBe(true);
  });
});

describe("buildPinoLogFileName", () => {
  it("compone la ruta del log a partir del runId", () => {
    expect(buildPinoLogFileName("stress", "ep-abc123")).toBe(
      ".logs/stress-ep-abc123.log",
    );
  });
});
