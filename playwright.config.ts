import { defineConfig, devices } from "@playwright/test";

// Las pruebas parten con la bienvenida ya vista; la prueba de bienvenida la reactiva.
const welcomed = {
  cookies: [],
  origins: [
    {
      origin: "http://127.0.0.1:3000",
      localStorage: [
        { name: "trazzo-onboarding", value: JSON.stringify({ done: true, role: null, tools: [] }) },
      ],
    },
  ],
};

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:3000",
    ...devices["Pixel 7"],
    storageState: welcomed,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
