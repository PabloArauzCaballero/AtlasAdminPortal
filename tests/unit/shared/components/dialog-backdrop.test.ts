import { afterEach, describe, expect, it } from "vitest";
import { bloquearElFondo } from "@/shared/components/ui/dialog-backdrop";

/**
 * Un diálogo abierto deja `inert` al resto del body. La única excepción son las
 * capas marcadas `data-atlas-above-dialogs` (el tutorial interactivo): guían al
 * usuario también dentro del diálogo y tienen que seguir recibiendo clics.
 */
describe("bloquearElFondo", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.body.style.overflow = "";
  });

  it("marca inert a los hermanos del velo, menos a las capas por encima de los diálogos", () => {
    const fondo = document.createElement("div");
    const tutorial = document.createElement("div");
    tutorial.setAttribute("data-atlas-above-dialogs", "");
    const velo = document.createElement("div");
    document.body.append(fondo, tutorial, velo);

    const soltar = bloquearElFondo(velo);
    expect(fondo.hasAttribute("inert")).toBe(true);
    expect(tutorial.hasAttribute("inert")).toBe(false);
    expect(velo.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("hidden");

    soltar();
    expect(fondo.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("");
  });

  it("con dos diálogos apilados, el de abajo queda inerte y al cerrar el de arriba sigue bloqueado el fondo", () => {
    const fondo = document.createElement("div");
    const primero = document.createElement("div");
    const segundo = document.createElement("div");
    document.body.append(fondo, primero, segundo);

    const soltarPrimero = bloquearElFondo(primero);
    const soltarSegundo = bloquearElFondo(segundo);
    expect(primero.hasAttribute("inert")).toBe(true);
    expect(segundo.hasAttribute("inert")).toBe(false);

    soltarSegundo();
    expect(primero.hasAttribute("inert")).toBe(false);
    expect(fondo.hasAttribute("inert")).toBe(true);

    soltarPrimero();
    expect(fondo.hasAttribute("inert")).toBe(false);
  });
});
