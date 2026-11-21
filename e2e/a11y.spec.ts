import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/normativa",
  "/normativa/escalera-paso-contrapaso",
  "/calculadoras",
  "/calculadoras?tab=materiales",
  "/calculadoras?tab=utilidades",
  "/calculadoras?tab=cabida",
  "/calculadoras?tab=aforo",
  "/calculadoras?tab=escalas",
  "/calculadoras?tab=techo",
  "/calculadoras?tab=ocupacion",
  "/calculadoras?tab=pies",
  "/bitacora",
  "/estudio",
  "/matriz",
  "/normativa?tab=medidas",
  "/metrados",
  "/honorarios",
  "/asistente",
  "/cuenta",
  "/login",
  "/register",
];

for (const theme of ["dark", "light"]) {
  test("accesibilidad AA en todas las pantallas, tema " + theme, async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript((value) => localStorage.setItem("trazzo-theme", value), theme);
    const problems: string[] = [];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      for (const violation of results.violations) {
        for (const node of violation.nodes) {
          problems.push(route + " · " + violation.id + " · " + node.target.join(" "));
        }
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
}

test.describe("estados interactivos", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("bienvenida y buscador abierto cumplen AA", async ({ page }) => {
    const scan = async (): Promise<string[]> => {
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      return results.violations.flatMap((violation) =>
        violation.nodes.map((node) => violation.id + " · " + node.target.join(" ")),
      );
    };
    await page.goto("/cuenta");
    await page.getByRole("button", { name: "Ver bienvenida" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    expect(await scan()).toEqual([]);
    await dialog.getByRole("button", { name: "Continuar" }).click();
    expect(await scan()).toEqual([]);

    // Escape cierra la bienvenida y el foco queda en la página.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.goto("/");
    const search = page.getByRole("dialog", { name: "Buscar en el RNE" });
    const query = search.getByRole("combobox", { name: "Buscar en TRAZZO" });
    await expect(async () => {
      await page.keyboard.press("Control+k");
      await expect(query).toBeFocused({ timeout: 400 });
    }).toPass({ timeout: 5000 });
    await query.fill("rampa");
    await expect(page.getByRole("option").first()).toBeVisible();
    expect(await scan()).toEqual([]);
  });
});
