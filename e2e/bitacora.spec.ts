import { expect, test } from "@playwright/test";
import { createProject } from "./helpers";

test("registra una visita de obra y agrega un ambiente a los metrados desde un móvil", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  let offline = false;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (entry) => {
    if (entry.type() !== "error") return;
    const message = entry.text();
    // Offline route prefetch can fall back to the service worker's cached HTML.
    if (offline && /^(Failed to fetch RSC payload|Failed to load resource)/.test(message)) return;
    errors.push(message);
  });
  await createProject(page, "Casa Barranco");
  await page.getByRole("link", { name: "Nueva visita" }).click();
  await expect(page).toHaveURL(/bitacora\?project=/);
  await expect(page.getByRole("heading", { name: "Bitácora de obra", exact: true })).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Proyecto", exact: true }).locator("option:checked"),
  ).toHaveText("Casa Barranco");

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  offline = true;
  await page.context().setOffline(true);
  await page.getByLabel("Fecha de visita").fill("2026-11-20");
  await page.getByLabel("Asistentes").fill("Rosa Flores y residente");
  await page
    .getByLabel("Estado de los trabajos", { exact: true })
    .fill("Encofrado terminado en el primer piso.");
  await page.getByLabel("Hallazgos", { exact: true }).fill("Verificar niveles del eje A.");
  const topic = page.getByRole("button", { name: "Estructuras", exact: true });
  await topic.click();
  await expect(topic).toHaveAttribute("aria-pressed", "true");
  const photo = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Foto de la visita", { exact: true }).setInputFiles({
    name: "obra.png",
    mimeType: "image/png",
    buffer: Buffer.from(photo, "base64"),
  });
  await page.getByLabel("Descripción de la foto 1").fill("Encofrado");
  await expect(page.getByText("Cambios sin guardar")).toBeVisible();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page).toHaveURL(/log=/);
  await expect(
    page.getByRole("list", { name: "Visitas de obra" }).getByText("20/11/2026"),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Hallazgos", { exact: true })).toHaveValue(
    "Verificar niveles del eje A.",
  );
  await expect(topic).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Descripción de la foto 1")).toHaveValue("Encofrado");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar Informe PDF" }).click();
  expect((await download).suggestedFilename()).toBe("bitacora-casa-barranco-2026-11-20.pdf");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  await page.context().setOffline(false);
  offline = false;
  await page.goto("/metrados");
  const stages = page.getByRole("list", { name: "Etapas del proyecto" });
  await expect(stages.getByRole("link", { name: "Sitio y Cabida" })).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(stages.getByRole("link", { name: /Obra y Bitácora/ })).toHaveText(/Completada/);
  await expect(page.getByRole("link", { name: /Visita de obra/ })).toHaveAttribute(
    "href",
    /bitacora\?log=/,
  );
  await page.getByText("Generar ambiente rectangular rápido").click();
  await page.getByLabel("Largo").fill("5");
  await expect(page.getByRole("definition").filter({ hasText: /^15 m²$/ })).toHaveCount(3);
  await page.getByRole("button", { name: "Agregar 4 partidas" }).click();
  await expect(page.getByText(/Se agregaron 4 partidas/)).toBeVisible();
  await expect(stages.getByRole("link", { name: /Costos y Metrados/ })).toHaveText(/Completada/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});
