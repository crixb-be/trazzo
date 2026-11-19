import { expect, type Page } from "@playwright/test";

/**
 * Creates a project from /metrados and waits until IndexedDB has stored it.
 * The dialog closes only after the write commits and the sidebar list (a live query
 * on IndexedDB) shows the name: navigating earlier can abort the write.
 */
export async function createProject(page: Page, name: string): Promise<void> {
  await page.goto("/metrados");
  await page.getByRole("button", { name: "Nuevo proyecto" }).click();
  await page.getByPlaceholder("Casa Miraflores").fill(name);
  await page.getByRole("button", { name: "Crear proyecto", exact: true }).click();
  await expect(page.locator(".project-dialog")).toHaveCount(0);
  await expect(page.locator(".project-sidebar").getByText(name, { exact: true })).toBeVisible();
}
