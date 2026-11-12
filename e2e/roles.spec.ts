import { test, expect } from "@playwright/test";
import {
  loginAs, uniq, expectToast, apiCreateTeam, apiCreateProject, apiCreateIdea, apiAddTask, apiLogin, teamIdOf, api, openTab,
  boardCard, inboxCard, TEAM_BETA,
} from "./support/helpers";

test.describe("Papeis (equipe isolada)", () => {
  let team = "";
  let projTitle = "";
  let projId = 0;
  let ideaTitle = "";
  let ideaId = 0;

  test.beforeAll(async () => {
    team = uniq("Equipe Papeis");
    await apiCreateTeam(team);
    projTitle = uniq("Projeto dos papeis");
    const proj = await apiCreateProject(projTitle, "ana", team);
    projId = proj.id;
    await apiAddTask(projId, "Tarefa A", "ana", team);
    await apiAddTask(projId, "Tarefa B", "ana", team);
    ideaTitle = uniq("Ideia dos papeis");
    ideaId = (await apiCreateIdea({ title: ideaTitle }, "ana", team)).id;
  });

  test("E2E-17 / BF-07: Revisor no quadro nao tem editar, excluir, mover, colunas nem Capturar Ideia", async ({ page }) => {
    await loginAs(page, "rui", team);
    await expect(page.getByRole("button", { name: "Capturar Ideia" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Adicionar Coluna" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Mover coluna|Configurar coluna/ })).toHaveCount(0);
    const card = boardCard(page, projTitle);
    await expect(card).toBeVisible(); // conteudo visivel
    await expect(card.getByTitle("Excluir item")).toHaveCount(0);
    await expect(card.locator("button:has(svg.lucide-settings-2)")).toHaveCount(0);
    await expect(card.getByTitle("Mover para próxima coluna")).toHaveCount(0);
    await expect(card.getByTitle("Mover para coluna anterior")).toHaveCount(0);
    await expect(page.getByText("Revisor").first()).toBeVisible(); // papel exibido
  });

  test("Revisor: no checklist nao adiciona/edita/exclui tarefas, mas PODE marcar tarefas (servidor)", async ({ page }) => {
    await loginAs(page, "rui", team);
    await boardCard(page, projTitle).getByTitle("Tarefas do card").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Tarefa A", { exact: true })).toBeVisible();
    await expect(dialog.getByLabel("Título da nova tarefa")).toHaveCount(0);
    await expect(dialog.getByTitle("Excluir tarefa")).toHaveCount(0);
    await expect(dialog.getByTitle("Editar título")).toHaveCount(0);
    await expect(dialog.getByLabel(/^Responsável pela tarefa/)).toHaveCount(0);
    await expect(dialog.getByLabel(/^Prazo da tarefa/)).toHaveCount(0);
    await expect(dialog.getByTitle("Mover para cima")).toHaveCount(0);

    await dialog.locator("button.cursor-pointer").filter({ hasText: "Tarefa A" }).click();
    await expect(dialog.getByText("1 de 2 tarefas concluídas")).toBeVisible();
    // desmarca para nao afetar outros testes
    await dialog.locator("button.cursor-pointer").filter({ hasText: "Tarefa A" }).click();
    await expect(dialog.getByText("0 de 2 tarefas concluídas")).toBeVisible();
    // e o Revisor pode ler o historico
    await dialog.getByRole("tab", { name: "Histórico" }).click();
    await expect(dialog.getByText(/Movido para|Nenhum registro/).first()).toBeVisible();
  });

  test("Revisor: na Caixa de Entrada nao cria/converte/exclui, mas PODE votar", async ({ page }) => {
    await loginAs(page, "rui", team);
    await openTab(page, "Caixa de Entrada");
    await expect(page.getByRole("button", { name: "Nova Ideia" })).toHaveCount(0);
    const card = inboxCard(page, ideaTitle);
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: /Converter em Projeto/ })).toHaveCount(0);
    await expect(card.getByTitle("Excluir ideia")).toHaveCount(0);
    const vote = card.getByRole("button", { name: /^\d+$/ });
    const before = Number(await vote.innerText());
    await vote.click();
    await expect(vote).toHaveText(String(before + 1));
    await vote.click();
    await expect(vote).toHaveText(String(before));
  });

  test("Revisor: Estudio de Escrita em modo leitura (sem Salvar/Versao/toolbar)", async ({ page }) => {
    await loginAs(page, "rui", team);
    await openTab(page, "Estúdio de Escrita");
    await expect(page.getByText("Modo Leitura (Revisor)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Versão", exact: true })).toHaveCount(0);
    await expect(page.locator(".ProseMirror")).toHaveAttribute("contenteditable", "false");
  });

  test("API (Revisor): mover, editar, excluir, criar tarefa, salvar roteiro e criar versao respondem 403; ler e votar funcionam", async () => {
    const { token } = await apiLogin("rui");
    const t = await teamIdOf("rui", team);
    const board = (await api(token, "GET", `/api/v1/teams/${t}/board`)).body;
    const col = board.columns[1].id;
    expect((await api(token, "PATCH", `/api/v1/teams/${t}/cards/${projId}/move`, { columnId: col, sortOrder: 0 })).status).toBe(403);
    expect((await api(token, "PUT", `/api/v1/kanban/${projId}`, { title: "Hack", targetAudience: "Estudantes", pedagogicalObjective: "Objetivo longo o bastante" })).status).toBe(403);
    expect((await api(token, "DELETE", `/api/v1/teams/${t}/cards/${projId}`)).status).toBe(403);
    expect((await api(token, "POST", `/api/v1/teams/${t}/cards/${projId}/tasks`, { title: "Nao" })).status).toBe(403);
    expect((await api(token, "PUT", `/api/v1/kanban/${projId}/script`, { content: "<p>x</p>" })).status).toBe(403);
    expect((await api(token, "POST", `/api/v1/kanban/${projId}/script/versions`)).status).toBe(403);
    expect((await api(token, "GET", `/api/v1/kanban/${projId}/script`)).status).toBe(200);
    expect((await api(token, "POST", `/api/v1/teams/${t}/cards/${ideaId}/vote`)).status).toBe(200);
    expect((await api(token, "POST", `/api/v1/teams/${t}/cards/${ideaId}/vote`)).status).toBe(200);
  });

  test("Criador: edita, move, cria tarefas e ideias; sem colunas/etiquetas/configuracoes", async ({ page }) => {
    await loginAs(page, "caio", team);
    await expect(page.getByRole("button", { name: "Capturar Ideia" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Adicionar Coluna" })).toHaveCount(0);
    const card = boardCard(page, projTitle);
    await expect(card.getByTitle("Excluir item")).toBeVisible();
    await expect(card.locator("button:has(svg.lucide-settings-2)")).toBeVisible();
    await expect(card.getByTitle("Mover para próxima coluna")).toBeVisible();

    await card.getByTitle("Tarefas do card").click();
    const dialog = page.getByRole("dialog");
    const title = uniq("Tarefa do criador");
    await dialog.getByLabel("Título da nova tarefa").fill(title);
    await dialog.getByRole("button", { name: "Adicionar" }).click();
    await expect(dialog.getByText(title, { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: `Excluir tarefa` }).last().click().catch(() => {});
  });

  test("E2E-16: Admin troca o papel de um membro para Revisor e o membro passa a ver a tela somente leitura", async ({ page, browser }) => {
    // Caio passa a Revisor e volta a Criador
    await loginAs(page, "ana", team);
    await page.getByTitle("Gerenciar membros da equipe").click();
    await page.getByLabel("Papel de Caio Criador").selectOption({ label: "Revisor" });
    await expectToast(page, "Papel do membro atualizado!");

    const ctx = await browser.newContext({ locale: "pt-BR" });
    const p2 = await ctx.newPage();
    await loginAs(p2, "caio", team);
    await expect(p2.getByRole("button", { name: "Capturar Ideia" })).toHaveCount(0);
    await expect(boardCard(p2, projTitle).getByTitle("Excluir item")).toHaveCount(0);
    await ctx.close();

    await page.getByLabel("Papel de Caio Criador").selectOption({ label: "Criador" });
    await expectToast(page, "Papel do membro atualizado!");
  });

  test("E2E-18 / SEC-03 / SEC-14: Criador de outra equipe nao acessa cards da equipe (404/403), nem pela API nem pela UI", async ({ page }) => {
    const { token } = await apiLogin("bia");
    // Bia (Admin de Beta) tenta ler/alterar o card da equipe de teste
    expect([403, 404]).toContain((await api(token, "GET", `/api/v1/kanban/${projId}`)).status);
    expect([403, 404]).toContain((await api(token, "PUT", `/api/v1/kanban/${projId}`, { title: "Invasor", targetAudience: "Estudantes", pedagogicalObjective: "Objetivo longo o bastante" })).status);
    const t = await teamIdOf("ana", team);
    expect([403, 404]).toContain((await api(token, "GET", `/api/v1/teams/${t}/board`)).status);
    const reread = (await api(null, "POST", "/api/auth/login", { email: "ana.admin.e2e@creatorworkbench.test", password: "Teste@123" })).body.token;
    expect((await api(reread, "GET", `/api/v1/kanban/${projId}`)).body.title).toBe(projTitle);

    // UI: Bia so ve as proprias equipes e nao o card da equipe de teste
    await loginAs(page, "bia", TEAM_BETA);
    await expect(boardCard(page, projTitle)).toHaveCount(0);
  });
});
