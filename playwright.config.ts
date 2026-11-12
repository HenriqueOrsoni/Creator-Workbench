import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta (E2E). Rodam contra o app já iniciado em http://localhost:3000
 * (npm run dev ou npm run start). Execute com: npm run test:e2e
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
