import { test, expect } from "@playwright/test";

test("receta de muro crea compras y capítulos", async ({ page }) => {
  await page.goto("/metrados");
  await page.getByRole("button", { name: "Nuevo proyecto" }).click();
  await page.getByPlaceholder("Casa Miraflores").fill("Recetas");
  await page.getByRole("button", { name: "Crear proyecto", exact: true }).click();
  await page.getByRole("button", { name: "Agregar receta al proyecto" }).click();
  await expect(page.getByText("Receta agregada.", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lista de compras" })).toBeVisible();
  await expect(page.locator(".takeoff-table tbody tr")).toHaveCount(3);
});
test("favoritos y recientes conservan visitas", async ({ page }) => {
  await page.goto("/normativa/escalera-paso-contrapaso");
  await page.getByRole("button", { name: "Guardar favorito" }).click();
  await expect(page.getByRole("button", { name: "Quitar favorito" })).toBeVisible();
  await page.goto("/normativa");
  await page.getByLabel("Solo favoritos").check();
  await expect(page.getByText("Relación paso–contrapaso", { exact: false }).first()).toBeVisible();
});
test("asistente responde sin red y conserva historial", async ({ page }) => {
  await page.goto("/asistente");
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.context().setOffline(true);
  await page
    .getByRole("textbox", { name: "Pregunta al asistente RNE" })
    .fill("ancho de puerta accesible");
  await page.locator(".chat-form button[type=submit]").click();
  await expect(page.locator(".chat-message.assistant")).toContainText("1.00");
  await page.reload();
  await expect(page.locator(".chat-message.assistant")).toContainText("1.00");
});
test("buscador abre medidas y honorarios conserva datos entre pasos", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Buscar en TRAZZO" }).last().fill("clóset");
  await page.getByRole("option").filter({ hasText: "Clóset" }).first().click();
  await expect(page).toHaveURL(/medidas/);
  await page.goto("/honorarios");
  await page.getByPlaceholder("Casa Miraflores").fill("Proyecto por pasos");
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByRole("region", { name: "Paso: Alcance" })).toBeVisible();
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await expect(page.getByPlaceholder("Casa Miraflores")).toHaveValue("Proyecto por pasos");
  await expect(page.locator(".quote-total-fixed")).toBeInViewport();
  await page.getByRole("button", { name: "Preparar PDF para compartir" }).click();
  await expect(page.getByRole("button", { name: "Compartir PDF", exact: true })).toBeVisible();
});

test("editar precio de material importado en m² conserva cantidad", async ({ page }) => {
  await page.goto("/metrados");
  await page.getByRole("button", { name: "Nuevo proyecto" }).click();
  await page.getByPlaceholder("Casa Miraflores").fill("Pisos");
  await page.getByRole("button", { name: "Crear proyecto", exact: true }).click();
  await page.goto("/calculadoras?tab=materiales");
  await page.getByRole("combobox", { name: "Trabajo", exact: true }).selectOption("ceramico");
  await page
    .getByRole("combobox", { name: "Proyecto de destino", exact: true })
    .selectOption({ label: "Pisos" });
  await page.getByRole("button", { name: "Enviar a metrado" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Cantidades enviadas");
  await page.goto("/metrados");
  const row = page.locator(".takeoff-table tbody tr").first();
  const before = await row.locator("td").nth(8).innerText();
  await row.getByRole("button", { name: "Editar partida" }).click();
  await page.getByRole("textbox", { name: "Precio unitario (S/)", exact: true }).fill("100");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(row.locator("td").nth(8)).toHaveText(before);
});
