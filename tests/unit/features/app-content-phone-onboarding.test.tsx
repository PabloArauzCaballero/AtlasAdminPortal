import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  PhonePreview,
  type PreviewDraft,
} from "@/features/app-content/phone-preview";

const pieza = (extra: Partial<PreviewDraft>): PreviewDraft => ({
  title: "",
  subtitle: "",
  body: "",
  bullets: [],
  actionKind: null,
  actionLabel: "",
  isActive: true,
  ...extra,
});

const publicado = [
  pieza({
    contentKey: "eslogan",
    title: "Eslogan",
    subtitle: "Tu primer crédito.",
    body: "Para comprar en Santa Cruz.",
  }),
  pieza({
    contentKey: "paso-1",
    title: "Escaneas y listo",
    subtitle: "Escaneas el QR y escribes el monto.",
  }),
  pieza({
    contentKey: "paso-2",
    title: "Pagas en cuotas",
    subtitle: "Cuotas mensuales.",
  }),
];

function celular(published: PreviewDraft[], draft: PreviewDraft | null = null) {
  return render(
    <PhonePreview
      surface="onboarding"
      surfaceLabel="Bienvenida"
      draft={draft}
      published={published}
    />,
  );
}

describe("la Bienvenida en el celular del portal", () => {
  it("empieza por la marca y el eslogan, como la app, no por una lista", () => {
    celular(publicado);
    expect(screen.getByTestId("phone-screen-onboarding")).toBeInTheDocument();
    expect(screen.getByText("ATLAS")).toBeInTheDocument();
    expect(screen.getByText("Tu primer crédito.")).toBeInTheDocument();
    // La pieza «Eslogan» no es un paso: su título interno no sale en pantalla.
    expect(screen.queryByText("Eslogan")).toBeNull();
    expect(screen.queryByText("Escaneas y listo")).toBeNull();
  });

  it("«Siguiente» pasa de página —marca, «Qué es Atlas» y los pasos— y la última ofrece «Crear mi cuenta»", () => {
    celular(publicado);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    // La app antepone «Qué es Atlas» aunque el portal sólo tenga editados los pasos de siempre.
    expect(screen.getByText("Qué es Atlas")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Escaneas y listo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Pagas en cuotas")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Crear mi cuenta" }),
    ).toBeInTheDocument();
  });

  it("un paso sin cuerpo no se pinta: la app lo descarta", () => {
    celular([
      ...publicado,
      pieza({ contentKey: "paso-3", title: "Sin texto" }),
    ]);
    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    }
    expect(screen.queryByText("Sin texto")).toBeNull();
  });

  it("al editar un paso se enseña ese paso, con la ilustración que le pone la app", () => {
    celular(
      publicado,
      pieza({
        contentKey: "paso-1",
        title: "Escaneas y listo",
        subtitle: "Texto nuevo.",
        bullets: [
          { text: "x", iconImage: "data:image/png;base64,iVBORw0KGgo=" },
        ],
      }),
    );
    expect(screen.getByText("Texto nuevo.")).toBeInTheDocument();
    expect(
      screen.getByTestId("ilustracion-escaneas-y-listo"),
    ).toBeInTheDocument();
    // La app no pinta el icono propio del paso (pinta la ilustración): la vista previa tampoco.
    expect(document.querySelector('img[src^="data:image/png"]')).toBeNull();
  });
});

describe("la Bienvenida del portal es la de la app: «Qué es Atlas» primero y una ilustración por paso", () => {
  const siguiente = () =>
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

  it("si el portal no tiene «Qué es Atlas», se antepone el de fábrica con su ilustración", () => {
    celular(publicado);
    siguiente();
    expect(
      screen.getByText(/crédito para comprar en los comercios de tu barrio/),
    ).toBeInTheDocument();
    expect(screen.getByTestId("ilustracion-que-es-atlas")).toBeInTheDocument();
  });

  it("si el portal SÍ tiene la pieza, manda su texto y va primera aunque se publicara después", () => {
    celular([
      ...publicado,
      pieza({
        contentKey: "que-es-atlas",
        title: "Qué es Atlas",
        subtitle: "Texto editado en el portal.",
      }),
    ]);
    siguiente();
    expect(screen.getByText("Texto editado en el portal.")).toBeInTheDocument();
    expect(screen.queryByText(/comercios de tu barrio/)).toBeNull();
    siguiente();
    expect(screen.getByText("Escaneas y listo")).toBeInTheDocument();
  });

  it.each([
    ["paso-1", "Escaneas y listo", "escaneas-y-listo"],
    ["paso-2", "Pagas en cuotas", "pagas-en-cuotas"],
  ])("el paso %s lleva la ilustración «%s»", (clave, _titulo, ilustracion) => {
    celular(publicado);
    const clics = clave === "paso-1" ? 2 : 3;
    for (let i = 0; i < clics; i += 1) siguiente();
    expect(
      screen.getByTestId(`ilustracion-${ilustracion}`),
    ).toBeInTheDocument();
  });

  it("una pieza en blanco sigue mostrando el aviso, no una Bienvenida con un paso inventado", () => {
    celular([], pieza({ contentKey: "paso-1" }));
    expect(screen.getByTestId("phone-empty")).toBeInTheDocument();
    expect(screen.queryByText("Qué es Atlas")).toBeNull();
  });

  it("existen las mismas cuatro ilustraciones que en la app", async () => {
    const { NOMBRES_DE_ILUSTRACION } =
      await import("@/features/app-content/phone-ilustraciones");
    expect([...NOMBRES_DE_ILUSTRACION].sort()).toEqual([
      "construyes-historial",
      "escaneas-y-listo",
      "pagas-en-cuotas",
      "que-es-atlas",
    ]);
  });

  it("una clave que el portal invente toma la ilustración por su posición: nunca queda sin dibujo", async () => {
    const { ilustracionDe } =
      await import("@/features/app-content/phone-ilustraciones");
    expect(ilustracionDe("paso-inventado", 2)).toBe("pagas-en-cuotas");
    expect(ilustracionDe("paso-inventado", 99)).toBe("construyes-historial");
  });
});

describe("los iconos de la app portados al celular", () => {
  it("están todos los de la app y los que usa la Bienvenida existen", async () => {
    const { APP_ICON_NAMES } = await import("@/features/app-content/app-icons");
    expect([...APP_ICON_NAMES].sort()).toEqual([
      "adelante",
      "alerta",
      "asistente",
      "atras",
      "ayuda",
      "billetera",
      "camara",
      "candado",
      "celulares",
      "check",
      "chispa",
      "comercio",
      "copiar",
      "cuadricula",
      "descargar",
      "documento",
      "editar",
      "educacion",
      "electronica",
      "escanear",
      "escudo",
      "estrella",
      "etiqueta",
      "filtro",
      "grafico",
      "hogar",
      "info",
      "inicio",
      "lista",
      "ojo",
      "ojo-tachado",
      "pagos",
      "perfil",
      "refrescar",
      "reloj",
      "ropa",
      "salir",
      "salud",
      "servicios",
      "sobre",
      "supermercado",
      "telefono",
      "tendencia",
      "transporte",
      "ubicacion",
    ]);
  });
});
