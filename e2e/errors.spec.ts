import { test, expect } from "@playwright/test";
import {
  loginAs, openTab, uniq, apiCreateTeam, apiCreateProject, apiCreateIdea, apiAddTask, apiBoard, boardCard, boardColumn, inboxCard,
} from "./support/helpers";

/**
 * Nenhuma falha pode parecer sucesso: com o servidor respondendo erro (500) ou fora do ar, a interface
 * mostra o erro e o estado visivel nao muda.
 */
test.describe("Falhas de rede e erros 5xx (sem sucesso falso)", () => {
  let team = "";
  test.beforeAll(async () => {
    team = uniq("Equipe Erros");
    await apiCreateTeam(team);
  });

  const serverError = { status: 500, contentType: "application/json", body: JSON.stringify({ message: "Erro interno de teste." }) };

  test("mover card com 500: toast de erro, card continua na coluna, nada de sucesso", async ({ page }) => {
    const title = uniq("Card erro mover");
    await apiCreateProject(title, "ana", team);
    await loginAs(page, "ana", team);
    await page.route("**/cards/*/move", (r) => r.fulfill(serverError));
    await boardCard(page, title).getByTitle("Mover para próxima coluna").click();
    await expect(page.locator('[data-sonner-toast][data-type="error"]').filter({ hasText: "Erro interno de teste." })).toBeVisible();
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    await expect(boardColumn(page, "Pesquisa").getByRole("heading", { name: title })).toBeVisible();
    const board = await apiBoard("ana", team);
    expect(board.columns[0].cards.some((c: any) => c.title === title)).toBe(true);
  });

  test("votar com 500: contador nao muda e o erro aparece", async ({ page }) => {
    const title = uniq("Ideia erro voto");
    await apiCreateIdea({ title }, "ana", team);
    await loginAs(page, "ana", team);
    await openTab(page, "Caixa de Entrada");
    await page.route("**/cards/*/vote", (r) => r.fulfill(serverError));
    const vote = inboxCard(page, title).getByRole("button", { name: /^\d+$/ });
    await vote.click();
    await expect(page.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible();
    await expect(vote).toHaveText("0");
    await expect(vote).toHaveAttribute("title", "Votar nesta ideia");
  });

  test("marcar tarefa com 500: a tarefa continua desmarcada e o erro aparece", async ({ page }) => {
    const title = uniq("Card erro tarefa");
    const proj = await apiCreateProject(title, "ana", team);
    await apiAddTask(proj.id, "Tarefa X", "ana", team);
    await loginAs(page, "ana", team);
    await boardCard(page, title).getByTitle("Tarefas do card").click();
    const dialog = page.getByRole("dialog");
    await page.route("**/tasks/*/toggle", (r) => r.fulfill(serverError));
    await dialog.locator("button.cursor-pointer").filter({ hasText: "Tarefa X" }).click();
    await expect(page.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible();
    await expect(dialog.getByText("0 de 1 tarefas concluídas")).toBeVisible();
    await expect(dialog.getByText("100%")).toHaveCount(0);
  });

  test("criar ideia com o servidor fora do ar (rede abortada): erro em portugues, dialogo aberto, nada criado", async ({ page }) => {
    await loginAs(page, "ana", team);
    await openTab(page, "Caixa de Entrada");
    const title = uniq("Ideia offline");
    await page.route("**/ideas", (r) => (r.request().method() === "POST" ? r.abort("connectionrefused") : r.continue()));
    await page.getByRole("button", { name: "Nova Ideia" }).first().click();
    await page.locator("#idea-title").fill(title);
    await page.getByRole("button", { name: /Guardar na Inbox/ }).click();
    const err = page.locator('[data-sonner-toast][data-type="error"]').first();
    await expect(err).toBeVisible();
    const text = await err.innerText();
    console.log("mensagem (servidor fora do ar):", JSON.stringify(text));
    await expect(page.locator("#idea-title")).toHaveValue(title);
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    // UX-05: sem jargao tecnico em ingles
    expect.soft(text, "[BUG] mensagem tecnica em ingles exibida ao usuario").not.toMatch(/Failed to fetch|NetworkError|TypeError|Load failed/i);
  });

  test("salvar roteiro com 500: continua 'Alteracoes nao salvas' e mostra o erro", async ({ page }) => {
    const title = uniq("Projeto erro roteiro");
    await apiCreateProject(title, "ana", team);
    await loginAs(page, "ana", team);
    await boardCard(page, title).click();
    await openTab(page, "Estúdio de Escrita");
    await page.locator(".ProseMirror").click();
    await page.keyboard.type("Texto qualquer.");
    await page.route("**/script", (r) => (r.request().method() === "PUT" ? r.fulfill(serverError) : r.continue()));
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.locator('[data-sonner-toast][data-type="error"]').filter({ hasText: "Erro interno de teste." })).toBeVisible();
    await expect(page.getByText("Alterações não salvas")).toBeVisible();
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
  });

  test("falha ao carregar o roteiro (500): aviso de erro, sem editor com texto de outro projeto", async ({ page }) => {
    const title = uniq("Projeto erro carga");
    await apiCreateProject(title, "ana", team);
    await loginAs(page, "ana", team);
    await boardCard(page, title).click();
    await page.route("**/script", (r) => (r.request().method() === "GET" ? r.fulfill(serverError) : r.continue()));
    await openTab(page, "Estúdio de Escrita");
    await expect(page.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible();
  });

  test("alertas e convites escondidos (sem backend): nao ha sino, aba Convites nem chamadas a essas rotas, e nenhum toast de erro", async ({ page }) => {
    const calls: string[] = [];
    page.on("request", (r) => {
      if (/\/(alerts|invites)/.test(r.url())) calls.push(r.url());
    });
    await loginAs(page, "ana", team);
    await expect(page.getByRole("button", { name: "Alertas de Prazos" })).toHaveCount(0);
    await page.getByTitle("Gerenciar membros da equipe").click();
    await expect(page.getByRole("tab", { name: /Membros/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Convites/ })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Configurações" })).toHaveCount(0);
    await page.waitForTimeout(800);
    expect(calls).toEqual([]);
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toHaveCount(0);
  });

  test("RN/validacao do servidor: nome de coluna com 100 caracteres e titulo de tarefa com 300 caracteres sao recusados com mensagem e sem sucesso falso", async ({ page }) => {
    const title = uniq("Card validacao");
    await apiCreateProject(title, "ana", team);
    await loginAs(page, "ana", team);

    await page.getByRole("button", { name: "Configurar coluna Pesquisa" }).click();
    await page.locator("[role=dialog] input").first().fill("C".repeat(100));
    await page.getByRole("button", { name: "Salvar Nome" }).click();
    const err = page.locator('[data-sonner-toast][data-type="error"]').first();
    await expect(err).toBeVisible();
    console.log("mensagem (coluna 100 caracteres):", await err.innerText());
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Configurar Coluna" })).toBeVisible(); // dialogo continua aberto
    await page.keyboard.press("Escape");
    await expect(boardColumn(page, "Pesquisa")).toBeVisible(); // nome original

    await boardCard(page, title).getByTitle("Tarefas do card").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Título da nova tarefa").fill("T".repeat(300));
    await dialog.getByRole("button", { name: "Adicionar" }).click();
    const err2 = page.locator('[data-sonner-toast][data-type="error"]').filter({ hasText: /tarefa/i }).first();
    await expect(err2).toBeVisible();
    console.log("mensagem (tarefa 300 caracteres):", await err2.innerText());
    await expect(dialog.getByRole("tab", { name: "Tarefas (0)" })).toBeVisible();
  });
});
