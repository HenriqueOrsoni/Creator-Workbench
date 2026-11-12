import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import {
  loginAs, openTab, uniq, expectToast, apiCreateTeam, apiCreateProject, apiLogin, teamIdOf, api, boardCard,
} from "./support/helpers";

async function openStudio(page: Page, projectTitle: string) {
  // seleciona o projeto no quadro (o clique no card define o projeto do Estudio) e abre a aba
  await boardCard(page, projectTitle).click();
  await openTab(page, "Estúdio de Escrita");
  await expect(page.getByText("Projeto:", { exact: true })).toBeVisible();
  await expect(page.getByTitle(projectTitle)).toBeVisible();
}

test.describe("Estudio de Escrita (roteiro)", () => {
  let team = "";
  test.beforeAll(async () => {
    team = uniq("Equipe Roteiro");
    await apiCreateTeam(team);
  });

  test("E2E-09 / FT-18..21: projeto novo abre com roteiro vazio sem erro; salvar, criar versao, editar, restaurar, exportar", async ({ page }) => {
    const title = uniq("Projeto roteiro");
    const proj = await apiCreateProject(title, "ana", team);
    await loginAs(page, "ana", team);
    await openStudio(page, title);

    // BF-18: roteiro inexistente = 200 vazio, sem toast de erro
    await expect(page.locator(".ProseMirror")).toBeVisible();
    await expect(page.getByText("Status: Salvo")).toBeVisible();
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Revisões \(0\)/ })).toBeVisible();

    // escreve e salva
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.type("Primeira versão do roteiro com acentuação e coração.");
    await expect(page.getByText("Alterações não salvas")).toBeVisible();
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expectToast(page, "Roteiro salvo com sucesso!");
    await expect(page.getByText("Status: Salvo")).toBeVisible();

    // negrito pela toolbar (FT-19)
    await editor.click();
    await page.keyboard.press("Control+A");
    await page.locator("button:has(svg.lucide-bold)").click();
    await expect(editor.locator("strong")).toContainText("Primeira versão");

    // versao
    await page.getByRole("button", { name: "Versão", exact: true }).click();
    await expectToast(page, "Versão do roteiro criada com sucesso!");
    await expect(page.getByRole("button", { name: /Revisões \(1\)/ })).toBeVisible();

    // altera o texto e salva
    await editor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Texto totalmente diferente, depois da versão.");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expectToast(page, "Roteiro salvo com sucesso!");
    await expect(editor).toContainText("Texto totalmente diferente");

    // restaura a versao
    await page.getByRole("button", { name: /Revisões \(1\)/ }).click();
    await expect(page.getByRole("heading", { name: "Histórico de Versões" })).toBeVisible();
    await page.getByText("VERSÃO", { exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Pré-visualizar e Restaurar Versão" })).toBeVisible();
    await page.getByRole("button", { name: "Restaurar Versão" }).click();
    await expectToast(page, "Versão do roteiro restaurada com sucesso!");
    await expect(editor).toContainText("Primeira versão do roteiro");
    await expect(editor).not.toContainText("Texto totalmente diferente");

    // servidor guardou o conteudo restaurado
    const { token } = await apiLogin("ana");
    const server = (await api(token, "GET", `/api/v1/kanban/${proj.id}/script`)).body;
    expect(server.content).toContain("Primeira versão do roteiro");

    // exportacao: baixa o .md gerado pelo servidor
    await page.keyboard.press("Escape");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Exportar \.MD/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^roteiro-.*\.md$/);
    const text = fs.readFileSync(await download.path(), "utf8");
    expect(text).toContain("Primeira versão do roteiro");
    await expectToast(page, "Roteiro baixado em Markdown (.md)!");
  });

  test("Resumo IA com menos de 100 palavras mostra aviso em portugues e nao chama a IA", async ({ page }) => {
    const title = uniq("Projeto resumo");
    await apiCreateProject(title, "ana", team);
    await loginAs(page, "ana", team);
    await openStudio(page, title);
    await page.getByRole("button", { name: /Resumo IA/ }).click();
    await expectToast(page, "Dados insuficientes para gerar o resumo");
  });

  test("erro do servidor ao salvar (card excluido por outra sessao): mensagem exibida e continua 'Alteracoes nao salvas'", async ({ page }) => {
    const title = uniq("Projeto salvar erro");
    const proj = await apiCreateProject(title, "ana", team);
    await loginAs(page, "ana", team);
    await openStudio(page, title);
    await page.locator(".ProseMirror").click();
    await page.keyboard.type("Texto que nao pode ser salvo.");

    const { token } = await apiLogin("ana");
    const t = await teamIdOf("ana", team);
    expect((await api(token, "DELETE", `/api/v1/teams/${t}/cards/${proj.id}`)).status).toBe(204);

    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    const err = page.locator('[data-sonner-toast][data-type="error"]').first();
    await expect(err).toBeVisible();
    console.log("mensagem (salvar roteiro de card removido):", await err.innerText());
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    await expect(page.getByText("Alterações não salvas")).toBeVisible();
    await expect(page).not.toHaveURL(/login/);
  });

  test("Criador tambem edita o roteiro; versoes do mesmo projeto ficam na lista", async ({ page }) => {
    const title = uniq("Projeto criador roteiro");
    await apiCreateProject(title, "ana", team);
    await loginAs(page, "caio", team);
    await openStudio(page, title);
    await page.locator(".ProseMirror").click();
    await page.keyboard.type("Roteiro escrito pelo criador.");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expectToast(page, "Roteiro salvo com sucesso!");
  });
});
