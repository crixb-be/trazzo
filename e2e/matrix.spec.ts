import { expect, test } from "@playwright/test";

test("matriz guarda relaciones y exporta imagen y PDF", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/matriz");
  await expect(page.getByRole("main").getByRole("status")).toHaveText(
    "Guardado en este dispositivo",
  );
  await page.getByLabel("Sala con Cocina", { exact: true }).selectOption("necesaria");
  await page.getByLabel("Cocina con Comedor", { exact: true }).selectOption("deseable");
  await expect(page.locator("ol li").first()).toHaveText("Cocina: 4");
  await expect(page.getByRole("main").getByRole("status")).toHaveText(
    "Guardado en este dispositivo",
  );
  await page.reload();
  await expect(page.getByLabel("Sala con Cocina", { exact: true })).toHaveValue("necesaria");
  await expect(page.locator("ol li").first()).toHaveText("Cocina: 4");
  const svgDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar imagen SVG" }).click();
  const svg = await svgDownload;
  expect(svg.suggestedFilename()).toBe("trazo-relaciones.svg");
  expect(await svg.failure()).toBeNull();
  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar PDF", exact: true }).click();
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toBe("trazo-relaciones.pdf");
  expect(await pdf.failure()).toBeNull();
  await page.getByRole("button", { name: "Eliminar Cocina", exact: true }).click();
  await expect(page.locator("ol li")).toHaveCount(2);
  await expect(page.locator("ol li").first()).toContainText(": 0");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.context().setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Matriz de relaciones", exact: true }),
  ).toBeVisible();
  await expect(page.locator("ol li")).toHaveCount(2);
  await page.screenshot({ path: "test-results/matriz-movil.png", fullPage: true });
});
