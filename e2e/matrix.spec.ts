import { expect, test } from "@playwright/test";

test("matriz ponderada móvil, persistencia y exportaciones", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/matriz");
  await expect(page.getByRole("main").getByRole("status")).toHaveText(
    "Guardado en este dispositivo",
  );

  const salaCocina = page.getByRole("button", { name: /^Sala con Cocina/ });
  await salaCocina.click();
  await expect(salaCocina).toHaveAttribute("aria-label", /necesaria \(4\)/);
  const comedorCocina = page.getByRole("button", { name: /^Comedor con Cocina/ });
  await comedorCocina.click();
  await comedorCocina.click();
  await expect(comedorCocina).toHaveAttribute("aria-label", /deseable \(2\)/);
  // Sala 4 · Comedor 2 · Cocina 4 + 2 = 6 → Cocina leads the ranking.
  const firstRow = page.locator(".matrix-ranking-table tbody tr").first();
  await expect(firstRow).toContainText("Cocina");
  await expect(firstRow).toContainText("R1");

  await expect(page.getByRole("main").getByRole("status")).toHaveText(
    "Guardado en este dispositivo",
  );
  await page.reload();
  await expect(page.getByRole("button", { name: /^Sala con Cocina/ })).toHaveAttribute(
    "aria-label",
    /necesaria \(4\)/,
  );

  const svgDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar imagen SVG", exact: true }).click();
  const svg = await svgDownload;
  expect(svg.suggestedFilename()).toBe("trazo-relaciones.svg");
  expect(await svg.failure()).toBeNull();
  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar PDF", exact: true }).click();
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toBe("trazo-relaciones.pdf");
  expect(await pdf.failure()).toBeNull();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cargar ejemplo", exact: true }).click();
  await expect(page.locator(".matrix-ranking-table tbody tr").first()).toContainText("Comedor");
  await expect(page.locator(".matrix-ranking-table tbody tr").first()).toContainText("12");
  await expect(page.locator("svg.relation-plate circle")).toHaveCount(1);
  await page.getByRole("button", { name: "Eliminar Cocina", exact: true }).click();

  await expect(
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).resolves.toBe(true);
  await expect(
    page
      .locator("svg.relation-plate text[data-fit-width]")
      .evaluateAll((texts) =>
        texts.every(
          (text) =>
            text.getComputedTextLength() <= Number(text.getAttribute("data-fit-width")) + 0.5,
        ),
      ),
  ).resolves.toBe(true);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.context().setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Matriz de relaciones", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/matriz-movil.png", fullPage: true });
});
