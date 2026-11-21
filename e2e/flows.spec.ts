import { expect, test } from "@playwright/test";
import { createProject } from "./helpers";

test("una cotización guardada se vincula a su proyecto", async ({ page }) => {
  await createProject(page, "Casa vinculada");
  await expect(page.getByRole("heading", { name: "Casa vinculada" })).toBeVisible();

  await page.goto("/honorarios");
  await page.getByPlaceholder("Casa Miraflores").fill("Honorarios casa");
  await page.getByRole("button", { name: "Guardar cotización" }).click();
  await expect(page.getByText("Cotización guardada localmente.")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Proyecto de esta cotización" })
    .selectOption({ label: "Casa vinculada" });

  await page.goto("/metrados");
  const hub = page.locator(".project-hub");
  await expect(hub.getByRole("link", { name: /COT-\d{4}-\d+/ })).toBeVisible();
  await hub.getByRole("link", { name: /COT-\d{4}-\d+/ }).click();
  await expect(page).toHaveURL(/honorarios\?quote=/);
  await expect(page.getByPlaceholder("Casa Miraflores")).toHaveValue("Honorarios casa");
});

test("todas las pantallas principales abren sin conexión", async ({ page, context }) => {
  await page.goto("/");
  // El service worker termina de guardar las rutas antes de cortar la red.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForTimeout(1500);
  await page.reload();
  await context.setOffline(true);
  const screens: Array<[string, string]> = [
    ["/normativa", "Normativa para decidir"],
    ["/normativa/escalera-paso-contrapaso", "Relación paso–contrapaso"],
    ["/calculadoras", "Cotas para decidir"],
    ["/medidas", "Medidas"],
    ["/matriz", "Matriz"],
    ["/estudio", "Estudio profesional"],
    ["/metrados", "Metrados"],
    ["/bitacora", "Bitácora de obra"],
    ["/honorarios", "Honorarios"],
    ["/asistente", "Consulta el RNE"],
    ["/cuenta", "Tu espacio TRAZZO"],
  ];
  for (const [route, heading] of screens) {
    await page.goto(route);
    await expect(
      page.getByRole("heading", { level: 1 }).filter({ hasText: heading }).first(),
      route,
    ).toBeVisible();
  }
});

test("las fotos de obra se guardan en el proyecto", async ({ page }) => {
  await createProject(page, "Obra con fotos");
  await expect(page.getByRole("heading", { name: "Fotos de obra" })).toBeVisible();

  // Una imagen grande generada en la página hace de foto de cámara.
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1800;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#b5822f";
    context.fillRect(0, 0, 2400, 1800);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((value) => resolve(value!), "image/png"),
    );
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await page.getByLabel("Foto de obra", { exact: true }).setInputFiles({
    name: "obra.png",
    mimeType: "image/png",
    buffer: Buffer.from(bytes),
  });

  const photo = page.locator(".project-photos img");
  await expect(photo).toHaveCount(1);
  // Se guarda reducida a 1280 px y como JPEG.
  // naturalWidth is 0 until the browser decodes the data URL: wait for it first.
  const stored = await photo.evaluate(async (image: HTMLImageElement) => {
    await image.decode();
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      jpeg: image.src.startsWith("data:image/jpeg"),
    };
  });
  expect(stored).toEqual({ width: 1280, height: 960, jpeg: true });

  await page.getByLabel("Nota de la foto 1").fill("Encofrado eje A");
  await page.getByLabel("Nota de la foto 1").blur();
  await page.reload();
  await expect(page.getByLabel("Nota de la foto 1")).toHaveValue("Encofrado eje A");
  await page.getByRole("button", { name: "Quitar foto 1" }).click();
  await expect(page.locator(".project-photos img")).toHaveCount(0);
});
