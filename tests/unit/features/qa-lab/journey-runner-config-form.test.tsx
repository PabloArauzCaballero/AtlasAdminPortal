import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  JourneyRunnerConfigFields,
  type JourneyRunnerConfig,
} from "@/features/qa-lab/journey-runner-config-form";

vi.setConfig({ testTimeout: 30000 });

function config(
  overrides: Partial<JourneyRunnerConfig> = {},
): JourneyRunnerConfig {
  return {
    environment: "LOCAL",
    baseRouteKey: "ENVIRONMENT_DEFAULT",
    customHostUrl: "",
    dryRun: true,
    timeoutMs: 20000,
    authMode: "session",
    customAuthToken: "",
    deviceProfile: "none",
    includeTenantHeader: true,
    includeIdempotencyKey: true,
    ...overrides,
  };
}

describe("JourneyRunnerConfigFields · ambiente y timeout", () => {
  it("el ambiente elegido se propaga", async () => {
    const onChange = vi.fn();
    render(<JourneyRunnerConfigFields config={config()} onChange={onChange} />);

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Ambiente" }),
      "STAGING",
    );

    expect(onChange).toHaveBeenCalledWith({ environment: "STAGING" });
  });

  it("el timeout por paso llega como número", async () => {
    const onChange = vi.fn();
    render(
      <JourneyRunnerConfigFields
        config={config({ timeoutMs: 2000 })}
        onChange={onChange}
      />,
    );

    await userEvent.type(
      screen.getByRole("spinbutton", { name: "Timeout ms por paso" }),
      "0",
    );

    expect(onChange).toHaveBeenCalledWith({ timeoutMs: 20000 });
  });

  it("el host manual se propaga", async () => {
    const onChange = vi.fn();
    render(<JourneyRunnerConfigFields config={config()} onChange={onChange} />);

    await userEvent.type(
      screen.getByPlaceholderText("https://staging-api.atlas.local"),
      "h",
    );

    expect(onChange).toHaveBeenCalledWith({ customHostUrl: "h" });
  });
});

describe("JourneyRunnerConfigFields · credencial del journey", () => {
  it("el token manual solo se pide con auth mode 'custom'", async () => {
    // Pedirlo siempre invitaría a pegar un token que no se va a usar.
    const onChange = vi.fn();
    const { rerender } = render(
      <JourneyRunnerConfigFields config={config()} onChange={onChange} />,
    );
    expect(screen.queryByRole("textbox", { name: /Token manual/ })).toBeNull();

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Auth mode" }),
      "custom",
    );
    expect(onChange).toHaveBeenCalledWith({ authMode: "custom" });

    rerender(
      <JourneyRunnerConfigFields
        config={config({ authMode: "custom" })}
        onChange={onChange}
      />,
    );
    expect(
      screen.getByRole("textbox", { name: /Token manual/ }),
    ).toBeInTheDocument();
  });

  it("el token manual tecleado se propaga", async () => {
    const onChange = vi.fn();
    render(
      <JourneyRunnerConfigFields
        config={config({ authMode: "custom" })}
        onChange={onChange}
      />,
    );

    await userEvent.type(
      screen.getByRole("textbox", { name: /Token manual/ }),
      "e",
    );

    expect(onChange).toHaveBeenCalledWith({ customAuthToken: "e" });
  });

  it("ofrece correr sin autenticación o con token inválido (matriz de permisos)", () => {
    render(<JourneyRunnerConfigFields config={config()} onChange={vi.fn()} />);
    const select = screen.getByRole("combobox", { name: "Auth mode" });

    expect(
      Array.from(select.querySelectorAll("option")).map((o) => o.value),
    ).toEqual(["session", "none", "invalid", "custom"]);
  });
});

describe("JourneyRunnerConfigFields · guardas", () => {
  it("refleja el dry-run y permite apagarlo", async () => {
    const onChange = vi.fn();
    render(<JourneyRunnerConfigFields config={config()} onChange={onChange} />);
    const dryRun = screen.getByRole("checkbox", {
      name: "Dry-run / modo seguro",
    });

    expect(dryRun).toBeChecked();
    await userEvent.click(dryRun);

    expect(onChange).toHaveBeenCalledWith({ dryRun: false });
  });

  it("los headers de tenant e idempotencia se pueden quitar por separado", async () => {
    const onChange = vi.fn();
    render(<JourneyRunnerConfigFields config={config()} onChange={onChange} />);

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Incluir x-idempotency-key" }),
    );

    expect(onChange).toHaveBeenCalledWith({ includeIdempotencyKey: false });
    expect(onChange).not.toHaveBeenCalledWith({ includeTenantHeader: false });
  });

  it("el perfil de dispositivo se propaga", async () => {
    const onChange = vi.fn();
    render(<JourneyRunnerConfigFields config={config()} onChange={onChange} />);
    const select = screen.getByRole("combobox", {
      name: /Simulador de dispositivo/,
    });
    const otro = Array.from(select.querySelectorAll("option")).find(
      (option) => option.value !== "none",
    );

    await userEvent.selectOptions(select, otro!.value);

    expect(onChange).toHaveBeenCalledWith({ deviceProfile: otro!.value });
  });
});
