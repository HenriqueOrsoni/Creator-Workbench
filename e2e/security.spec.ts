import { test, expect } from "@playwright/test";
import {
  loginAs, openTab, uniq, apiCreateTeam, apiCreateProject, apiCreateIdea, apiLogin, api, boardCard, inboxCard, API, USERS, PASSWORD,
} from "./support/helpers";

test.describe("Seguranca no navegador", () => {
  let team = "";
  test.beforeAll(async () => {
    team = uniq("Equipe Seguranca");
    await apiCreateTeam(team);
  });

  test("SEC-07: HTML malicioso no roteiro (salvo por outro membro) nao executa script ao abrir editor nem a previa de versao", async ({ page }) => {
    const title = uniq("Projeto xss");
    const proj = await apiCreateProject(title, "ana", team);
    const { token } = await apiLogin("caio");
    const payload = '<p>Texto</p><img src="x" onerror="window.__xss=(window.__xss||0)+1"><script>window.__xss=(window.__xss||0)+10</script>';
    expect((await api(token, "PUT", `/api/v1/kanban/${proj.id}/script`, { content: payload })).status).toBe(200);
    expect((await api(token, "POST", `/api/v1/kanban/${proj.id}/script/versions`)).status).toBe(200);

    await page.addInitScript(() => {
      (window as any).__xss = 0;
    });
    await loginAs(page, "ana", team);
    await boardCard(page, title).click();
    await openTab(page, "Estúdio de Escrita");
    await expect(page.locator(".ProseMirror")).toContainText("Texto");
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as any).__xss), "XSS ao abrir o editor").toBe(0);
    await page.getByRole("button", { name: /Revisões \(1\)/ }).click();
    await page.getByText("VERSÃO", { exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Pré-visualizar e Restaurar Versão" })).toBeVisible();
    await page.waitForTimeout(800);
    const fired = await page.evaluate(() => (window as any).__xss);
    expect(fired, "[BUG] onerror do roteiro executou ao abrir a previa de versao (ScriptEditor dangerouslySetInnerHTML)").toBe(0);
  });

  test("SEC-07: HTML/script no titulo e na descricao de ideias e escapado na interface", async ({ page }) => {
    const marker = uniq("XSS");
    const t = `${marker} <img src=x onerror="window.__xss=1">`;
    await apiCreateIdea({ title: t, description: '<script>window.__xss=2</script><b>negrito?</b>' }, "ana", team);
    await page.addInitScript(() => {
      (window as any).__xss = 0;
    });
    await loginAs(page, "ana", team);
    await openTab(page, "Caixa de Entrada");
    await expect(inboxCard(page, t)).toBeVisible(); // texto literal, nao interpretado
    expect(await page.evaluate(() => (window as any).__xss)).toBe(0);
    expect(await page.locator("b", { hasText: "negrito?" }).count()).toBe(0);
  });

  test("SEC-05/SEC-08: o token da sessao fica em cookie legivel por JS (limitacao conhecida) com SameSite=Lax", async ({ page }) => {
    await loginAs(page, "ana", team);
    const cookies = await page.context().cookies();
    const tok = cookies.find((c) => c.name === "creator_auth_token");
    expect(tok).toBeTruthy();
    // documenta o estado atual: o cookie e criado pelo JS (nao HttpOnly)
    console.log("cookie creator_auth_token: httpOnly=", tok!.httpOnly, "sameSite=", tok!.sameSite, "secure=", tok!.secure);
  });

  test("SEC-09: CORS rejeita origem nao autorizada e aceita a do frontend", async ({ request }) => {
    const bad = await request.fetch(`${API}/api/auth/login`, {
      method: "OPTIONS",
      headers: { Origin: "https://evil.example.com", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" },
    });
    expect(bad.headers()["access-control-allow-origin"]).toBeUndefined();
    const ok = await request.fetch(`${API}/api/auth/login`, {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" },
    });
    expect(ok.headers()["access-control-allow-origin"]).toBe("http://localhost:3000");
  });

  test("SEC-06: busca de ideias com SQL injection e tratada como texto (sem erro 500, sem vazar dados)", async () => {
    const { token } = await apiLogin("ana");
    const teams = (await api(token, "GET", "/api/v1/teams")).body as any[];
    const t = teams[0].id;
    for (const q of ["' OR '1'='1", "'; DROP TABLE users; --", "%' UNION SELECT password FROM users --"]) {
      const r = await api(token, "GET", `/api/v1/teams/${t}/ideas?q=${encodeURIComponent(q)}`);
      expect(r.status).toBe(200);
      expect(Array.isArray(r.body)).toBe(true);
      expect(r.body).toHaveLength(0);
    }
    expect((await api(null, "POST", "/api/auth/login", { email: USERS.ana.email, password: PASSWORD })).status).toBe(200);
  });

  test("SEC-04/NFR: login com senha errada nao revela se o e-mail existe (mesma resposta)", async () => {
    const a = await api(null, "POST", "/api/auth/login", { email: USERS.ana.email, password: "errada" });
    const b = await api(null, "POST", "/api/auth/login", { email: "ninguem.e2e@creatorworkbench.test", password: "errada" });
    expect(a.status).toBe(b.status);
    expect(a.body.message).toBe(b.body.message);
    console.log("mensagem de login invalido:", a.status, a.body.message);
  });

  test("SEC-11: a API envia X-Content-Type-Options e X-Frame-Options", async ({ request }) => {
    const r = await request.get(`${API}/api/v1/teams`);
    expect(r.headers()["x-content-type-options"]).toBe("nosniff");
    expect(r.headers()["x-frame-options"]).toBeTruthy();
  });

  test("SEC-10 (BE-44, aberto no backend): tentativas excessivas de login deveriam receber 429", async () => {
    test.fail(true, "BE-44: ainda nao ha limite de tentativas em /api/auth (esperado falhar ate ser implementado)");
    let got429 = false;
    for (let i = 0; i < 30 && !got429; i++) {
      const r = await api(null, "POST", "/api/auth/login", { email: "limite.e2e@creatorworkbench.test", password: "errada" });
      got429 = r.status === 429;
    }
    expect(got429).toBe(true);
  });
});
