import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import {
  loginAs, openTab, uniq, apiCreateTeam, apiCreateProject, apiCreateIdea, apiAddTask, apiLogin, teamIdOf, api, boardCard, SHOTS,
} from "./support/helpers";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
] as const;
const THEMES = ["light", "dark"] as const;

fs.mkdirSync(SHOTS, { recursive: true });

let team = "";
test.beforeAll(async () => {
  team = uniq("Equipe Layout");
  const teamId = await apiCreateTeam(team);
  const { token } = await apiLogin("ana");
  // 5a coluna (BF-06) e dados para as telas
  await api(token, "POST", `/api/v1/teams/${teamId}/columns`, { name: "Publicação" });
  const tags = (await api(token, "GET", `/api/v1/teams/${teamId}/tags`)).body as any[];
  const a = await apiCreateProject("Minicurso de Algoritmos de Busca em Grafos com um título bem comprido para testar quebra de linha", "ana", team);
  await apiAddTask(a.id, "Gravar introdução", "ana", team);
  const t2 = await apiAddTask(a.id, "Cortar silêncios e ajustar áudio", "ana", team);
  await api(token, "PATCH", `/api/v1/teams/${teamId}/cards/${a.id}/tasks/${t2.id}`, { dueDate: "2020-01-10" });
  await api(token, "PUT", `/api/v1/kanban/${a.id}`, { title: a.title, targetAudience: "Estudantes de ADS", pedagogicalObjective: "Compreender BFS e DFS em grafos", dueDate: "2020-01-02" });
  await apiCreateProject("Podcast sobre ação pedagógica", "ana", team);
  await apiCreateIdea({ title: "Ideia com etiqueta", description: "Descrição com acentuação: não, coração, avaliação.", tagId: tags[0].id }, "ana", team);
  await apiCreateIdea({ title: "Outra ideia sem etiqueta" }, "ana", team);
});

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem("studio-theme", t);
    } catch {
      /* ignora */
    }
  }, theme);
}

async function noHorizontalPageScroll(page: Page) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  return r.sw <= r.cw + 1;
}

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`${vp.name} ${theme}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height }, colorScheme: theme });

      test(`UX-04/UX-06: telas principais (${vp.name}, ${theme}) sem rolagem horizontal da pagina`, async ({ page }) => {
        await setTheme(page, theme);
        const prefix = `${SHOTS}/${vp.name}-${theme}`;

        // login
        await page.goto("/login");
        await expect(page.getByRole("heading", { name: "Acesso ao Estúdio" })).toBeVisible();
        await page.screenshot({ path: `${prefix}-login.png` });
        expect.soft(await noHorizontalPageScroll(page), "pagina com rolagem horizontal").toBe(true);
        const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
        expect(isDark).toBe(theme === "dark");

        await loginAs(page, "ana", team);
        expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(theme === "dark");

        // quadro com 5 colunas
        await expect(boardCard(page, "Podcast sobre ação pedagógica")).toBeVisible();
        await page.screenshot({ path: `${prefix}-board.png`, fullPage: true });
        expect.soft(await noHorizontalPageScroll(page), "pagina com rolagem horizontal").toBe(true);
        // BF-06: as 5 colunas ficam lado a lado (mesma linha), com rolagem horizontal dentro do quadro
        const tops = await page.locator("div.snap-start").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
        expect.soft(tops).toHaveLength(5);
        expect.soft(new Set(tops).size, "colunas quebram de linha").toBe(1);

        // Navbar: nada sobreposto/cortado (BF-04) e Encerrar Sessao acessivel
        const nav = await page.locator("nav.fixed").boundingBox();
        expect.soft(nav!.width).toBeLessThanOrEqual(vp.width + 1);
        // o botao principal de captura precisa estar inteiro na tela
        const cap = await page.getByRole("button", { name: "Capturar Ideia" }).boundingBox();
        expect.soft(cap!.x + cap!.width, "botao Capturar Ideia fora da tela").toBeLessThanOrEqual(vp.width + 1);

        // inbox
        await openTab(page, "Caixa de Entrada");
        await expect(page.getByText("Ideia com etiqueta")).toBeVisible();
        await page.screenshot({ path: `${prefix}-inbox.png`, fullPage: true });
        expect.soft(await noHorizontalPageScroll(page), "pagina com rolagem horizontal").toBe(true);

        // dialog de tarefas
        await openTab(page, "Quadro Kanban");
        await boardCard(page, "Minicurso de Algoritmos de Busca em Grafos com um título bem comprido para testar quebra de linha").getByTitle("Tarefas do card").click();
        await expect(page.getByRole("dialog").getByText(/tarefas concluídas/)).toBeVisible();
        await page.screenshot({ path: `${prefix}-tarefas.png` });
        const box = await page.getByRole("dialog").boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(-1);
        expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);
        await page.keyboard.press("Escape");

        // equipes e etiquetas
        if (vp.name === "mobile") {
          // no celular o atalho de membros fica fora da tela; usa o dialogo do seletor de equipe
          await page.locator("nav.fixed button:has(svg.lucide-users)").first().click();
          await page.getByRole("button", { name: "Gerenciar Membros" }).click();
        } else {
          await page.getByTitle("Gerenciar membros da equipe").click();
        }
        await page.getByRole("tab", { name: "Etiquetas" }).click();
        await expect(page.getByTestId("tag-manager")).toBeVisible();
        await page.screenshot({ path: `${prefix}-etiquetas.png` });
        const box2 = await page.getByRole("dialog").boundingBox();
        expect(box2!.x + box2!.width).toBeLessThanOrEqual(vp.width + 1);
        await page.keyboard.press("Escape");

        // estudio de escrita
        await boardCard(page, "Podcast sobre ação pedagógica").click();
        await openTab(page, "Estúdio de Escrita");
        await expect(page.locator(".ProseMirror")).toBeVisible();
        await page.screenshot({ path: `${prefix}-roteiro.png` });
        expect.soft(await noHorizontalPageScroll(page), "pagina com rolagem horizontal").toBe(true);
      });
    });
  }
}

test.describe("mobile 375: navegacao e logout", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("UX-06: dialogo de tarefas no celular: abas e acoes da tarefa ficam dentro da tela (alcancaveis)", async ({ page }) => {
    await loginAs(page, "ana", team);
    await boardCard(page, "Podcast sobre ação pedagógica").getByTitle("Tarefas do card").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Título da nova tarefa").fill("Tarefa para medir");
    await dialog.getByRole("button", { name: "Adicionar" }).click();
    await expect(dialog.getByText("Tarefa para medir", { exact: true })).toBeVisible();
    const inside = async (loc: ReturnType<typeof dialog.getByRole>, what: string) => {
      const b = await loc.boundingBox();
      expect.soft(b, what).not.toBeNull();
      expect.soft(b!.x + b!.width, `${what} fora da tela (right=${Math.round(b!.x + b!.width)})`).toBeLessThanOrEqual(376);
    };
    await inside(dialog.getByRole("tab", { name: "Histórico" }), "aba Histórico");
    await inside(dialog.getByRole("tab", { name: "Revisão" }), "aba Revisão");
    await inside(dialog.getByTitle("Excluir tarefa").first(), "botao Excluir tarefa");
    await inside(dialog.getByLabel(/^Prazo da tarefa/).first(), "campo Prazo da tarefa");
    await inside(dialog.getByTitle("Mover para baixo").first(), "botao Mover tarefa");
    await page.screenshot({ path: `${SHOTS}/mobile-light-tarefas-acoes.png` });
  });

  test("BF-09: menu lateral do celular tem navegacao e 'Encerrar Sessao'; logout funciona", async ({ page }) => {
    await loginAs(page, "ana", team);
    await page.locator("nav button:has(svg.lucide-menu)").click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("button", { name: /Ideação/ })).toBeVisible();
    await expect(sheet.getByRole("button", { name: /Configurações/ })).toBeVisible();
    await sheet.getByRole("button", { name: /Encerrar Sessão/ }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("BF-04: seletor de equipe no celular nao estoura a tela e o rodape do dialogo cabe", async ({ page }) => {
    await loginAs(page, "ana", team);
    await page.locator("nav button:has(svg.lucide-users)").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Equipes & Colaboração")).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(376);
    for (const label of ["Gerenciar Membros", "Criar Equipe"]) {
      const b = await dialog.getByRole("button", { name: label }).boundingBox();
      expect(b!.x).toBeGreaterThanOrEqual(0);
      expect(b!.x + b!.width).toBeLessThanOrEqual(376);
    }
    await page.screenshot({ path: `${SHOTS}/mobile-light-equipes.png` });
  });
});

void teamIdOf;
