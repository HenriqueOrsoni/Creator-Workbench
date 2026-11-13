import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  loginAs, uniq, expectToast, apiCreateTeam, apiCreateProject, apiCreateIdea, apiLogin, teamIdOf, api, boardCard,
  collectProblems, SHOTS,
} from "./support/helpers";
import { sql } from "./support/mail";

/**
 * v4 (FE QA): aba "Desempenho" do card (acompanhamento do video no YouTube, decisao 23).
 * O backend sobe com YOUTUBE_BASE_URL=http://localhost:3027 e YOUTUBE_API_KEY=stub-key e o `youtube-stub.mjs`
 * responde no lugar do YouTube (nunca a API real). Cada teste usa um id de video novo (o stub conta chamadas por id).
 * Roda numa equipe isolada (plano Agencia) e uma equipe extra para o limite de 30 atualizacoes por hora (429).
 */

const STUB = process.env.YOUTUBE_STUB_URL ?? "http://localhost:3027";
const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
const NOT_FOUND = "zzzzzzzzzzz";
const MSG_INVALID = "Informe um link válido do YouTube.";
const MSG_UNAVAILABLE = "Não foi possível consultar o YouTube agora. Tente novamente.";

let team = "";
let teamIdNum = 0;

/** Id de video de 11 caracteres, unico por teste. */
function videoId(): string {
  let s = "";
  for (let i = 0; i < 11; i++) s += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  return s === NOT_FOUND ? videoId() : s;
}

async function stub(path: string, body?: unknown) {
  const res = await fetch(STUB + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res.json();
}

const dialogOf = (page: Page) => page.getByRole("dialog").first();

async function openPerformance(page: Page, title: string): Promise<Locator> {
  await boardCard(page, title).getByTitle("Tarefas do card").click();
  const dialog = dialogOf(page);
  await expect(dialog.getByRole("tab", { name: /^Tarefas/ })).toBeVisible();
  await dialog.getByRole("tab", { name: "Desempenho" }).click();
  await expect(dialog.getByTestId("video-performance")).toBeVisible();
  return dialog;
}

const urlInput = (dialog: Locator) => dialog.getByLabel("Link do vídeo no YouTube");
const num = async (dialog: Locator, label: string) => (await dialog.getByTestId(`stat-${label}`).innerText()).trim();
const toInt = (s: string) => Number(s.replace(/\D/g, ""));

/** Torna os snapshots do card mais velhos que a janela de cache de 15 minutos. */
function ageSnapshots(cardId: number | string, minutes = 60) {
  sql(`UPDATE video_stat_snapshots SET captured_at = captured_at - INTERVAL ${Number(minutes)} MINUTE WHERE kanban_item_id = ${Number(cardId)};`);
}

async function putVideo(user: "ana" | "caio" | "rui", cardId: number | string, url: string) {
  const { token } = await apiLogin(user);
  const t = await teamIdOf("ana", team);
  return api(token, "PUT", `/api/v1/teams/${t}/cards/${cardId}/video`, { url });
}

test.beforeAll(async () => {
  team = uniq("Equipe YT");
  teamIdNum = await apiCreateTeam(team);
  await stub("/__reset", {});
});

test.afterEach(async () => {
  await stub("/__mode", { mode: "ok" });
});

test.describe("v4 YouTube: editor (Ana, Administradora)", () => {
  const forms: [string, (id: string) => string][] = [
    ["watch?v=", (id) => `https://www.youtube.com/watch?v=${id}`],
    ["youtu.be/", (id) => `https://youtu.be/${id}`],
    ["shorts/", (id) => `https://www.youtube.com/shorts/${id}`],
  ];

  for (const [label, build] of forms) {
    test(`FT-YT-01 (${label}): salva o link e mostra titulo, visualizacoes, curtidas e comentarios`, async ({ page }) => {
      const problems = collectProblems(page);
      const id = videoId();
      const title = uniq("Projeto YT");
      await apiCreateProject(title, "ana", team);
      await loginAs(page, "ana", team);
      const dialog = await openPerformance(page, title);

      // estado vazio antes de vincular
      await expect(dialog.getByTestId("video-empty")).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Remover" })).toHaveCount(0);

      await urlInput(dialog).fill(build(id));
      await dialog.getByRole("button", { name: "Salvar" }).click();
      await expectToast(page, "Link do vídeo salvo!");

      // ainda sem snapshot (o GET nao consulta o YouTube): clica em Atualizar para buscar no (falso) YouTube
      await expect(dialog.getByRole("button", { name: "Remover" })).toBeVisible();
      await expect(dialog.getByTestId("video-empty")).toHaveCount(0);
      const refresh = dialog.getByRole("button", { name: "Atualizar" });
      await expect(refresh).toBeVisible();
      await refresh.click();

      await expect(dialog.getByTestId("video-title")).toHaveText(`Vídeo de teste ${id}`);
      await expect(dialog.getByTestId("stat-Visualizações")).not.toHaveText("—");
      expect(toInt(await num(dialog, "Visualizações"))).toBeGreaterThan(0);
      expect(toInt(await num(dialog, "Curtidas"))).toBeGreaterThan(0);
      expect(toInt(await num(dialog, "Comentários"))).toBeGreaterThan(0);
      await expect(dialog.getByText(/Publicado em/)).toBeVisible();
      await expect(dialog.getByText(/Atualizado em/)).toBeVisible();

      // o link persiste: reabrir o card (recarregando) mostra o mesmo valor e os numeros
      await page.reload();
      await expect(page.getByRole("heading", { name: "Painel de Controle" })).toBeVisible();
      const again = await openPerformance(page, title);
      await expect(urlInput(again)).toHaveValue(build(id));
      await expect(again.getByTestId("video-title")).toHaveText(`Vídeo de teste ${id}`);
      expect(problems).toEqual([]);
    });
  }

  test("FT-YT-02: Atualizar usa o cache de 15 min (mesmos numeros) e, depois da janela, busca de novo e a tendencia aparece", async ({ page }) => {
    const id = videoId();
    const title = uniq("Projeto YT cache");
    const card = await apiCreateProject(title, "ana", team);
    expect((await putVideo("ana", card.id, `https://www.youtube.com/watch?v=${id}`)).status).toBe(200);
    await loginAs(page, "ana", team);
    const dialog = await openPerformance(page, title);

    // 1a leitura
    const refresh = dialog.getByRole("button", { name: "Atualizar" });
    await refresh.click();
    await expect(dialog.getByTestId("video-title")).toBeVisible();
    const first = toInt(await num(dialog, "Visualizações"));
    const callsAfterFirst = (await stub("/__state")).calls;

    // 2a leitura dentro de 15 min: cache, mesmos numeros e nenhuma chamada nova ao YouTube
    await refresh.click();
    await expect(refresh).toBeEnabled();
    expect(toInt(await num(dialog, "Visualizações"))).toBe(first);
    expect((await stub("/__state")).calls).toBe(callsAfterFirst);
    // com uma unica leitura nao ha tendencia
    await expect(dialog.getByText("A tendência aparece depois de mais de uma leitura.")).toBeVisible();

    // envelhece o snapshot (fora da janela): a proxima busca vai ao YouTube e os numeros crescem
    ageSnapshots(card.id);
    await refresh.click();
    await expect.poll(async () => toInt(await num(dialog, "Visualizações"))).toBeGreaterThan(first);
    expect((await stub("/__state")).calls).toBe(callsAfterFirst + 1);

    // agora ha 2 leituras: o grafico de tendencia aparece
    await expect(dialog.getByTestId("video-sparkline")).toBeVisible();
    const aria = await dialog.getByTestId("video-sparkline").getAttribute("aria-label");
    expect(aria).toContain("2 leituras");

    // API: historico em ordem crescente de data
    const { token } = await apiLogin("ana");
    const r = await api(token, "GET", `/api/v1/teams/${teamIdNum}/cards/${card.id}/video-stats`);
    expect(r.status).toBe(200);
    expect(r.body.history).toHaveLength(2);
    expect(r.body.history[0].viewCount).toBeLessThan(r.body.history[1].viewCount);
  });

  test("FT-YT-03: link invalido mostra 'Informe um link válido do YouTube.' e nada e salvo", async ({ page }) => {
    const title = uniq("Projeto YT invalido");
    const card = await apiCreateProject(title, "ana", team);
    await loginAs(page, "ana", team);
    const dialog = await openPerformance(page, title);

    for (const bad of ["isto nao e um link", "https://vimeo.com/123456789", "https://www.youtube.com/watch?v=curto"]) {
      await urlInput(dialog).fill(bad);
      await dialog.getByRole("button", { name: "Salvar" }).click();
      await expectToast(page, MSG_INVALID);
      await expect(dialog.getByTestId("video-empty")).toBeVisible();
      await expect(dialog.getByTestId("video-title")).toHaveCount(0);
    }
    // nao afirma sucesso
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Link do vídeo salvo!" })).toHaveCount(0);
    const board = (await api((await apiLogin("ana")).token, "GET", `/api/v1/teams/${teamIdNum}/cards/${card.id}/video-stats`));
    expect(board.status).toBe(404);
    await page.screenshot({ path: `${SHOTS}/v4-yt-invalid.png` });
  });

  test("FT-YT-04: limpar o link (Remover) volta ao estado vazio e apaga os numeros", async ({ page }) => {
    const id = videoId();
    const title = uniq("Projeto YT remover");
    const card = await apiCreateProject(title, "ana", team);
    expect((await putVideo("ana", card.id, `https://youtu.be/${id}`)).status).toBe(200);
    await loginAs(page, "ana", team);
    const dialog = await openPerformance(page, title);
    await dialog.getByRole("button", { name: "Atualizar" }).click();
    await expect(dialog.getByTestId("video-title")).toBeVisible();

    await dialog.getByRole("button", { name: "Remover" }).click();
    await expectToast(page, "Link do vídeo removido.");
    await expect(dialog.getByTestId("video-empty")).toBeVisible();
    await expect(urlInput(dialog)).toHaveValue("");
    await expect(dialog.getByTestId("video-title")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Atualizar" })).toHaveCount(0);

    const { token } = await apiLogin("ana");
    expect((await api(token, "GET", `/api/v1/teams/${teamIdNum}/cards/${card.id}/video-stats`)).status).toBe(404);
    // vincula de novo ao mesmo video: os snapshots antigos foram apagados, nao ha numeros
    expect((await putVideo("ana", card.id, `https://youtu.be/${id}`)).status).toBe(200);
    const again = await api(token, "GET", `/api/v1/teams/${teamIdNum}/cards/${card.id}/video-stats`);
    expect(again.status).toBe(200);
    expect(again.body.latest).toBeNull();
    expect(again.body.history).toHaveLength(0);
  });

  test("FT-YT-05: trocar o link para outro video descarta os numeros do anterior", async ({ page }) => {
    const a = videoId();
    const b = videoId();
    const title = uniq("Projeto YT troca");
    const card = await apiCreateProject(title, "ana", team);
    expect((await putVideo("ana", card.id, `https://youtu.be/${a}`)).status).toBe(200);
    await loginAs(page, "ana", team);
    const dialog = await openPerformance(page, title);
    await dialog.getByRole("button", { name: "Atualizar" }).click();
    await expect(dialog.getByTestId("video-title")).toHaveText(`Vídeo de teste ${a}`);

    await urlInput(dialog).fill(`https://youtu.be/${b}`);
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "Link do vídeo salvo!");
    // nao pode ficar com o titulo do video antigo
    await expect(dialog.getByTestId("video-title")).not.toHaveText(`Vídeo de teste ${a}`);
    await dialog.getByRole("button", { name: "Atualizar" }).click();
    await expect(dialog.getByTestId("video-title")).toHaveText(`Vídeo de teste ${b}`);
  });

  test("FT-YT-06: video inexistente ou privado mostra a mensagem de nao encontrado", async ({ page }) => {
    const title = uniq("Projeto YT 404");
    const card = await apiCreateProject(title, "ana", team);
    expect((await putVideo("ana", card.id, `https://www.youtube.com/watch?v=${NOT_FOUND}`)).status).toBe(200);
    await loginAs(page, "ana", team);
    const dialog = await openPerformance(page, title);
    await dialog.getByRole("button", { name: "Atualizar" }).click();

    // mensagem de erro do backend (404), nunca numeros falsos nem "sucesso"
    const t = page.locator('[data-sonner-toast][data-type="error"]').first();
    await expect(t).toBeVisible();
    await expect(t).toContainText(/não encontrad|nao encontrad|indispon|privad/i);
    await expect(dialog.getByTestId("video-title")).toHaveText("");
    for (const l of ["Visualizações", "Curtidas", "Comentários"]) await expect(dialog.getByTestId(`stat-${l}`)).toHaveText("—");
    await page.screenshot({ path: `${SHOTS}/v4-yt-not-found.png` });
  });

  test("FT-YT-07: cota do YouTube esgotada (403 no stub) mostra o 503 amigavel e nao os numeros", async ({ page }) => {
    const id = videoId();
    const title = uniq("Projeto YT cota");
    const card = await apiCreateProject(title, "ana", team);
    expect((await putVideo("ana", card.id, `https://youtu.be/${id}`)).status).toBe(200);
    await loginAs(page, "ana", team);
    const dialog = await openPerformance(page, title);

    await stub("/__mode", { mode: "quota" });
    await dialog.getByRole("button", { name: "Atualizar" }).click();
    const t = page.locator('[data-sonner-toast][data-type="error"]').first();
    await expect(t).toContainText(MSG_UNAVAILABLE);
    // nenhum numero inventado (ver FT-YT-12 sobre o estado sem leitura)
    await expect(dialog.getByTestId("stat-Visualizações")).toHaveText("—");
    await page.screenshot({ path: `${SHOTS}/v4-yt-quota.png` });

    // volta ao normal: Atualizar funciona de novo
    await stub("/__mode", { mode: "ok" });
    await dialog.getByRole("button", { name: "Atualizar" }).click();
    await expect(dialog.getByTestId("video-title")).toBeVisible();

    // erro 500 do YouTube tambem vira a mesma mensagem
    ageSnapshots(card.id);
    await page.locator('[data-sonner-toast]').first().waitFor({ state: "detached" }).catch(() => {});
    await stub("/__mode", { mode: "error" });
    await dialog.getByRole("button", { name: "Atualizar" }).click();
    await expect(page.locator('[data-sonner-toast][data-type="error"]').filter({ hasText: MSG_UNAVAILABLE }).first()).toBeVisible();
    // os numeros antigos continuam (nao zera nada)
    await expect(dialog.getByTestId("video-title")).toBeVisible();
  });

  test("FT-YT-08: 31a atualizacao da equipe na hora devolve 429 e a tela avisa", async ({ page }) => {
    // equipe nova para nao afetar os outros testes (limite de 30 consultas ao YouTube por equipe por hora)
    const t2 = uniq("Equipe YT 429");
    const tid = await apiCreateTeam(t2);
    const title = uniq("Projeto YT 429");
    const card = await apiCreateProject(title, "ana", t2);
    const { token } = await apiLogin("ana");
    const id = videoId();
    expect((await api(token, "PUT", `/api/v1/teams/${tid}/cards/${card.id}/video`, { url: `https://youtu.be/${id}` })).status).toBe(200);
    for (let i = 0; i < 30; i++) {
      const r = await api(token, "POST", `/api/v1/teams/${tid}/cards/${card.id}/video-stats/refresh`);
      expect(r.status, `refresh ${i + 1}`).toBe(200);
      ageSnapshots(card.id);
    }
    await loginAs(page, "ana", t2);
    const dialog = await openPerformance(page, title);
    await dialog.getByRole("button", { name: "Atualizar" }).click();
    const toastEl = page.locator('[data-sonner-toast][data-type="error"]').first();
    await expect(toastEl).toContainText("Limite de atualizações do YouTube atingido");
    await page.screenshot({ path: `${SHOTS}/v4-yt-429.png` });
  });
});

test.describe("v4 YouTube: estado sem leitura", () => {
  // [BUG] FE: com o video vinculado e nenhum snapshot ainda, a tela mostra titulo vazio, o icone de link solto e tres "—",
  // em vez do aviso "Ainda não há números deste vídeo. Clique em Atualizar." (VideoPerformance.tsx: `stats ?` ignora latest === null).
  test.fail("FT-YT-12 [BUG]: video vinculado sem nenhuma leitura mostra o aviso 'Ainda não há números', nao tiles vazios", async ({ page }) => {
    const title = uniq("Projeto YT sem leitura");
    const card = await apiCreateProject(title, "ana", team);
    expect((await putVideo("ana", card.id, `https://youtu.be/${videoId()}`)).status).toBe(200);
    await loginAs(page, "ana", team);
    const dialog = await openPerformance(page, title);
    await expect(dialog.getByText("Ainda não há números deste vídeo. Clique em Atualizar.")).toBeVisible();
    await expect(dialog.getByTestId("stat-Visualizações")).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/v4-yt-no-snapshot.png` });
  });
});

test.describe("v4 YouTube: revisor (Rui) e criador (Caio)", () => {
  test("FT-YT-09: Revisor ve os numeros somente leitura, sem campo de edicao, e ainda usa Atualizar", async ({ page }) => {
    const id = videoId();
    const title = uniq("Projeto YT revisor");
    const card = await apiCreateProject(title, "ana", team);
    expect((await putVideo("ana", card.id, `https://youtu.be/${id}`)).status).toBe(200);
    await loginAs(page, "rui", team);
    const dialog = await openPerformance(page, title);

    await expect(dialog.getByTestId("video-url-readonly")).toHaveText(`https://youtu.be/${id}`);
    await expect(dialog.getByRole("textbox")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Salvar" })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Remover" })).toHaveCount(0);

    const refresh = dialog.getByRole("button", { name: "Atualizar" });
    await expect(refresh).toBeVisible();
    await refresh.click();
    await expect(dialog.getByTestId("video-title")).toHaveText(`Vídeo de teste ${id}`);
    expect(toInt(await num(dialog, "Visualizações"))).toBeGreaterThan(0);
    await page.screenshot({ path: `${SHOTS}/v4-yt-reviewer.png` });

    // o servidor tambem recusa a escrita do revisor
    const r = await putVideo("rui", card.id, `https://youtu.be/${videoId()}`);
    expect(r.status).toBe(403);
    // e o link nao mudou
    const { token } = await apiLogin("rui");
    const stats = await api(token, "GET", `/api/v1/teams/${teamIdNum}/cards/${card.id}/video-stats`);
    expect(stats.body.videoId).toBe(id);
  });

  test("FT-YT-10: Criador (Caio) edita o link como editor", async ({ page }) => {
    const id = videoId();
    const title = uniq("Projeto YT criador");
    await apiCreateProject(title, "ana", team);
    await loginAs(page, "caio", team);
    const dialog = await openPerformance(page, title);
    await urlInput(dialog).fill(`https://youtu.be/${id}`);
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "Link do vídeo salvo!");
    await dialog.getByRole("button", { name: "Atualizar" }).click();
    await expect(dialog.getByTestId("video-title")).toHaveText(`Vídeo de teste ${id}`);
  });
});

test.describe("v4 YouTube: ideias", () => {
  test("FT-YT-11: ideia nao aceita video (400 do servidor) e o card de ideia nao tem a aba Desempenho", async ({ page }) => {
    const title = uniq("Ideia YT");
    const idea = await apiCreateIdea({ title, description: "Ideia sem video" }, "ana", team);
    const r = await putVideo("ana", idea.id, "https://youtu.be/abcdefghijk");
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain("Converta a ideia em projeto antes de vincular um vídeo.");

    await loginAs(page, "ana", team);
    await page.getByRole("tab", { name: "Caixa de Entrada" }).click();
    const card = page.locator('[data-slot="card"]').filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await expect(card).toBeVisible();
    // o card de ideia no inbox nao oferece o dialogo de tarefas com a aba Desempenho
    const opener = card.getByTitle("Tarefas do card");
    if (await opener.count()) {
      await opener.click();
      await expect(dialogOf(page).getByRole("tab", { name: /^Tarefas/ })).toBeVisible();
      await expect(dialogOf(page).getByRole("tab", { name: "Desempenho" })).toHaveCount(0);
    }
    await expect(page.getByRole("tab", { name: "Desempenho" })).toHaveCount(0);
  });
});

test.describe("v4 YouTube: responsivo", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`UX-YT-01: 375 px (${theme}) sem rolagem horizontal na aba Desempenho, vazia e com numeros`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.emulateMedia({ colorScheme: theme });
      const id = videoId();
      const title = uniq("Projeto YT mobile");
      const card = await apiCreateProject(title, "ana", team);
      await loginAs(page, "ana", team);
      const dialog = await openPerformance(page, title);

      const overflow = async () =>
        page.evaluate(() => {
          const d = document.querySelector('[role="dialog"]') as HTMLElement;
          return { page: document.documentElement.scrollWidth - document.documentElement.clientWidth, dialog: d.scrollWidth - d.clientWidth };
        });
      let o = await overflow();
      expect(o.page).toBeLessThanOrEqual(0);
      expect(o.dialog).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `${SHOTS}/v4-yt-375-${theme}-empty.png` });

      // titulo e link longos nao podem estourar a largura
      const longId = id;
      await urlInput(dialog).fill(`https://www.youtube.com/watch?v=${longId}&list=PLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&t=123456789`);
      await dialog.getByRole("button", { name: "Salvar" }).click();
      await expectToast(page, "Link do vídeo salvo!");
      await dialog.getByRole("button", { name: "Atualizar" }).click();
      await expect(dialog.getByTestId("video-title")).toBeVisible();
      ageSnapshots(card.id);
      await dialog.getByRole("button", { name: "Atualizar" }).click();
      await expect(dialog.getByTestId("video-sparkline")).toBeVisible();
      o = await overflow();
      expect(o.page).toBeLessThanOrEqual(0);
      expect(o.dialog).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `${SHOTS}/v4-yt-375-${theme}-stats.png` });
    });
  }

  test("UX-YT-02: 1440 px, tema escuro: aba Desempenho legivel", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const id = videoId();
    const title = uniq("Projeto YT desktop");
    const card = await apiCreateProject(title, "ana", team);
    expect((await putVideo("ana", card.id, `https://youtu.be/${id}`)).status).toBe(200);
    await loginAs(page, "ana", team);
    const dialog = await openPerformance(page, title);
    await dialog.getByRole("button", { name: "Atualizar" }).click();
    await expect(dialog.getByTestId("video-title")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/v4-yt-1440-dark.png` });
  });
});
