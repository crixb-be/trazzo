import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createProject } from "./helpers";

test("tema claro y tamaño de letra se aplican y se conservan", async ({ page }) => {
  await page.goto("/cuenta");
  await page.getByRole("radio", { name: "Claro" }).click();
  await page.getByRole("radio", { name: "Muy grande" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.locator("html")).toHaveAttribute("data-text", "muy-grande");

  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.getByRole("radio", { name: "Claro" })).toHaveAttribute("aria-checked", "true");

  // La letra crece sin provocar desplazamiento horizontal.
  await page.goto("/calculadoras");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: /Tema Claro/ }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test.describe("configuración guiada de accesos", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("tres pasos ordenan Inicio y no se repiten", async ({ page }, testInfo) => {
    await page.goto("/cuenta");
    await page.getByRole("button", { name: "Configurar accesos guiados" }).click();
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
    await page.screenshot({ path: testInfo.outputPath("bienvenida-instalar.png") });
    await install.getByRole("button", { name: "Empezar" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.goto("/");
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
    await page.getByRole("button", { name: "Configurar accesos guiados" }).click();
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

test("resultado y ficha se comparten como imagen y PDF", async ({ page }, testInfo) => {
  await page.goto("/calculadoras?tab=escaleras");
  const imageDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Compartir imagen" }).click();
  const image = await imageDownload;
  expect(image.suggestedFilename()).toMatch(/^trazzo-\d+-contrapasos\.png$/);
  const imagePath = testInfo.outputPath("compartir-escalera.png");
  await image.saveAs(imagePath);
  const png = await readFile(imagePath);
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBe(1080);
  expect(png.length).toBeGreaterThan(20000);

  await page.goto("/normativa/escalera-paso-contrapaso");
  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Compartir PDF" }).click();
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toMatch(/^trazzo-.+\.pdf$/);
  const pdfPath = testInfo.outputPath("compartir-ficha.pdf");
  await pdf.saveAs(pdfPath);
  const bytes = await readFile(pdfPath);
  expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  // La lámina va incrustada como imagen.
  expect(bytes.includes("/Subtype /Image")).toBe(true);

  const cardImage = page.waitForEvent("download");
  await page.getByRole("button", { name: "Compartir imagen" }).click();
  await (await cardImage).saveAs(testInfo.outputPath("compartir-ficha.png"));
});

test("el proyecto reúne cálculos y la copia de seguridad los restaura", async ({
  page,
}, testInfo) => {
  await createProject(page, "Casa eje");
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
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Descargar copia" }).click(),
  ]);
  expect(file.suggestedFilename()).toMatch(/^trazzo-copia-\d{4}-\d{2}-\d{2}\.json$/);
  const backupPath = testInfo.outputPath("copia.json");
  await file.saveAs(backupPath);
  const backup = JSON.parse(await readFile(backupPath, "utf8"));
  expect(backup).toMatchObject({
    format: "trazzo-backup",
    projects: [{ name: "Casa eje" }],
    projectNotes: [{ title: expect.stringMatching(/\d+ contrapasos/) }],
  });

  // Se borra todo lo del dispositivo y se restaura desde el archivo.
  await page.getByRole("button", { name: "Restablecer datos" }).click();
  // La recarga solo empieza después de que Dexie termina de borrar la base.
  await Promise.all([
    page.waitForEvent("framenavigated", (frame) => frame === page.mainFrame()),
    page.getByRole("alertdialog").getByRole("button", { name: "Restablecer", exact: true }).click(),
  ]);
  await page.goto("/metrados");
  await expect(page.getByRole("heading", { name: "Sin proyectos" })).toBeVisible();
  await expect(page.getByText("Casa eje")).toHaveCount(0);

  await page.goto("/cuenta");
  await page.getByLabel("Archivo de copia de seguridad").setInputFiles(backupPath);
  const restore = page.getByRole("alertdialog", { name: "¿Restaurar esta copia?" });
  await expect(restore).toContainText("1 proyecto(s)");
  await restore.getByRole("button", { name: "Restaurar", exact: true }).click();
  await expect(page.getByText("Copia restaurada.")).toBeVisible();

  await page.goto("/metrados");
  await expect(page.getByRole("heading", { name: "Casa eje" })).toBeVisible();
  await expect(page.locator(".project-hub").getByText(/\d+ contrapasos/)).toBeVisible();

  // Un archivo cualquiera se rechaza con un motivo.
  await page.goto("/cuenta");
  await page.getByLabel("Archivo de copia de seguridad").setInputFiles({
    name: "otro.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"hola":1}'),
  });
  await expect(page.getByText("El archivo no es una copia de TRAZZO.")).toBeVisible();
});
