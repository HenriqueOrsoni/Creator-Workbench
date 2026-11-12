import { test, expect, type Page } from "@playwright/test";
import {
  loginAs, uniq, expectToast, apiCreateTeam, apiCreateIdea, apiLogin, teamIdOf, api, openTab, inboxCard,
} from "./support/helpers";

async function openTags(page: Page) {
  await page.getByTitle("Gerenciar membros da equipe").click();
  await page.getByRole("tab", { name: "Etiquetas" }).click();
  await expect(page.getByTestId("tag-manager")).toBeVisible();
}

test.describe("Etiquetas (equipe isolada)", () => {
  let team = "";
  test.beforeAll(async () => {
    team = uniq("Equipe Etiquetas");
    await apiCreateTeam(team);
  });

  test("Admin cria, renomeia, muda a cor e exclui etiquetas; etiqueta nova aparece ao criar ideia", async ({ page }) => {
    await loginAs(page, "ana", team);
    await openTags(page);
    const manager = page.getByTestId("tag-manager");

    // etiquetas padrao da equipe
    for (const n of ["Tutorial", "Podcast", "Curso", "Roteiro", "Artigo"]) {
      await expect(manager.getByLabel(`Nome da etiqueta ${n}`)).toBeVisible();
    }

    // criar
    const name = "Webinar";
    await manager.getByLabel("Nome da nova etiqueta").fill(name);
    await manager.getByLabel("Cor da nova etiqueta").fill("#ff0000");
    await manager.getByRole("button", { name: /Criar/ }).click();
    await expectToast(page, "Etiqueta criada com sucesso!");
    await expect(manager.getByLabel(`Nome da etiqueta ${name}`)).toBeVisible();
    await expect(manager.getByLabel(`Cor da etiqueta ${name}`)).toHaveValue("#ff0000");

    // renomear + recolorir
    await manager.getByLabel(`Nome da etiqueta ${name}`).fill("Webinário");
    await manager.getByLabel(`Cor da etiqueta ${name}`).fill("#0000ff");
    await manager.getByRole("button", { name: `Salvar etiqueta ${name}` }).click();
    await expect(manager.getByLabel("Nome da etiqueta Webinário")).toBeVisible();
    await expect(manager.getByLabel("Cor da etiqueta Webinário")).toHaveValue("#0000ff");

    // persistiu no servidor
    const { token } = await apiLogin("ana");
    const t = await teamIdOf("ana", team);
    const tags = (await api(token, "GET", `/api/v1/teams/${t}/tags`)).body as any[];
    const created = tags.find((x) => x.name === "Webinário");
    expect(created?.color.toLowerCase()).toBe("#0000ff");

    // ideia com a etiqueta nova
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Capturar Ideia" }).click();
    await expect(page.getByLabel("Etiqueta", { exact: true }).locator("option", { hasText: "Webinário" })).toHaveCount(1);
    await page.keyboard.press("Escape");

    // excluir (com confirmacao): a etiqueta some e a ideia fica sem etiqueta
    const ideaTitle = uniq("Ideia com etiqueta removida");
    await apiCreateIdeaIn(team, ideaTitle, created.id);
    await page.getByTitle("Gerenciar membros da equipe").click();
    await page.getByRole("tab", { name: "Etiquetas" }).click();
    await manager.getByRole("button", { name: "Excluir etiqueta Webinário" }).click();
    await expect(page.getByRole("heading", { name: "Excluir Etiqueta" })).toBeVisible();
    await page.getByRole("button", { name: "Confirmar Exclusão" }).click();
    await expect(manager.getByLabel("Nome da etiqueta Webinário")).toHaveCount(0);
    const afterTags = (await api(token, "GET", `/api/v1/teams/${t}/tags`)).body as any[];
    expect(afterTags.some((x) => x.name === "Webinário")).toBeFalsy();
    await page.keyboard.press("Escape");
    await openTab(page, "Caixa de Entrada");
    await expect(inboxCard(page, ideaTitle)).toBeVisible();
    await expect(inboxCard(page, ideaTitle).getByText("Webinário")).toHaveCount(0);
  });

  test("etiqueta duplicada (409): mensagem do servidor, lista inalterada, sem sucesso falso", async ({ page }) => {
    await loginAs(page, "ana", team);
    await openTags(page);
    const manager = page.getByTestId("tag-manager");
    const before = await manager.locator('input[aria-label^="Nome da etiqueta"]').count();
    await manager.getByLabel("Nome da nova etiqueta").fill("Podcast");
    await manager.getByRole("button", { name: /Criar/ }).click();
    const err = page.locator('[data-sonner-toast][data-type="error"]').first();
    await expect(err).toBeVisible();
    console.log("mensagem (etiqueta duplicada):", await err.innerText());
    await expect(err).toContainText(/existe|já|duplic/i);
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    expect(await manager.locator('input[aria-label^="Nome da etiqueta"]').count()).toBe(before);
    // o nome digitado continua no campo (usuario pode corrigir)
    await expect(manager.getByLabel("Nome da nova etiqueta")).toHaveValue("Podcast");

    // renomear para um nome ja usado tambem e rejeitado e a linha mantem o nome original no servidor
    await manager.getByLabel("Nome da etiqueta Artigo").fill("Curso");
    await manager.getByRole("button", { name: "Salvar etiqueta Artigo" }).click();
    await expect(page.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible();
    const { token } = await apiLogin("ana");
    const t = await teamIdOf("ana", team);
    const tags = (await api(token, "GET", `/api/v1/teams/${t}/tags`)).body as any[];
    expect(tags.filter((x) => x.name === "Curso")).toHaveLength(1);
    expect(tags.some((x) => x.name === "Artigo")).toBeTruthy();
  });

  for (const who of ["caio", "rui"] as const) {
    test(`Criador/Revisor (${who}) nao veem gestao de etiquetas, colunas nem configuracoes da equipe`, async ({ page }) => {
      await loginAs(page, who, team);
      await page.getByTitle("Gerenciar membros da equipe").click();
      await expect(page.getByRole("tab", { name: /Membros/ })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Etiquetas" })).toHaveCount(0);
      await expect(page.getByRole("tab", { name: "Configurações" })).toHaveCount(0);
      await expect(page.getByTestId("tag-manager")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Adicionar Membro" })).toHaveCount(0);
      await expect(page.getByLabel(/^Papel de /)).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Adicionar Coluna" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /Mover coluna/ })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /Configurar coluna/ })).toHaveCount(0);
    });

    test(`API (${who}): criar/editar/excluir etiqueta e reordenar colunas respondem 403 e nada muda`, async () => {
      const { token } = await apiLogin(who);
      const t = await teamIdOf(who, team);
      const post = await api(token, "POST", `/api/v1/teams/${t}/tags`, { name: "Nao pode", color: "#123456" });
      expect(post.status).toBe(403);
      const tags = (await api(token, "GET", `/api/v1/teams/${t}/tags`)).body as any[];
      expect(tags.some((x) => x.name === "Nao pode")).toBeFalsy();
      expect((await api(token, "PATCH", `/api/v1/teams/${t}/tags/${tags[0].id}`, { name: "X" })).status).toBe(403);
      expect((await api(token, "DELETE", `/api/v1/teams/${t}/tags/${tags[0].id}`)).status).toBe(403);
      const board = (await api(token, "GET", `/api/v1/teams/${t}/board`)).body;
      expect((await api(token, "PUT", `/api/v1/teams/${t}/columns/order`, { columnIds: board.columns.map((c: any) => c.id).reverse() })).status).toBe(403);
      expect((await api(token, "POST", `/api/v1/teams/${t}/columns`, { name: "Coluna indevida" })).status).toBe(403);
    });
  }
});

async function apiCreateIdeaIn(team: string, title: string, tagId: number) {
  return apiCreateIdea({ title, tagId }, "ana", team);
}
