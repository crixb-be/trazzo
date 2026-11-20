import { expect, test } from "@playwright/test";

test("Estudio abre desde la barra móvil y conserva las marcas del expediente", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");

  const nav = page.getByRole("navigation", { name: "Navegación móvil" });
  await expect(nav.getByRole("link")).toHaveText([
    "Inicio",
    "Normas",
    "Calcular",
    "Proyectos",
    "Estudio",
    "Asistente",
  ]);
  expect(await nav.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(360);
  const studio = nav.getByRole("link", { name: "Estudio" });
  await studio.click();
  await expect(page).toHaveURL(/\/estudio$/);
  await expect(studio).toHaveAttribute("aria-current", "page");

  for (const title of [
    "Matriz de Relaciones Ponderadas",
    "Honorarios y Propuestas",
    "Checklist de Expediente RNE",
    "Identidad y Tarifario del Estudio",
  ]) {
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  }

  const item = page.getByRole("checkbox", { name: /Planos de ubicación y localización/ });
  await item.check();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "1");
  await page.reload();
  await expect(item).toBeChecked();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "1");
  await page.getByRole("button", { name: "Reiniciar" }).click();
  await expect(item).not.toBeChecked();
  await page.reload();
  await expect(item).not.toBeChecked();

  for (const [label, route] of [
    ["Matriz de Relaciones Ponderadas", "/matriz"],
    ["Honorarios y Propuestas", "/honorarios"],
  ]) {
    await page.getByRole("link", { name: new RegExp(label) }).click();
    await expect(page).toHaveURL(new RegExp(route + "$"));
    await expect(studio).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Proyectos" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
    await studio.click();
  }

  const avatar = page.getByRole("link", { name: "Abrir cuenta y planes" });
  await avatar.click();
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(avatar).toHaveAttribute("aria-current", "page");
});
