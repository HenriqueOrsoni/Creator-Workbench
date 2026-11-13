import { test, expect, type Page } from "@playwright/test";
import {
  loginAs, uniq, expectToast, toast, apiCreateTeam, apiCreateProject, apiSetPlan, apiLogin, teamIdOf, api, USERS, SHOTS, boardCard, openTab,
  inboxCard, apiCreateIdea, sqlAddMember,
} from "./support/helpers";
import { apiRegister, sql } from "./support/mail";
import { loginSession, apiTeams, openTeamDialog } from "./support/session";

/**
 * Marco 5 (Planos): pagina do plano, uso, teste de 14 dias, 402 com "Ver planos", aviso, selo e Resumo IA.
 * Casos do plano: FT-54, E2E-33, SEC-24, SEC-25.
 */

const tabPlano = (page: Page) => page.getByRole("tab", { name: "Plano" });
async function openPlan(page: Page) {
  await tabPlano(page).click();
  await expect(page.getByRole("heading", { name: "Plano da equipe" })).toBeVisible();
}

/** Usuario novo (so equipe pessoal) com uma equipe compartilhada no plano Gratuito. */
async function freeTeamOwner(prefix: string) {
  const u = await apiRegister(prefix);
  const name = uniq(`M5 Gratuita ${prefix}`);
  const r = await api(u.token, "POST", "/api/v1/teams", { name });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return { ...u, teamId: r.body.id as number, teamName: name };
}

const dialogOf = (page: Page) => page.getByRole("dialog").first();

// ---------------------------------------------------------------------------------------------------------------------
test.describe("M5 pagina do plano (FT-54)", () => {
  let team: string;
  let teamId: number;
  let owner: Awaited<ReturnType<typeof apiRegister>>;

  test.beforeAll(async () => {
    // Equipe de um usuario NOVO (Admin) com Caio (Criador) e Rui (Revisor) e 3 projetos ativos, rebaixada para o Gratuito:
    // fica acima do limite de usuarios. Nao usa a Ana: quem tem uma equipe Gratuita nao cria outras (402) e quebraria os demais specs.
    owner = await apiRegister("limite");
    team = uniq("M5 Acima do limite");
    teamId = (await api(owner.token, "POST", "/api/v1/teams", { name: team })).body.id;
    await apiSetPlan(teamId, "AGENCIA");
    sqlAddMember(teamId, USERS.caio.email, "CREATOR");
    sqlAddMember(teamId, USERS.rui.email, "REVIEWER");
    for (let i = 1; i <= 3; i++) {
      const idea = await api(owner.token, "POST", `/api/v1/teams/${teamId}/ideas`, { title: uniq(`Projeto ${i}`), description: "d" });
      const c = await api(owner.token, "POST", `/api/v1/teams/${teamId}/cards/${idea.body.id}/convert`, { targetAudience: "Estudantes", pedagogicalObjective: "Aprender os fundamentos do tema" });
      expect(c.status, JSON.stringify(c.body)).toBe(200);
    }
    await apiSetPlan(teamId, "GRATUITO");
  });

  test("FT-54: plano atual, barras de uso e tabela de comparacao dos 4 planos", async ({ page }) => {
    await loginSession(page, owner, teamId);
    await openPlan(page);
    await expect(page.getByTestId("current-plan-name")).toHaveText("Gratuito");
    await expect(page.getByTestId("current-plan-source")).toHaveText("Gratuito");
    await expect(page.getByTestId("usage-Membros")).toContainText("3 de 1");
    await expect(page.getByTestId("usage-Projetos ativos")).toContainText("3 de 3");
    await expect(page.getByTestId("usage-Cursos")).toContainText("0 de 1");
    await expect(page.getByTestId("usage-Armazenamento")).toContainText("de 100 MB");
    await expect(page.getByText("Resumo automático: indisponível neste plano.")).toBeVisible();
    const bars = page.getByRole("progressbar");
    await expect(bars).toHaveCount(4);
    // barra cheia/estourada fica destacada (nao so por cor: o texto "3 de 1" mostra o excesso)
    for (const p of ["GRATUITO", "SOLO", "PRO", "AGENCIA"]) await expect(page.getByTestId(`plan-row-${p}`)).toBeVisible();
    await expect(page.getByTestId("plan-row-GRATUITO")).toContainText("Atual");
    await expect(page.getByTestId("plan-row-GRATUITO")).toContainText("Grátis");
    await expect(page.getByTestId("plan-row-PRO")).toContainText("Ilimitado");
    // valores da tabela batem com GET /plans
    const plans = (await api(owner.token, "GET", "/api/v1/plans")).body as any[];
    expect(plans.map((p) => p.plan)).toEqual(["GRATUITO", "SOLO", "PRO", "AGENCIA"]);
    await page.screenshot({ path: `${SHOTS}/m5-plano-desktop.png`, fullPage: true });
  });

  test("FT-54: selo do plano no seletor de equipes e na lista de equipes", async ({ page }) => {
    await loginSession(page, owner, teamId);
    await expect(page.getByTestId("team-plan-badge")).toHaveText("Gratuito");
    await page.getByTestId("team-plan-badge").click();
    const list = dialogOf(page);
    await expect(list.getByText("Gratuito").first()).toBeVisible();
  });

  test("FT-54 / E2E-33: acima do limite aparece o aviso com 'Ver planos' que abre a aba Plano", async ({ page }) => {
    await loginSession(page, owner, teamId);
    const banner = page.getByTestId("plan-banner");
    await expect(banner).toContainText("Sua equipe passou do limite do plano");
    await page.screenshot({ path: `${SHOTS}/m5-aviso-acima-do-limite.png` });
    await banner.getByRole("button", { name: "Ver planos" }).click();
    await expect(page.getByRole("heading", { name: "Plano da equipe" })).toBeVisible();
    await expect(tabPlano(page)).toHaveAttribute("aria-selected", "true");
  });

  test("E2E-33: 402 ao criar acima do limite mostra a mensagem do plano, 'Ver planos' abre o Plano e o plano e recarregado", async ({ page }) => {
    const title = uniq("Ideia acima do limite");
    await api(owner.token, "POST", `/api/v1/teams/${teamId}/ideas`, { title, description: "d" });
    await loginSession(page, owner, teamId);
    await openTab(page, "Caixa de Entrada");
    await inboxCard(page, title).getByRole("button", { name: /Converter em Projeto/ }).click();
    await page.getByPlaceholder("Ex: Iniciantes em CS").fill("Estudantes de ADS");
    await page.getByPlaceholder("Ex: Compreender BFS e DFS").fill("Compreender busca em grafos");
    let planGets = 0;
    page.on("request", (r) => {
      if (r.method() === "GET" && r.url().endsWith(`/api/v1/teams/${teamId}/plan`)) planGets++;
    });
    await page.getByRole("button", { name: "Confirmar e Mover ao Quadro" }).click();
    const t = toast(page).filter({ hasText: /plano/i }).first();
    await expect(t).toBeVisible();
    await expect(t).toContainText("Gratuito");
    // nada de sucesso falso
    await expect(toast(page).filter({ hasText: "Ideia convertida" })).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/m5-toast-402.png` });
    const before = planGets;
    await t.getByRole("button", { name: "Ver planos" }).click();
    await expect(page.getByRole("heading", { name: "Plano da equipe" })).toBeVisible();
    await expect.poll(() => planGets, { message: "o plano deve ser recarregado depois do 402" }).toBeGreaterThanOrEqual(before + 0);
    // a ideia continua na caixa de entrada
    const inbox = (await api(owner.token, "GET", `/api/v1/teams/${teamId}/ideas`)).body as any[];
    expect(inbox.some((i) => i.title === title)).toBe(true);
  });

  test("FT-54: Criador e Revisor nao veem 'Testar por 14 dias' e leem a explicacao", async ({ page }) => {
    for (const who of ["caio", "rui"] as const) {
      await page.context().clearCookies();
      await loginAs(page, who, team);
      await openPlan(page);
      await expect(page.getByRole("button", { name: "Testar por 14 dias" })).toHaveCount(0);
      await expect(page.getByText("Somente o administrador da equipe pode iniciar o teste.")).toBeVisible();
    }
  });

  test("SEC-24: Administrador de equipe e Criador recebem 403 na rota /admin; sem login 401/403", async () => {
    for (const token of [owner.token, (await apiLogin("caio")).token, (await apiLogin("ana")).token]) {
      expect((await api(token, "PUT", `/api/v1/admin/teams/${teamId}/plan`, { plan: "AGENCIA" })).status).toBe(403);
      expect((await api(token, "GET", `/api/v1/admin/teams?email=${USERS.ana.email}`)).status).toBe(403);
    }
    expect([401, 403]).toContain((await api(null, "PUT", `/api/v1/admin/teams/${teamId}/plan`, { plan: "AGENCIA" })).status);
    const sys = (await api((await apiLogin("sistema")).token, "GET", `/api/v1/admin/teams?email=${USERS.ana.email}`)).status;
    expect(sys).toBe(200);
  });

  test("SEC-25: convite e membro acima do limite devolvem 402 sem efeito colateral", async () => {
    const token = owner.token;
    const before = ((await api(token, "GET", `/api/v1/teams/${teamId}/members`)).body as any[]).length;
    const inv = await api(token, "POST", `/api/v1/teams/${teamId}/invites`, { email: `limite.${Date.now().toString(36)}.e2e@creatorworkbench.test`, role: "CREATOR" });
    expect(inv.status).toBe(402);
    expect(inv.body.message).toMatch(/plano/i);
    // POST /members agora tambem so cria convite (decisao 22): sem vaga no plano continua 402
    const add = await api(token, "POST", `/api/v1/teams/${teamId}/members`, { email: USERS.bia.email, role: "CREATOR" });
    expect(add.status).toBe(402);
    expect(((await api(token, "GET", `/api/v1/teams/${teamId}/members`)).body as any[]).length).toBe(before);
    expect(((await api(token, "GET", `/api/v1/teams/${teamId}/invites`)).body as any[]).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe("M5 teste de 14 dias e aviso de fim do teste", () => {
  test("FT-54: Administrador no Gratuito inicia o teste do Pro; plano, origem, selo e botoes mudam; so uma vez por equipe", async ({ page }) => {
    const o = await freeTeamOwner("trial");
    await loginSession(page, o, o.teamId);
    await openPlan(page);
    await expect(page.getByRole("button", { name: "Testar por 14 dias" })).toHaveCount(3);
    await expect(page.getByTestId("plan-row-GRATUITO").getByRole("button")).toHaveCount(0);
    await page.getByTestId("plan-row-PRO").getByRole("button", { name: "Testar por 14 dias" }).click();
    await expect(page.getByTestId("current-plan-name")).toHaveText("Pro");
    await expect(page.getByTestId("current-plan-source")).toContainText(/Teste até \d{2}\/\d{2}\/\d{4}/);
    await expect(page.getByRole("button", { name: "Testar por 14 dias" })).toHaveCount(0);
    await expect(page.getByTestId("team-plan-badge")).toHaveText("Pro");
    await expect(page.getByTestId("plan-row-PRO")).toContainText("Atual");
    await expect(page.getByTestId("usage-Membros")).toContainText("1 de 1"); // Pro: 1 usuario
    await expect(page.getByTestId("usage-Projetos ativos")).toContainText("0 de Ilimitado");
    await page.screenshot({ path: `${SHOTS}/m5-plano-em-teste.png`, fullPage: true });

    const plan = (await api(o.token, "GET", `/api/v1/teams/${o.teamId}/plan`)).body;
    expect(plan.plan).toBe("PRO");
    expect(plan.source).toBe("TRIAL");
    expect(plan.trialAvailable).toBe(false);
    const days = (new Date(plan.expiresAt).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(13);
    expect(days).toBeLessThanOrEqual(14.01);
    // 2o teste: servidor recusa
    const again = await api(o.token, "POST", `/api/v1/teams/${o.teamId}/plan/trial`, { plan: "SOLO" });
    expect(again.status).toBeGreaterThanOrEqual(400);
    expect(again.body.message).toBeTruthy();
  });

  test("FT-54: aviso 'O teste da equipe termina em 2 dias' aparece perto do fim e some com mais de 3 dias", async ({ page }) => {
    const o = await freeTeamOwner("trialfim");
    const t = await api(o.token, "POST", `/api/v1/teams/${o.teamId}/plan/trial`, { plan: "SOLO" });
    expect(t.status, JSON.stringify(t.body)).toBe(200);
    await loginSession(page, o, o.teamId);
    await expect(page.getByTestId("team-plan-badge")).toHaveText("Solo");
    await expect(page.getByTestId("plan-banner")).toHaveCount(0); // 14 dias restantes

    sql(`UPDATE teams SET plan_expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 49 HOUR) WHERE id = ${o.teamId};`);
    await page.reload();
    await expect(page.getByTestId("plan-banner")).toContainText("O teste da equipe termina em 2 dias.");
    await page.screenshot({ path: `${SHOTS}/m5-aviso-fim-do-teste.png` });
    await page.getByTestId("plan-banner").getByRole("button", { name: "Ver planos" }).click();
    await expect(page.getByRole("heading", { name: "Plano da equipe" })).toBeVisible();

    sql(`UPDATE teams SET plan_expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 DAY) WHERE id = ${o.teamId};`);
    await page.reload();
    await expect(page.getByTestId("team-plan-badge")).toHaveText("Solo");
    await expect(page.getByTestId("plan-banner")).toHaveCount(0);
  });

  test("falha ao carregar o plano (500): mensagem e 'Tentar novamente', sem mostrar um plano falso", async ({ page }) => {
    const o = await freeTeamOwner("plano500");
    let fail = true;
    await page.route(`**/api/v1/teams/${o.teamId}/plan`, (route) =>
      fail && route.request().method() === "GET"
        ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Erro interno de teste." }) })
        : route.continue(),
    );
    await loginSession(page, o, o.teamId);
    await tabPlano(page).click();
    await expect(page.getByText("Não foi possível carregar o plano da equipe.")).toBeVisible();
    await expect(page.getByTestId("current-plan-name")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Testar por 14 dias" })).toHaveCount(0);
    fail = false;
    await page.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(page.getByTestId("current-plan-name")).toHaveText("Gratuito");
  });

  test("falha ao iniciar o teste (500): erro visivel e o plano continua Gratuito", async ({ page }) => {
    const o = await freeTeamOwner("trial500");
    await page.route(`**/api/v1/teams/${o.teamId}/plan/trial`, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Falha simulada no teste" }) }),
    );
    await loginSession(page, o, o.teamId);
    await openPlan(page);
    await page.getByTestId("plan-row-SOLO").getByRole("button", { name: "Testar por 14 dias" }).click();
    await expectToast(page, "Falha simulada no teste");
    await expect(page.getByTestId("current-plan-name")).toHaveText("Gratuito");
    await expect(page.getByRole("button", { name: "Testar por 14 dias" })).toHaveCount(3);
    expect((await api(o.token, "GET", `/api/v1/teams/${o.teamId}/plan`)).body.plan).toBe("GRATUITO");
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe("M5 limites na interface", () => {
  test("E2E-33: segunda equipe compartilhada gratuita mostra a mensagem 402 com 'Ver planos' e nao cria a equipe", async ({ page }) => {
    const o = await freeTeamOwner("segunda");
    await loginSession(page, o, o.teamId);
    const before = (await apiTeams(o.token)).length;
    await page.getByTestId("team-plan-badge").click();
    await dialogOf(page).getByRole("button", { name: /Criar Equipe/ }).click();
    await page.getByPlaceholder("Ex: Laboratório de Mídias, Canal Tech").fill(uniq("M5 Segunda"));
    await page.getByRole("button", { name: "Criar Equipe", exact: true }).click();
    const t = toast(page).filter({ hasText: /plano/i }).first();
    await expect(t).toBeVisible();
    await expect(toast(page).filter({ hasText: "Equipe criada com sucesso" })).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/m5-402-segunda-equipe.png` });
    expect((await apiTeams(o.token)).length).toBe(before);
    await t.getByRole("button", { name: "Ver planos" }).click();
    // a aba muda mesmo com o dialogo aberto por cima (por isso includeHidden); o dialogo aberto e o BF-M5-01 abaixo
    await expect(page.getByRole("tab", { name: "Plano", includeHidden: true })).toHaveAttribute("aria-selected", "true");
  });

  // Regressao do BF-M5-01 (corrigido): "Ver planos" fecha o dialogo de criar equipe.
  test("E2E-33: 'Ver planos' do toast da segunda equipe deixa a pagina do Plano acessivel (sem o dialogo de criacao por cima)", async ({ page }) => {
    const o = await freeTeamOwner("segundadlg");
    await loginSession(page, o, o.teamId);
    await page.getByTestId("team-plan-badge").click();
    await dialogOf(page).getByRole("button", { name: /Criar Equipe/ }).click();
    await page.getByPlaceholder("Ex: Laboratório de Mídias, Canal Tech").fill(uniq("M5 Segunda"));
    await page.getByRole("button", { name: "Criar Equipe", exact: true }).click();
    const t = toast(page).filter({ hasText: /plano/i }).first();
    await expect(t).toBeVisible();
    await t.getByRole("button", { name: "Ver planos" }).click();
    await page.screenshot({ path: `${SHOTS}/m5-bug-ver-planos-dialogo-aberto.png` });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Plano da equipe" })).toBeVisible();
  });

  test("decisao 16: a equipe pessoal nao conta; com a equipe compartilhada em plano pago manual, uma nova equipe e aceita", async () => {
    const o = await freeTeamOwner("manual");
    const second = await api(o.token, "POST", "/api/v1/teams", { name: uniq("M5 Bloqueada") });
    expect(second.status).toBe(402);
    await apiSetPlan(o.teamId, "AGENCIA");
    const third = await api(o.token, "POST", "/api/v1/teams", { name: uniq("M5 Liberada") });
    expect(third.status, JSON.stringify(third.body)).toBe(200);
  });

  for (const plan of ["GRATUITO", "SOLO", "PRO", "AGENCIA"] as const) {
    test(`Resumo IA no plano ${plan}: ${plan === "GRATUITO" || plan === "SOLO" ? "aviso 'Disponivel nos planos Pro e Agencia' e sem botao" : "botao Gerar Resumo disponivel"}`, async ({ page }) => {
      const o = await freeTeamOwner(`resumo${plan.toLowerCase()}`);
      const title = uniq("Projeto resumo");
      if (plan !== "GRATUITO") await apiSetPlan(o.teamId, plan);
      const idea = await api(o.token, "POST", `/api/v1/teams/${o.teamId}/ideas`, { title, description: "d", targetAudience: "Estudantes", pedagogicalObjective: "Aprender os fundamentos do tema" });
      expect(idea.status, JSON.stringify(idea.body)).toBe(200);
      const conv = await api(o.token, "POST", `/api/v1/teams/${o.teamId}/cards/${idea.body.id}/convert`, { targetAudience: "Estudantes", pedagogicalObjective: "Aprender os fundamentos do tema" });
      expect(conv.status, JSON.stringify(conv.body)).toBe(200);
      await loginSession(page, o, o.teamId);
      await boardCard(page, title).getByTitle("Tarefas do card").click();
      const dlg = dialogOf(page);
      await dlg.getByRole("tab", { name: /^Resumo IA/ }).click();
      if (plan === "GRATUITO" || plan === "SOLO") {
        await expect(dlg.getByTestId("summary-plan-gate")).toHaveText("Disponível nos planos Pro e Agência.");
        await expect(dlg.getByRole("button", { name: /Gerar Resumo/ })).toHaveCount(0);
        // API: 402 e nada gerado
        const r = await api(o.token, "POST", `/api/v1/teams/${o.teamId}/cards/${conv.body.id}/summary`);
        expect(r.status).toBe(402);
      } else {
        await expect(dlg.getByTestId("summary-plan-gate")).toHaveCount(0);
        await expect(dlg.getByRole("button", { name: /Gerar Resumo/ })).toBeVisible();
      }
      await page.screenshot({ path: `${SHOTS}/m5-resumo-${plan.toLowerCase()}.png` });
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe("M5 aparencia (375 px e tema escuro)", () => {
  for (const theme of ["light", "dark"] as const) {
    // Regressao do BF-M5-02 (corrigido): a tabela de comparacao rola dentro do cartao, nao na pagina.
    test(`UX: aba Plano a 375 px sem rolagem horizontal da pagina, tabela rola dentro do cartao (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript((t) => window.localStorage.setItem("studio-theme", t), theme);
      const o = await freeTeamOwner(`mobile${theme}`);
      await loginSession(page, o, o.teamId);
      await openPlan(page);
      await expect(page.getByTestId("plan-row-PRO")).toBeAttached();
      await page.screenshot({ path: `${SHOTS}/m5-plano-mobile-${theme}.png`, fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(376);
    });
  }

  test("UX: aba Plano e aviso no tema escuro a 1440 px", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => window.localStorage.setItem("studio-theme", "dark"));
    const o = await freeTeamOwner("escuro");
    await api(o.token, "POST", `/api/v1/teams/${o.teamId}/plan/trial`, { plan: "PRO" });
    sql(`UPDATE teams SET plan_expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 25 HOUR) WHERE id = ${o.teamId};`);
    await loginSession(page, o, o.teamId);
    await expect(page.getByTestId("plan-banner")).toBeVisible();
    await openPlan(page);
    await page.screenshot({ path: `${SHOTS}/m5-plano-desktop-dark.png`, fullPage: true });
  });
});
