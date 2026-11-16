import { expect, test } from "@playwright/test";

test("herramientas y resultado visibles en móvil", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Herramientas de obra" })).toBeVisible();
  await page.getByRole("link", { name: "Escaleras 2cp + p", exact: true }).click();
  await expect(page.locator(".calculator-result-bar")).toBeInViewport();
  await expect(page.locator(".calculator-result-bar")).toContainText("contrapasos");
  await page.getByRole("combobox", { name: "Calculadora", exact: true }).selectOption("rampas");
  await expect(page.locator(".calculator-result-bar")).toBeInViewport();
  await expect(page.locator(".calculator-result-bar")).toContainText("A.120");
});
