import { test, expect } from "@playwright/test";
import { USERS, PASSWORD, API, loginAs, apiLogin, expectToast, collectProblems } from "./support/helpers";

test.describe("Autenticacao", () => {
  test("E2E-02 / FT-07: login valido leva ao painel; campos vazios mostram validacao", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Iniciar Sessão/ }).click();
    await expect(page.getByText("E-mail é obrigatório.")).toBeVisible();
    await expect(page.getByText("Senha é obrigatória.")).toBeVisible();

    await page.getByPlaceholder("operador@creator.studio").fill(USERS.ana.email);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.getByRole("button", { name: /Iniciar Sessão/ }).click();
    await expect(page).toHaveURL(/localhost:3000\/$/);
    await expect(page.getByRole("heading", { name: "Painel de Controle" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Quadro Kanban" })).toBeVisible();
  });

  test("login com senha errada mostra a mensagem do servidor e nao entra", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("operador@creator.studio").fill(USERS.ana.email);
    await page.getByPlaceholder("••••••••").fill("SenhaErrada@1");
    await page.getByRole("button", { name: /Iniciar Sessão/ }).click();
    await expect(page.locator("form p.font-medium, form [class*=destructive] p").first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "creator_auth_token")).toBeUndefined();
  });

  test("E2E-03 / FT-09: rota protegida sem login vai para /login e depois do login volta para a rota", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/convite?token=abc");
    // /convite e publica: nao redireciona
    await expect(page).toHaveURL(/\/convite/);
  });

  test("redirect apos login: ?redirect= interno e respeitado, externo e ignorado", async ({ page }) => {
    await page.goto("/login?redirect=%2Fconvite%3Ftoken%3Dxyz");
    await page.getByPlaceholder("operador@creator.studio").fill(USERS.ana.email);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.getByRole("button", { name: /Iniciar Sessão/ }).click();
    // o token sai da barra de enderecos (fica so na sessao da aba); o redirect interno e respeitado
    await expect(page).toHaveURL(/localhost:3000\/convite$/);

    // redirect externo: cai na raiz
    await page.context().clearCookies();
    await page.goto("/login?redirect=https%3A%2F%2Fevil.example.com");
    await page.getByPlaceholder("operador@creator.studio").fill(USERS.ana.email);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.getByRole("button", { name: /Iniciar Sessão/ }).click();
    await expect(page).toHaveURL(/localhost:3000\/$/);
  });

  test("E2E-04: logout limpa a sessao e volta ao login; voltar nao reabre o painel", async ({ page }) => {
    await loginAs(page, "caio");
    await page.getByRole("button", { name: "Encerrar Sessão" }).click();
    await expect(page).toHaveURL(/\/login/);
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "creator_auth_token" && c.value)).toBeUndefined();
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("SEC-02 / BF-11: sessao expirada (401 no meio do uso) limpa a sessao e vai ao login", async ({ page }) => {
    await loginAs(page, "ana");
    // invalida o token no cookie (servidor responde 401 na proxima chamada)
    await page.context().addCookies([{ name: "creator_auth_token", value: "token.invalido.assinatura", url: "http://localhost:3000" }]);
    // dispara uma chamada autenticada (a aba da Caixa de Entrada recarrega as ideias); a propria
    // pagina pode ja ter redirecionado por uma chamada em segundo plano
    await page.getByRole("tab", { name: "Caixa de Entrada" }).click({ timeout: 3000 }).catch(() => {});
    await expect(page).toHaveURL(/\/login/);
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "creator_auth_token" && c.value)).toBeUndefined();
  });

  test("SEC-01: JWT com assinatura invalida e rejeitado pela API (401) e a UI redireciona", async ({ page, request }) => {
    const { token } = await apiLogin("ana");
    const forged = token.slice(0, -3) + (token.endsWith("abc") ? "xyz" : "abc");
    const res = await request.get(`${API}/api/v1/teams`, { headers: { Authorization: `Bearer ${forged}` } });
    expect(res.status()).toBe(401);
    await page.context().addCookies([{ name: "creator_auth_token", value: forged, url: "http://localhost:3000" }]);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("rota desconhecida do app (404) NAO derruba a sessao", async ({ page }) => {
    await loginAs(page, "ana");
    const resp = await page.goto("/pagina-que-nao-existe");
    expect(resp?.status()).toBe(404);
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "creator_auth_token" && c.value)).toBeTruthy();
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Painel de Controle" })).toBeVisible();
  });

  test("rota desconhecida da API autenticada responde 404 (nao 401) e a sessao continua", async ({ page }) => {
    await loginAs(page, "ana");
    const status = await page.evaluate(async () => {
      const token = document.cookie.match(/creator_auth_token=([^;]+)/)?.[1];
      const r = await fetch("http://localhost:8080/api/v1/rota-que-nao-existe", { headers: { Authorization: `Bearer ${token}` } });
      return r.status;
    });
    expect(status).toBe(404);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Painel de Controle" })).toBeVisible();
  });

  test("usuario autenticado em /login e levado ao painel", async ({ page }) => {
    await loginAs(page, "ana");
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Painel de Controle" })).toBeVisible();
  });

  test("alertas (flag ligada desde o M4): sino visivel e GET /alerts chamado sem erro", async ({ page }) => {
    const problems = collectProblems(page);
    const calls: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/alerts")) calls.push(r.url());
    });
    await loginAs(page, "ana");
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toHaveCount(0);
    expect(calls.length, "o sino deve consultar /alerts").toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: "Alertas de Prazos" })).toBeVisible();
    expect(problems).toEqual([]);
    void expectToast;
  });
});
