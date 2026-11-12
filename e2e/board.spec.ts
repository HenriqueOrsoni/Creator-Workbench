import { test, expect, type Page } from "@playwright/test";
import {
  loginAs, uniq, expectToast, apiCreateProject, apiCreateTeam, apiBoard, apiLogin, teamIdOf, api, apiAddTask, boardCard, boardColumn,
} from "./support/helpers";

const COLS = ["Pesquisa", "Roteiro", "Gravação", "Edição"];

async function columnOrder(page: Page): Promise<string[]> {
  return page.locator("div.snap-start h3").allTextContents();
}

test.describe("Quadro Kanban (Admin, equipe isolada)", () => {
  let team = "";
  test.beforeAll(async () => {
    team = uniq("Equipe Quadro");
    await apiCreateTeam(team);
  });

  test("FT-12/FT-15: colunas do servidor; setas de card movem para a vizinha e nao existem nas pontas", async ({ page }) => {
    const title = uniq("Card setas");
    await apiCreateProject(title, "ana", team);
    await loginAs(page, "ana", team);
    expect(await columnOrder(page)).toEqual(COLS);

    const card = () => boardCard(page, title);
    await expect(boardColumn(page, "Pesquisa").getByRole("heading", { name: title })).toBeVisible();
    // 1a coluna: so seta para a direita
    await expect(card().getByTitle("Mover para coluna anterior")).toHaveCount(0);
    await expect(card().getByTitle("Mover para próxima coluna")).toHaveCount(1);

    await card().getByTitle("Mover para próxima coluna").click();
    await expect(boardColumn(page, "Roteiro").getByRole("heading", { name: title })).toBeVisible();
    // coluna do meio: as duas setas
    await expect(card().getByTitle("Mover para coluna anterior")).toHaveCount(1);
    await expect(card().getByTitle("Mover para próxima coluna")).toHaveCount(1);
    await expect(card().getByText(/Na coluna desde/)).toBeVisible();
    await expect(card()).toHaveCount(1);

    await card().getByTitle("Mover para próxima coluna").click();
    await expect(boardColumn(page, "Gravação").getByRole("heading", { name: title })).toBeVisible();
    await expect(card()).toHaveCount(1); // fim da animacao de saida
    await card().getByTitle("Mover para próxima coluna").click();
    await expect(boardColumn(page, "Edição").getByRole("heading", { name: title })).toBeVisible();
    // ultima coluna: so seta para a esquerda
    await expect(card().getByTitle("Mover para próxima coluna")).toHaveCount(0);
    await expect(card().getByTitle("Mover para coluna anterior")).toHaveCount(1);

    // estado do servidor
    const board = await apiBoard("ana", team);
    const col = board.columns.find((c: any) => c.cards.some((x: any) => x.title === title));
    expect(col.name).toBe("Edição");

    await card().getByTitle("Mover para coluna anterior").click();
    await expect(boardColumn(page, "Gravação").getByRole("heading", { name: title })).toBeVisible();
  });

  test("FT-05/E2E-10: card selecionado e o projeto do Estudio de Escrita; badge de contagem por coluna", async ({ page }) => {
    const title = uniq("Card badge");
    await apiCreateProject(title, "ana", team);
    await loginAs(page, "ana", team);
    const col = boardColumn(page, "Pesquisa");
    const n = await col.locator('[data-slot="card"]').count();
    await expect(col.locator('[data-slot="badge"]').first()).toHaveText(String(n));
  });

  test("aba Historico mostra as movimentacoes (mais recente primeiro) e quem moveu", async ({ page }) => {
    const title = uniq("Card historico");
    const proj = await apiCreateProject(title, "ana", team);
    const { token } = await apiLogin("ana");
    const t = await teamIdOf("ana", team);
    const board = await apiBoard("ana", team);
    const roteiro = board.columns.find((c: any) => c.name === "Roteiro");
    const mv = await api(token, "PATCH", `/api/v1/teams/${t}/cards/${proj.id}/move`, { columnId: roteiro.id, sortOrder: 0 });
    expect(mv.status).toBe(200);

    await loginAs(page, "ana", team);
    await boardCard(page, title).getByTitle("Tarefas do card").click();
    await page.getByRole("tab", { name: "Histórico" }).click();
    const items = page.locator('text=/Movido para/');
    await expect(items.first()).toContainText("Roteiro");
    await expect(page.getByText("Por Ana Administradora").first()).toBeVisible();
    expect(await items.count()).toBeGreaterThanOrEqual(2);
  });

  test("E2E-06/E2E-07: editar projeto (titulo, publico, objetivo, prazo) e excluir com confirmacao", async ({ page }) => {
    const title = uniq("Card editar");
    await apiCreateProject(title, "ana", team);
    await loginAs(page, "ana", team);
    await boardCard(page, title).locator("button:has(svg.lucide-settings-2)").first().click();
    await expect(page.getByRole("heading", { name: "Configurar Projeto" })).toBeVisible();

    const newTitle = title + " revisado";
    await page.getByPlaceholder("Ex: Minha Nova Série de Vídeos").fill(newTitle);
    await page.getByPlaceholder("Ex: Criadores de Conteúdo Iniciantes").fill("Professores da educação básica");
    await page.getByPlaceholder("Quais competências ou aprendizados serão adquiridos?").fill("Dominar planejamento pedagógico de aulas");
    await page.locator('input[type="date"]').fill("2030-12-24");
    await page.getByRole("button", { name: "Salvar Alterações" }).click();
    await expectToast(page, "Projeto atualizado!");
    const card = boardCard(page, newTitle);
    await expect(card).toBeVisible();
    await expect(card.getByText("Professores da educação básica")).toBeVisible();
    await expect(card.getByText(/Prazo 24\/12\/2030/)).toBeVisible();

    // exclusao com confirmacao
    await card.getByTitle("Excluir item").click();
    await expect(page.getByRole("heading", { name: "Confirmar Exclusão" })).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(card).toBeVisible();
    await card.getByTitle("Excluir item").click();
    await page.getByRole("button", { name: "Sim, Excluir" }).click();
    await expect(boardCard(page, newTitle)).toHaveCount(0);
  });

  test("edicao do projeto: RN01 no formulario (objetivo < 10 caracteres) bloqueia o salvamento", async ({ page }) => {
    const title = uniq("Card rn01");
    await apiCreateProject(title, "ana", team);
    await loginAs(page, "ana", team);
    await boardCard(page, title).locator("button:has(svg.lucide-settings-2)").first().click();
    await page.getByPlaceholder("Quais competências ou aprendizados serão adquiridos?").fill("curto");
    await expect(page.getByRole("button", { name: "Salvar Alterações" })).toBeDisabled();
    await expect(page.locator("[data-slot=form-message], p.text-destructive").first()).toBeVisible();
  });

  test("RN01 no servidor: PUT /kanban com objetivo curto responde 400 com mensagem e o card nao muda", async () => {
    const title = uniq("Card rn01 api");
    const proj = await apiCreateProject(title, "ana", team);
    const { token } = await apiLogin("ana");
    const r = await api(token, "PUT", `/api/v1/kanban/${proj.id}`, { title, targetAudience: "ab", pedagogicalObjective: "curto" });
    expect(r.status).toBe(400);
    expect(String(r.body.message)).toMatch(/[Pp]úblico|[Oo]bjetivo/);
    const after = (await api(token, "GET", `/api/v1/kanban/${proj.id}`)).body;
    expect(after.targetAudience).toBe("Estudantes");
  });

  test("erro do servidor ao mover (card removido por outra sessao): mensagem do servidor, sem sucesso falso", async ({ page }) => {
    const title = uniq("Card removido");
    const proj = await apiCreateProject(title, "ana", team);
    await loginAs(page, "ana", team);
    await expect(boardCard(page, title)).toBeVisible();
    const { token } = await apiLogin("ana");
    const t = await teamIdOf("ana", team);
    expect((await api(token, "DELETE", `/api/v1/teams/${t}/cards/${proj.id}`)).status).toBe(204);

    await boardCard(page, title).getByTitle("Mover para próxima coluna").click();
    const err = page.locator('[data-sonner-toast][data-type="error"]').first();
    await expect(err).toBeVisible();
    console.log("mensagem (mover card removido):", await err.innerText());
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    // a sessao continua valida (404 nao derruba)
    await expect(page).not.toHaveURL(/login/);
  });

  test("colunas (Admin): criar, renomear, reordenar com setas (sem seta nas pontas), excluir movendo os cards", async ({ page }) => {
    const title = uniq("Card coluna");
    await apiCreateProject(title, "ana", team);
    await loginAs(page, "ana", team);

    // criar
    await page.getByRole("button", { name: "Adicionar Coluna" }).click();
    await page.getByPlaceholder(/Ex: Roteirização/).fill("Publicação");
    await page.getByRole("button", { name: "Criar Coluna" }).click();
    await expect(boardColumn(page, "Publicação")).toBeVisible();
    expect((await columnOrder(page)).at(-1)).toBe("Publicação");

    // pontas: esquerda desabilitada na 1a e direita desabilitada na ultima
    await expect(page.getByRole("button", { name: "Mover coluna Pesquisa para a esquerda" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Mover coluna Publicação para a direita" })).toBeDisabled();

    // reordenar: Publicação para a esquerda
    await page.getByRole("button", { name: "Mover coluna Publicação para a esquerda" }).click();
    await expect.poll(async () => (await columnOrder(page)).join(",")).toBe("Pesquisa,Roteiro,Gravação,Publicação,Edição");
    await page.reload();
    await expect.poll(async () => (await columnOrder(page)).join(",")).toBe("Pesquisa,Roteiro,Gravação,Publicação,Edição");

    // renomear
    await page.getByRole("button", { name: "Configurar coluna Publicação" }).click();
    await page.locator("[role=dialog] input").first().fill("Lançamento");
    await page.getByRole("button", { name: "Salvar Nome" }).click();
    await expect(boardColumn(page, "Lançamento")).toBeVisible();

    // excluir coluna com card: o card vai para a coluna escolhida
    await boardCard(page, title).getByTitle("Mover para próxima coluna").click(); // Pesquisa -> Roteiro
    await page.getByRole("button", { name: "Configurar coluna Roteiro" }).click();
    await page.locator("[role=dialog] select").selectOption({ label: "Edição" });
    await page.getByRole("button", { name: "Excluir Coluna" }).click();
    await expect(boardColumn(page, "Roteiro")).toHaveCount(0);
    await expect(boardColumn(page, "Edição").getByRole("heading", { name: title })).toBeVisible();
  });
});

test.describe("Tarefas do card (Admin)", () => {
  let team = "";
  test.beforeAll(async () => {
    team = uniq("Equipe Tarefas");
    await apiCreateTeam(team);
  });

  test("adicionar, editar titulo, responsavel, prazo (salva ao sair do campo), Remover prazo, concluir, reordenar e excluir", async ({ page }) => {
    const title = uniq("Card tarefas");
    await apiCreateProject(title, "ana", team);
    await loginAs(page, "ana", team);
    await boardCard(page, title).getByTitle("Tarefas do card").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("tab", { name: "Tarefas (0)" })).toBeVisible();
    await expect(dialog.getByText("Nenhuma tarefa adicionada ainda")).toBeVisible();

    // adicionar duas
    for (const t of ["Gravar introdução", "Cortar silêncios"]) {
      await dialog.getByLabel("Título da nova tarefa").fill(t);
      await dialog.getByRole("button", { name: "Adicionar" }).click();
      await expect(dialog.getByText(t, { exact: true })).toBeVisible();
    }
    await expect(dialog.getByRole("tab", { name: "Tarefas (2)" })).toBeVisible();

    // editar titulo (Enter salva)
    await dialog.getByRole("button", { name: "Editar título da tarefa Gravar introdução" }).click();
    const input = dialog.getByRole("textbox", { name: "Título da tarefa Gravar introdução" });
    await input.fill("Gravar introdução revisada");
    await input.press("Enter");
    await expect(dialog.getByText("Gravar introdução revisada", { exact: true })).toBeVisible();

    // responsavel
    const assignee = dialog.getByLabel("Responsável pela tarefa Gravar introdução revisada");
    await assignee.selectOption({ label: "Caio" });
    await expect(dialog.getByText("Caio Criador")).toBeVisible();

    // prazo: salva ao sair do campo
    const due = dialog.getByLabel("Prazo da tarefa Gravar introdução revisada");
    await due.fill("2031-03-15");
    await due.blur();
    await expect(dialog.getByText("15/03/2031")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Remover prazo da tarefa Gravar introdução revisada" })).toBeVisible();
    // remover prazo
    await dialog.getByRole("button", { name: "Remover prazo da tarefa Gravar introdução revisada" }).click();
    await expect(dialog.getByText("15/03/2031")).toHaveCount(0);
    await expect(dialog.getByLabel("Prazo da tarefa Gravar introdução revisada")).toHaveValue("");

    // reordenar: a primeira desce
    await dialog.getByRole("button", { name: "Mover tarefa Gravar introdução revisada para baixo" }).click();
    await expect.poll(async () => dialog.locator("button.cursor-pointer span.block").allTextContents()).toEqual(["Cortar silêncios", "Gravar introdução revisada"]);
    // primeira nao sobe, ultima nao desce
    await expect(dialog.getByRole("button", { name: "Mover tarefa Cortar silêncios para cima" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Mover tarefa Gravar introdução revisada para baixo" })).toBeDisabled();

    // concluir e progresso
    await dialog.locator("button.cursor-pointer").filter({ hasText: "Cortar silêncios" }).click();
    await expect(dialog.getByText("1 de 2 tarefas concluídas")).toBeVisible();
    await expect(dialog.getByText("50%")).toBeVisible();

    // persistencia
    await page.reload();
    await boardCard(page, title).getByTitle("Tarefas do card").click();
    await expect(page.getByRole("dialog").getByText("1 de 2 tarefas concluídas")).toBeVisible();
    const order = await page.getByRole("dialog").locator("button.cursor-pointer span.block").allTextContents();
    expect(order).toEqual(["Cortar silêncios", "Gravar introdução revisada"]);

    // excluir
    await page.getByRole("dialog").getByTitle("Excluir tarefa").first().click();
    await expect(page.getByRole("dialog").getByRole("tab", { name: "Tarefas (1)" })).toBeVisible();
  });

  test("erro do servidor ao editar tarefa (excluida por outra sessao): mensagem exibida, sem sucesso falso", async ({ page }) => {
    const title = uniq("Card tarefa fantasma");
    const proj = await apiCreateProject(title, "ana", team);
    const task = await apiAddTask(proj.id, "Tarefa que some", "ana", team);
    await loginAs(page, "ana", team);
    await boardCard(page, title).getByTitle("Tarefas do card").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Tarefa que some", { exact: true })).toBeVisible();

    const { token } = await apiLogin("ana");
    const t = await teamIdOf("ana", team);
    expect((await api(token, "DELETE", `/api/v1/teams/${t}/cards/${proj.id}/tasks/${task.id}`)).status).toBe(204);

    await dialog.getByLabel("Responsável pela tarefa Tarefa que some").selectOption({ label: "Caio" });
    const err = page.locator('[data-sonner-toast][data-type="error"]').first();
    await expect(err).toBeVisible();
    console.log("mensagem (editar tarefa removida):", await err.innerText());
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
  });
});
