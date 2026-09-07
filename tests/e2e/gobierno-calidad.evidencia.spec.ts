import { expect, test, type Page } from "@playwright/test";

/**
 * Evidencia visual de las tres vistas de «Gobierno y calidad» que se pintaban con el tema oscuro.
 *
 * ## Qué demuestra
 *
 * Consentimientos, Contenido de la app y Políticas de notificación se habían quedado con las clases
 * del tema anterior (`bg-slate-900/60`, `text-slate-400`) mientras el portal entero pasaba al claro.
 * Como la rampa `slate` está REDEFINIDA en `tailwind.config.ts` con el gris de ATLAS, `slate-900`
 * no era un gris azulado sino un casi negro: las tarjetas salían como bloques oscuros con el texto
 * en gris medio encima, ilegible. No era un fallo de datos —los documentos cargaban— sino de
 * contraste, que es lo que hacía parecer rota una pantalla que funcionaba.
 *
 * ## Por qué corre sin login ni backend
 *
 * Igual que `expedientes.evidencia.spec.ts`: siembra la sesión en `sessionStorage` y contesta las
 * llamadas de datos desde la propia prueba. Lo que se mide aquí es el CÓDIGO DE PANTALLA, y atarlo
 * a un segundo factor por correo o a un backend levantado lo pondría rojo por motivos que no tienen
 * nada que ver con lo que comprueba.
 *
 * La aserción no es la captura: se mide el color EFECTIVO del fondo de la tarjeta y el contraste
 * del texto contra él. Una captura sola volvería a pasar el día que alguien reintroduzca el tema
 * oscuro y nadie mire el PNG.
 */
const SESION = {
  accessToken: "evidencia.sin.valor",
  tokenType: "Bearer",
  user: {
    id: "1",
    tenantId: "1",
    email: "demo@atlas.bo",
    fullName: "Analista de Gobierno",
    userCode: "GOV-1",
    status: "ACTIVE",
    mustChangePassword: false,
    mfaEnabled: true,
    roles: ["admin", "platform_admin", "internal_operator"],
    legacyRoles: [],
    permissions: [
      "governance.policies.read",
      "governance.policies.write",
      "governance.data.read",
    ],
  },
  session: { expiresAt: "2099-01-01T00:00:00.000Z" },
};

const CONSENTIMIENTOS = {
  items: [
    {
      id: "doc-1",
      documentCode: "credit_bureau_query",
      versionCode: "v1",
      language: "es",
      title: "Consulta de tu historial crediticio",
      summary:
        "Nos autorizas a consultar tu historial para decidir tu crédito.",
      bodyMarkdown:
        "## Qué autorizas\n\nQue Atlas consulte tu información en las centrales de información crediticia para evaluar tu solicitud, y que reporte el comportamiento de pago de tus créditos.\n\n## Por qué te lo pedimos aparte\n\nPorque es una autorización distinta de usar la app: puedes usar Atlas y no darla, aunque sin ella no podemos ofrecerte una línea.",
      contentUrl: null,
      requiresExplicitAction: true,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveUntil: null,
      status: "published",
    },
    {
      id: "doc-2",
      documentCode: "device_address_book",
      versionCode: "v1",
      language: "es",
      title: "Tus contactos",
      summary:
        "Nos autorizas a guardar los contactos de tu teléfono para verificar tu identidad y contactarte. Es opcional.",
      bodyMarkdown:
        "## Qué autorizas\n\nQue Atlas lea la agenda de tu teléfono y guarde la ficha de cada contacto —nombre, teléfonos, correos, empresa y cumpleaños— en nuestros servidores, cifrada.\n\n## Para qué la usamos\n\n- Verificar que las referencias que declaras son personas con las que realmente hablas.",
      contentUrl: null,
      requiresExplicitAction: false,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveUntil: null,
      status: "published",
    },
    {
      id: "doc-3",
      documentCode: "privacy_policy",
      versionCode: "v2",
      language: "es",
      title: "Política de privacidad",
      summary:
        "Qué datos guardamos, por cuánto tiempo y con quién los compartimos.",
      bodyMarkdown:
        "## Qué guardamos\n\nTu identidad, tu actividad de pago y los documentos que subes.",
      contentUrl: null,
      requiresExplicitAction: true,
      effectiveFrom: "2026-06-01T00:00:00.000Z",
      effectiveUntil: null,
      status: "draft",
    },
  ],
};

const CONTENIDO = {
  items: [
    {
      contentId: "c-1",
      surface: "faq",
      contentKey: "como_se_calcula_mi_linea",
      locale: "es",
      title: "¿Cómo se calcula mi línea de crédito?",
      subtitle: "Depende de tus ingresos y de tu historial de pago.",
      bodyMd:
        "Miramos lo que ingresas cada mes en tu cuenta, lo que ya debes en otras entidades y cómo has pagado hasta ahora. Con eso calculamos un monto que puedas devolver sin ahogarte.",
      bullets: [
        {
          text: "Se revisa cada mes, no queda fija",
          icon: "refresh",
          emphasis: true,
        },
        { text: "Pagar a tiempo la sube", icon: "trend-up", emphasis: false },
      ],
      metadata: {},
      actionKind: null,
      actionLabel: null,
      actionValue: null,
      resolvedAction: null,
      displayOrder: 1,
      isActive: true,
      publishedAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
    {
      contentId: "c-2",
      surface: "faq",
      contentKey: "que_pasa_si_me_atraso",
      locale: "es",
      title: "¿Qué pasa si me atraso?",
      subtitle: null,
      bodyMd:
        "Te avisamos el mismo día. A partir del cuarto día corre un interés de mora y el atraso se reporta a las centrales de riesgo.",
      bullets: [],
      metadata: {},
      actionKind: "whatsapp",
      actionLabel: "Hablar con soporte",
      actionValue: "70000000",
      resolvedAction: {
        kind: "whatsapp",
        label: "Hablar con soporte",
        url: "https://wa.me/59170000000",
      },
      displayOrder: 2,
      isActive: true,
      publishedAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
    {
      contentId: "c-3",
      surface: "faq",
      contentKey: "puedo_pagar_antes",
      locale: "es",
      title: "¿Puedo pagar antes del vencimiento?",
      subtitle: null,
      bodyMd: "Sí, y no cobramos ninguna penalidad por hacerlo.",
      bullets: [],
      metadata: {},
      actionKind: null,
      actionLabel: null,
      actionValue: null,
      resolvedAction: null,
      displayOrder: 3,
      isActive: false,
      publishedAt: null,
      updatedAt: "2026-08-02T00:00:00.000Z",
    },
  ],
};

const POLITICAS = {
  data: [
    {
      policyId: "p-1",
      eventCode: "payment_due_soon",
      channel: "push",
      label: "Tu cuota vence pronto",
      description: "Aviso tres días antes de la fecha de pago.",
      category: "pagos",
      icon: null,
      isMandatory: false,
      defaultEnabled: true,
      mandatoryReason: null,
      displayOrder: 1,
      isActive: true,
      updatedAt: "2026-08-10T00:00:00.000Z",
    },
    {
      policyId: "p-2",
      eventCode: "payment_overdue",
      channel: "push",
      label: "Tu cuota está en mora",
      description: "Aviso el día del atraso y en cada corte posterior.",
      category: "pagos",
      icon: null,
      isMandatory: true,
      defaultEnabled: true,
      mandatoryReason:
        "Un atraso tiene costo e impacta tu historial. Avisarte no es opcional para nosotros.",
      displayOrder: 2,
      isActive: true,
      updatedAt: "2026-08-10T00:00:00.000Z",
    },
    {
      policyId: "p-3",
      eventCode: "new_device_login",
      channel: "email",
      label: "Entraron a tu cuenta desde otro teléfono",
      description: "Aviso cada vez que la sesión se abre en un equipo nuevo.",
      category: "seguridad",
      icon: null,
      isMandatory: true,
      defaultEnabled: true,
      mandatoryReason:
        "Es el aviso que te deja reaccionar si alguien más entra a tu cuenta.",
      displayOrder: 1,
      isActive: true,
      updatedAt: "2026-08-10T00:00:00.000Z",
    },
    {
      policyId: "p-4",
      eventCode: "product_news",
      channel: "push",
      label: "Novedades de Atlas",
      description: null,
      category: "novedades",
      icon: null,
      isMandatory: false,
      defaultEnabled: false,
      mandatoryReason: null,
      displayOrder: 1,
      isActive: false,
      updatedAt: "2026-08-10T00:00:00.000Z",
    },
  ],
};

async function preparar(page: Page): Promise<void> {
  await page.addInitScript((sesion) => {
    window.sessionStorage.setItem(
      "atlas_internal_session_v3",
      JSON.stringify(sesion),
    );
  }, SESION);

  // El comodín va PRIMERO —Playwright evalúa en orden inverso— y corta cualquier llamada de datos
  // que no interceptemos abajo. Un corte de red lo maneja el portal solo; un cuerpo inventado
  // rompería la validación de contrato de algún otro servicio.
  await page.route("**/*", (route) => {
    const tipo = route.request().resourceType();
    return tipo === "fetch" || tipo === "xhr"
      ? route.abort()
      : route.fallback();
  });

  const responde = (patron: RegExp, json: unknown) =>
    page.route(
      (url) =>
        !url.pathname.startsWith("/internal") && patron.test(url.pathname),
      (route) => route.fulfill({ json: { data: json } }),
    );

  await responde(/\/operations\/consent-documents$/, CONSENTIMIENTOS);
  await responde(/\/operations\/app-content$/, CONTENIDO);
  await responde(/\/operations\/notification-policies$/, POLITICAS);
}

/** El color efectivo de un elemento, ya resuelto por el navegador. */
async function colores(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((nodo) => {
      const estilo = getComputedStyle(nodo as Element);
      return { fondo: estilo.backgroundColor, texto: estilo.color };
    });
}

/** Luminancia relativa de un `rgb(...)`, según la fórmula de WCAG. */
function luminancia(color: string): number {
  const [r, g, b] = (color.match(/\d+(\.\d+)?/g) ?? ["0", "0", "0"])
    .slice(0, 3)
    .map((valor) => {
      const canal = Number(valor) / 255;
      return canal <= 0.03928
        ? canal / 12.92
        : ((canal + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(uno: string, otro: string): number {
  const [claro, oscuro] = [luminancia(uno), luminancia(otro)].sort(
    (a, b) => b - a,
  );
  return (claro + 0.05) / (oscuro + 0.05);
}

const VISTAS = [
  {
    nombre: "consentimientos",
    ruta: "/internal/settings/consent-documents",
    lista: "consent-documents-list",
    tarjeta: '[data-testid="consent-document-credit_bureau_query"]',
    titulo: /Documentos de consentimiento/,
    editar: "edit-credit_bureau_query",
    campo: "body-credit_bureau_query",
    guardar: "save-credit_bureau_query",
  },
  {
    nombre: "contenido-de-la-app",
    ruta: "/internal/settings/app-content",
    lista: "app-content-list",
    tarjeta: '[data-testid="app-content-como_se_calcula_mi_linea"]',
    titulo: /Contenido de la app/,
    editar: "edit-como_se_calcula_mi_linea",
    campo: "body-como_se_calcula_mi_linea",
    guardar: "save-como_se_calcula_mi_linea",
  },
  {
    nombre: "politicas-de-notificacion",
    ruta: "/internal/settings/notification-policies",
    lista: "notification-policies-list",
    tarjeta: '[data-testid="notification-policy-payment_overdue-push"]',
    titulo: /Políticas de notificación/,
    editar: "edit-payment_overdue-push",
    campo: "description-payment_overdue-push",
    guardar: "save-payment_overdue-push",
  },
];

for (const vista of VISTAS) {
  test(`Gobierno y calidad — ${vista.nombre} se pinta sobre el tema claro`, async ({
    page,
  }, testInfo) => {
    await preparar(page);
    await page.goto(vista.ruta);

    await expect(page.getByRole("heading", { name: vista.titulo })).toBeVisible(
      {
        timeout: 20_000,
      },
    );
    await expect(page.getByTestId(vista.lista)).toBeVisible({
      timeout: 20_000,
    });

    const tarjeta = await colores(page, vista.tarjeta);
    // La tarjeta es clara: el fallo era exactamente lo contrario —un fondo casi negro
    // (`rgb(29, 29, 31)`, la `slate-900` de ATLAS) heredado del tema anterior.
    expect(
      luminancia(tarjeta.fondo),
      `fondo de la tarjeta en ${vista.nombre}: ${tarjeta.fondo}`,
    ).toBeGreaterThan(0.7);

    // Y el texto secundario, el que quedaba ilegible, se lee: 4,5:1 es el suelo de WCAG AA.
    const secundario = await colores(
      page,
      `${vista.tarjeta} .text-atlas-muted`,
    );
    expect(
      contraste(secundario.texto, tarjeta.fondo),
      `contraste del texto secundario en ${vista.nombre}`,
    ).toBeGreaterThan(4.5);

    const archivo = testInfo.outputPath(`${vista.nombre}.png`);
    await page.screenshot({ path: archivo, fullPage: true });
    await testInfo.attach(vista.nombre, {
      path: archivo,
      contentType: "image/png",
    });
  });
}

/**
 * El modo edición es donde vivía el resto del tema oscuro: los campos eran `bg-slate-950`, un negro
 * casi puro, con la etiqueta en gris sobre el fondo oscuro de la tarjeta. Se comprueba aparte
 * porque no se ve hasta pulsar «Editar», que es justo por lo que pasó desapercibido.
 */
for (const vista of VISTAS) {
  test(`Gobierno y calidad — el formulario de ${vista.nombre} es legible`, async ({
    page,
  }, testInfo) => {
    await preparar(page);
    await page.goto(vista.ruta);
    await expect(page.getByTestId(vista.lista)).toBeVisible({
      timeout: 20_000,
    });

    await page.getByTestId(vista.editar).click();

    const campo = page.getByTestId(vista.campo);
    await expect(campo).toBeVisible();
    await expect(page.getByTestId(vista.guardar)).toBeEnabled();

    // El campo escribe en negro sobre blanco, no en blanco sobre negro.
    const entrada = await campo.evaluate((nodo) => {
      const estilo = getComputedStyle(nodo as Element);
      return { fondo: estilo.backgroundColor, texto: estilo.color };
    });
    expect(
      luminancia(entrada.fondo),
      `fondo del campo en ${vista.nombre}: ${entrada.fondo}`,
    ).toBeGreaterThan(0.9);
    expect(
      contraste(entrada.texto, entrada.fondo),
      `contraste del texto escrito en ${vista.nombre}`,
    ).toBeGreaterThan(4.5);

    const archivo = testInfo.outputPath(`${vista.nombre}-edicion.png`);
    await page.screenshot({ path: archivo, fullPage: true });
    await testInfo.attach(`${vista.nombre} — edición`, {
      path: archivo,
      contentType: "image/png",
    });
  });
}
