import { expect, test } from "@playwright/test";

test("modo obra y tamaño de letra se aplican y se conservan", async ({ page }) => {
  await page.goto("/cuenta");
  await page.getByRole("radio", { name: "Obra" }).click();
  await page.getByRole("radio", { name: "Muy grande" }).click();
  await expect(page.locator("html")).toHaveClass(/obra/);
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.locator("html")).toHaveAttribute("data-text", "muy-grande");

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/obra/);
  await expect(page.getByRole("radio", { name: "Obra" })).toHaveAttribute("aria-checked", "true");
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe("rgb(255, 255, 255)");

  // La letra crece sin provocar desplazamiento horizontal.
  await page.goto("/calculadoras");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // El botón de la cabecera recorre los tres temas.
  await page.getByRole("button", { name: /Tema Obra/ }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test.describe("bienvenida", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("tres pasos ordenan Inicio y no se repiten", async ({ page }) => {
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: "Bienvenido a TRAZZO" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Funciona sin cuenta y sin señal");
    await dialog.getByRole("button", { name: /Profesional/ }).click();

    const tools = page.getByRole("dialog", { name: "Elige tus herramientas" });
    await expect(tools.getByRole("button", { name: "Honorarios" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await tools.getByRole("button", { name: "Cabida de terreno" }).click();
    await tools.getByRole("button", { name: "Continuar" }).click();

    const install = page.getByRole("dialog", { name: "Llévala en tu pantalla de inicio" });
    await expect(install.getByRole("radio", { name: "Android" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await install.getByRole("radio", { name: "iPhone" }).click();
    await expect(install).toContainText("Compartir");
    await page.screenshot({ path: "test-results/bienvenida-instalar.png" });
    await install.getByRole("button", { name: "Empezar" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Tus herramientas" })).toBeVisible();
    const tiles = page.locator(".calculator-tile strong");
    await expect(tiles.first()).toHaveText("Materiales");
    await expect(tiles).toHaveCount(5);

    await page.reload();
    await expect(page.getByRole("heading", { name: "Tus herramientas" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("se puede omitir y Cuenta muestra la guía de instalación", async ({ page }) => {
    await page.goto("/cuenta");
    await page.getByRole("button", { name: "Omitir" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "TRAZZO en tu pantalla de inicio" }),
    ).toBeVisible();
    await page
      .getByRole("group", { name: "Herramientas en Inicio" })
      .getByRole("button", { name: "Metrados" })
      .click();
    await page.goto("/");
    await expect(page.locator(".calculator-tile strong")).toHaveCount(8);
  });
});
