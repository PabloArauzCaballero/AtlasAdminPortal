import { expect, type Page } from "@playwright/test";

/**
 * Cómo se espera en esta suite sin poner un reloj.
 *
 * `page.waitForTimeout` está prohibido por lint (`playwright/no-wait-for-timeout`) y con razón: es
 * lento en una máquina rápida, inestable en una lenta, y esconde qué se estaba esperando de verdad.
 * Estas dos funciones cubren los dos únicos casos donde la suite creía necesitarlo.
 */

/**
 * Deja la página quieta para capturarla: sin animaciones, sin transiciones, con las fuentes ya
 * cargadas y sin peticiones en vuelo.
 *
 * Antes se esperaba 1,2 s «a que asiente». Esto no espera un tiempo: apaga lo que se movía y espera
 * a que las condiciones concretas se cumplan, así que es más rápido Y más fiable. Es también lo que
 * hacía falta para que `axe` no midiera el contraste a media animación.
 */
export async function quietaParaCapturar(page: Page): Promise<void> {
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;}",
  });
  await page.evaluate(() => document.fonts.ready).catch(() => undefined);
  await page.waitForLoadState("networkidle");
}

/**
 * Comprueba que algo NO cambia durante una ventana de tiempo.
 *
 * Es el único caso legítimo donde hace falta que pase tiempo: demostrar la AUSENCIA de un bucle de
 * redirecciones exige mirar durante un rato — ninguna aserción puede concluirlo al instante. Se
 * expresa como lo que es, una aserción de estabilidad con su motivo, en vez de un
 * `waitForTimeout` suelto que el siguiente lector no sabe interpretar.
 */
export async function seMantiene(
  leer: () => Promise<string> | string,
  esperado: string,
  motivo: string,
  ventanaMs = 2_500,
): Promise<void> {
  const limite = Date.now() + ventanaMs;
  while (Date.now() < limite) {
    const actual = await leer();
    expect(actual, motivo).toBe(esperado);
    await new Promise((resolver) => setTimeout(resolver, 250));
  }
}
