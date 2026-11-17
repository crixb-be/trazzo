import { test, expect } from "@playwright/test";
test("A.120-2023: tabla de rampas actual y supresión de12%", async ({ page }) => {
  await page.goto("/calculadoras?tab=rampas");
  await expect(page.locator(".result-main")).toContainText("8% máximo");
  await page.getByRole("textbox", { name: "Desnivel", exact: true }).fill("0.25");
  await expect(page.locator(".result-main")).toContainText("10% máximo");
  await page.getByRole("textbox", { name: "Desnivel", exact: true }).fill("1.20");
  await expect(page.locator(".result-main")).toContainText("Fuera de la tabla");
});
test("IS.010-2025: demanda residencial por población y clima", async ({ page }) => {
  await page.goto("/calculadoras?tab=agua");
  await expect(page.locator(".result-main")).toContainText("465 L/d");
  await page
    .getByRole("combobox", { name: "Carácter del clima", exact: true })
    .selectOption("calido");
  await expect(page.locator(".result-main")).toContainText("507 L/d");
  await page
    .getByRole("combobox", { name: "Carácter del clima", exact: true })
    .selectOption("frio");
  await expect(page.locator(".result-main")).toContainText("387 L/d");
});
test("trazabilidad de ficha y reserva de plazas accesibles", async ({ page }) => {
  await page.goto("/normativa");
  await page.getByRole("button", { name: "G.040", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Guía documental G.040", exact: true }),
  ).toBeVisible();
  await page.goto("/normativa/estacionamiento-accesible");
  await expect(page.locator(".highlight-value")).toContainText("3.7");
  await expect(page.getByText("RM 075-2023-VIVIENDA", { exact: false })).toBeVisible();
  await expect(page.getByText("Por verificar", { exact: true })).toHaveCount(0);
  await page.goto("/calculadoras?tab=parking");
  await page.getByRole("textbox", { name: "Total de estacionamientos de uso público" }).fill("500");
  await expect(page.locator(".result-main")).toContainText("20 plazas");
});
test("biblioteca distingue RNE de teoría e indexa artículo218", async ({ page }) => {
  await page.goto("/biblioteca");
  await expect(
    page.getByRole("heading", { name: "Normativa Peruana Obligatoria (RNE)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Teoría y Referencia Arquitectónica Internacional" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Buscar artículo o término" }).fill("218");
  await expect(page.getByRole("status").filter({ hasText: "1 artículos" })).toBeVisible();
  await page.getByText("Artículo 218 · página PDF", { exact: false }).click();
  await expect(page.locator("details[open] p")).toContainText("Artículo 218");
  await page.goto("/calculadoras?tab=sismo");
  await expect(page.locator(".result-main")).toContainText("112.50 kN");
});
