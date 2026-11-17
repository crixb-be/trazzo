import { expect, test } from "@playwright/test";

test("comparte y guarda materiales, campo, matriz y medidas", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cuenta");
  await page.getByRole("radio", { name: "Obra" }).click();
  await expect(page.locator("html")).toHaveClass(/obra/);
  await page.goto("/metrados");
  await page.getByRole("button", { name: "Nuevo proyecto" }).click();
  await page.getByPlaceholder("Casa Miraflores").fill("Acciones de obra");
  await page.getByRole("button", { name: "Crear proyecto", exact: true }).click();

  async function shareAndSave(url: string, scope = "body") {
    await page.goto(url);
    const area = page.locator(scope).first();
    const downloadPromise = page.waitForEvent("download");
    await area.getByRole("button", { name: "Compartir imagen", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^trazzo-.+\.png$/);

    await area.getByRole("button", { name: "Guardar en proyecto", exact: true }).click();
    const saver = area.locator(".save-to-project");
    await saver.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Cálculo guardado en Acciones de obra.")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }

  await shareAndSave("/calculadoras?tab=materiales");
  await shareAndSave("/calculadoras?tab=utilidades");
  await shareAndSave("/matriz", "main");
  await shareAndSave("/medidas", ".measure-card");

  await page.goto("/metrados");
  await expect(page.locator(".project-hub .project-hub-list li")).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "test-results/workspace-actions-mobile.png", fullPage: true });
});
