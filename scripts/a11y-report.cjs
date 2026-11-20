// Prints every WCAG 2.1 AA finding per theme against a running build.
// Usage: node scripts/a11y-report.cjs [baseUrl]
const { chromium, devices } = require("@playwright/test");
const { AxeBuilder } = require("@axe-core/playwright");

const base = process.argv[2] ?? "http://127.0.0.1:3000";
const routes = [
  "/",
  "/normativa",
  "/normativa/escalera-paso-contrapaso",
  "/calculadoras",
  "/calculadoras?tab=materiales",
  "/calculadoras?tab=utilidades",
  "/calculadoras?tab=cabida",
  "/calculadoras?tab=aforo",
  "/estudio",
  "/matriz",
  "/medidas",
  "/metrados",
  "/honorarios",
  "/asistente",
  "/cuenta",
  "/login",
  "/register",
];

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
  for (const theme of ["dark", "light"]) {
    const context = await browser.newContext({ ...devices["Pixel 7"] });
    await context.addInitScript((value) => {
      localStorage.setItem("trazzo-theme", value);
      localStorage.setItem(
        "trazzo-onboarding",
        JSON.stringify({ done: true, role: null, tools: [] }),
      );
    }, theme);
    const page = await context.newPage();
    const seen = new Map();
    for (const route of routes) {
      await page.goto(base + route, { waitUntil: "networkidle" });
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      for (const violation of results.violations) {
        for (const node of violation.nodes) {
          const data = node.any[0]?.data ?? {};
          const detail =
            violation.id === "color-contrast"
              ? `${data.fgColor} on ${data.bgColor} = ${data.contrastRatio} (${data.fontSize})`
              : (node.any[0]?.message ?? node.failureSummary ?? "").slice(0, 110);
          const key = `${violation.id} | ${node.target.join(" ").replace(/:nth-child\(\d+\)/g, "")} | ${detail}`;
          seen.set(key, (seen.get(key) ?? new Set()).add(route));
        }
      }
    }
    console.log(`\n== ${theme}: ${seen.size} distinct`);
    for (const [key, where] of seen)
      console.log(
        `${key} | ${[...where].slice(0, 2).join(",")}${where.size > 2 ? " +" + (where.size - 2) : ""}`,
      );
    await context.close();
  }
  await browser.close();
})();
