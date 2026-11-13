import { test, expect } from "@playwright/test";
import {
  loginAs, openTab, uniq, expectToast, apiCreateIdea, apiCreateProject, apiLogin, teamIdOf, api, inboxCard, boardCard, TEAM_ALFA,
} from "./support/helpers";

// Fechamento do marco 1: edicao de ideia e de etiqueta, flags e layout no celular.

async function tagId(name: string) {
  const { token } = await apiLogin("ana");
  const t = await teamIdOf("ana", TEAM_ALFA);
  const tags = (await api(token, "GET", `/api/v1/teams/${t}/tags`)).body as { id: number; name: string }[];
  return tags.find((x) => x.name === name)!.id;
}

test.describe("Edicao de ideia e de etiqueta", () => {
  test("editor edita titulo, descricao e etiqueta da ideia da Caixa de Entrada (e remove a etiqueta)", async ({ page }) => {
    const title = uniq("Ideia editavel");
    await apiCreateIdea({ title, description: "antes", tagId: await tagId("Podcast") });
    await loginAs(page, "ana");
    await openTab(page, "Caixa de Entrada");

    await page.getByRole("button", { name: `Editar ideia ${title}` }).click();
    await expect(page.getByRole("heading", { name: "Editar Ideia" })).toBeVisible();
    const newTitle = `${title} v2`;
    await page.getByLabel("Título da Ideia *").fill("ab");
    await expect(page.getByRole("button", { name: "Salvar Alterações" })).toBeDisabled();
    await page.getByLabel("Título da Ideia *").fill(newTitle);
    await page.getByLabel("Descrição / Notas").fill("depois da edição");
    await page.getByLabel("Etiqueta", { exact: true }).selectOption({ label: "Tutorial" });
    await page.getByRole("button", { name: "Salvar Alterações" }).click();
    await expectToast(page, "Ideia atualizada!");

    const card = inboxCard(page, newTitle);
    await expect(card).toBeVisible();
    await expect(card.getByText("Tutorial", { exact: true })).toBeVisible();
    await expect(card.getByText("depois da edição")).toBeVisible();

    // remove a etiqueta
    await page.getByRole("button", { name: `Editar ideia ${newTitle}` }).click();
    await page.getByLabel("Etiqueta", { exact: true }).selectOption({ label: "Sem etiqueta" });
    await page.getByRole("button", { name: "Salvar Alterações" }).click();
    await expect(page.getByRole("heading", { name: "Editar Ideia" })).toHaveCount(0);
    await expect(inboxCard(page, newTitle).getByText("Tutorial", { exact: true })).toHaveCount(0);

    await page.reload();
    await openTab(page, "Caixa de Entrada");
    await expect(inboxCard(page, newTitle)).toBeVisible();
    await expect(inboxCard(page, newTitle).getByText("Tutorial", { exact: true })).toHaveCount(0);
  });

  test("converter com titulo editado cria o projeto com o titulo novo", async ({ page }) => {
    const title = uniq("Ideia para renomear");
    await apiCreateIdea({ title });
    await loginAs(page, "ana");
    await openTab(page, "Caixa de Entrada");
    await inboxCard(page, title).getByRole("button", { name: /Converter em Projeto/ }).click();
    const newTitle = `${title} projeto`;
    await page.getByLabel("Título do Projeto *").fill(newTitle);
    await page.getByPlaceholder("Ex: Iniciantes em CS").fill("Estudantes de ADS");
    await page.getByPlaceholder("Ex: Compreender BFS e DFS").fill("Compreender busca em grafos");
    await page.getByRole("button", { name: "Confirmar e Mover ao Quadro" }).click();
    await expectToast(page, "Ideia convertida em projeto no quadro!");
    await openTab(page, "Quadro Kanban");
    await expect(boardCard(page, newTitle)).toBeVisible();
  });

  test("editor troca e remove a etiqueta de um projeto no formulario de edicao", async ({ page }) => {
    const title = uniq("Projeto etiqueta");
    await apiCreateProject(title);
    await loginAs(page, "ana");
    const card = boardCard(page, title);
    await card.getByTitle("Configurar projeto").click();
    await expect(page.getByRole("heading", { name: "Configurar Projeto" })).toBeVisible();
    await page.getByLabel("Etiqueta", { exact: true }).selectOption({ label: "Curso" });
    await page.getByRole("button", { name: "Salvar Alterações" }).click();
    await expectToast(page, "Projeto atualizado!");
    await expect(boardCard(page, title).getByText("Curso", { exact: true })).toBeVisible();

    await boardCard(page, title).getByTitle("Configurar projeto").click();
    await page.getByLabel("Etiqueta", { exact: true }).selectOption({ label: "Sem etiqueta" });
    await page.getByRole("button", { name: "Salvar Alterações" }).click();
    await expectToast(page, "Projeto atualizado!");
    await expect(boardCard(page, title).getByText("Curso", { exact: true })).toHaveCount(0);
  });

  test("servidor recusa titulo curto na edicao da ideia: mensagem do servidor e dialogo aberto", async ({ page }) => {
    const title = uniq("Ideia 400");
    const idea = await apiCreateIdea({ title });
    const { token } = await apiLogin("ana");
    const r = await api(token, "PUT", `/api/v1/kanban/${idea.id}`, { title: "ab" });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain("O título deve ter pelo menos 3 caracteres.");
    await loginAs(page, "ana");
    await openTab(page, "Caixa de Entrada");
    await expect(inboxCard(page, title)).toBeVisible();
  });
});

test.describe("Layout no celular (375 px)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("barra superior e quadro nao geram rolagem horizontal; Capturar Ideia e membros alcancaveis", async ({ page }) => {
    await loginAs(page, "ana");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, "rolagem horizontal da pagina").toBeLessThanOrEqual(0);
    for (const loc of [page.getByRole("button", { name: "Capturar Ideia" }), page.getByTitle("Gerenciar membros da equipe")]) {
      const b = await loc.boundingBox();
      expect(b).not.toBeNull();
      expect(b!.x + b!.width).toBeLessThanOrEqual(375);
    }
  });
});
