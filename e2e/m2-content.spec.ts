import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  loginAs, uniq, expectToast, apiCreateTeam, apiCreateProject, apiLogin, teamIdOf, api, openTab, boardCard,
  collectProblems, API, SHOTS, type UserKey,
} from "./support/helpers";

/**
 * Marco 2 (FE QA): dialogo do card com 5 abas, materiais, materiais da aula, revisoes, resumo e XSS.
 * Roda numa equipe isolada. O teste "503" do resumo so roda com SUMMARY_DOWN=1 e o servico Python parado.
 */

const WORDS_120 = Array.from({ length: 120 }, (_, i) => `palavra${i % 17}`).join(" ");
const SCRIPT_OK = `<p>Introdução ao tema. ${WORDS_120}.</p><p>Segundo parágrafo com mais explicações sobre o tema da aula.</p>`;

let team = "";
const dialogOf = (page: Page) => page.getByRole("dialog").first();

async function teamId(user: UserKey = "ana") {
  return teamIdOf(user, team);
}

async function openCard(page: Page, title: string): Promise<Locator> {
  await boardCard(page, title).getByTitle("Tarefas do card").click();
  const dialog = dialogOf(page);
  await expect(dialog.getByRole("tab", { name: /^Tarefas/ })).toBeVisible();
  return dialog;
}

async function uploadApi(user: UserKey, cardId: number, name: string, type: string, content: string | Uint8Array) {
  const { token } = await apiLogin(user);
  const t = await teamId(user);
  const fd = new FormData();
  fd.append("file", new Blob([content as BlobPart], { type }), name);
  const r = await fetch(`${API}/api/v1/teams/${t}/cards/${cardId}/materials`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
  const text = await r.text();
  return { status: r.status, body: text ? JSON.parse(text) : null };
}

async function putScript(cardId: number, html: string) {
  const { token } = await apiLogin("ana");
  const r = await api(token, "PUT", `/api/v1/kanban/${cardId}/script`, { content: html });
  expect(r.status).toBe(200);
}

const file = (name: string, text = "conteudo de teste", mimeType = "text/plain") => ({ name, mimeType, buffer: Buffer.from(text) });


test.beforeAll(async () => {
  team = uniq("Equipe M2");
  await apiCreateTeam(team);
});

test.describe("M2 card dialog layout", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`UX-06: dialogo do card tem 6 abas e a lista quebrada nao cobre o conteudo (375 px, ${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.emulateMedia({ colorScheme: theme });
      const title = uniq("Projeto abas");
      await apiCreateProject(title, "ana", team);
      await loginAs(page, "ana", team);
      const dialog = await openCard(page, title);
      const tabs = dialog.getByRole("tab");
      await expect(tabs).toHaveCount(6); // v4: + Desempenho (projetos)
      const names = (await tabs.allInnerTexts()).map((s) => s.trim());
      expect(names.map((n) => n.replace(/\s*\(\d+\)/, ""))).toEqual(["Tarefas", "Materiais", "Resumo IA", "Revisão", "Desempenho", "Histórico"]);

      const tablistBox = (await dialog.getByRole("tablist").boundingBox())!;
      const tops = new Set<number>();
      for (const [i, name] of ["Tarefas", "Materiais", "Resumo IA", "Revisão", "Desempenho", "Histórico"].entries()) {
        const tab = dialog.getByRole("tab", { name: new RegExp(`^${name}`) });
        await tab.click();
        const b = (await tab.boundingBox())!;
        tops.add(Math.round(b.y));
        expect.soft(b.x + b.width, `aba ${name} fora da tela`).toBeLessThanOrEqual(376);
        expect.soft(b.x, `aba ${name} fora da tela (esq.)`).toBeGreaterThanOrEqual(0);
        await expect(dialog.getByRole("tabpanel")).toBeVisible();
        // medidas na mesma passada, para que uma mudanca de layout entre leituras nao gere falso erro
        const m = await dialog.evaluate((el, label) => {
          const list = el.querySelector('[role="tablist"]')!.getBoundingClientRect();
          const panel = el.querySelector('[role="tabpanel"]:not([hidden])')!.getBoundingClientRect();
          const tabs = [...el.querySelectorAll('[role="tab"]')].find((t) => (t.textContent ?? "").trim().startsWith(label))!.getBoundingClientRect();
          return { listBottom: list.bottom, panelTop: panel.top, tabBottom: tabs.bottom };
        }, name);
        expect.soft(m.listBottom, `aba ${name}: a lista de abas (base) nao passa do topo do painel (2a linha de abas cobre o conteudo)`).toBeLessThanOrEqual(m.panelTop + 0.5);
        // a ultima linha de abas tambem cabe na lista
        expect.soft(m.tabBottom, `aba ${name} nao vaza da lista (a 2a linha fica fora da caixa da lista)`).toBeLessThanOrEqual(m.listBottom + 0.5);
        if (i === 5) await page.screenshot({ path: `${SHOTS}/m2-mobile-${theme}-abas-${name}.png` });
      }
      expect(tops.size, "as abas deveriam quebrar em mais de uma linha a 375 px").toBeGreaterThan(1);
      expect(tablistBox.height).toBeGreaterThan(40);
      await dialog.getByRole("tab", { name: /^Revisão/ }).click();
      await page.screenshot({ path: `${SHOTS}/m2-mobile-${theme}-abas.png` });
    });
  }
});

test.describe("M2 materiais", () => {
  let title = "";
  let cardId = 0;

  test.beforeAll(async () => {
    title = uniq("Projeto materiais");
    cardId = (await apiCreateProject(title, "ana", team)).id;
  });

  test("FE-10/11: Admin envia (progresso real), lista, chip 'N materiais' no quadro, baixa com acento e exclui com confirmacao", async ({ page }) => {
    const problems = collectProblems(page);
    await loginAs(page, "ana", team);
    // atrasa a resposta para a barra de envio ficar visivel
    await page.route("**/materials", async (route) => {
      if (route.request().method() === "POST") await new Promise((r) => setTimeout(r, 900));
      await route.continue();
    });
    const dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: /^Materiais/ }).click();
    await expect(dialog.getByText("Nenhum arquivo anexado a este projeto ainda.")).toBeVisible();

    await dialog.locator('input[type="file"]').setInputFiles(file("Relatório pedagógico ção.txt"));
    await expect(dialog.getByTestId("upload-progress")).toBeVisible();
    // progresso real (XHR): porcentagem visivel durante o envio e nunca 100% antes do sucesso
    await expect(dialog.getByTestId("upload-percent")).toHaveText(/Enviando\.\.\. \d{1,2}%/);
    await expect(dialog.getByRole("progressbar")).toBeVisible();
    await expectToast(page, "Material enviado com sucesso!");
    await expect(dialog.getByTestId("upload-progress")).toHaveCount(0);
    await expect(dialog.getByText("Relatório pedagógico ção.txt", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("tab", { name: "Materiais (1)" })).toBeVisible();

    await dialog.locator('input[type="file"]').setInputFiles({ name: "Imagem.png", mimeType: "image/png", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]) });
    await expect(dialog.getByText("Imagem.png", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("tab", { name: "Materiais (2)" })).toBeVisible();
    // colunas: tipo, tamanho, quem enviou e data
    await expect(dialog.getByTestId("material-meta").first()).toHaveText(/^PNG • \d+ B • Por .+ • \d{2}\/\d{2}\/\d{4}$/);
    await expect(dialog.getByTestId("material-meta").nth(1)).toHaveText(/^TXT • /);
    // Visualizar so para PDF/imagem; abre numa nova aba com o token (?inline=true)
    await expect(dialog.getByRole("button", { name: "Visualizar Relatório pedagógico ção.txt" })).toHaveCount(0);
    const popupPromise = page.waitForEvent("popup");
    await dialog.getByRole("button", { name: "Visualizar Imagem.png" }).click();
    const popup = await popupPromise;
    expect(popup.url()).toMatch(/^blob:/);
    await popup.close();
    await page.screenshot({ path: `${SHOTS}/m2-materiais-desktop.png` });

    // download: nome com acento vem do filename*
    const dl = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Baixar Relatório pedagógico ção.txt" }).click();
    const download = await dl;
    expect(download.suggestedFilename()).toBe("Relatório pedagógico ção.txt");

    // fecha e confere o chip do quadro
    await page.keyboard.press("Escape");
    await expect(boardCard(page, title).getByText("2 materiais", { exact: true })).toBeVisible();

    // exclusao: Cancelar nao exclui; Confirmar exclui
    const dialog2 = await openCard(page, title);
    await dialog2.getByRole("tab", { name: /^Materiais/ }).click();
    await dialog2.getByRole("button", { name: "Excluir Imagem.png" }).click();
    const confirm = page.getByRole("dialog").filter({ hasText: "Excluir Material" });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByText("Imagem.png")).toBeVisible();
    await confirm.getByRole("button", { name: "Cancelar" }).click();
    await expect(confirm).toHaveCount(0);
    await expect(dialog2.getByText("Imagem.png", { exact: true })).toBeVisible();
    await dialog2.getByRole("button", { name: "Excluir Imagem.png" }).click();
    await page.getByRole("dialog").filter({ hasText: "Excluir Material" }).getByRole("button", { name: "Confirmar Exclusão" }).click();
    await expectToast(page, "Material removido!");
    await expect(dialog2.getByText("Imagem.png", { exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(boardCard(page, title).getByText("1 material", { exact: true })).toBeVisible();
    // servidor confirma
    const { token } = await apiLogin("ana");
    const list = (await api(token, "GET", `/api/v1/teams/${await teamId()}/cards/${cardId}/materials`)).body;
    expect(list).toHaveLength(1);
    expect(problems).toEqual([]);
  });

  test("FE-10: erros do cliente (formato, vazio, > 20 MB) mostram aviso e nada e enviado", async ({ page }) => {
    await loginAs(page, "ana", team);
    let posts = 0;
    page.on("request", (r) => { if (r.method() === "POST" && r.url().endsWith("/materials")) posts++; });
    const dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: /^Materiais/ }).click();
    const input = dialog.locator('input[type="file"]');

    await input.setInputFiles(file("virus.exe", "MZ", "application/octet-stream"));
    await expectToast(page, "Formato não suportado");
    await input.setInputFiles(file("vazio.txt", ""));
    await expectToast(page, "O arquivo está vazio.");
    await input.setInputFiles({ name: "grande.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(21 * 1024 * 1024, 1) });
    await expectToast(page, "O arquivo excede o limite de 20 MB.");
    expect(posts).toBe(0);
    await expect(dialog.getByTestId("upload-progress")).toHaveCount(0);
  });

  test("FE-10: erros do servidor (413, 415, 500, rede) viram toast de erro, sem 'sucesso' e a barra some", async ({ page }) => {
    await loginAs(page, "ana", team);
    const dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: /^Materiais/ }).click();
    const before = await dialog.getByRole("tab", { name: /^Materiais/ }).innerText();
    const cases: Array<[number | "abort", string, string]> = [
      [413, "O arquivo excede o limite de 20 MB.", "O arquivo excede o limite de 20 MB."],
      [415, "Tipo de arquivo não permitido.", "Tipo de arquivo não permitido."],
      [400, 'Envie um arquivo não vazio no campo "file".', "Envie um arquivo não vazio"],
      [500, "Erro interno simulado", "Erro interno simulado"],
      ["abort", "", "Não foi possível conectar ao servidor"],
    ];
    for (const [status, message, expected] of cases) {
      const handler = async (route: any) => {
        if (route.request().method() !== "POST") return route.continue();
        if (status === "abort") return route.abort();
        return route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ message }) });
      };
      await page.route("**/materials", handler);
      await dialog.locator('input[type="file"]').setInputFiles(file(`falha-${status}.txt`));
      await expectToast(page, expected);
      await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
      await expect(dialog.getByText(`falha-${status}.txt`)).toHaveCount(0);
      await expect(dialog.getByTestId("upload-progress")).toHaveCount(0);
      await page.unroute("**/materials", handler);
    }
    expect(await dialog.getByRole("tab", { name: /^Materiais/ }).innerText()).toBe(before);
    await page.screenshot({ path: `${SHOTS}/m2-materiais-erro-servidor.png` });
  });

  test("FE-10: progresso real: com resposta 413 atrasada a porcentagem aparece e a barra some na hora, com o toast do servidor", async ({ page }) => {
    await loginAs(page, "ana", team);
    const dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: /^Materiais/ }).click();
    const handler = async (route: any) => {
      if (route.request().method() !== "POST") return route.continue();
      await new Promise((r) => setTimeout(r, 700));
      return route.fulfill({ status: 413, contentType: "application/json", body: JSON.stringify({ message: "O arquivo excede o limite de 20 MB." }) });
    };
    await page.route("**/materials", handler);
    await dialog.locator('input[type="file"]').setInputFiles(file("progresso-413.txt"));
    await expect(dialog.getByTestId("upload-percent")).toHaveText(/Enviando\.\.\. \d{1,2}%/);
    await expectToast(page, "O arquivo excede o limite de 20 MB.");
    await expect(dialog.getByTestId("upload-progress")).toHaveCount(0);
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    await page.unroute("**/materials", handler);
  });

  test("SEC/FT: servidor real responde 413/415/400 e o upload do Criador funciona; Revisor nao tem upload nem exclusao", async ({ page }) => {
    // API real
    const big = await uploadApi("ana", cardId, "grande.pdf", "application/pdf", new Uint8Array(21 * 1024 * 1024));
    expect(big.status).toBe(413);
    expect((await uploadApi("ana", cardId, "virus.exe", "application/octet-stream", "MZ")).status).toBe(415);
    expect((await uploadApi("ana", cardId, "vazio.txt", "text/plain", "")).status).toBe(400);
    expect((await uploadApi("rui", cardId, "revisor.txt", "text/plain", "x")).status).toBe(403);

    // Criador envia pela tela
    await loginAs(page, "caio", team);
    const dc = await openCard(page, title);
    await dc.getByRole("tab", { name: /^Materiais/ }).click();
    await dc.locator('input[type="file"]').setInputFiles(file("do-criador.txt"));
    await expect(dc.getByText("do-criador.txt", { exact: true })).toBeVisible();
  });

  test("BF-07: Revisor ve e baixa materiais, mas nao ve envio nem exclusao", async ({ page }) => {
    await loginAs(page, "rui", team);
    const dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: /^Materiais/ }).click();
    await expect(dialog.getByText("do-criador.txt", { exact: true })).toBeVisible();
    await expect(dialog.locator('input[type="file"]')).toHaveCount(0);
    await expect(dialog.getByText("Clique para enviar material de apoio")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: /^Excluir / })).toHaveCount(0);
    const dl = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Baixar do-criador.txt" }).click();
    expect((await dl).suggestedFilename()).toBe("do-criador.txt");
    await page.screenshot({ path: `${SHOTS}/m2-materiais-revisor.png` });
  });

  test("Download de PDF funciona no Chromium (anexo, sem visualizacao embutida)", async ({ page }) => {
    const pdf = "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF";
    expect((await uploadApi("ana", cardId, "Apostila ação.pdf", "application/pdf", pdf)).status).toBe(200);
    await loginAs(page, "ana", team);
    const dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: /^Materiais/ }).click();
    const dl = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Baixar Apostila ação.pdf" }).click();
    const d = await dl;
    expect(d.suggestedFilename()).toBe("Apostila ação.pdf");
    expect(page.url()).not.toContain("blob:");
  });
});

test.describe("M2 materiais: nome longo no celular", () => {
  test("UX-06: nome de arquivo comprido nao empurra o dialogo para fora da tela (375 px); baixar/excluir ficam alcancaveis", async ({ page }) => {
    const title = uniq("Projeto nome longo");
    const id = (await apiCreateProject(title, "ana", team)).id;
    const longName = "Material de apoio com nome bem comprido para testar quebra de linha.pdf";
    expect((await uploadApi("ana", id, longName, "application/pdf", "%PDF-1.4")).status).toBe(200);
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAs(page, "ana", team);
    const dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: /^Materiais/ }).click();
    await expect(dialog.getByText(longName, { exact: true })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/m2-materiais-nome-longo-mobile.png` });
    const box = (await dialog.boundingBox())!;
    const dl = (await dialog.getByRole("button", { name: `Baixar ${longName}` }).boundingBox())!;
    const del = (await dialog.getByRole("button", { name: `Excluir ${longName}` }).boundingBox())!;
    expect.soft(dl.x + dl.width, "botao Baixar dentro da tela").toBeLessThanOrEqual(376);
    expect.soft(del.x + del.width, "botao Excluir dentro da tela").toBeLessThanOrEqual(376);
    const overflow = await dialog.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect.soft(overflow, "o dialogo do card nao rola na horizontal").toBeLessThanOrEqual(1);
    expect.soft(box.x + box.width).toBeLessThanOrEqual(376);
  });
});

test.describe("M2 materiais da aula", () => {
  let projA = 0;
  let projATitle = "";
  let projB = 0;
  let projBTitle = "";
  let courseId = 0;
  let courseTitle = "";
  let moduleId = 0;
  let lessonWith = { id: 0, title: "" };
  let lessonWithout = { id: 0, title: "" };
  let matIds: number[] = [];

  test.beforeAll(async () => {
    projATitle = uniq("Projeto aula A");
    projBTitle = uniq("Projeto aula B");
    projA = (await apiCreateProject(projATitle, "ana", team)).id;
    projB = (await apiCreateProject(projBTitle, "ana", team)).id;
    matIds = [
      (await uploadApi("ana", projA, "Aula acentuada ão.txt", "text/plain", "a")).body.id,
      (await uploadApi("ana", projA, "<img src=x onerror=window.__xss=1>.txt", "text/plain", "b")).body.id,
      (await uploadApi("ana", projB, "Do projeto B.txt", "text/plain", "c")).body.id,
    ];
    const { token } = await apiLogin("ana");
    const t = await teamId();
    courseTitle = uniq("Curso M2");
    const c = await api(token, "POST", `/api/v1/teams/${t}/courses`, { title: courseTitle, description: "Curso E2E" });
    courseId = c.body.id;
    await api(token, "POST", `/api/v1/teams/${t}/courses/${courseId}/modules`, { title: "Módulo 1" });
    let det = (await api(token, "GET", `/api/v1/teams/${t}/courses/${courseId}`)).body;
    moduleId = det.modules[0].id;
    lessonWith = { id: 0, title: "Aula com projeto" };
    lessonWithout = { id: 0, title: "Aula sem projeto" };
    await api(token, "POST", `/api/v1/teams/${t}/courses/${courseId}/modules/${moduleId}/lessons`, { title: lessonWith.title, type: "VIDEO", projectId: projA });
    await api(token, "POST", `/api/v1/teams/${t}/courses/${courseId}/modules/${moduleId}/lessons`, { title: lessonWithout.title, type: "VIDEO" });
    det = (await api(token, "GET", `/api/v1/teams/${t}/courses/${courseId}`)).body;
    lessonWith.id = det.modules[0].lessons.find((l: any) => l.title === lessonWith.title).id;
    lessonWithout.id = det.modules[0].lessons.find((l: any) => l.title === lessonWithout.title).id;
  });

  async function openLesson(page: Page, lessonTitle: string, user: UserKey = "ana") {
    await loginAs(page, user, team);
    await openTab(page, "Cursos & Módulos");
    await page.getByText(courseTitle, { exact: true }).click();
    await page.getByRole("button", { name: `Materiais da aula ${lessonTitle}` }).click();
    const dialog = dialogOf(page);
    await expect(dialog.getByText("Materiais da aula", { exact: true })).toBeVisible();
    return dialog;
  }

  test("FE-12: aula com projeto: seletor vem no projeto da aula; vincula, bloqueia duplicado (409), desvincula", async ({ page }) => {
    const dialog = await openLesson(page, lessonWith.title);
    const picker = dialog.getByLabel("Projeto do material");
    await expect(picker).toHaveValue(String(projA));
    await expect(dialog.getByText("Nenhum material vinculado a esta aula.")).toBeVisible();
    await dialog.locator("#lesson-material-select").selectOption({ label: "Aula acentuada ão.txt" });
    await dialog.getByRole("button", { name: "Vincular", exact: true }).click();
    await expectToast(page, "Material vinculado à aula!");
    await expect(dialog.getByRole("button", { name: "Baixar Aula acentuada ão.txt" })).toBeVisible();
    await expect(dialog.getByText("Vinculados (1)")).toBeVisible();
    // o material vinculado some da lista de disponiveis
    await expect(dialog.locator("#lesson-material-select option", { hasText: "Aula acentuada ão.txt" })).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/m2-aula-materiais.png` });

    // 409: outra sessao vincula o mesmo arquivo depois que o dialogo carregou a lista
    const { token } = await apiLogin("ana");
    const t = await teamId();
    const base = `/api/v1/teams/${t}/courses/${courseId}/modules/${moduleId}/lessons/${lessonWith.id}/materials`;
    await dialog.locator("#lesson-material-select").selectOption({ label: "<img src=x onerror=window.__xss=1>.txt" });
    const other = await api(token, "POST", base, { materialId: matIds[1] });
    expect(other.status).toBe(200);
    const dup = await api(token, "POST", base, { materialId: matIds[1] });
    expect(dup.status).toBe(409);
    await dialog.getByRole("button", { name: "Vincular", exact: true }).click();
    await expectToast(page, dup.body.message);
    await expect(page.locator('[data-sonner-toast][data-type="success"]').filter({ hasText: "vinculado" })).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();

    // desvincula
    await dialog.getByRole("button", { name: "Desvincular Aula acentuada ão.txt" }).click();
    await expectToast(page, "Material desvinculado da aula!");
    await expect(dialog.getByRole("button", { name: "Baixar Aula acentuada ão.txt" })).toHaveCount(0);
  });

  test("FE-12: aula sem projeto: seletor vazio, escolhe qualquer projeto da equipe e vincula", async ({ page }) => {
    const dialog = await openLesson(page, lessonWithout.title);
    const picker = dialog.getByLabel("Projeto do material");
    await expect(picker).toHaveValue("");
    await expect(dialog.getByText("Escolha um projeto para ver os materiais dele.")).toBeVisible();
    await picker.selectOption({ label: projBTitle });
    await dialog.locator("#lesson-material-select").selectOption({ label: "Do projeto B.txt" });
    await dialog.getByRole("button", { name: "Vincular", exact: true }).click();
    await expectToast(page, "Material vinculado à aula!");
    await expect(dialog.getByText("Do projeto B.txt", { exact: true })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/m2-aula-sem-projeto.png` });
  });

  test("BF-07: Revisor ve e baixa os materiais da aula, sem vincular nem desvincular", async ({ page }) => {
    const dialog = await openLesson(page, lessonWithout.title, "rui");
    await expect(dialog.getByText("Do projeto B.txt", { exact: true })).toBeVisible();
    await expect(dialog.getByLabel("Projeto do material")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: /Vincular|Desvincular/ })).toHaveCount(0);
    const dl = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Baixar Do projeto B.txt" }).click();
    expect((await dl).suggestedFilename()).toBe("Do projeto B.txt");
  });

  test("FE-12: dialogo da aula no celular (375 px) cabe na tela", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const dialog = await openLesson(page, lessonWithout.title);
    const b = (await dialog.boundingBox())!;
    expect(b.x + b.width).toBeLessThanOrEqual(376);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `${SHOTS}/m2-aula-materiais-mobile.png` });
  });
});

test.describe("M2 revisoes", () => {
  let title = "";
  let cardId = 0;

  test.beforeAll(async () => {
    title = uniq("Projeto revisao");
    cardId = (await apiCreateProject(title, "ana", team)).id;
  });

  test("FE-27: Revisor exige comentario para pedir alteracoes, mantem o texto se falhar, depois registra; selo no quadro", async ({ page }) => {
    const problems = collectProblems(page);
    await loginAs(page, "rui", team);
    const dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: /^Revisão/ }).click();
    await expect(dialog.getByText("Nenhuma revisão registrada ainda.")).toBeVisible();
    await dialog.getByRole("button", { name: "Pedir Alterações" }).click();
    const submit = dialog.getByRole("button", { name: "Registrar Decisão de Revisão" });
    await expect(submit).toBeDisabled();

    // falha simulada: o texto continua no campo e nao aparece sucesso
    const comment = "Ajustar o <b>objetivo</b> e o exemplo da aula";
    await dialog.getByLabel("Comentários de revisão").fill(comment);
    await expect(submit).toBeEnabled();
    await page.route("**/reviews", async (route) => {
      if (route.request().method() === "POST") return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Falha simulada ao revisar" }) });
      return route.continue();
    });
    await submit.click();
    await expectToast(page, "Falha simulada ao revisar");
    await expect(dialog.getByLabel("Comentários de revisão")).toHaveValue(comment);
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    await expect(dialog.getByText("Nenhuma revisão registrada ainda.")).toBeVisible();
    await page.unroute("**/reviews");

    // agora vai
    await submit.click();
    await expectToast(page, "Revisão enviada com observações!");
    await expect(dialog.getByLabel("Comentários de revisão")).toHaveValue("");
    const item = dialog.locator("li").filter({ hasText: "Rui Revisor" });
    await expect(item.getByText("Alterações solicitadas", { exact: true })).toBeVisible();
    // XSS: comentario aparece como texto
    await expect(item.getByText(comment, { exact: true })).toBeVisible();
    await expect(item.locator("b")).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/m2-revisao-historico.png` });
    await page.keyboard.press("Escape");
    await expect(boardCard(page, title).getByText("Alterações solicitadas", { exact: true })).toBeVisible();
    // o 500 simulado acima e esperado; qualquer outro 5xx nao
    expect(problems.filter((p) => !p.includes("/reviews"))).toEqual([]);
  });

  test("FE-27: Administrador aprova (comentario opcional); historico mostra as duas; selo vira 'Aprovado'", async ({ page }) => {
    await loginAs(page, "ana", team);
    const dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: /^Revisão/ }).click();
    await expect(dialog.locator("li")).toHaveCount(1);
    await dialog.getByRole("button", { name: "Aprovar", exact: true }).click();
    await dialog.getByRole("button", { name: "Registrar Decisão de Revisão" }).click();
    await expectToast(page, "Projeto aprovado!");
    await expect(dialog.locator("li")).toHaveCount(2);
    await expect(dialog.locator("li").first().getByText("Aprovado", { exact: true })).toBeVisible();
    await expect(dialog.locator("li").nth(1).getByText("Alterações solicitadas", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    const card = boardCard(page, title);
    await expect(card.getByText("Aprovado", { exact: true })).toBeVisible();
    await expect(card.getByText("Alterações solicitadas", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/m2-quadro-selo-aprovado.png` });
  });

  test("BF-07/SEC: Criador ve o historico mas nao tem o formulario; API responde 403 ao Criador", async ({ page }) => {
    await loginAs(page, "caio", team);
    const dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: /^Revisão/ }).click();
    await expect(dialog.getByText("Histórico de revisões")).toBeVisible();
    await expect(dialog.locator("li")).toHaveCount(2);
    await expect(dialog.getByRole("button", { name: "Registrar Decisão de Revisão" })).toHaveCount(0);
    await expect(dialog.getByLabel("Comentários de revisão")).toHaveCount(0);
    const { token } = await apiLogin("caio");
    const r = await api(token, "POST", `/api/v1/teams/${await teamId("caio")}/cards/${cardId}/reviews`, { decision: "APPROVED", comment: "" });
    expect(r.status).toBe(403);
  });

  test("XSS: comentario de revisao com <img onerror> e <script> e exibido como texto", async ({ page }) => {
    const { token } = await apiLogin("ana");
    const xss = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>';
    const r = await api(token, "POST", `/api/v1/teams/${await teamId()}/cards/${cardId}/reviews`, { decision: "CHANGES_REQUESTED", comment: xss });
    expect(r.status).toBe(200);
    await loginAs(page, "ana", team);
    const dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: /^Revisão/ }).click();
    await expect(dialog.getByText(xss, { exact: true })).toBeVisible();
    await expect(dialog.locator("img")).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
  });
});

test.describe("M2 resumo", () => {
  let title = "";
  let cardId = 0;
  let emptyTitle = "";
  let emptyId = 0;

  test.beforeAll(async () => {
    title = uniq("Projeto resumo");
    cardId = (await apiCreateProject(title, "ana", team)).id;
    emptyTitle = uniq("Projeto resumo vazio");
    emptyId = (await apiCreateProject(emptyTitle, "ana", team)).id;
  });

  test("FE-17: 404 mostra estado vazio; menos de 100 palavras mostra a mensagem exata do doc 07 e nao cria resumo", async ({ page }) => {
    await putScript(emptyId, "<p>Roteiro curto demais para o resumo.</p>");
    await loginAs(page, "ana", team);
    const dialog = await openCard(page, emptyTitle);
    await dialog.getByRole("tab", { name: "Resumo IA" }).click();
    await expect(dialog.getByText(/Nenhum resumo gerado para este projeto\./)).toBeVisible();
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toHaveCount(0);
    await dialog.getByRole("button", { name: "Gerar Resumo" }).click();
    await expectToast(page, "Dados insuficientes para gerar o resumo: escreva pelo menos 100 palavras no roteiro.");
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    await expect(dialog.getByTestId("summary-text")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Gerar Resumo" })).toBeEnabled();
    await page.screenshot({ path: `${SHOTS}/m2-resumo-pouco-texto.png` });
  });

  test("FE-17: Criador gera o resumo (>= 100 palavras), botao desabilitado durante a geracao, texto e origem aparecem", async ({ page }) => {
    await putScript(cardId, SCRIPT_OK);
    await loginAs(page, "caio", team);
    await page.route("**/summary", async (route) => {
      if (route.request().method() === "POST") await new Promise((r) => setTimeout(r, 700));
      await route.continue();
    });
    const dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: "Resumo IA" }).click();
    await expect(dialog.getByText(/Nenhum resumo gerado/)).toBeVisible();
    await dialog.getByRole("button", { name: "Gerar Resumo" }).click();
    await expect(dialog.getByRole("button", { name: /Gerando/ })).toBeDisabled();
    await expectToast(page, "Resumo gerado com sucesso!");
    const text = dialog.getByTestId("summary-text");
    await expect(text).toBeVisible();
    expect((await text.innerText()).trim().length).toBeGreaterThan(20);
    await expect(dialog.getByText(/Gerado em .* a partir do roteiro de produção\./)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Gerar novo resumo" })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/m2-resumo-gerado.png` });
  });

  test("FE-17/BF-07: Administrador ve o botao e o resumo salvo; Revisor ve o resumo mas nao o botao", async ({ page }) => {
    await loginAs(page, "ana", team);
    let dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: "Resumo IA" }).click();
    await expect(dialog.getByTestId("summary-text")).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Gerar/ })).toBeVisible();
    await page.context().clearCookies();
    await page.evaluate(() => window.localStorage.clear());

    const page2 = await page.context().newPage();
    await loginAs(page2, "rui", team);
    dialog = await openCard(page2, title);
    await dialog.getByRole("tab", { name: "Resumo IA" }).click();
    await expect(dialog.getByTestId("summary-text")).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Gerar/ })).toHaveCount(0);
    const { token } = await apiLogin("rui");
    expect((await api(token, "POST", `/api/v1/teams/${await teamId("rui")}/cards/${cardId}/summary`)).status).toBe(403);
    await page2.screenshot({ path: `${SHOTS}/m2-resumo-revisor.png` });
  });

  test("XSS: resumo gerado de roteiro com <b>/<img onerror> e texto puro; resumo com marcacao vinda do servidor tambem", async ({ page }) => {
    const hostile = `<p><b>NEGRITO</b> <img src=x onerror="window.__xss=1"> ${WORDS_120}</p>`;
    await putScript(cardId, hostile);
    await loginAs(page, "ana", team);
    let dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: "Resumo IA" }).click();
    await dialog.getByRole("button", { name: "Gerar novo resumo" }).click();
    await expectToast(page, "Resumo gerado com sucesso!");
    const text = dialog.getByTestId("summary-text");
    await expect(text.locator("b, img, script")).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();

    // marcacao crua no GET: continua texto
    await page.keyboard.press("Escape");
    const raw = '<b>negrito</b><img src=x onerror="window.__xss=3"><script>window.__xss=4</script>';
    await page.reload();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.route("**/summary", (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ cardId, summary: raw, generatedAt: new Date().toISOString(), basedOn: "SCRIPT" }) })
        : route.continue());
    dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: "Resumo IA" }).click();
    await expect(dialog.getByTestId("summary-text")).toHaveText(raw);
    await expect(dialog.getByTestId("summary-text").locator("b, img, script")).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
  });

  test("FE-17: erro 503 do servico de resumo (simulado) mostra o aviso e mantem o resumo antigo", async ({ page }) => {
    await putScript(cardId, SCRIPT_OK);
    await loginAs(page, "ana", team);
    const dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: "Resumo IA" }).click();
    const old = await dialog.getByTestId("summary-text").innerText();
    await page.route("**/summary", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Serviço de resumo indisponível. Tente novamente em instantes." }) })
        : route.continue());
    await dialog.getByRole("button", { name: "Gerar novo resumo" }).click();
    await expectToast(page, "Serviço de resumo indisponível");
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    await expect(dialog.getByTestId("summary-text")).toHaveText(old);
    await expect(dialog.getByRole("button", { name: "Gerar novo resumo" })).toBeEnabled();
  });

  test("FE-17: servico Python realmente parado (SUMMARY_DOWN=1) -> 503, toast e resumo antigo preservado", async ({ page }) => {
    test.skip(!process.env.SUMMARY_DOWN, "rode com SUMMARY_DOWN=1; o teste espera o servico de resumo (porta 8001) ser parado");
    test.setTimeout(150_000);
    // o resumo antigo foi gerado pelos testes anteriores (servico no ar); agora espera-se que o operador pare o servico
    const up = async () => fetch((process.env.SUMMARY_URL ?? "http://localhost:8001") + "/health").then((r) => r.ok, () => false);
    for (let i = 0; i < 120 && (await up()); i++) await new Promise((r) => setTimeout(r, 1000));
    expect(await up(), "o servico de resumo deveria estar parado").toBe(false);
    await loginAs(page, "ana", team);
    const dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: "Resumo IA" }).click();
    const old = await dialog.getByTestId("summary-text").innerText();
    const status = page.waitForResponse((r) => r.url().endsWith("/summary") && r.request().method() === "POST");
    await dialog.getByRole("button", { name: "Gerar novo resumo" }).click();
    const res = await status;
    expect(res.status()).toBe(503);
    const message = (await res.json()).message as string;
    expect(message).toBeTruthy();
    await expectToast(page, message);
    await page.screenshot({ path: `${SHOTS}/m2-resumo-503-real.png` });
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    await expect(dialog.getByTestId("summary-text")).toHaveText(old);
  });
});

test.describe("M2 nomes de arquivo (XSS)", () => {
  test("XSS: nome de arquivo com HTML aparece como texto na lista, na confirmacao de exclusao e no download", async ({ page }) => {
    const title = uniq("Projeto xss arquivo");
    const id = (await apiCreateProject(title, "ana", team)).id;
    const evil = '<img src=x onerror=window.__xss=1>.txt';
    const up = await uploadApi("ana", id, evil, "text/plain", "x");
    expect(up.status).toBe(200);
    await loginAs(page, "ana", team);
    const dialog = await openCard(page, title);
    await dialog.getByRole("tab", { name: /^Materiais/ }).click();
    await expect(dialog.getByText(up.body.fileName, { exact: true })).toBeVisible();
    await expect(dialog.locator("img")).toHaveCount(0);
    await dialog.getByRole("button", { name: /^Excluir / }).click();
    const confirm = page.getByRole("dialog").filter({ hasText: "Excluir Material" });
    await expect(confirm.getByText(up.body.fileName)).toBeVisible();
    await expect(confirm.locator("img")).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
  });
});

test.describe("M2 temas e celular (capturas)", () => {
  for (const [theme, vp] of [["dark", { width: 1440, height: 900 }], ["dark", { width: 375, height: 812 }], ["light", { width: 375, height: 812 }]] as const) {
    test(`UX-04/UX-05: quadro e abas do card com materiais, selo e resumo (${vp.width}px, ${theme})`, async ({ page }) => {
      const title = uniq("Projeto visual");
      const id = (await apiCreateProject(title, "ana", team)).id;
      await uploadApi("ana", id, "Material de apoio com nome bem comprido para testar quebra de linha.pdf", "application/pdf", "%PDF-1.4");
      const { token } = await apiLogin("ana");
      await api(token, "POST", `/api/v1/teams/${await teamId()}/cards/${id}/reviews`, { decision: "CHANGES_REQUESTED", comment: "Revisar o objetivo pedagógico e acrescentar exemplos práticos ao roteiro." });
      await page.setViewportSize(vp);
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript((t) => { try { window.localStorage.setItem("theme", t); } catch { /* ignora */ } }, theme);
      await loginAs(page, "ana", team);
      const card = boardCard(page, title);
      await card.scrollIntoViewIfNeeded();
      await expect(card.getByText("1 material", { exact: true })).toBeVisible();
      await expect(card.getByText("Alterações solicitadas", { exact: true })).toBeVisible();
      await card.screenshot({ path: `${SHOTS}/m2-card-chips-${theme}-${vp.width}.png` });
      const dialog = await openCard(page, title);
      await dialog.getByRole("tab", { name: /^Materiais/ }).click();
      await expect(dialog.getByText(/Material de apoio com nome/)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `${SHOTS}/m2-dialogo-materiais-${theme}-${vp.width}.png` });
      await dialog.getByRole("tab", { name: /^Revisão/ }).click();
      await expect(dialog.locator("li")).toHaveCount(1);
      await page.screenshot({ path: `${SHOTS}/m2-dialogo-revisao-${theme}-${vp.width}.png` });
    });
  }
});
