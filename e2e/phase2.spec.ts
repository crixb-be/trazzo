import { expect, test } from "@playwright/test";
import { createProject } from "./helpers";

test("medidas filtra y las nuevas calculadoras responden", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/medidas");
  await page.getByRole("textbox", { name: "Buscar medidas" }).fill("fondo de colgado");
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.locator("article")).toContainText("Por verificar");
  await page.goto("/calculadoras?tab=cabida");
  await expect(page.locator(".result-main")).toHaveText("560.00 m² techados");
  await page.getByRole("combobox", { name: "Calculadora", exact: true }).selectOption("aforo");
  await expect(page.locator(".result-main")).toHaveText("10 personas");
  await page.getByRole("combobox", { name: "Calculadora", exact: true }).selectOption("utilidades");
  await expect(page.getByRole("main").getByRole("status")).toContainText("100 cm");
  await page.getByRole("combobox", { name: /^Herramienta/ }).selectOption("area");
  await expect(page.getByRole("main").getByRole("status")).toContainText("80.000 m²");
});

test("materiales envía cantidades con merma una sola vez a un proyecto", async ({ page }) => {
  await createProject(page, "Prueba materiales");
  await expect(page.getByRole("button", { name: /Prueba materiales Lima/ })).toBeVisible();
  await page.goto("/calculadoras?tab=materiales");
  await page
    .getByRole("combobox", { name: /^Proyecto de destino/ })
    .selectOption({ label: "Prueba materiales" });
  await page.getByRole("button", { name: "Enviar a metrado" }).click();
  await expect(page.getByRole("button", { name: "Enviar a metrado" })).toBeDisabled();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Cantidades enviadas");
  await page.goto("/metrados");
  await expect(
    page.getByText("Concreto por resistencia · Cemento", { exact: false }),
  ).toBeVisible();
});
