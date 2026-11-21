import { expect, test, type Page } from "@playwright/test";
import { createProject } from "./helpers";

function replaceLocalRow(
  page: Page,
  input: { table: string; key: string; values: Record<string, unknown> },
) {
  return page.evaluate(
    ({ table, key, values }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("TrazzoDB");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const database = open.result;
          const tx = database.transaction(table, "readwrite");
          const store = tx.objectStore(table);
          const row = store.get(key);
          row.onsuccess = () => store.put({ ...row.result, ...values });
          tx.oncomplete = () => {
            database.close();
            resolve();
          };
          tx.onabort = () => {
            database.close();
            reject(tx.error);
          };
        };
      }),
    input,
  );
}

test("Inicio abre una pregunta en el asistente y el historial dañado permite un chat temporal", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const question = "¿Cuál es el ancho mínimo de una rampa?";
  await page.getByRole("link", { name: question, exact: true }).click();
  const composer = page.getByRole("textbox", { name: "Pregunta al asistente RNE" });
  await expect(composer).toHaveValue(question);
  await expect(page).toHaveURL(/\/asistente$/);
  await expect(page.locator(".chat-message")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Borrar historial de este dispositivo" }),
  ).toBeHidden();

  await expect(composer).toBeEnabled();
  await replaceLocalRow(page, {
    table: "meta",
    key: "assistant-history",
    values: { key: "assistant-history", value: "{" },
  });
  await page.reload();
  await expect(page.getByText(/No se pudo leer el historial/)).toBeVisible();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await composer.fill("ancho de puerta accesible");
  await page.getByRole("button", { name: "Enviar consulta" }).click();
  await expect(page.locator(".chat-message.assistant")).toContainText("0.90");
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByText(/No se pudo leer el historial/)).toBeVisible();
  await page.getByRole("button", { name: "Restablecer" }).click();
  await expect(page.getByText(/No se pudo leer el historial/)).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Borrar historial de este dispositivo" }),
  ).toBeVisible();
});

test("la ficha guarda y limpia el área, mantiene los parámetros y devuelve el foco al cerrar", async ({
  page,
}) => {
  await createProject(page, "Proyecto con ficha");
  const area = page.getByRole("textbox", { name: "Área construida" });
  await expect(area).toHaveValue("");
  await area.press("/");
  await area.press("Control+k");
  await expect(area).toHaveValue("/");
  await expect(page.locator(".mobile-search-sheet")).toBeHidden();
  await area.fill("120,50");
  await expect(page.getByText("120.5 m²", { exact: true })).toBeVisible();
  await expect(page.getByText("Guardado", { exact: true })).toBeVisible();
  await area.fill("1.234,50");
  await expect(area).toHaveAttribute("aria-invalid", "true");
  await area.blur();
  await expect(area).toHaveValue("1.234,50");
  await page.reload();
  await expect(area).toHaveValue("120.5");
  await area.fill("");
  await expect(page.getByText("Guardado", { exact: true })).toBeVisible();
  await page.goto("/metrados?desde=prueba");
  await expect(area).toHaveValue("");

  const duplicate = page.getByRole("button", { name: "Duplicar", exact: true });
  await duplicate.click();
  await expect(page.getByRole("dialog", { name: "Función de plan superior" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(duplicate).toBeFocused();
  await page.getByRole("button", { name: "Eliminar Proyecto con ficha", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "¿Eliminar Proyecto con ficha?" });
  await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Eliminar", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "Metrados y presupuesto" }).click();
  expect(new URL(page.url()).searchParams.get("desde")).toBe("prueba");
  const editor = page.locator("#partidas");
  await editor.getByLabel("Capítulo").fill("Estructuras");
  const submit = editor.getByRole("button", { name: "Agregar partida" });
  await submit.click();
  await expect(editor.getByLabel("Partida", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await editor.getByLabel("Partida", { exact: true }).fill("Muro");
  const price = editor.getByLabel("Precio unitario (S/)", { exact: true });
  await price.fill("");
  await submit.click();
  await expect(price).toHaveAttribute("aria-invalid", "true");
  await price.fill("0");
  await submit.click();
  const line = page.locator(".takeoff-mobile-list > li").first();
  await expect(line).toContainText("S/ 0.00");
  await expect(page.getByText("Partida agregada.", { exact: true })).toBeVisible();
});

test("Bitácora recupera cambios tras navegar y los elimina al descartarlos", async ({ page }) => {
  await page.goto("/bitacora");
  const findings = page.getByLabel("Hallazgos", { exact: true });
  await findings.fill("Revisar el eje D");
  await page
    .getByRole("navigation", { name: "Navegación móvil" })
    .getByRole("link", { name: "Inicio" })
    .click();
  await page
    .getByRole("navigation", { name: "Navegación móvil" })
    .getByRole("link", { name: "Bitácora" })
    .click();
  await expect(findings).toHaveValue("Revisar el eje D");
  await expect(page.getByText("Recuperamos cambios sin guardar")).toBeVisible();
  await page.getByRole("button", { name: "Descartar", exact: true }).click();
  await page.reload();
  await expect(findings).toHaveValue("");
  await expect(page.getByText("Recuperamos cambios sin guardar")).toBeHidden();
});

test("Honorarios actualiza una ficha limpia y conserva una ficha con cambios", async ({ page }) => {
  await page.goto("/honorarios");
  const name = page.getByPlaceholder("Casa Miraflores");
  await name.fill("Cotización inicial");
  await page.getByRole("button", { name: "Guardar cotización" }).click();
  await expect(page).toHaveURL(/quote=/);
  const quoteId = new URL(page.url()).searchParams.get("quote")!;
  // Writes through Dexie in a second page so the live query sees a version change.
  const other = await page.context().newPage();
  await other.goto("/honorarios?quote=" + quoteId);
  await expect(other.getByPlaceholder("Casa Miraflores")).toHaveValue("Cotización inicial");
  await other.getByPlaceholder("Casa Miraflores").fill("Cotización actualizada");
  await other.getByRole("button", { name: "Guardar cotización" }).click();
  await expect(name).toHaveValue("Cotización actualizada");

  await name.fill("Edición local");
  await other.getByPlaceholder("Casa Miraflores").fill("Cotización más reciente");
  await other.getByRole("button", { name: "Guardar cotización" }).click();
  await expect(page.getByText(/Hay una versión más reciente/)).toBeVisible();
  await expect(name).toHaveValue("Edición local");
  await page.getByRole("button", { name: "Nueva", exact: true }).click();
  const prompt = page.getByRole("dialog", { name: "¿Guardar los cambios de la cotización?" });
  await prompt.getByRole("button", { name: "Cancelar" }).click();
  await expect(name).toHaveValue("Edición local");
  await page.getByRole("button", { name: "Nueva", exact: true }).click();
  await prompt.getByRole("button", { name: "Descartar" }).click();
  await expect(name).toHaveValue("");

  await name.fill("Cotización para guardar");
  await page.getByRole("button", { name: /Cotización más reciente/ }).click();
  await prompt.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(name).toHaveValue("Cotización más reciente");
  await expect(page.getByRole("button", { name: /Cotización para guardar/ })).toBeVisible();
});
