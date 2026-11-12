import { test, expect } from "@playwright/test";
import {
  loginAs, openTab, uniq, apiCreateTeam, apiCreateProject, apiCreateIdea, apiLogin, teamIdOf, api, USERS, PASSWORD, TEAM_ALFA, boardCard,
} from "./support/helpers";

test.describe("Diversos", () => {
  let team = "";
  test.beforeAll(async () => {
    team = uniq("Equipe Diversos");
    await apiCreateTeam(team);
  });

  test("datas: 'columnSince'/'createdAt' do servidor batem com o relogio (sem deslocamento de fuso)", async () => {
    const title = uniq("Card relogio");
    const proj = await apiCreateProject(title, "ana", team);
    const { token } = await apiLogin("ana");
    const t = await teamIdOf("ana", team);
    const board = (await api(token, "GET", `/api/v1/teams/${t}/board`)).body;
    const card = board.columns.flatMap((c: any) => c.cards).find((c: any) => c.id === proj.id);
    const diffMin = (Date.now() - new Date(card.columnSince).getTime()) / 60000;
    console.log(`columnSince=${card.columnSince} diferenca para agora = ${diffMin.toFixed(1)} min`);
    expect(Math.abs(diffMin), "[BUG] columnSince/createdAt vem com 'Z' mas e hora local da JVM (deslocamento de fuso)").toBeLessThan(5);
  });

  test("sessao nao vaza entre usuarios: apos logout e login de outro usuario so aparecem os dados dele", async ({ page }) => {
    const titulo = uniq("Card privado da Ana");
    await apiCreateProject(titulo, "ana", team);
    await loginAs(page, "ana", team);
    await expect(boardCard(page, titulo)).toBeVisible();
    await page.getByRole("button", { name: "Encerrar Sessão" }).click();
    await expect(page).toHaveURL(/\/login/);

    // login pela tela como Bia (administra apenas as equipes dela)
    await page.getByPlaceholder("operador@creator.studio").fill(USERS.bia.email);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.getByRole("button", { name: /Iniciar Sessão/ }).click();
    await expect(page.getByRole("heading", { name: "Painel de Controle" })).toBeVisible();
    await expect(page.getByText("Estúdio de Bia").first()).toBeVisible();
    await expect(page.getByText(titulo)).toHaveCount(0);
    await page.locator("nav.fixed button:has(svg.lucide-users)").first().click();
    const dialogText = await page.getByRole("dialog").innerText();
    expect(dialogText).not.toContain(team);
    expect(dialogText).not.toContain("Estúdio de Ana");
  });

  test("UX-05: textos das telas principais estao em portugues com acentuacao (sem palavras sem acento)", async ({ page }) => {
    await apiCreateIdea({ title: uniq("Ideia texto") }, "ana", TEAM_ALFA);
    await loginAs(page, "ana", TEAM_ALFA);
    const bad = /\b(nao|sessao|configuracoes|configuracao|descricao|acao|edicao|gravacao|ideacao|producao|revisao|versao|usuario|publico|colaboracao|exclusao|publicacao|etiquetas?s? nao)\b/i;
    const seen: string[] = [];
    const scan = async (label: string) => {
      const text = await page.locator("body").innerText();
      const m = text.match(bad);
      if (m) seen.push(`${label}: "${m[0]}"`);
    };
    await scan("quadro");
    await openTab(page, "Caixa de Entrada");
    await scan("inbox");
    await page.getByRole("button", { name: "Nova Ideia" }).first().click();
    await scan("nova ideia");
    await page.keyboard.press("Escape");
    await openTab(page, "Estúdio de Escrita");
    await scan("roteiro");
    await openTab(page, "Cursos & Módulos");
    await scan("cursos");
    await page.getByTitle("Gerenciar membros da equipe").click();
    await scan("membros");
    await page.getByRole("tab", { name: "Etiquetas" }).click();
    await scan("etiquetas");
    // aba "Configurações" (renomear/excluir equipe) fica escondida ate o backend existir
    expect(seen, "palavras sem acento em texto de interface").toEqual([]);
  });

  test("mensagens de erro da API chegam com acentuacao (400 de validacao e 404)", async () => {
    const { token } = await apiLogin("ana");
    const t = await teamIdOf("ana", team);
    const a = await api(token, "POST", `/api/v1/teams/${t}/ideas`, { title: "" });
    expect(a.status).toBe(400);
    expect(a.body.message).toMatch(/título|obrigatório/i);
    const b = await api(token, "GET", `/api/v1/teams/${t}/cards/999999/history`);
    expect(b.status).toBe(404);
    expect(b.body.message).toMatch(/não|encontrad/i);
    // sem token: 401, nao 403/500
    expect((await api(null, "GET", `/api/v1/teams/${t}/board`)).status).toBe(401);
  });

  test("UX-05: pagina de rota inexistente esta em portugues", async ({ page }) => {
    await loginAs(page, "ana", team);
    await page.goto("/pagina-que-nao-existe");
    const text = await page.locator("body").innerText();
    expect.soft(text, "[BUG] pagina 404 em ingles (falta app/not-found.tsx)").not.toMatch(/This page could not be found/);
  });

  test("prazo do projeto: definir na edicao aparece no card; limpar o campo remove o prazo no servidor", async ({ page }) => {
    const title = uniq("Card prazo");
    await apiCreateProject(title, "ana", team);
    await loginAs(page, "ana", team);
    const open = () => boardCard(page, title).locator("button:has(svg.lucide-settings-2)").first().click();
    await open();
    await page.locator('input[type="date"]').fill("2031-07-20");
    await page.getByRole("button", { name: "Salvar Alterações" }).click();
    await expect(boardCard(page, title).getByText(/Prazo 20\/07\/2031/)).toBeVisible();
    await open();
    await expect(page.locator('input[type="date"]')).toHaveValue("2031-07-20");
    await page.locator('input[type="date"]').fill("");
    await page.getByRole("button", { name: "Salvar Alterações" }).click();
    await expect(page.getByRole("heading", { name: "Configurar Projeto" })).toHaveCount(0);
    await expect(boardCard(page, title).getByText(/Prazo /)).toHaveCount(0);
    const { token } = await apiLogin("ana");
    const t = await teamIdOf("ana", team);
    const board = (await api(token, "GET", `/api/v1/teams/${t}/board`)).body;
    const card = board.columns.flatMap((c: any) => c.cards).find((c: any) => c.title === title);
    expect(card.dueDate ?? null).toBeNull();
  });
});
