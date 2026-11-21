import { chromium, devices } from "@playwright/test";

const baseURL = process.env.TRAZZO_AUDIT_URL ?? "http://127.0.0.1:3000";
const routes = [
  "/",
  "/normativa",
  "/normativa?tab=medidas",
  "/calculadoras",
  ...["rampas", "escalas", "techo", "ocupacion", "pies"].map((tab) => "/calculadoras?tab=" + tab),
  "/metrados",
  "/bitacora",
  "/estudio",
  "/matriz",
  "/honorarios",
  "/asistente",
  "/cuenta",
];
const viewports = [
  { viewport: { width: 1440, height: 900 } },
  { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
];

async function populateWorkspace(page) {
  await page.goto("/metrados");
  await page.getByRole("button", { name: "Nuevo proyecto" }).click();
  await page.getByPlaceholder("Casa Miraflores").fill("Vivienda en Barranco");
  await page.getByRole("button", { name: "Crear proyecto", exact: true }).click();
  await page
    .locator(".project-sidebar")
    .getByText("Vivienda en Barranco", { exact: true })
    .waitFor();
  await page.getByText("Generar ambiente rectangular rápido").click();
  await page.getByRole("button", { name: "Agregar 4 partidas" }).click();
  await page.getByText(/Se agregaron 4 partidas/).waitFor();
  await page.getByRole("link", { name: "Nueva visita" }).click();
  await page.getByLabel("Fecha de visita").fill("2026-11-20");
  await page.getByLabel("Hallazgos", { exact: true }).fill("Verificar niveles del eje A.");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByRole("list", { name: "Visitas de obra" }).getByText("20/11/2026").waitFor();
  return new URL(page.url()).search;
}

async function inspectLayout(page) {
  return page.evaluate(() => {
    const failures = [];
    const viewport = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    if (scrollWidth > viewport) failures.push(`Ancho del documento ${scrollWidth} > ${viewport}`);

    // Compare controls and text within the same shell region. The sticky header and
    // fixed navigation get separate scopes so page scrolling cannot cause false hits.
    const selector = "button, a, input, select, textarea, label, .badge, .chip, h1, h2, h3, strong";
    const groups = new Map();
    for (const element of document.querySelectorAll(selector)) {
      const scope = element.closest(".header, .bottom-nav, .sidebar, main");
      if (!scope || !element.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
        continue;
      let { left, right, top, bottom } = element.getBoundingClientRect();
      let excluded = false;
      for (let parent = element; parent && parent !== scope; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (style.position === "fixed" || style.clipPath !== "none" || style.clip !== "auto") {
          excluded = true;
          break;
        }
        if (parent === element) continue;
        const bounds = parent.getBoundingClientRect();
        if (style.overflowX !== "visible") {
          left = Math.max(left, bounds.left);
          right = Math.min(right, bounds.right);
        }
        if (style.overflowY !== "visible") {
          top = Math.max(top, bounds.top);
          bottom = Math.min(bottom, bounds.bottom);
        }
      }
      if (excluded || right - left <= 2 || bottom - top <= 2) continue;
      const boxes = groups.get(scope) ?? [];
      boxes.push({ element, left, right, top, bottom });
      groups.set(scope, boxes);
    }
    const describe = (element) => {
      const name = element.getAttribute("aria-label") || element.id || element.textContent.trim();
      const container = element.parentElement.classList[0] || element.parentElement.localName;
      return `${element.localName}[${name.slice(0, 45)}] (${container})`;
    };
    for (const boxes of groups.values()) {
      boxes.sort((a, b) => a.top - b.top);
      for (let i = 0; i < boxes.length; i++) {
        const a = boxes[i];
        for (let j = i + 1; j < boxes.length; j++) {
          const b = boxes[j];
          if (b.top >= a.bottom - 2) break;
          const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const height = Math.min(a.bottom, b.bottom) - b.top;
          if (
            width <= 2 ||
            height <= 2 ||
            a.element.contains(b.element) ||
            b.element.contains(a.element)
          )
            continue;
          failures.push(
            `${describe(a.element)} × ${describe(b.element)} (${width.toFixed(1)} × ${height.toFixed(1)} px)`,
          );
        }
      }
    }

    const nav = [...document.querySelectorAll(".sidebar-nav, .bottom-nav")].find((item) =>
      item.checkVisibility(),
    );
    const links = [...(nav?.querySelectorAll("a") ?? [])].map((item) => item.getAttribute("href"));
    if (links.join("|") !== "/|/normativa|/calculadoras|/metrados|/bitacora|/estudio") {
      failures.push("Destinos principales incorrectos: " + links.join(", "));
    }

    for (const label of document.querySelectorAll(".bottom-nav a span")) {
      if (!label.checkVisibility()) continue;
      const range = document.createRange();
      range.selectNodeContents(label);
      if (range.getClientRects().length !== 1 || label.scrollWidth > label.clientWidth) {
        failures.push(`Etiqueta de navegación recortada o en dos líneas: ${label.textContent}`);
      }
    }

    const status = document.querySelector(".status-cards");
    const featured = document.querySelector(".site-log-featured");
    if (status && featured) {
      const gap = featured.getBoundingClientRect().top - status.getBoundingClientRect().bottom;
      if (Math.abs(gap - 20) > 0.5)
        failures.push(`Separación de Inicio: ${gap} px, se esperan 20 px`);
    }
    return failures;
  });
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
const problems = [];
let inspected = 0;
try {
  for (const device of viewports) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ ...device, baseURL, reducedMotion: "reduce" });
      await context.addInitScript((mode) => {
        localStorage.setItem("trazzo-theme", mode);
        localStorage.setItem("trazzo-onboarding", '{"done":true}');
      }, theme);
      const page = await context.newPage();
      const report = (message) =>
        problems.push(
          `${device.viewport.width}×${device.viewport.height} ${theme} ${new URL(page.url()).pathname}: ${message}`,
        );
      page.on("pageerror", (error) => report(error.message));
      page.on("console", (entry) => {
        if (entry.type() === "error") report(entry.text());
      });
      const logQuery = await populateWorkspace(page);
      for (const route of routes) {
        await page.goto(route === "/bitacora" ? route + logQuery : route);
        await page.locator("main h1").waitFor();
        if (route === "/metrados") {
          await page.locator(".takeoff-table tbody tr").first().waitFor();
          await page
            .getByLabel("Material", { exact: true })
            .selectOption("concreto-premezclado-fc210");
          const generator = page.getByText("Generar ambiente rectangular rápido");
          if (!(await generator.evaluate((summary) => summary.parentElement.open))) {
            await generator.click();
          }
          await page.evaluate(() => window.scrollTo(0, 0));
        }
        await page.evaluate(() => document.fonts.ready);
        for (const problem of await inspectLayout(page)) report(problem);
        inspected++;
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
}
console.log(`${inspected} pantallas revisadas. ${problems.length} incidencias.`);
