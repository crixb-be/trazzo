import { expect, test, type Page } from "@playwright/test";

const seenKey = "trazzo_onboarding_v1_seen";
const guide = (page: Page) => page.locator(".welcome-guide");

async function simulateFirstVisit(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { value: false });
  });
}

test.use({ storageState: { cookies: [], origins: [] } });

test("la guía sigue tres pasos y solo se vuelve a abrir desde Cuenta", async ({ page }) => {
  await simulateFirstVisit(page);
  await page.goto("/");
  const card = guide(page);
  await expect(card).toContainText("Paso 1 de 3");
  await expect(card).toContainText("Calculadoras normativas RNE");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await card.getByRole("button", { name: "Siguiente" }).click();
  await expect(card).toContainText("Paso 2 de 3");
  await expect(card).toContainText("Modo Obra");
  await card.getByRole("button", { name: "Atrás" }).click();
  await expect(card).toContainText("Paso 1 de 3");
  await card.getByRole("button", { name: "Siguiente" }).click();
  await card.getByRole("button", { name: "Siguiente" }).click();
  await expect(card).toContainText("Paso 3 de 3");
  await expect(card).toContainText("Proyectos, respaldo y sincronización");
  await card.getByRole("button", { name: "Empezar" }).click();
  await expect(card).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), seenKey)).toBe("1");

  await page.reload();
  await expect(card).toHaveCount(0);
  await page.goto("/cuenta");
  const reopen = page.getByRole("button", { name: "Ver guía rápida" });
  await reopen.click();
  await expect(card).toContainText("Paso 1 de 3");
  await expect(card.getByRole("heading")).toBeFocused();
  await card.getByRole("button", { name: "Cerrar guía" }).click();
  await expect(card).toHaveCount(0);
  await expect(reopen).toBeFocused();
});

test("Saltar guía persiste tras recargar", async ({ page }) => {
  await simulateFirstVisit(page);
  await page.goto("/");
  await guide(page).getByRole("button", { name: "Saltar guía" }).click();
  await expect(guide(page)).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), seenKey)).toBe("1");
  await page.reload();
  await expect(guide(page)).toHaveCount(0);
});

test("webdriver y e2e=1 evitan la apertura automática sin marcar la guía como vista", async ({
  page,
}) => {
  await page.goto("/cuenta");
  await expect(guide(page)).toHaveCount(0);
  await simulateFirstVisit(page);
  await page.goto("/cuenta?e2e=1");
  await expect(guide(page)).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), seenKey)).toBeNull();
  const reopen = page.getByRole("button", { name: "Ver guía rápida" });
  await reopen.click();
  await expect(guide(page)).toContainText("Paso 1 de 3");
});
