import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { BulletsEditor } from "@/features/app-content/bullets-editor";
import type { ContentBullet } from "@/features/app-content/types";

const PNG_URI = "data:image/png;base64,iVBORw0KGgo=";

const iconFromFile = vi.fn();
vi.mock("@/features/app-content/icon-upload", async () => {
  const real = await vi.importActual<
    typeof import("@/features/app-content/icon-upload")
  >("@/features/app-content/icon-upload");
  return { ...real, iconFromFile: (file: File) => iconFromFile(file) };
});

function Host({ inicial }: Readonly<{ inicial: ContentBullet[] }>) {
  const [bullets, setBullets] = useState(inicial);
  return (
    <>
      <BulletsEditor
        bullets={bullets}
        contentKey="k"
        onChange={(f) => setBullets(f)}
      />
      <output data-testid="estado">{JSON.stringify(bullets)}</output>
    </>
  );
}

const estado = () =>
  JSON.parse(
    screen.getByTestId("estado").textContent ?? "[]",
  ) as ContentBullet[];

describe("icono propio de un punto", () => {
  it("cargar un archivo guarda el icono propio en el punto", async () => {
    iconFromFile.mockResolvedValue(PNG_URI);
    render(<Host inicial={[{ text: "Uno", icon: "check" }]} />);
    const archivo = screen.getByTestId("icon-k-0-archivo");
    fireEvent.change(archivo, {
      target: { files: [new File(["x"], "i.png", { type: "image/png" })] },
    });
    await waitFor(() => expect(estado()[0].iconImage).toBe(PNG_URI));
    expect(screen.getByTestId("icon-k-0-imagen")).toBeTruthy();
    expect(estado()[0].icon).toBe("check");
  });

  it("quitar el icono propio devuelve el de Atlas sin perder la elección anterior", async () => {
    render(
      <Host inicial={[{ text: "Uno", icon: "escudo", iconImage: PNG_URI }]} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /volver al de Atlas/i }),
    );
    await waitFor(() => expect(estado()[0].iconImage).toBeNull());
    expect(estado()[0].icon).toBe("escudo");
  });

  it("un archivo rechazado enseña el motivo y no toca el punto", async () => {
    const { IconUploadError } =
      await import("@/features/app-content/icon-upload");
    iconFromFile.mockRejectedValue(
      new IconUploadError("El icono debe ser un PNG o WebP."),
    );
    render(<Host inicial={[{ text: "Uno" }]} />);
    fireEvent.change(screen.getByTestId("icon-k-0-archivo"), {
      target: { files: [new File(["x"], "i.gif", { type: "image/gif" })] },
    });
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /PNG o WebP/,
    );
    expect(estado()[0].iconImage).toBeUndefined();
  });
});
