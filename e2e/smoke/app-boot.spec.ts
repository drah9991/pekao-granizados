import { expect, test, type Page } from "@playwright/test";

/**
 * Arranque del build de producción en un navegador real.
 *
 * El 2026-10-27 un despliegue compiló sin errores pero dejó la app en blanco:
 * los chunks de vendor se importaban entre sí y React llegaba undefined
 * ("Cannot read properties of undefined (reading 'createContext')"). Ni los
 * tests unitarios ni el build lo detectaron porque nadie abría la app compilada.
 *
 * Supabase apunta a una URL ficticia (playwright.smoke.config.ts): aquí solo
 * importa que la app arranque y pinte, no los datos.
 */

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

// Los errores se revisan antes de esperar el contenido: si la app no arranca, el
// fallo muestra el error real (p. ej. createContext) y no solo "elemento no visible".
test("la pantalla de acceso carga sin errores de JavaScript", async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto("/auth");
  expect(errors, "errores de JavaScript al arrancar").toEqual([]);

  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test("la carta digital pública arranca sin errores de JavaScript", async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto("/digital-menu?store=00000000-0000-0000-0000-000000000000");
  expect(errors, "errores de JavaScript al arrancar").toEqual([]);

  // Sin base de datos la carta queda vacía, pero el encabezado y el <main> se pintan.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  expect(errors).toEqual([]);
});
