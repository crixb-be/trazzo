import { expect, test } from "@playwright/test";

test("una cotización guardada se vincula a su proyecto", async ({ page }) => {
  await page.goto("/metrados");
  await page.getByRole("button", { name: "Nuevo proyecto" }).click();
  await page.getByPlaceholder("Casa Miraflores").fill("Casa vinculada");
  await page.getByRole("button", { name: "Crear proyecto", exact: true }).click();
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
    ["/metrados", "Metrados"],
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
