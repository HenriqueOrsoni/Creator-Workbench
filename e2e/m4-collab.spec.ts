import { test, expect, type Page } from "@playwright/test";
import {
  loginAs, uniq, expectToast, toast, apiCreateTeam, apiCreateProject, apiAddTask, apiLogin, teamIdOf, api, USERS, PASSWORD, SHOTS, APP, collectProblems,
} from "./support/helpers";
import { apiRegister, waitMail, codeFrom, inviteTokenFrom, mailsTo } from "./support/mail";
import { loginSession, apiTeams, serverDate, openTeamDialog, loginViaForm } from "./support/session";

/**
 * Marco 4 (Colaboracao): alertas, gestao da equipe, convites, seguranca da conta e redirect seguro.
 * Casos do plano: FT-50 (convites), FT-51 (alertas), FT-52 (conta), FT-53 (equipe), E2E-32, E2E-34, SEC-22..23.
 */

async function setCard(token: string, cardId: number, fields: Record<string, unknown>) {
  const r = await api(token, "PUT", `/api/v1/kanban/${cardId}`, fields);
  expect(r.status, JSON.stringify(r.body)).toBe(200);
}

async function bell(page: Page) {
  const btn = page.getByRole("button", { name: "Alertas de Prazos" });
  await expect(btn).toBeVisible();
  return btn;
}

// ---------------------------------------------------------------------------------------------------------------------
test.describe("M4 alertas (sino)", () => {
  let team: string;
  let teamId: number;
  const titles = { today: "", tomorrow: "", late: "", approved: "", none: "", taskOnly: "" };

  test.beforeAll(async () => {
    team = uniq("M4 Alertas");
    teamId = await apiCreateTeam(team);
    const { token } = await apiLogin("ana");
    const mk = async (key: keyof typeof titles, due: string | null) => {
      titles[key] = uniq(`Alerta ${key}`);
      const c = await apiCreateProject(titles[key], "ana", team);
      if (due) await setCard(token, c.id, { title: c.title, targetAudience: "Estudantes", pedagogicalObjective: "Aprender os fundamentos do tema", dueDate: due });
      return c;
    };
    await mk("today", serverDate(0));
    await mk("tomorrow", serverDate(1));
    await mk("late", serverDate(-3));
    const ap = await mk("approved", serverDate(-2));
    const none = await mk("none", null);
    // decisao 19: projeto aprovado nao alerta (nem as tarefas dele)
    const apTask = await apiAddTask(ap.id, "Tarefa do aprovado", "ana", team);
    await api(token, "PATCH", `/api/v1/teams/${teamId}/cards/${ap.id}/tasks/${apTask.id}`, { dueDate: serverDate(-1) });
    const rv = await api(token, "POST", `/api/v1/teams/${teamId}/cards/${ap.id}/reviews`, { decision: "APPROVED", comment: "" });
    expect(rv.status, JSON.stringify(rv.body)).toBe(200);
    // so a tarefa tem prazo: o alerta mostra o titulo do card e "Tarefa: ..."
    const t = await apiAddTask(none.id, "Gravar a vinheta", "ana", team);
    await api(token, "PATCH", `/api/v1/teams/${teamId}/cards/${none.id}/tasks/${t.id}`, { dueDate: serverDate(2) });
  });

  test("FT-51 / E2E-34: o sino mostra a lista do servidor com rotulos (Vence hoje, Vence amanha, Atrasado) e nao inclui projeto aprovado", async ({ page }) => {
    const problems = collectProblems(page);
    await loginAs(page, "ana", team);
    const { token } = await apiLogin("ana");
    const server = (await api(token, "GET", `/api/v1/teams/${teamId}/alerts`)).body as any[];
    expect(server.some((a) => a.cardTitle === titles.approved), "API nao deve alertar projeto aprovado").toBe(false);

    await expect(page.getByTestId("alerts-badge")).toBeVisible();
    await (await bell(page)).click();
    const panel = page.getByRole("dialog").filter({ hasText: "Alertas de Prazos" });
    await expect(panel.getByText(`Alertas de Prazos (${server.length})`)).toBeVisible();
    const item = (t: string) => panel.getByRole("button", { name: `Abrir card ${t}` });
    await expect(item(titles.today)).toContainText("Vence hoje");
    await expect(item(titles.tomorrow)).toContainText("Vence amanhã");
    await expect(item(titles.late)).toContainText("Atrasado há 3 dias");
    await expect(item(titles.none)).toContainText("Vence em 2 dias");
    await expect(item(titles.none)).toContainText("Tarefa: Gravar a vinheta");
    await expect(panel.getByRole("button", { name: `Abrir card ${titles.approved}` })).toHaveCount(0);
    await expect(panel.getByText("1 atrasado")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/m4-alertas-desktop.png` });
    expect(problems).toEqual([]);
  });

  test("FT-51: clicar no alerta abre o card correspondente no quadro", async ({ page }) => {
    await loginAs(page, "ana", team);
    await (await bell(page)).click();
    await page.getByRole("button", { name: `Abrir card ${titles.late}` }).click();
    const dialog = page.getByRole("dialog").filter({ hasText: titles.late });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("tab", { name: /^Tarefas/ })).toBeVisible();
  });

  test("FT-51: aprovar o projeto tira o alerta (decisao 19) e Criador e Revisor tambem veem o sino", async ({ page }) => {
    const { token } = await apiLogin("ana");
    const c = await apiCreateProject(uniq("Atrasado e depois aprovado"), "ana", team);
    await setCard(token, c.id, { title: c.title, targetAudience: "Estudantes", pedagogicalObjective: "Aprender os fundamentos do tema", dueDate: serverDate(-5) });
    await loginAs(page, "caio", team);
    await (await bell(page)).click();
    await expect(page.getByRole("button", { name: `Abrir card ${c.title}` })).toContainText("Atrasado há 5 dias");
    await page.keyboard.press("Escape");

    const rv = await api((await apiLogin("rui")).token, "POST", `/api/v1/teams/${teamId}/cards/${c.id}/reviews`, { decision: "APPROVED", comment: "" });
    expect(rv.status).toBe(200);
    await page.reload();
    await (await bell(page)).click();
    await expect(page.getByRole("button", { name: `Abrir card ${titles.late}` })).toBeVisible();
    await expect(page.getByRole("button", { name: `Abrir card ${c.title}` })).toHaveCount(0);
  });

  test("FT-51: equipe sem prazos mostra o estado vazio e nenhum indicador", async ({ page }) => {
    const empty = uniq("M4 Sem prazos");
    await apiCreateTeam(empty);
    await apiCreateProject(uniq("Sem prazo"), "ana", empty);
    await loginAs(page, "ana", empty);
    await expect(page.getByTestId("alerts-badge")).toHaveCount(0);
    await (await bell(page)).click();
    await expect(page.getByText("Nenhum prazo pendente ou em atraso.")).toBeVisible();
    await expect(page.getByText("Alertas de Prazos (0)")).toBeVisible();
  });

  // Bug confirmado (BF-M4-01): enquanto existir, o teste "falha de proposito" (test.fail), como o SEC-10 do M1.
  test.fail("falha em GET /alerts nao parece sucesso: nao afirma 'Nenhum prazo' quando a requisicao falhou", async ({ page }) => {
    await page.route("**/alerts", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Erro interno de teste." }) }));
    await loginAs(page, "ana", team);
    await (await bell(page)).click();
    // aceitavel: aviso de falha; inaceitavel: dizer que nao ha prazos pendentes
    const claimsEmpty = await page.getByText("Nenhum prazo pendente ou em atraso.").isVisible();
    expect(claimsEmpty, "[BUG] com a falha do servidor o sino diz que nao ha prazos pendentes").toBe(false);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`UX: painel de alertas a 375 px cabe na tela (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript((t) => window.localStorage.setItem("studio-theme", t), theme);
      await loginAs(page, "ana", team);
      await (await bell(page)).click();
      const panel = page.getByRole("dialog").filter({ hasText: "Alertas de Prazos" });
      await expect(panel).toBeVisible();
      const b = (await panel.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(376);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(376);
      await page.screenshot({ path: `${SHOTS}/m4-alertas-mobile-${theme}.png` });
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe("M4 gestao da equipe (FT-53)", () => {
  test("renomear: so Administrador ve Configuracoes; salvar muda o nome na tela e no servidor", async ({ page }) => {
    const name = uniq("M4 Renomear");
    const teamId = await apiCreateTeam(name);
    await loginAs(page, "caio", name);
    const dlgC = await openTeamDialog(page);
    await expect(dlgC.getByRole("tab", { name: /^Configurações/ })).toHaveCount(0);
    await expect(dlgC.getByRole("tab", { name: /^Convites/ })).toHaveCount(0);
    await page.keyboard.press("Escape");

    await page.context().clearCookies();
    await loginAs(page, "ana", name);
    const dlg = await openTeamDialog(page, "Configurações");
    const input = dlg.getByPlaceholder("Nome da Equipe");
    const save = dlg.getByRole("button", { name: "Salvar Nome" });
    await expect(save).toBeDisabled();
    await input.fill("   ");
    await expect(save).toBeDisabled();
    const novo = uniq("M4 Renomeada");
    await input.fill(novo);
    await save.click();
    await expect(dlg.getByText(novo).first()).toBeVisible();
    await expectToast(page, /nome|renomead|equipe/i);
    const { token } = await apiLogin("ana");
    const t = (await apiTeams(token)).find((x) => x.id === teamId);
    expect(t.name).toBe(novo);
  });

  test("renomear com falha do servidor: mostra o erro e o nome nao muda", async ({ page }) => {
    const name = uniq("M4 Renomear falha");
    const teamId = await apiCreateTeam(name);
    await loginAs(page, "ana", name);
    await page.route(`**/api/v1/teams/${teamId}`, (route) =>
      route.request().method() === "PATCH"
        ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Falha simulada ao renomear" }) })
        : route.continue(),
    );
    const dlg = await openTeamDialog(page, "Configurações");
    await dlg.getByPlaceholder("Nome da Equipe").fill(uniq("Nao deve valer"));
    await dlg.getByRole("button", { name: "Salvar Nome" }).click();
    await expectToast(page, "Falha simulada ao renomear");
    await expect(toast(page).filter({ hasText: /sucesso|renomead/i })).toHaveCount(0);
    const { token } = await apiLogin("ana");
    expect((await apiTeams(token)).find((x) => x.id === teamId).name).toBe(name);
  });

  test("excluir: o botao so habilita digitando o nome; excluir remove a equipe do servidor e da lista", async ({ page }) => {
    const name = uniq("M4 Excluir");
    const teamId = await apiCreateTeam(name);
    await loginAs(page, "ana", name);
    const dlg = await openTeamDialog(page, "Configurações");
    await dlg.getByRole("button", { name: "Excluir Equipe" }).click();
    const confirm = page.getByRole("dialog").filter({ hasText: "Esta ação é irreversível" });
    const ok = confirm.getByRole("button", { name: "Confirmar Exclusão" });
    await expect(ok).toBeDisabled();
    await confirm.getByPlaceholder("Digite o nome da equipe").fill(name.slice(0, -1));
    await expect(ok).toBeDisabled();
    await confirm.getByPlaceholder("Digite o nome da equipe").fill(name);
    await expect(ok).toBeEnabled();
    await ok.click();
    await expectToast(page, "Equipe excluída com sucesso.");
    await expect(page.getByRole("dialog").filter({ hasText: "Gestão da Equipe" })).toHaveCount(0);
    const { token } = await apiLogin("ana");
    expect((await apiTeams(token)).some((x) => x.id === teamId)).toBe(false);
    expect((await api(token, "GET", `/api/v1/teams/${teamId}/board`)).status).toBeGreaterThanOrEqual(403);
    // a tela nao fica presa na equipe excluida
    await expect(page.getByText(name)).toHaveCount(0);
  });

  test("excluir com falha do servidor: dialogo continua aberto, erro visivel e a equipe segue existindo", async ({ page }) => {
    const name = uniq("M4 Excluir falha");
    const teamId = await apiCreateTeam(name);
    await loginAs(page, "ana", name);
    await page.route(`**/api/v1/teams/${teamId}`, (route) =>
      route.request().method() === "DELETE"
        ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Falha simulada ao excluir" }) })
        : route.continue(),
    );
    const dlg = await openTeamDialog(page, "Configurações");
    await dlg.getByRole("button", { name: "Excluir Equipe" }).click();
    const confirm = page.getByRole("dialog").filter({ hasText: "Esta ação é irreversível" });
    await confirm.getByPlaceholder("Digite o nome da equipe").fill(name);
    await confirm.getByRole("button", { name: "Confirmar Exclusão" }).click();
    await expectToast(page, "Falha simulada ao excluir");
    await expect(confirm).toBeVisible();
    const { token } = await apiLogin("ana");
    expect((await apiTeams(token)).some((x) => x.id === teamId)).toBe(true);
  });

  test("FT-53: equipe pessoal: botao Excluir desabilitado com o texto, e a API responde 409 com a mesma mensagem", async ({ page }) => {
    const u = await apiRegister("pessoal");
    const teams = await apiTeams(u.token);
    const personal = teams.find((t) => t.personal === true);
    expect(personal, "o cadastro deve criar a equipe pessoal").toBeTruthy();
    await loginSession(page, u, personal.id);
    const dlg = await openTeamDialog(page, "Configurações");
    await expect(dlg.getByRole("button", { name: "Excluir Equipe" })).toBeDisabled();
    await expect(dlg.getByText("A equipe pessoal não pode ser excluída.")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/m4-equipe-pessoal.png` });
    const r = await api(u.token, "DELETE", `/api/v1/teams/${personal.id}`);
    expect(r.status).toBe(409);
    expect(r.body.message).toBe("A equipe pessoal não pode ser excluída.");
    expect((await apiTeams(u.token)).some((t) => t.id === personal.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe("M4 convites (FT-50, E2E-32, SEC-22)", () => {
  let team: string;
  let teamId: number;

  test.beforeAll(async () => {
    team = uniq("M4 Convites");
    teamId = await apiCreateTeam(team);
  });

  test("a aba Convites so aparece para Administrador (Criador e Revisor nao a veem)", async ({ page }) => {
    for (const who of ["caio", "rui"] as const) {
      await page.context().clearCookies();
      await loginAs(page, who, team);
      const dlg = await openTeamDialog(page);
      await expect(dlg.getByRole("tab", { name: /^Membros/ })).toBeVisible();
      await expect(dlg.getByRole("tab", { name: /^Convites/ })).toHaveCount(0);
      await page.keyboard.press("Escape");
    }
    // API: Criador e Revisor nao listam nem criam convites
    for (const who of ["caio", "rui"] as const) {
      const { token } = await apiLogin(who);
      expect((await api(token, "GET", `/api/v1/teams/${teamId}/invites`)).status).toBe(403);
      expect((await api(token, "POST", `/api/v1/teams/${teamId}/invites`, { email: "x.e2e@creatorworkbench.test", role: "CREATOR" })).status).toBe(403);
    }
  });

  test("criar e cancelar convite pela interface; o e-mail chega com o link /convite?token=", async ({ page }) => {
    const guest = await apiRegister("convidado");
    await loginAs(page, "ana", team);
    const dlg = await openTeamDialog(page, "Convites");
    const t0 = Date.now() - 1000;
    await dlg.getByPlaceholder("e-mail do convidado").fill(guest.email);
    await dlg.locator("select").selectOption("REVIEWER");
    await dlg.getByRole("button", { name: "Enviar Convite por E-mail" }).click();
    await expect(dlg.getByText(guest.email)).toBeVisible();
    await expect(dlg.getByRole("tab", { name: /^Convites \(1\)/ })).toBeVisible();
    const mail = await waitMail(guest.email, /Convite para a equipe/, t0);
    expect(mail.text).toContain(team);
    expect(inviteTokenFrom(mail).length).toBeGreaterThan(10);

    await dlg.getByRole("button", { name: "Cancelar Convite" }).click();
    await expect(dlg.getByText("Nenhum convite pendente no momento.")).toBeVisible();
    const { token } = await apiLogin("ana");
    expect(((await api(token, "GET", `/api/v1/teams/${teamId}/invites`)).body as any[]).length).toBe(0);
    // o token cancelado deixa de valer
    const gone = await api(null, "GET", `/api/auth/invites/${inviteTokenFrom(mail)}`);
    expect(gone.status).toBe(404);
  });

  test("convite duplicado e para quem ja e membro mostram o erro do servidor (409), sem criar nada", async ({ page }) => {
    await loginAs(page, "ana", team);
    const dlg = await openTeamDialog(page, "Convites");
    await dlg.getByPlaceholder("e-mail do convidado").fill(USERS.caio.email);
    await dlg.getByRole("button", { name: "Enviar Convite por E-mail" }).click();
    await expect(toast(page).filter({ hasText: /./ }).first()).toBeVisible();
    await expect(toast(page).filter({ hasText: /enviado|sucesso/i })).toHaveCount(0);
    const { token } = await apiLogin("ana");
    const invites = (await api(token, "GET", `/api/v1/teams/${teamId}/invites`)).body as any[];
    expect(invites.some((i) => i.email === USERS.caio.email)).toBe(false);
  });

  test("E2E-32 / FT-50: deslogado abre o link, entra, volta ao convite, aceita e entra na equipe com o papel; o token sai da URL", async ({ page }) => {
    const guest = await apiRegister("aceita");
    const { token } = await apiLogin("ana");
    const t0 = Date.now() - 1000;
    const created = await api(token, "POST", `/api/v1/teams/${teamId}/invites`, { email: guest.email, role: "REVIEWER" });
    expect(created.status, JSON.stringify(created.body)).toBe(200);
    const inviteToken = inviteTokenFrom(await waitMail(guest.email, /Convite para a equipe/, t0));

    await page.goto(`/convite?token=${inviteToken}`);
    await expect(page.getByRole("heading", { name: "Convite para Equipe" })).toBeVisible();
    await expect(page.getByText(team)).toBeVisible();
    await expect(page.locator("span", { hasText: guest.email })).toBeVisible();
    await expect(page.getByText("Revisor", { exact: true })).toBeVisible();
    // o token sai da barra de enderecos
    await expect(page).toHaveURL(/\/convite$/);
    expect(page.url()).not.toContain(inviteToken);

    await page.getByRole("link", { name: /Entrar na Minha Conta/ }).click();
    await expect(page).toHaveURL(/\/login\?redirect=%2Fconvite/);
    await loginViaForm(page, guest.email, guest.password);
    await expect(page).toHaveURL(/\/convite$/);
    await expect(page.getByRole("heading", { name: "Convite para Equipe" })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/m4-convite-logado.png` });
    await page.getByRole("button", { name: /Aceitar Convite e Acessar/ }).click();
    await expect(page).toHaveURL(/localhost:3000\/$/);
    await expectToast(page, `Você agora faz parte da equipe ${team}`);

    const teams = await apiTeams(guest.token);
    const joined = teams.find((t) => t.name === team);
    expect(joined?.role).toBe("REVIEWER");
    // o mesmo link nao vale duas vezes
    await page.goto(`/convite?token=${inviteToken}`);
    await expect(page.getByRole("heading", { name: "Convite Inválido ou Expirado" })).toBeVisible();
  });

  test("SEC-22: aceitar com a conta de outro e-mail mostra a mensagem 403 e nao entra na equipe", async ({ page }) => {
    const owner = await apiRegister("dono");
    const other = await apiRegister("intruso");
    const { token } = await apiLogin("ana");
    const t0 = Date.now() - 1000;
    await api(token, "POST", `/api/v1/teams/${teamId}/invites`, { email: owner.email, role: "CREATOR" });
    const inviteToken = inviteTokenFrom(await waitMail(owner.email, /Convite para a equipe/, t0));

    await page.context().addCookies([
      { name: "creator_auth_token", value: other.token, url: APP },
      { name: "creator_user_id", value: String(other.userId), url: APP },
    ]);
    await page.goto(`/convite?token=${inviteToken}`);
    await page.getByRole("button", { name: /Aceitar Convite e Acessar/ }).click();
    const alert = page.getByRole("alert").filter({ hasText: /./ });
    await expect(alert.first()).toBeVisible();
    await expect(page).toHaveURL(/\/convite/);
    await page.screenshot({ path: `${SHOTS}/m4-convite-email-errado.png` });
    expect((await apiTeams(other.token)).some((t) => t.name === team)).toBe(false);
    // o convite continua valido para o dono
    expect((await api(null, "GET", `/api/auth/invites/${inviteToken}`)).status).toBe(200);
    const direct = await api(other.token, "POST", `/api/v1/invites/${inviteToken}/accept`);
    expect(direct.status).toBe(403);
  });

  test("token invalido ou ausente: mensagem clara e link para o login", async ({ page }) => {
    await page.goto("/convite?token=token-que-nao-existe");
    await expect(page.getByRole("heading", { name: "Convite Inválido ou Expirado" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ir para o login/ })).toBeVisible();
    await expect(page).toHaveURL(/\/convite$/);

    await page.evaluate(() => window.sessionStorage.clear());
    await page.goto("/convite");
    await expect(page.getByText("Token de convite não informado.")).toBeVisible();
  });

  for (const theme of ["light", "dark"] as const) {
    test(`UX: pagina do convite a 375 px sem rolagem horizontal (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript((t) => window.localStorage.setItem("studio-theme", t), theme);
      const longName = uniq("M4 Equipe com um nome bastante comprido para testar quebra");
      const tid = await apiCreateTeam(longName);
      const guest = await apiRegister("mobile");
      const { token } = await apiLogin("ana");
      const t0 = Date.now() - 1000;
      await api(token, "POST", `/api/v1/teams/${tid}/invites`, { email: guest.email, role: "CREATOR" });
      const inviteToken = inviteTokenFrom(await waitMail(guest.email, /Convite para a equipe/, t0));
      await page.goto(`/convite?token=${inviteToken}`);
      await expect(page.getByRole("heading", { name: "Convite para Equipe" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(376);
      await page.screenshot({ path: `${SHOTS}/m4-convite-mobile-${theme}.png` });
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe("M4 seguranca da conta (FT-52, SEC-23)", () => {
  async function openAccount(page: Page, tab: "Segurança" | "E-mail" | "Perfil") {
    await page.getByRole("button", { name: "Configurações de Usuário" }).first().click();
    const dialog = page.getByRole("dialog").filter({ has: page.getByRole("tab") });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("tab", { name: new RegExp(tab, "i") }).click();
    return dialog;
  }

  test("trocar senha: senha atual errada mostra erro e NAO desloga; senha correta troca e a antiga deixa de valer", async ({ page }) => {
    const u = await apiRegister("senha");
    await loginSession(page, u);
    const dlg = await openAccount(page, "Segurança");
    await dlg.getByPlaceholder("Digite sua senha atual").fill("SenhaErrada@1");
    await dlg.getByPlaceholder("Digite a nova senha").fill("NovaSenha@123");
    await dlg.getByRole("button", { name: "Alterar Senha" }).click();
    await expect(page.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible();
    await expect(toast(page).filter({ hasText: /sucesso/i })).toHaveCount(0);
    // continua autenticado
    await expect(page).not.toHaveURL(/\/login/);
    const cookie = (await page.context().cookies()).find((c) => c.name === "creator_auth_token");
    expect(cookie?.value).toBeTruthy();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Painel de Controle" })).toBeVisible();
    expect((await api(null, "POST", "/api/auth/login", { email: u.email, password: u.password })).status).toBe(200);

    const dlg2 = await openAccount(page, "Segurança");
    await dlg2.getByPlaceholder("Digite sua senha atual").fill(u.password);
    await dlg2.getByPlaceholder("Digite a nova senha").fill("NovaSenha@123");
    await dlg2.getByRole("button", { name: "Alterar Senha" }).click();
    await expectToast(page, "Senha alterada com sucesso!");
    expect((await api(null, "POST", "/api/auth/login", { email: u.email, password: "NovaSenha@123" })).status).toBe(200);
    expect((await api(null, "POST", "/api/auth/login", { email: u.email, password: u.password })).status).toBe(401);
  });

  test("trocar senha: validacoes locais (curta demais) nao chamam o servidor", async ({ page }) => {
    const u = await apiRegister("senhacurta");
    await loginSession(page, u);
    const dlg = await openAccount(page, "Segurança");
    await dlg.getByPlaceholder("Digite sua senha atual").fill(u.password);
    await dlg.getByPlaceholder("Digite a nova senha").fill("12345");
    await expect(dlg.getByRole("button", { name: "Alterar Senha" })).toBeDisabled();
  });

  test("trocar e-mail: codigo errado nao altera; codigo do e-mail confirma e o login passa a usar o novo endereco", async ({ page }) => {
    const u = await apiRegister("email");
    const novo = `novo.${Date.now().toString(36)}.e2e@creatorworkbench.test`;
    await loginSession(page, u);
    const dlg = await openAccount(page, "E-mail");
    const t0 = Date.now() - 1000;
    await dlg.getByPlaceholder("novo@exemplo.com").fill(novo);
    await dlg.getByRole("button", { name: "Enviar Código de Verificação" }).click();
    await expectToast(page, `Enviamos um código de verificação para ${novo}`);
    const mail = await waitMail(novo, /novo e-mail/, t0);
    const code = codeFrom(mail);

    const wrong = code === "000000" ? "111111" : "000000";
    await dlg.getByPlaceholder("123456").fill(wrong);
    await dlg.getByRole("button", { name: "Confirmar Troca" }).click();
    await expect(toast(page).filter({ hasText: /inválido|invalido|código|expirado/i }).first()).toBeVisible();
    expect((await api(null, "POST", "/api/auth/login", { email: u.email, password: u.password })).status).toBe(200);

    await dlg.getByPlaceholder("123456").fill(code);
    await dlg.getByRole("button", { name: "Confirmar Troca" }).click();
    await expectToast(page, "E-mail atualizado com sucesso!");
    expect((await api(null, "POST", "/api/auth/login", { email: novo, password: u.password })).status).toBe(200);
    expect((await api(null, "POST", "/api/auth/login", { email: u.email, password: u.password })).status).toBe(401);
  });

  test("trocar e-mail para um endereco que ja existe mostra o erro e nao avanca para o codigo", async ({ page }) => {
    const u = await apiRegister("emailjaexiste");
    await loginSession(page, u);
    const dlg = await openAccount(page, "E-mail");
    await dlg.getByPlaceholder("novo@exemplo.com").fill(USERS.caio.email);
    await dlg.getByRole("button", { name: "Enviar Código de Verificação" }).click();
    await expect(toast(page).filter({ hasText: /./ }).first()).toBeVisible();
    await expect(dlg.getByPlaceholder("123456")).toHaveCount(0);
    expect((await mailsTo(USERS.caio.email)).filter((m) => /novo e-mail/.test(m.subject)).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe("M4 redirect seguro (SEC-REDIR)", () => {
  const evil = [
    "%2F.%2F%2Fevil.com",
    "%2F..%2F%2Fevil.com",
    "%2F%2Fevil.com",
    "%2F%5Cevil.com",
    "%2F%09%2Fevil.com",
    "https%3A%2F%2Fevil.com",
    "javascript%3Aalert(1)",
    "%2F%2F%2Fevil.com",
  ];
  for (const r of evil) {
    test(`/login?redirect=${r}: depois do login continua dentro do app`, async ({ page }) => {
      await page.goto(`/login?redirect=${r}`);
      await loginViaForm(page, USERS.caio.email, PASSWORD);
      await expect(page.getByRole("heading", { name: "Painel de Controle" })).toBeVisible();
      const u = new URL(page.url());
      expect(u.origin).toBe(APP);
      expect(u.pathname).toBe("/");
    });
  }

  test("redirect interno valido (/convite) continua funcionando", async ({ page }) => {
    await page.goto("/login?redirect=%2Fconvite");
    await loginViaForm(page, USERS.caio.email, PASSWORD);
    await expect(page).toHaveURL(/localhost:3000\/convite$/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
test.describe("M4 telas novas em 375 px e tema escuro (UX)", () => {
  /** O conteudo do dialogo nao pode passar da borda do proprio dialogo (nada cortado a direita). */
  async function noClip(dlg: ReturnType<Page["getByRole"]>, label: string) {
    const r = await dlg.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, right: el.getBoundingClientRect().right }));
    expect.soft(r.sw, `${label}: conteudo cortado (scrollWidth ${r.sw} > largura ${r.cw})`).toBeLessThanOrEqual(r.cw + 1);
    expect.soft(r.right, `${label}: passa da tela`).toBeLessThanOrEqual(376);
  }

  for (const theme of ["light", "dark"] as const) {
    for (const longName of [false, true]) {
      // Bug confirmado (BF-M4-02): a 375 px o conteudo do dialogo da equipe passa da borda (scrollWidth 374 > 341), mesmo com nome curto;
      // com nome comprido o titulo e "Salvar Nome" ficam cortados. test.fail enquanto existir.
      test.fail(`UX: dialogo da equipe a 375 px com nome ${longName ? "comprido" : "curto"} (${theme})`, async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.emulateMedia({ colorScheme: theme });
        await page.addInitScript((t) => window.localStorage.setItem("studio-theme", t), theme);
        const name = longName ? uniq("M4 Visual com um nome de equipe razoavelmente comprido") : uniq("M4 Visual");
        await apiCreateTeam(name);
        await loginAs(page, "ana", name);
        const dlg = await openTeamDialog(page, "Convites");
        await noClip(dlg, "aba Convites");
        await page.screenshot({ path: `${SHOTS}/m4-equipe-convites-mobile-${theme}${longName ? "-nome-longo" : ""}.png` });
        await dlg.getByRole("tab", { name: /^Configurações/ }).click();
        await expect(dlg.getByRole("button", { name: "Excluir Equipe" })).toBeVisible();
        await noClip(dlg, "aba Configuracoes");
        await page.screenshot({ path: `${SHOTS}/m4-equipe-config-mobile-${theme}${longName ? "-nome-longo" : ""}.png` });
        expect(test.info().errors.length).toBe(0);
      });
    }

    // Bug confirmado no tema claro (BF-M4-04): o dialogo da conta fica sem fundo (rgba(0,0,0,0)) e o texto do menu lateral aparece atras.
    (theme === "light" ? test.fail : test)(`UX: dialogo da conta (Seguranca e E-mail) a 375 px aberto pelo menu lateral (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript((t) => window.localStorage.setItem("studio-theme", t), theme);
      const name = uniq("M4 Conta");
      await apiCreateTeam(name);
      await loginAs(page, "ana", name);
      // no celular a conta fica no menu lateral (o botao do menu nao tem nome acessivel: BF-M4-03)
      await page.locator("nav").getByRole("button").first().click();
      await page.getByRole("button", { name: /Configurações/ }).first().click();
      const acc = page.getByRole("dialog").filter({ has: page.getByRole("tab", { name: "Segurança" }) });
      await expect(acc).toBeVisible();
      await acc.getByRole("tab", { name: "Segurança" }).click();
      await expect(acc.getByPlaceholder("Digite sua senha atual")).toBeVisible();
      await noClip(acc, "dialogo da conta");
      await page.screenshot({ path: `${SHOTS}/m4-conta-seguranca-mobile-${theme}.png` });
      await acc.getByRole("tab", { name: "E-mail" }).click();
      await expect(acc.getByPlaceholder("novo@exemplo.com")).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/m4-conta-email-mobile-${theme}.png` });
      // o dialogo e opaco: o texto do menu lateral nao pode aparecer atras do titulo (BF-M4-04, tema claro)
      const bg = await acc.evaluate((el) => getComputedStyle(el).backgroundColor);
      const alpha = /rgba?\(([^)]+)\)/.exec(bg)?.[1].split(",").map((x) => parseFloat(x))[3];
      expect.soft(alpha === undefined ? 1 : alpha, `fundo do dialogo da conta transparente (${bg})`).toBeGreaterThanOrEqual(0.95);
    });
  }
});
