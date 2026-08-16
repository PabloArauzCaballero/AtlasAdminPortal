import { describe, expect, it } from "vitest";
import {
  ESTADOS_DE_EXPORTACION,
  estadoDeExportacion,
  intervaloDeSondeo,
  sigueEnCurso,
} from "@/features/data-exports/export-lifecycle";

/**
 * El ciclo de vida de un reporte o exportación.
 *
 * La acción de descarga se ofrecía en cuanto el registro traía una downloadUrl,
 * sin mirar estado ni caducidad. Eso da dos pantallas que mienten: una
 * exportación fallida que alcanzó a escribir su ruta enseña «Abrir archivo» y
 * devuelve un error del servidor; y una caducada enseña el mismo botón, que hoy
 * funciona y mañana da un 403.
 *
 * Lo que se fija aquí es qué PERMITE cada estado, que es lo que la pantalla
 * necesita para no ofrecer un botón que no lleva a ninguna parte.
 */

const HOY = new Date("2026-08-16T12:00:00.000Z");
const URL_OK = "/api/v1/exports/abc.csv";

describe("una exportación en curso invita a esperar, no a descargar", () => {
  it.each(["PENDING", "QUEUED", "RUNNING", "PROCESSING"])(
    "«%s» sigue en curso",
    (status) => {
      const estado = estadoDeExportacion({ status }, HOY);
      expect(estado.enCurso).toBe(true);
      expect(estado.accion).toBe("esperar");
    },
  );

  it("una grafía desconocida se trata como en curso, que es lo conservador", () => {
    // Invita a esperar en vez de a pulsar un botón que puede fallar.
    const estado = estadoDeExportacion({ status: "LO_QUE_SEA" }, HOY);
    expect(estado.accion).toBe("esperar");
  });

  it("sin estado tampoco se da por completada", () => {
    expect(estadoDeExportacion({}, HOY).accion).toBe("esperar");
  });
});

describe("sólo se ofrece descargar lo que de verdad se puede descargar", () => {
  it("completada, con archivo y dentro de plazo", () => {
    const estado = estadoDeExportacion(
      {
        status: "COMPLETED",
        downloadUrl: URL_OK,
        expiresAt: "2026-08-20T00:00:00.000Z",
      },
      HOY,
    );
    expect(estado.code).toBe("COMPLETADA");
    expect(estado.accion).toBe("descargar");
  });

  it("completada pero CADUCADA se ofrece regenerar, no abrir", () => {
    // El archivo no está roto: su ventana pasó. Y eso hay que decirlo antes del
    // clic, no después de un 403.
    const estado = estadoDeExportacion(
      {
        status: "COMPLETED",
        downloadUrl: URL_OK,
        expiresAt: "2026-08-01T00:00:00.000Z",
      },
      HOY,
    );
    expect(estado.code).toBe("CADUCADA");
    expect(estado.accion).toBe("regenerar");
  });

  it("completada SIN archivo se trata como fallida", () => {
    // Es la combinación que produce el botón que no lleva a ninguna parte: el
    // trabajo se dio por bueno pero no dejó archivo.
    const estado = estadoDeExportacion({ status: "COMPLETED", downloadUrl: "  " }, HOY);
    expect(estado.code).toBe("FALLIDA");
    expect(estado.accion).toBe("regenerar");
  });

  it("completada sin fecha de caducidad no caduca sola", () => {
    expect(
      estadoDeExportacion({ status: "READY", downloadUrl: URL_OK }, HOY).accion,
    ).toBe("descargar");
  });
});

describe("lo que no se puede descargar se puede volver a pedir", () => {
  it.each(["FAILED", "ERROR", "CANCELLED"])("«%s» ofrece regenerar", (status) => {
    expect(estadoDeExportacion({ status }, HOY).accion).toBe("regenerar");
  });

  it("una fallida NO se presenta como caducada aunque su fecha pasara", () => {
    /*
     * Una exportación fallida no «caduca», falló. Presentarla como caducada
     * sugeriría que hubo un archivo que ya no está, cuando nunca lo hubo — y
     * manda a buscar una copia que no existe.
     */
    const estado = estadoDeExportacion(
      { status: "FAILED", expiresAt: "2026-01-01T00:00:00.000Z", downloadUrl: URL_OK },
      HOY,
    );
    expect(estado.code).toBe("FALLIDA");
  });

  it("una fallida conserva su explicación accionable", () => {
    expect(ESTADOS_DE_EXPORTACION.FALLIDA.help).toMatch(/parámetros/i);
  });
});

describe("el sondeo se apaga cuando no hay nada vivo", () => {
  it("con algo en curso, consulta", () => {
    expect(
      intervaloDeSondeo([{ status: "COMPLETED", downloadUrl: URL_OK }, { status: "RUNNING" }], HOY),
    ).toBe(5_000);
  });

  it("con todo terminado, se calla", () => {
    /*
     * Sin esto, una pantalla abierta toda la tarde hace una petición cada cinco
     * segundos sobre datos que ya no cambian.
     */
    expect(
      intervaloDeSondeo(
        [
          { status: "COMPLETED", downloadUrl: URL_OK },
          { status: "FAILED" },
        ],
        HOY,
      ),
    ).toBe(false);
  });

  it("una lista vacía tampoco sondea", () => {
    expect(intervaloDeSondeo([], HOY)).toBe(false);
  });

  it("sigueEnCurso responde la pregunta directamente", () => {
    expect(sigueEnCurso({ status: "PENDING" }, HOY)).toBe(true);
    expect(sigueEnCurso({ status: "COMPLETED", downloadUrl: URL_OK }, HOY)).toBe(false);
  });
});

describe("cada estado se puede pintar y explicar", () => {
  it("todos llevan etiqueta, tono y ayuda", () => {
    for (const estado of Object.values(ESTADOS_DE_EXPORTACION)) {
      expect(estado.label).toBeTruthy();
      expect(estado.tone).toBeTruthy();
      // Sin la ayuda, «Caducada» no dice qué hacer al respecto.
      expect(estado.help.length).toBeGreaterThan(20);
    }
  });
});
