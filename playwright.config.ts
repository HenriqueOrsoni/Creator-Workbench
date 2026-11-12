import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta (E2E). Rodam contra o app já iniciado em http://localhost:3000
 * (npm run dev ou npm run start) e o backend em http://localhost:8080 apontando para o banco
 * de testes db_tcc_e2e (veja e2e/README.md). Execute com: npm run test:e2e
 *
 * Os specs compartilham o mesmo banco, por isso rodam em série (1 worker).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  retries: 0,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    acceptDownloads: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
