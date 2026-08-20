import { expect, test as setup } from "@playwright/test";
import {
  INTERNAL_STORAGE_STATE,
  hasInternalCredentials,
  loginAsInternalUser,
} from "./internal-session";

/**
 * Un ÚNICO login para toda la suite, guardado como estado de sesión.
 *
 * `POST /internal/auth/login` está limitado a 10 intentos por minuto — es un endpoint público de
 * autenticación y ese techo es deliberado. Con un login por prueba, la cuarta empezaba a recibir
 * 429 y el fallo aparecía como un timeout esperando la navegación, que se lee como «el portal está
 * roto» y no lo estaba. Autenticar una vez y reutilizar las cookies respeta el límite y, de paso,
 * hace que cada prueba mida lo suyo y no el formulario de login.
 */
setup("autenticar en el portal interno", async ({ page }) => {
  setup.skip(
    !hasInternalCredentials(),
    "Define TEST_EMAIL y TEST_PASSWORD para correr el E2E contra el stack real.",
  );

  await loginAsInternalUser(page);
  await expect(page).toHaveURL(/\/internal/);
  await page.context().storageState({ path: INTERNAL_STORAGE_STATE });
});
