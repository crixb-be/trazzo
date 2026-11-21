import { expect, test } from "@playwright/test";

test("herramientas y resultado visibles en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Herramientas de obra" })).toBeVisible();
  await page.getByRole("link", { name: /^Calculadoras técnicas/ }).click();
  await expect(page.locator(".calculator-result-bar")).toBeInViewport();
  await expect(page.locator(".calculator-result-bar")).toContainText("contrapasos");
  await page
    .getByRole("navigation", { name: "Calculadoras", exact: true })
    .getByRole("link", { name: "Rampas", exact: true })
    .click();
  await expect(page.locator(".calculator-result-bar")).toBeInViewport();
  await expect(page.locator(".calculator-result-bar")).toContainText("A.120");
  await page.screenshot({ path: "test-results/calculadora-movil.png" });
});
