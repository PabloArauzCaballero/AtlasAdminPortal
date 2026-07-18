import { describe, expect, it, vi } from "vitest";
import {
  getRuntimeEnvironmentLabel,
  getServiceOriginLabel,
} from "@/shared/lib/runtime-environment";

describe("getRuntimeEnvironmentLabel", () => {
  it("devuelve el ambiente configurado", () => {
    vi.stubEnv("NEXT_PUBLIC_ATLAS_ENVIRONMENT", "staging");

    expect(getRuntimeEnvironmentLabel()).toBe("staging");
  });

  it("cae a `local` cuando la variable no está definida", () => {
    vi.stubEnv("NEXT_PUBLIC_ATLAS_ENVIRONMENT", "");

    expect(getRuntimeEnvironmentLabel()).toBe("local");
  });

  it("trata una variable con solo espacios como no configurada", () => {
    // Un `.env` con `NEXT_PUBLIC_ATLAS_ENVIRONMENT= ` no debe pintar un badge
    // de ambiente vacío en la cabecera del portal.
    vi.stubEnv("NEXT_PUBLIC_ATLAS_ENVIRONMENT", "   ");

    expect(getRuntimeEnvironmentLabel()).toBe("local");
  });

  it("recorta los espacios alrededor del ambiente configurado", () => {
    vi.stubEnv("NEXT_PUBLIC_ATLAS_ENVIRONMENT", "  production  ");

    expect(getRuntimeEnvironmentLabel()).toBe("production");
  });
});

describe("getServiceOriginLabel", () => {
  it("muestra solo el host del backend, no la URL completa", () => {
    // La etiqueta va en la UI: la ruta `/api/v1` es ruido para el operador.
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.atlas.internal/api/v1");

    expect(getServiceOriginLabel()).toBe("api.atlas.internal");
  });

  it("conserva el puerto, que es lo que distingue dos backends locales", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:3005/api/v1");

    expect(getServiceOriginLabel()).toBe("localhost:3005");
  });

  it("indica servicio local cuando no hay base URL configurada", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");

    expect(getServiceOriginLabel()).toBe("servicio local");
  });

  it("trata una base URL con solo espacios como no configurada", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "   ");

    expect(getServiceOriginLabel()).toBe("servicio local");
  });

  it("no lanza si la base URL está mal formada", () => {
    // `new URL` lanza ante una URL relativa; la cabecera no debe tumbar la app
    // por un `.env` mal escrito.
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "no-soy-una-url");

    expect(getServiceOriginLabel()).toBe("servicio configurado");
  });
});
