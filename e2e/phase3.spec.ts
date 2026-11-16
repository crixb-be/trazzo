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
