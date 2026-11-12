import { test, expect } from "@playwright/test";
import {
  loginAs, openTab, uniq, expectToast, apiCreateIdea, apiLogin, teamIdOf, api, inboxCard, boardCard, boardColumn, apiBoard,
  TEAM_ALFA,
} from "./support/helpers";

test.describe("Caixa de Entrada (ideias)", () => {
  test("E2E-05 (parte 1) / UX-01: criar ideia com etiqueta pela Caixa de Entrada", async ({ page }) => {
    await loginAs(page, "ana");
    await openTab(page, "Caixa de Entrada");
    const title = uniq("Ideia etiquetada");
    await page.getByRole("button", { name: "Nova Ideia" }).first().click();
    await expect(page.getByRole("heading", { name: "Capturar Nova Ideia" })).toBeVisible();

    // com menos de 3 caracteres o botao fica desabilitado
    await page.locator("#idea-title").fill("ab");
    await expect(page.getByRole("button", { name: /Guardar na Inbox/ })).toBeDisabled();

    await page.locator("#idea-title").fill(title);
    await page.locator("#idea-desc").fill("Anotações sobre acentuação: ação, coração, pedagógico.");
    await page.getByLabel("Etiqueta", { exact: true }).selectOption({ label: "Podcast" });
    await page.getByRole("button", { name: /Guardar na Inbox/ }).click();

    await expectToast(page, "Ideia guardada na Caixa de Entrada!");
    const card = inboxCard(page, title);
    await expect(card).toBeVisible();
    await expect(card.getByText("Podcast", { exact: true })).toBeVisible();
    await expect(card.getByText("Ideia Bruta")).toBeVisible();
    await expect(card.getByText("Anotações sobre acentuação")).toBeVisible();

    // persistiu no servidor
    await page.reload();
    await openTab(page, "Caixa de Entrada");
    await expect(inboxCard(page, title)).toBeVisible();
  });

  test("botao 'Capturar Ideia' da barra superior: a lista de etiquetas ja vem carregada", async ({ page }) => {
    await loginAs(page, "ana"); // abre na aba Quadro Kanban (Caixa de Entrada nunca aberta)
    await page.getByRole("button", { name: "Capturar Ideia" }).click();
    const options = await page.getByLabel("Etiqueta", { exact: true }).locator("option").allTextContents();
    expect(options).toContain("Sem etiqueta");
    expect(options).toEqual(expect.arrayContaining(["Tutorial", "Podcast", "Curso", "Roteiro", "Artigo"]));
  });

  test("erro do servidor ao criar ideia (titulo enorme): mensagem exibida, dialogo e dados preservados, nada criado", async ({ page }) => {
    await loginAs(page, "ana");
    await openTab(page, "Caixa de Entrada");
    await page.getByRole("button", { name: "Nova Ideia" }).first().click();
    const longTitle = "T".repeat(400);
    await page.locator("#idea-title").fill(longTitle);
    await page.getByRole("button", { name: /Guardar na Inbox/ }).click();
    const err = page.locator('[data-sonner-toast][data-type="error"]').first();
    await expect(err).toBeVisible();
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    // o dialogo continua aberto com o texto digitado
    await expect(page.locator("#idea-title")).toHaveValue(longTitle);
    console.log("mensagem de erro (titulo 400 caracteres):", await err.innerText());
  });

  test("busca, filtro por etiqueta e ordenacao sao enviados ao servidor (?q=&tagId=&sort=)", async ({ page }) => {
    const tagUser = "ana" as const;
    const { token } = await apiLogin(tagUser);
    const t = await teamIdOf(tagUser, TEAM_ALFA);
    const tags = (await api(token, "GET", `/api/v1/teams/${t}/tags`)).body as { id: number; name: string }[];
    const curso = tags.find((x) => x.name === "Curso")!;
    const key = uniq("Zeta").replace(/\s/g, "");
    const a = await apiCreateIdea({ title: `Busca ${key} alfa`, tagId: curso.id });
    const b = await apiCreateIdea({ title: `Busca ${key} beta` });
    await api(token, "POST", `/api/v1/teams/${t}/cards/${b.id}/vote`);
    void a;

    await loginAs(page, "ana");
    await openTab(page, "Caixa de Entrada");

    const reqs: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/ideas?")) reqs.push(decodeURIComponent(r.url()));
    });

    // busca
    const searchReq = page.waitForRequest((r) => decodeURIComponent(r.url()).includes(`q=${key}`));
    await page.getByPlaceholder("Buscar ideias...").fill(key);
    await searchReq;
    await expect(inboxCard(page, `Busca ${key} alfa`)).toBeVisible();
    await expect(inboxCard(page, `Busca ${key} beta`)).toBeVisible();
    // a busca filtrou no servidor: so as 2 ideias deste teste (e nao as demais da equipe)
    await expect(page.locator('[data-slot="card"]')).toHaveCount(2);

    // filtro por etiqueta: so a ideia com a etiqueta Curso
    const tagReq = page.waitForRequest((r) => decodeURIComponent(r.url()).includes(`tagId=${curso.id}`));
    await page.getByRole("button", { name: "Curso", exact: true }).click();
    await tagReq;
    await expect(inboxCard(page, `Busca ${key} alfa`)).toBeVisible();
    await expect(inboxCard(page, `Busca ${key} beta`)).toHaveCount(0);
    expect(reqs.some((u) => u.includes(`tagId=${curso.id}`))).toBeTruthy();

    // sem resultado: mensagem especifica
    await page.getByRole("button", { name: "Todas", exact: true }).click();
    await page.getByPlaceholder("Buscar ideias...").fill("zzz-nao-existe-zzz");
    await expect(page.getByText("Nenhuma ideia encontrada para a busca")).toBeVisible();

    // ordenacao: Mais Votadas coloca a ideia votada primeiro
    await page.getByPlaceholder("Buscar ideias...").fill(key);
    const sortReq = page.waitForRequest((r) => r.url().includes("sort=votes"));
    await page.getByRole("button", { name: "Recentes" }).click();
    await sortReq;
    await expect(page.getByRole("button", { name: "Mais Votadas" })).toBeVisible();
    expect(reqs.some((u) => u.includes("sort=votes"))).toBeTruthy();
    await expect(page.locator('[data-slot="card"]')).toHaveCount(2);
    await expect.poll(async () => (await page.locator('[data-slot="card"] h3').allTextContents())[0]).toContain("beta");
    const titles = await page.locator('[data-slot="card"] h3').allTextContents();
    expect(titles.findIndex((x) => x.includes("beta"))).toBeLessThan(titles.findIndex((x) => x.includes("alfa")));
  });

  test("votar e remover o voto (servidor): contador e persistencia", async ({ page }) => {
    const title = uniq("Ideia para votar");
    await apiCreateIdea({ title });
    await loginAs(page, "ana");
    await openTab(page, "Caixa de Entrada");
    const card = inboxCard(page, title);
    const voteBtn = card.getByRole("button", { name: /^\d+$/ });
    await expect(voteBtn).toHaveText("0");
    await voteBtn.click();
    await expect(voteBtn).toHaveText("1");
    await expect(voteBtn).toHaveAttribute("title", "Remover meu voto");
    await page.reload();
    await openTab(page, "Caixa de Entrada");
    await expect(inboxCard(page, title).getByRole("button", { name: /^\d+$/ })).toHaveText("1");
    await inboxCard(page, title).getByRole("button", { name: /^\d+$/ }).click();
    await expect(inboxCard(page, title).getByRole("button", { name: /^\d+$/ })).toHaveText("0");
  });

  test("E2E-05 (parte 2) / RN01 / FT-17: converter em projeto exige publico-alvo >= 3 e objetivo >= 10; depois aparece na coluna escolhida", async ({ page }) => {
    const title = uniq("Ideia para converter");
    await apiCreateIdea({ title }); // sem publico/objetivo
    await loginAs(page, "ana");
    await openTab(page, "Caixa de Entrada");
    await inboxCard(page, title).getByRole("button", { name: /Converter em Projeto/ }).click();
    const confirm = page.getByRole("button", { name: "Confirmar e Mover ao Quadro" });
    await expect(page.getByRole("heading", { name: "Ativar Projeto no Quadro" })).toBeVisible();
    await expect(confirm).toBeDisabled();

    await page.getByPlaceholder("Ex: Iniciantes em CS").fill("ab");
    await page.getByPlaceholder("Ex: Compreender BFS e DFS").fill("curto");
    await expect(confirm).toBeDisabled();
    await expect(page.getByText(/Público-alvo: mínimo 3 caracteres/)).toBeVisible();
    await expect(page.getByText(/Objetivo pedagógico: mínimo 10 caracteres/)).toBeVisible();

    await page.getByPlaceholder("Ex: Iniciantes em CS").fill("Estudantes de ADS");
    await page.getByPlaceholder("Ex: Compreender BFS e DFS").fill("Compreender busca em grafos");
    await expect(confirm).toBeEnabled();
    await page.getByRole("button", { name: "Roteiro", exact: true }).click();
    await confirm.click();
    await expectToast(page, "Ideia convertida em projeto no quadro!");
    await expect(inboxCard(page, title)).toHaveCount(0);

    await openTab(page, "Quadro Kanban");
    await expect(boardColumn(page, "Roteiro").getByRole("heading", { name: title })).toBeVisible();
    await expect(boardCard(page, title).getByText("Estudantes de ADS")).toBeVisible();
  });

  test("erro do servidor na conversao (ideia ja convertida em outra sessao): mensagem do servidor e estado inalterado", async ({ page }) => {
    const title = uniq("Ideia convertida por outro");
    const idea = await apiCreateIdea({ title });
    await loginAs(page, "ana");
    await openTab(page, "Caixa de Entrada");
    await expect(inboxCard(page, title)).toBeVisible();

    // outra sessao converte a ideia primeiro
    const { token } = await apiLogin("ana");
    const t = await teamIdOf("ana", TEAM_ALFA);
    const r = await api(token, "POST", `/api/v1/teams/${t}/cards/${idea.id}/convert`, { targetAudience: "Estudantes", pedagogicalObjective: "Aprender os fundamentos" });
    expect(r.status).toBe(200);

    await inboxCard(page, title).getByRole("button", { name: /Converter em Projeto/ }).click();
    await page.getByPlaceholder("Ex: Iniciantes em CS").fill("Estudantes de ADS");
    await page.getByPlaceholder("Ex: Compreender BFS e DFS").fill("Compreender busca em grafos");
    await page.getByRole("button", { name: "Confirmar e Mover ao Quadro" }).click();
    const err = page.locator('[data-sonner-toast][data-type="error"]').first();
    await expect(err).toBeVisible();
    await expect(page.locator('[data-sonner-toast][data-type="success"]').filter({ hasText: "convertida" })).toHaveCount(0);
    // dialogo continua aberto (nao fingiu sucesso)
    await expect(page.getByRole("heading", { name: "Ativar Projeto no Quadro" })).toBeVisible();
    console.log("mensagem (conversao repetida):", await err.innerText());
    // e o card continua uma unica vez no quadro
    const board = await apiBoard();
    const count = board.columns.flatMap((c: any) => c.cards).filter((c: any) => c.title === title).length;
    expect(count).toBe(1);
  });

  test("excluir ideia (Admin) pede confirmacao e remove do servidor", async ({ page }) => {
    const title = uniq("Ideia para excluir");
    await apiCreateIdea({ title });
    await loginAs(page, "ana");
    await openTab(page, "Caixa de Entrada");
    await inboxCard(page, title).getByTitle("Excluir ideia").click();
    await expect(page.getByRole("heading", { name: "Excluir Ideia" })).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(inboxCard(page, title)).toBeVisible();
    await inboxCard(page, title).getByTitle("Excluir ideia").click();
    await page.getByRole("button", { name: "Confirmar Exclusão" }).click();
    await expect(inboxCard(page, title)).toHaveCount(0);
    await page.reload();
    await openTab(page, "Caixa de Entrada");
    await expect(inboxCard(page, title)).toHaveCount(0);
  });
});
