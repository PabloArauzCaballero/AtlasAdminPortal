import { describe, expect, it } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";
import { MOTIVO_DE_RECHAZO, explicarError } from "@/features/files/errores";
import { carpetaDe, explicarRechazo } from "@/features/files/upload-dialog";
import { ErrorDelAlmacen } from "@/features/files/upload";

const error = (code: string, message: string, status = 400) =>
  new AtlasApiError({ status, code, message });

/**
 * Los rechazos del backend, en palabras de quien opera.
 *
 * El motivo real llega en `message` (`BadRequestException('FILE_TOO_LARGE')`) con un `code`
 * genérico por estado. Buscar sólo por `code` enseñaba el código en mayúsculas.
 */
describe("explicarError", () => {
  it("encuentra el motivo cuando viaja en el mensaje y el código es genérico", () => {
    expect(
      explicarError(error("VALIDATION_ERROR", "FILE_TOO_LARGE"), "genérico"),
    ).toBe(MOTIVO_DE_RECHAZO.FILE_TOO_LARGE);
    expect(
      explicarError(
        error("CONFLICT", "EXPEDIENTE_TICKET_VENCIDO", 409),
        "genérico",
      ),
    ).toMatch(/caducó/);
  });

  it("también si algún día llega como código", () => {
    expect(explicarError(error("FILE_EMPTY", "otra cosa"), "genérico")).toBe(
      "El archivo está vacío.",
    );
  });

  it("un código desconocido NO se enseña crudo", () => {
    expect(
      explicarError(error("VALIDATION_ERROR", "ALGO_NUEVO_RARO"), "genérico"),
    ).toBe("genérico");
    expect(
      explicarError(
        error(
          "VALIDATION_ERROR",
          "String must contain at least 8 character(s)",
        ),
        "genérico",
      ),
    ).toBe("genérico");
  });

  it("los errores que fabrica el portal ya vienen redactados y se respetan", () => {
    const red = error(
      "NETWORK_ERROR",
      "No se pudo conectar con el servicio.",
      0,
    );
    expect(explicarError(red, "genérico")).toBe(
      "No se pudo conectar con el servicio.",
    );
  });

  it("un 403 sin motivo reconocible dice que el acceso no alcanza", () => {
    expect(explicarError(error("FORBIDDEN", "Forbidden", 403), "g")).toMatch(
      /acceso/,
    );
  });

  it("cubre todo lo que lanza la subida y la verificación del objeto", () => {
    for (const codigo of [
      "FILE_TOO_LARGE",
      "FILE_CONTENT_TYPE_NOT_ALLOWED",
      "FILE_EMPTY",
      "FILE_CONTENT_TYPE_MISMATCH",
      "FILE_HASH_MISMATCH",
      "FILE_SIZE_MISMATCH",
      "FILE_MALWARE_DETECTED",
      "FILE_SCAN_UNAVAILABLE",
      "FILE_NOT_FOUND",
      "EXPEDIENTE_TICKET_NO_ENCONTRADO",
      "EXPEDIENTE_TICKET_YA_CONSUMIDO",
      "EXPEDIENTE_TICKET_VENCIDO",
      "EXPEDIENTE_ARCHIVO_DUPLICADO",
      "EXPEDIENTE_NOMBRE_INVALIDO",
    ]) {
      expect(explicarError(error("X", codigo), "SIN_MAPA")).not.toBe(
        "SIN_MAPA",
      );
    }
  });
});

describe("rechazos de la subida", () => {
  it("nunca enseña un error interno del navegador; sí el del almacén, que ya está redactado", () => {
    expect(explicarRechazo(new TypeError("Failed to fetch"))).toBe(
      "No se pudo subir el archivo. Inténtalo de nuevo.",
    );
    expect(explicarRechazo(new ErrorDelAlmacen("El almacén no aceptó."))).toBe(
      "El almacén no aceptó.",
    );
    expect(
      explicarRechazo(
        error("VALIDATION_ERROR", "FILE_CONTENT_TYPE_NOT_ALLOWED"),
      ),
    ).toMatch(/JPG, PNG o PDF/);
  });

  it("dice en qué carpeta quedó el archivo", () => {
    expect(carpetaDe("/otros/anverso.jpg")).toBe("/otros");
    expect(carpetaDe("/auth/kyc/selfie.png")).toBe("/auth/kyc");
    expect(carpetaDe("/suelto.pdf")).toBe("la raíz");
  });
});
