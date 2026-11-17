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

test("resultado y ficha se comparten como imagen y PDF", async ({ page }) => {
  const { readFileSync } = await import("node:fs");
  await page.goto("/calculadoras?tab=escaleras");
  const imageDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Compartir imagen" }).click();
  const image = await imageDownload;
  expect(image.suggestedFilename()).toMatch(/^trazzo-\d+-contrapasos\.png$/);
  await image.saveAs("test-results/compartir-escalera.png");
  const png = readFileSync("test-results/compartir-escalera.png");
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBe(1080);
  expect(png.length).toBeGreaterThan(20000);

  await page.goto("/normativa/escalera-paso-contrapaso");
  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Compartir PDF" }).click();
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toMatch(/^trazzo-.+\.pdf$/);
  await pdf.saveAs("test-results/compartir-ficha.pdf");
  const bytes = readFileSync("test-results/compartir-ficha.pdf");
  expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  // La lámina va incrustada como imagen.
  expect(bytes.includes("/Subtype /Image")).toBe(true);

  const cardImage = page.waitForEvent("download");
  await page.getByRole("button", { name: "Compartir imagen" }).click();
  await (await cardImage).saveAs("test-results/compartir-ficha.png");
});

test("el proyecto reúne cálculos y la copia de seguridad los restaura", async ({ page }) => {
  await page.goto("/metrados");
  await page.getByRole("button", { name: "Nuevo proyecto" }).click();
  await page.getByPlaceholder("Casa Miraflores").fill("Casa eje");
  await page.getByRole("button", { name: "Crear proyecto", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cálculos guardados" })).toBeVisible();

  await page.goto("/calculadoras?tab=escaleras");
  await page.getByRole("button", { name: "Guardar en proyecto" }).click();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Cálculo guardado en Casa eje.")).toBeVisible();

  await page.goto("/metrados");
  const hub = page.locator(".project-hub");
  await expect(hub.getByText(/\d+ contrapasos/)).toBeVisible();

  // Copia a archivo.
  await page.goto("/cuenta");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar copia" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^trazzo-copia-\d{4}-\d{2}-\d{2}\.json$/);
  await file.saveAs("test-results/copia.json");

  // Se borra todo lo del dispositivo y se restaura desde el archivo.
  await page.getByRole("button", { name: "Restablecer datos" }).click();
  const resetLoaded = page.waitForEvent("load");
  await page.getByRole("button", { name: "Restablecer", exact: true }).click();
  await resetLoaded;
  await page.goto("/metrados");
  await expect(page.getByText("Casa eje")).toHaveCount(0);

  await page.goto("/cuenta");
  await expect(page.getByRole("button", { name: "Restaurar copia", exact: true })).toBeEnabled();
  await page.getByLabel("Archivo de copia de seguridad").setInputFiles("test-results/copia.json");
  await expect(page.getByRole("alertdialog")).toContainText("1 proyecto(s)");
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await expect(page.getByText("Copia restaurada.")).toBeVisible();

  await page.goto("/metrados");
  await expect(page.getByRole("heading", { name: "Casa eje" })).toBeVisible();
  await expect(page.locator(".project-hub").getByText(/\d+ contrapasos/)).toBeVisible();

  // Un archivo cualquiera se rechaza con un motivo.
  await page.goto("/cuenta");
  await expect(page.getByRole("button", { name: "Restaurar copia", exact: true })).toBeEnabled();
  await page.getByLabel("Archivo de copia de seguridad").setInputFiles({
    name: "otro.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"hola":1}'),
  });
  await expect(page.getByText("El archivo no es una copia de TRAZZO.")).toBeVisible();
});
