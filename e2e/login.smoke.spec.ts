import { test, expect } from "@playwright/test";

test("a página de login carrega", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Acesso ao Estúdio" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Iniciar Sessão/ })).toBeVisible();
});
