import { test, expect, type Page, type Locator } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  loginAs, uniq, expectToast, apiCreateTeam, apiCreateProject, apiLogin, teamIdOf, api, openTab,
  collectProblems, SHOTS, type UserKey,
} from "./support/helpers";

/**
 * Marco 3 (FE QA): telas de curso do doc 07 sec. 7.9 (CoursesView).
 * Edicao inline, reordenacao, formulario da aula, verificacao de publicacao, publicar/despublicar,
 * exportacao JSON/CSV, papeis, mobile 375 px e tema escuro.
 * Cada teste cria o proprio curso numa equipe isolada.
 *
 * Mapa dos casos do plano: ver o bloco "Mapa" no fim do arquivo.
 */

let team = "";
const dialogOf = (page: Page) => page.getByRole("dialog").first();
const MYSQL = process.env.MYSQL_BIN ?? "C:\\Program Files\\MySQL\\MySQL Server 9.7\\bin\\mysql.exe";

function sql(statement: string) {
  execFileSync(MYSQL, ["-uroot", "db_tcc_e2e", "-e", statement], { env: { ...process.env, MYSQL_PWD: process.env.MYSQL_PWD ?? "130206" } });
}

interface LessonSpec { title: string; contentUrl?: string; description?: string; projectId?: number; type?: "VIDEO" | "TEXT" | "QUIZ" }
interface ModuleSpec { title: string; lessons?: LessonSpec[] }
interface BuiltCourse { id: number; title: string; modules: { id: number; title: string; lessons: { id: number; title: string }[] }[] }

async function buildCourse(modules: ModuleSpec[], opts: { title?: string; description?: string } = {}): Promise<BuiltCourse> {
  const { token } = await apiLogin("ana");
  const t = await teamIdOf("ana", team);
  const title = opts.title ?? uniq("Curso M3");
  const c = await api(token, "POST", `/api/v1/teams/${t}/courses`, { title, description: opts.description ?? "Descricao inicial do curso" });
  expect(c.status).toBe(200);
  const base = `/api/v1/teams/${t}/courses/${c.body.id}`;
  for (const m of modules) {
    const r = await api(token, "POST", `${base}/modules`, { title: m.title });
    expect(r.status).toBe(200);
  }
  let det = (await api(token, "GET", base)).body;
  for (const m of modules) {
    const mod = det.modules.find((x: any) => x.title === m.title);
    for (const l of m.lessons ?? []) {
      const r = await api(token, "POST", `${base}/modules/${mod.id}/lessons`, { title: l.title, type: l.type ?? "VIDEO", description: l.description, contentUrl: l.contentUrl, projectId: l.projectId });
      expect(r.status, JSON.stringify(r.body)).toBe(200);
    }
  }
  det = (await api(token, "GET", base)).body;
  return {
    id: c.body.id,
    title,
    modules: det.modules.map((m: any) => ({ id: m.id, title: m.title, lessons: m.lessons.map((l: any) => ({ id: l.id, title: l.title })) })),
  };
}

const GOOD = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

async function openCourse(page: Page, user: UserKey, course: BuiltCourse) {
  await loginAs(page, user, team);
  await openTab(page, "Cursos & Módulos");
  await page.locator("div.cursor-pointer").filter({ hasText: course.title }).first().click();
  await expect(page.getByRole("heading", { level: 3, name: course.title })).toBeVisible();
}

const courseCard = (page: Page) => page.locator('[data-slot="card"]').filter({ has: page.getByText("Curso Ativo") });
const moduleBox = (page: Page, title: string): Locator => courseCard(page).locator("div.bg-muted\\/30").filter({ hasText: title }).filter({ has: page.getByTitle("Excluir módulo") }).first();
const moduleTitles = (page: Page) => courseCard(page).locator("span.uppercase.font-bold");
const lessonTitles = (mod: Locator) => mod.locator("div.truncate.font-medium");

async function apiCourse(user: UserKey, courseId: number) {
  const { token } = await apiLogin(user);
  const t = await teamIdOf(user, team);
  return (await api(token, "GET", `/api/v1/teams/${t}/courses/${courseId}`)).body;
}

async function noHorizontalScroll(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over, "pagina com rolagem horizontal").toBeLessThanOrEqual(1);
}

test.beforeAll(async () => {
  team = uniq("Equipe M3");
  await apiCreateTeam(team);
});

// ---------------------------------------------------------------- edicao inline
test.describe("M3 edicao inline", () => {
  test("FT-47: editar titulo e descricao do curso; persiste apos recarregar; cancelar descarta", async ({ page }) => {
    const problems = collectProblems(page);
    const course = await buildCourse([{ title: "Modulo A" }]);
    await openCourse(page, "ana", course);
    await page.getByRole("button", { name: "Editar curso" }).click();
    const form = page.getByRole("form", { name: "Editar curso" });
    await expect(form.getByLabel("Título do curso")).toHaveValue(course.title);
    await expect(form.getByLabel("Descrição do curso")).toHaveValue("Descricao inicial do curso");
    // cancelar descarta
    await form.getByLabel("Título do curso").fill("Nao deve salvar");
    await form.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("heading", { level: 3, name: course.title })).toBeVisible();
    expect((await apiCourse("ana", course.id)).title).toBe(course.title);
    // salvar
    const novo = uniq("Curso renomeado ç");
    await page.getByRole("button", { name: "Editar curso" }).click();
    await form.getByLabel("Título do curso").fill(novo);
    await form.getByLabel("Descrição do curso").fill("Nova descrição com acentuação.");
    await form.getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, /atualizad|salv/i);
    await expect(page.getByRole("heading", { level: 3, name: novo })).toBeVisible();
    await expect(page.getByText("Nova descrição com acentuação.")).toBeVisible();
    // a lista lateral tambem muda
    await expect(page.locator("div.cursor-pointer").filter({ hasText: novo })).toHaveCount(1);
    await page.reload();
    await openTab(page, "Cursos & Módulos");
    await expect(page.locator("div.cursor-pointer").filter({ hasText: novo })).toHaveCount(1);
    const det = await apiCourse("ana", course.id);
    expect(det.title).toBe(novo);
    expect(det.description).toBe("Nova descrição com acentuação.");
    expect(problems).toEqual([]);
  });

  test("FT-47: limpar a descricao salva vazio e some da tela; titulo vazio nao envia", async ({ page }) => {
    const course = await buildCourse([]);
    await openCourse(page, "ana", course);
    await page.getByRole("button", { name: "Editar curso" }).click();
    const form = page.getByRole("form", { name: "Editar curso" });
    await form.getByLabel("Título do curso").fill("   ");
    await expect(form.getByRole("button", { name: "Salvar" })).toBeDisabled();
    await form.getByLabel("Título do curso").fill(course.title);
    await form.getByLabel("Descrição do curso").fill("");
    await form.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("form", { name: "Editar curso" })).toHaveCount(0);
    await expect(page.getByText("Descricao inicial do curso")).toHaveCount(0);
    expect(((await apiCourse("ana", course.id)).description ?? "")).toBe("");
  });

  test("FT-47: erro do servidor ao salvar o curso mantem o formulario aberto e mostra o erro (nunca parece sucesso)", async ({ page }) => {
    const course = await buildCourse([]);
    await openCourse(page, "ana", course);
    await page.route(`**/api/v1/teams/*/courses/${course.id}`, async (route) => {
      if (route.request().method() === "PATCH") return route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "Título inválido para o teste." }) });
      return route.continue();
    });
    await page.getByRole("button", { name: "Editar curso" }).click();
    const form = page.getByRole("form", { name: "Editar curso" });
    await form.getByLabel("Título do curso").fill("Titulo que o servidor recusa");
    await form.getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "Título inválido para o teste.");
    await expect(form).toBeVisible();
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 3, name: "Titulo que o servidor recusa" })).toHaveCount(0);
  });

  test("FT-48: renomear modulo; persiste; erro 500 mantem o campo aberto", async ({ page }) => {
    const course = await buildCourse([{ title: "Modulo original" }, { title: "Outro modulo" }]);
    await openCourse(page, "ana", course);
    await page.getByRole("button", { name: "Renomear módulo Modulo original" }).click();
    const form = page.getByRole("form", { name: "Renomear módulo" });
    await form.getByLabel("Nome do módulo").fill("Módulo renomeado");
    await form.getByRole("button", { name: "Salvar" }).click();
    await expect(moduleTitles(page).filter({ hasText: "Módulo renomeado" })).toHaveCount(1);
    await expect(form).toHaveCount(0);
    expect((await apiCourse("ana", course.id)).modules.map((m: any) => m.title)).toContain("Módulo renomeado");
    // erro 500
    await page.route(`**/courses/${course.id}/modules/${course.modules[1].id}`, (route) =>
      route.request().method() === "PATCH" ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Falha simulada." }) }) : route.continue());
    await page.getByRole("button", { name: "Renomear módulo Outro modulo" }).click();
    await form.getByLabel("Nome do módulo").fill("Nao salva");
    await form.getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "Falha simulada.");
    await expect(form).toBeVisible();
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    await form.getByRole("button", { name: "Cancelar" }).click();
    await expect(moduleTitles(page).filter({ hasText: "Outro modulo" })).toHaveCount(1);
  });
});

// ---------------------------------------------------------------- reordenacao
test.describe("M3 reordenacao", () => {
  test("FT-49: reordenar modulos com os botoes; primeiro 'subir' e ultimo 'descer' desabilitados; persiste", async ({ page }) => {
    const problems = collectProblems(page);
    const course = await buildCourse([{ title: "M-1" }, { title: "M-2" }, { title: "M-3" }]);
    await openCourse(page, "ana", course);
    await expect(moduleTitles(page)).toHaveText(["M-1", "M-2", "M-3"]);
    const up = page.getByRole("button", { name: "Mover módulo para cima" });
    const down = page.getByRole("button", { name: "Mover módulo para baixo" });
    await expect(up.first()).toBeDisabled();
    await expect(down.last()).toBeDisabled();
    await down.first().click();
    await expect(moduleTitles(page)).toHaveText(["M-2", "M-1", "M-3"]);
    await up.last().click();
    await expect(moduleTitles(page)).toHaveText(["M-2", "M-3", "M-1"]);
    await page.reload();
    await openTab(page, "Cursos & Módulos");
    await page.locator("div.cursor-pointer").filter({ hasText: course.title }).first().click();
    await expect(moduleTitles(page)).toHaveText(["M-2", "M-3", "M-1"]);
    expect((await apiCourse("ana", course.id)).modules.map((m: any) => m.title)).toEqual(["M-2", "M-3", "M-1"]);
    expect(problems).toEqual([]);
  });

  test("FT-49: reordenar aulas dentro do modulo; persiste; outro modulo nao muda", async ({ page }) => {
    const course = await buildCourse([
      { title: "Mod X", lessons: [{ title: "L1", contentUrl: GOOD }, { title: "L2", contentUrl: GOOD }, { title: "L3", contentUrl: GOOD }] },
      { title: "Mod Y", lessons: [{ title: "Y1", contentUrl: GOOD }, { title: "Y2", contentUrl: GOOD }] },
    ]);
    await openCourse(page, "ana", course);
    const x = moduleBox(page, "Mod X");
    await expect(lessonTitles(x)).toHaveText(["L1", "L2", "L3"]);
    await expect(x.getByRole("button", { name: "Mover aula para cima" }).first()).toBeDisabled();
    await expect(x.getByRole("button", { name: "Mover aula para baixo" }).last()).toBeDisabled();
    await x.getByRole("button", { name: "Mover aula para baixo" }).first().click();
    await expect(lessonTitles(x)).toHaveText(["L2", "L1", "L3"]);
    await x.getByRole("button", { name: "Mover aula para cima" }).last().click();
    await expect(lessonTitles(x)).toHaveText(["L2", "L3", "L1"]);
    await expect(lessonTitles(moduleBox(page, "Mod Y"))).toHaveText(["Y1", "Y2"]);
    const det = await apiCourse("ana", course.id);
    expect(det.modules.find((m: any) => m.title === "Mod X").lessons.map((l: any) => l.title)).toEqual(["L2", "L3", "L1"]);
    expect(det.modules.find((m: any) => m.title === "Mod Y").lessons.map((l: any) => l.title)).toEqual(["Y1", "Y2"]);
  });

  test("FT-49: botoes de mover ficam desabilitados enquanto a requisicao esta em andamento (sem pedido duplo)", async ({ page }) => {
    const course = await buildCourse([{ title: "R-1" }, { title: "R-2" }, { title: "R-3" }]);
    await openCourse(page, "ana", course);
    let puts = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    await page.route(`**/courses/${course.id}/modules/order`, async (route) => {
      puts++;
      await gate;
      await route.continue();
    });
    const down = page.getByRole("button", { name: "Mover módulo para baixo" });
    await down.first().click();
    await expect(down.first()).toBeDisabled();
    await expect(page.getByRole("button", { name: "Mover módulo para cima" }).nth(1)).toBeDisabled();
    await expect(down.nth(1)).toBeDisabled();
    await down.nth(1).click({ force: true }).catch(() => {});
    expect(puts).toBe(1);
    release();
    await expect(moduleTitles(page)).toHaveText(["R-2", "R-1", "R-3"]);
    await expect(down.first()).toBeEnabled();
    expect(puts).toBe(1);
  });

  test("FT-49: falha ao reordenar mostra o erro e mantem a ordem do servidor", async ({ page }) => {
    const course = await buildCourse([{ title: "F-1" }, { title: "F-2" }]);
    await openCourse(page, "ana", course);
    await page.route(`**/courses/${course.id}/modules/order`, (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Falha ao reordenar (simulada)." }) }));
    await page.getByRole("button", { name: "Mover módulo para baixo" }).first().click();
    await expectToast(page, "Falha ao reordenar (simulada).");
    await expect(moduleTitles(page)).toHaveText(["F-1", "F-2"]);
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mover módulo para baixo" }).first()).toBeEnabled();
  });

  test("FT-49: falha de rede ao reordenar aulas mostra mensagem em portugues e libera os botoes", async ({ page }) => {
    const course = await buildCourse([{ title: "Mod N", lessons: [{ title: "N1", contentUrl: GOOD }, { title: "N2", contentUrl: GOOD }] }]);
    await openCourse(page, "ana", course);
    await page.route("**/lessons/order", (route) => route.abort("failed"));
    const mod = moduleBox(page, "Mod N");
    await mod.getByRole("button", { name: "Mover aula para baixo" }).first().click();
    await expectToast(page, /conectar ao servidor/i);
    await expect(lessonTitles(mod)).toHaveText(["N1", "N2"]);
    await expect(mod.getByRole("button", { name: "Mover aula para baixo" }).first()).toBeEnabled();
  });
});

// ---------------------------------------------------------------- formulario da aula
test.describe("M3 formulario da aula", () => {
  test("FT-50: criar aula com Descricao e Link do conteudo; editar; limpar o link; persiste", async ({ page }) => {
    const problems = collectProblems(page);
    const course = await buildCourse([{ title: "Mod aula" }]);
    await openCourse(page, "ana", course);
    await page.getByRole("button", { name: /Nova Aula/ }).click();
    const dialog = dialogOf(page);
    await expect(dialog.getByLabel(/Link do conteúdo/)).toBeVisible();
    await expect(dialog.getByLabel("Descrição da aula")).toBeVisible();
    await dialog.getByLabel(/Título da Aula/).fill("Aula com link");
    await dialog.getByLabel(/Link do conteúdo/).fill(GOOD);
    await dialog.getByLabel("Descrição da aula").fill("Descrição da aula com acentuação.");
    await dialog.getByRole("button", { name: "Salvar Aula" }).click();
    await expectToast(page, /Aula/i);
    await expect(dialog).toHaveCount(0);
    let det = await apiCourse("ana", course.id);
    let lesson = det.modules[0].lessons[0];
    expect(lesson.contentUrl).toBe(GOOD);
    expect(lesson.description).toBe("Descrição da aula com acentuação.");
    // editar: o dialogo vem preenchido
    await page.getByRole("button", { name: "Editar aula Aula com link" }).click();
    await expect(dialog.getByLabel(/Link do conteúdo/)).toHaveValue(GOOD);
    await expect(dialog.getByLabel("Descrição da aula")).toHaveValue("Descrição da aula com acentuação.");
    await dialog.getByLabel(/Link do conteúdo/).fill("");
    await dialog.getByLabel("Descrição da aula").fill("Só a descrição agora.");
    await dialog.getByRole("button", { name: "Salvar Alterações" }).click();
    await expect(dialog).toHaveCount(0);
    det = await apiCourse("ana", course.id);
    lesson = det.modules[0].lessons[0];
    expect(lesson.contentUrl ?? "", "link em branco deveria limpar o link").toBe("");
    expect(lesson.description).toBe("Só a descrição agora.");
    expect(problems).toEqual([]);
  });

  test("FT-50: link invalido (nao http/https) e recusado pelo servidor; dialogo fica aberto com a mensagem", async ({ page }) => {
    const course = await buildCourse([{ title: "Mod link" }]);
    await openCourse(page, "ana", course);
    await page.getByRole("button", { name: /Nova Aula/ }).click();
    const dialog = dialogOf(page);
    await dialog.getByLabel(/Título da Aula/).fill("Aula ftp");
    await dialog.getByLabel(/Link do conteúdo/).fill("ftp://servidor.exemplo/arquivo");
    await dialog.getByRole("button", { name: "Salvar Aula" }).click();
    await expect(page.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    expect((await apiCourse("ana", course.id)).modules[0].lessons).toHaveLength(0);
  });

  test("FT-50: link com mais de 500 caracteres e recusado (limite 500) sem criar a aula", async ({ page }) => {
    const course = await buildCourse([{ title: "Mod 500" }]);
    await openCourse(page, "ana", course);
    await page.getByRole("button", { name: /Nova Aula/ }).click();
    const dialog = dialogOf(page);
    const longUrl = "https://exemplo.test/" + "a".repeat(481); // 502 caracteres
    expect(longUrl.length).toBeGreaterThan(500);
    await dialog.getByLabel(/Título da Aula/).fill("Aula link longo");
    await dialog.getByLabel(/Link do conteúdo/).fill(longUrl);
    await dialog.getByRole("button", { name: "Salvar Aula" }).click();
    await expect(page.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible();
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    await expect(dialog).toBeVisible();
    expect((await apiCourse("ana", course.id)).modules[0].lessons).toHaveLength(0);
    // exatamente 500 passa
    const ok = "https://exemplo.test/" + "b".repeat(479);
    expect(ok.length).toBe(500);
    await dialog.getByLabel(/Link do conteúdo/).fill(ok);
    await dialog.getByRole("button", { name: "Salvar Aula" }).click();
    await expect(dialog).toHaveCount(0);
    expect((await apiCourse("ana", course.id)).modules[0].lessons[0].contentUrl).toBe(ok);
  });

  test("FT-50: aula so com titulo continua sendo criada (link e descricao opcionais)", async ({ page }) => {
    const course = await buildCourse([{ title: "Mod opc" }]);
    await openCourse(page, "ana", course);
    await page.getByRole("button", { name: /Nova Aula/ }).click();
    const dialog = dialogOf(page);
    await dialog.getByLabel(/Título da Aula/).fill("So titulo");
    await dialog.getByRole("button", { name: "Salvar Aula" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("So titulo", { exact: true })).toBeVisible();
  });
});

// ---------------------------------------------------------------- verificacao e publicacao
test.describe("M3 publicacao", () => {
  async function startPublish(page: Page) {
    await page.getByRole("button", { name: /Publicar Curso/ }).click();
  }

  test("FT-51: curso sem modulos lista NO_MODULES; nada e publicado", async ({ page }) => {
    const course = await buildCourse([]);
    await openCourse(page, "ana", course);
    await startPublish(page);
    const dialog = dialogOf(page);
    await expect(dialog.getByText(/Não é possível publicar: 1 problema/)).toBeVisible();
    const check = await api((await apiLogin("ana")).token, "GET", `/api/v1/teams/${await teamIdOf("ana", team)}/courses/${course.id}/publication-check`);
    expect(check.body.publishable).toBe(false);
    expect(check.body.problems[0].type).toBe("NO_MODULES");
    await expect(dialog.getByText(check.body.problems[0].message)).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/m3-check-sem-modulos.png` });
    await dialog.getByRole("button", { name: "Entendido" }).click();
    await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();
    expect((await apiCourse("ana", course.id)).status).toBe("DRAFT");
  });

  test("FT-51: modulo vazio e aula sem material listam EMPTY_MODULE e LESSON_WITHOUT_MATERIAL com os titulos", async ({ page }) => {
    const course = await buildCourse([
      { title: "Modulo vazio" },
      { title: "Modulo com aula", lessons: [{ title: "Aula sem nada" }, { title: "Aula do youtube", contentUrl: GOOD }] },
    ]);
    await openCourse(page, "ana", course);
    await startPublish(page);
    const dialog = dialogOf(page);
    await expect(dialog.getByText(/Não é possível publicar: 2 problemas/)).toBeVisible();
    const t = await teamIdOf("ana", team);
    const check = (await api((await apiLogin("ana")).token, "GET", `/api/v1/teams/${t}/courses/${course.id}/publication-check`)).body;
    const types = check.problems.map((p: any) => p.type).sort();
    expect(types).toEqual(["EMPTY_MODULE", "LESSON_WITHOUT_MATERIAL"]);
    for (const p of check.problems) await expect(dialog.getByText(p.message, { exact: true })).toBeVisible();
    await expect(dialog).toContainText("Modulo vazio"); // o titulo vem dentro da mensagem do servidor (sem repetir)
    await expect(dialog).toContainText("Aula sem nada"); // o titulo vem dentro da mensagem do servidor (sem repetir)
    // a aula com link do YouTube e sem material nao e problema
    await expect(dialog.getByText(/Aula do youtube/)).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/m3-check-problemas.png` });
  });

  test("FT-51: link invalido gravado direto no banco aparece como INVALID_LINK", async ({ page }) => {
    const course = await buildCourse([{ title: "Mod link ruim", lessons: [{ title: "Aula link ruim", contentUrl: GOOD }] }]);
    sql(`update course_lessons set content_url='javascript:alert(1)' where id=${course.modules[0].lessons[0].id}`);
    await openCourse(page, "ana", course);
    await startPublish(page);
    const dialog = dialogOf(page);
    await expect(dialog.getByText(/Não é possível publicar: 1 problema/)).toBeVisible();
    const t = await teamIdOf("ana", team);
    const check = (await api((await apiLogin("ana")).token, "GET", `/api/v1/teams/${t}/courses/${course.id}/publication-check`)).body;
    expect(check.problems.map((p: any) => p.type)).toContain("INVALID_LINK");
    await expect(dialog.getByText(check.problems[0].message, { exact: true })).toBeVisible();
    await expect(dialog).toContainText("Aula link ruim"); // o titulo vem dentro da mensagem do servidor (sem repetir)
    // o link ruim nunca vira link clicavel na tela
    await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
  });

  test("FT-51: erro na verificacao (500) mostra o erro e NAO abre confirmacao de publicacao", async ({ page }) => {
    const course = await buildCourse([{ title: "Mod ok", lessons: [{ title: "Aula ok", contentUrl: GOOD }] }]);
    await openCourse(page, "ana", course);
    await page.route("**/publication-check", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Verificação indisponível (simulada)." }) }));
    await startPublish(page);
    await expectToast(page, "Verificação indisponível (simulada).");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();
  });

  test("FT-52 / E2E-11: aula com YouTube e sem material e valida; confirmar publica; selo 'Publicado em dd/mm/aaaa'; Despublicar volta a Rascunho", async ({ page }) => {
    const problems = collectProblems(page);
    const course = await buildCourse([{ title: "Mod publica", lessons: [{ title: "Aula yt", contentUrl: GOOD }] }]);
    await openCourse(page, "ana", course);
    await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();
    await startPublish(page);
    const dialog = dialogOf(page);
    await expect(dialog.getByText("Publicar Curso", { exact: true })).toBeVisible();
    await expect(dialog.getByText(new RegExp(course.title))).toBeVisible();
    // cancelar nao publica
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    expect((await apiCourse("ana", course.id)).status).toBe("DRAFT");
    await startPublish(page);
    await dialog.getByRole("button", { name: "Confirmar Publicação" }).click();
    await expectToast(page, "Curso publicado com sucesso!");
    const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    await expect(page.getByText(`Publicado em ${hoje}`)).toBeVisible();
    await expect(page.getByText("Rascunho", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Despublicar" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Publicar Curso/ })).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/m3-publicado.png` });
    const det = await apiCourse("ana", course.id);
    expect(det.status).toBe("PUBLISHED");
    expect(det.publishedAt).toBeTruthy();
    await page.reload();
    await openTab(page, "Cursos & Módulos");
    await page.locator("div.cursor-pointer").filter({ hasText: course.title }).first().click();
    await expect(page.getByText(`Publicado em ${hoje}`)).toBeVisible();
    await page.getByRole("button", { name: "Despublicar" }).click();
    await expectToast(page, /despublicado/i);
    await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();
    await expect(page.getByText(/Publicado em/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Publicar Curso/ })).toBeVisible();
    const after = await apiCourse("ana", course.id);
    expect(after.status).toBe("DRAFT");
    expect(after.publishedAt ?? null).toBeNull();
    expect(problems).toEqual([]);
  });

  test("FT-53: publicar respondido com 400 refaz a verificacao e mostra a lista de problemas (sem selo de publicado)", async ({ page }) => {
    const course = await buildCourse([{ title: "Mod corrida", lessons: [{ title: "Aula corrida", contentUrl: GOOD }] }]);
    await openCourse(page, "ana", course);
    await startPublish(page);
    const dialog = dialogOf(page);
    await expect(dialog.getByRole("button", { name: "Confirmar Publicação" })).toBeVisible();
    // enquanto a confirmacao esta aberta, outra pessoa tira o link da aula (o curso deixa de ser publicavel)
    const t = await teamIdOf("ana", team);
    const { token } = await apiLogin("ana");
    const mod = course.modules[0];
    const r = await api(token, "PATCH", `/api/v1/teams/${t}/courses/${course.id}/modules/${mod.id}/lessons/${mod.lessons[0].id}`, { contentUrl: "" });
    expect(r.status).toBe(200);
    await dialog.getByRole("button", { name: "Confirmar Publicação" }).click();
    await expect(page.getByText(/Não é possível publicar: 1 problema/)).toBeVisible();
    await expect(dialogOf(page)).toContainText("Aula corrida"); // o titulo vem dentro da mensagem do servidor (sem repetir)
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Entendido" }).click();
    await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();
    await expect(page.getByText(/Publicado em/)).toHaveCount(0);
    expect((await apiCourse("ana", course.id)).status).toBe("DRAFT");
  });

  test("FT-53: publicar com 500 mostra erro e o curso continua como Rascunho", async ({ page }) => {
    const course = await buildCourse([{ title: "Mod 500", lessons: [{ title: "Aula 500", contentUrl: GOOD }] }]);
    await openCourse(page, "ana", course);
    await page.route("**/publish", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Falha ao publicar (simulada)." }) }));
    await startPublish(page);
    await dialogOf(page).getByRole("button", { name: "Confirmar Publicação" }).click();
    await expectToast(page, "Falha ao publicar (simulada).");
    await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();
    await expect(page.getByText(/Publicado em/)).toHaveCount(0);
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    expect((await apiCourse("ana", course.id)).status).toBe("DRAFT");
  });

  test("FT-52: despublicar com erro mostra o erro e o curso continua publicado", async ({ page }) => {
    const course = await buildCourse([{ title: "Mod desp", lessons: [{ title: "Aula desp", contentUrl: GOOD }] }]);
    const t = await teamIdOf("ana", team);
    expect((await api((await apiLogin("ana")).token, "POST", `/api/v1/teams/${t}/courses/${course.id}/publish`)).status).toBe(200);
    await openCourse(page, "ana", course);
    await page.route("**/unpublish", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Falha ao despublicar (simulada)." }) }));
    await page.getByRole("button", { name: "Despublicar" }).click();
    await expectToast(page, "Falha ao despublicar (simulada).");
    await expect(page.getByText(/Publicado em/)).toBeVisible();
    await expect(page.getByText("Rascunho", { exact: true })).toHaveCount(0);
  });

  test("FT-52: o selo de publicado aparece na hora para quem abre o curso ja publicado (Rui, Revisor)", async ({ page }) => {
    const course = await buildCourse([{ title: "Mod rui", lessons: [{ title: "Aula rui", contentUrl: GOOD }] }]);
    const t = await teamIdOf("ana", team);
    await api((await apiLogin("ana")).token, "POST", `/api/v1/teams/${t}/courses/${course.id}/publish`);
    await openCourse(page, "rui", course);
    await expect(page.getByText(/Publicado em \d{2}\/\d{2}\/\d{4}/)).toBeVisible();
  });
});

// ---------------------------------------------------------------- exportacao
test.describe("M3 exportacao", () => {
  test("FT-54 / E2E-12: exportar JSON baixa curso-{id}.json com a estrutura do curso", async ({ page }) => {
    const course = await buildCourse([{ title: "Mod json", lessons: [{ title: "Aula json", contentUrl: GOOD, description: "Desc" }] }]);
    await openCourse(page, "ana", course);
    const dl = page.waitForEvent("download");
    await page.getByRole("button", { name: "JSON", exact: true }).click();
    const download = await dl;
    expect(download.suggestedFilename()).toBe(`curso-${course.id}.json`);
    const path = await download.path();
    const parsed = JSON.parse(readFileSync(path!, "utf8"));
    expect(JSON.stringify(parsed)).toContain("Aula json");
    expect(JSON.stringify(parsed)).toContain(course.title);
    await expectToast(page, /JSON/);
  });

  test("FT-54 / E2E-12: exportar CSV baixa curso-{id}.csv com BOM UTF-8, ';' e acentos preservados", async ({ page }) => {
    const course = await buildCourse([{ title: "Módulo ção", lessons: [{ title: "Aula açaí", contentUrl: GOOD }] }]);
    await openCourse(page, "ana", course);
    const dl = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV", exact: true }).click();
    const download = await dl;
    expect(download.suggestedFilename()).toBe(`curso-${course.id}.csv`);
    const bytes = readFileSync((await download.path())!);
    expect([...bytes.subarray(0, 3)], "o CSV deve comecar com o BOM UTF-8 (EF BB BF)").toEqual([0xef, 0xbb, 0xbf]);
    const text = bytes.toString("utf8").replace(/^\uFEFF/, "");
    const lines = text.split(/\r?\n/).filter(Boolean);
    expect(lines[0]).toBe("modulo_ordem;modulo_titulo;aula_ordem;aula_titulo;aula_tipo;aula_publicada;aula_link;projeto_id;materiais");
    expect(lines[1]).toContain("Módulo ção");
    expect(lines[1]).toContain("Aula açaí");
    expect(lines[1].split(";").length).toBeGreaterThanOrEqual(9);
    await expectToast(page, /CSV/);
  });

  test("FT-54: o nome do arquivo vem de filename* (UTF-8) quando o servidor o envia, nao do nome padrao do front", async ({ page }) => {
    const course = await buildCourse([{ title: "Mod nome" }]);
    await openCourse(page, "ana", course);
    await page.route("**/export?format=csv", async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=UTF-8",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Expose-Headers": "Content-Disposition",
          "Content-Disposition": `attachment; filename="fallback.csv"; filename*=UTF-8''curso%20acentua%C3%A7%C3%A3o.csv`,
        },
        body: "\uFEFFa;b\n1;2\n",
      });
    });
    const dl = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV", exact: true }).click();
    expect((await dl).suggestedFilename()).toBe("curso acentuação.csv");
  });

  test("FT-54: erro 500 na exportacao mostra o erro, nao baixa nada e nao mostra sucesso; botoes voltam a funcionar", async ({ page }) => {
    const course = await buildCourse([{ title: "Mod falha" }]);
    await openCourse(page, "ana", course);
    let downloaded = false;
    page.on("download", () => (downloaded = true));
    await page.route("**/export?format=json", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Exportação indisponível (simulada)." }) }));
    await page.getByRole("button", { name: "JSON", exact: true }).click();
    await expectToast(page, "Exportação indisponível (simulada).");
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
    expect(downloaded).toBe(false);
    await expect(page.getByRole("button", { name: "JSON", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "CSV", exact: true })).toBeEnabled();
  });

  test("FT-54: botoes de exportacao ficam desabilitados durante o download (sem clique duplo)", async ({ page }) => {
    const course = await buildCourse([{ title: "Mod duplo" }]);
    await openCourse(page, "ana", course);
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    await page.route("**/export?format=csv", async (route) => {
      calls++;
      await gate;
      await route.continue();
    });
    const csv = page.getByRole("button", { name: "CSV", exact: true });
    await csv.click();
    await expect(csv).toBeDisabled();
    await expect(page.getByRole("button", { name: "JSON", exact: true })).toBeDisabled();
    release();
    await expect(csv).toBeEnabled();
    expect(calls).toBe(1);
  });

  test("FT-54: exportar em outra equipe/curso inexistente devolve erro claro (404) sem baixar", async ({ page }) => {
    const course = await buildCourse([{ title: "Mod 404" }]);
    await openCourse(page, "ana", course);
    const { token } = await apiLogin("ana");
    const t = await teamIdOf("ana", team);
    await api(token, "DELETE", `/api/v1/teams/${t}/courses/${course.id}`); // apagado por outra sessao
    let downloaded = false;
    page.on("download", () => (downloaded = true));
    await page.getByRole("button", { name: "CSV", exact: true }).click();
    await expect(page.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible();
    expect(downloaded).toBe(false);
  });
});

// ---------------------------------------------------------------- papeis
test.describe("M3 papeis", () => {
  let course: BuiltCourse;
  test.beforeAll(async () => {
    course = await buildCourse([
      { title: "Papel A", lessons: [{ title: "Aula 1", contentUrl: GOOD }, { title: "Aula 2", contentUrl: GOOD }] },
      { title: "Papel B", lessons: [{ title: "Aula 3", contentUrl: GOOD }] },
    ]);
  });

  test("FT-47..54 / roles: Revisor ve o curso, exporta JSON e CSV, mas nao ve editar, reordenar, publicar, criar nem excluir", async ({ page }) => {
    await openCourse(page, "rui", course);
    await expect(page.getByRole("button", { name: "Criar Novo Curso" })).toHaveCount(0);
    for (const name of [/Editar curso/, /Renomear módulo/, /Mover módulo/, /Mover aula/, /Editar aula/, /Publicar Curso/, /Despublicar/, /Adicionar Módulo/, /Nova Aula/]) {
      await expect(page.getByRole("button", { name }), `Revisor nao deve ver ${name}`).toHaveCount(0);
    }
    await expect(page.getByTitle("Excluir curso")).toHaveCount(0);
    await expect(page.getByTitle("Excluir módulo")).toHaveCount(0);
    await expect(page.getByTitle("Excluir aula")).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/m3-revisor.png` });
    const dlJson = page.waitForEvent("download");
    await page.getByRole("button", { name: "JSON", exact: true }).click();
    expect((await dlJson).suggestedFilename()).toBe(`curso-${course.id}.json`);
    await expect(page.getByRole("button", { name: "CSV", exact: true })).toBeEnabled();
    const dlCsv = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV", exact: true }).click();
    expect((await dlCsv).suggestedFilename()).toBe(`curso-${course.id}.csv`);
  });

  test("roles: Revisor recebe 403 da API em editar, reordenar, publicar e despublicar (e o curso nao muda)", async () => {
    const { token } = await apiLogin("rui");
    const t = await teamIdOf("rui", team);
    const base = `/api/v1/teams/${t}/courses/${course.id}`;
    const ids = course.modules.map((m) => m.id).reverse();
    const results = [
      await api(token, "PATCH", base, { title: "Hack" }),
      await api(token, "PATCH", `${base}/modules/${course.modules[0].id}`, { title: "Hack" }),
      await api(token, "PUT", `${base}/modules/order`, { moduleIds: ids }),
      await api(token, "PUT", `${base}/modules/${course.modules[0].id}/lessons/order`, { lessonIds: course.modules[0].lessons.map((l) => l.id).reverse() }),
      await api(token, "POST", `${base}/publish`),
      await api(token, "POST", `${base}/unpublish`),
      await api(token, "PATCH", `${base}/modules/${course.modules[0].id}/lessons/${course.modules[0].lessons[0].id}`, { contentUrl: "https://x.test" }),
    ];
    expect(results.map((r) => r.status)).toEqual([403, 403, 403, 403, 403, 403, 403]);
    const det = await apiCourse("ana", course.id);
    expect(det.title).toBe(course.title);
    expect(det.modules.map((m: any) => m.title)).toEqual(["Papel A", "Papel B"]);
    // exportar e permitido
    expect((await api(token, "GET", `${base}/export?format=csv`)).status).toBe(200);
    expect((await api(token, "GET", `${base}/publication-check`)).status).toBe(200);
  });

  test("roles: Criador edita, reordena e publica (mesmos controles do Admin)", async ({ page }) => {
    const c = await buildCourse([{ title: "Criador 1", lessons: [{ title: "C-aula", contentUrl: GOOD }] }, { title: "Criador 2" }]);
    await openCourse(page, "caio", c);
    await expect(page.getByRole("button", { name: "Editar curso" })).toBeVisible();
    await page.getByRole("button", { name: "Mover módulo para baixo" }).first().click();
    await expect(moduleTitles(page)).toHaveText(["Criador 2", "Criador 1"]);
    await expect(page.getByRole("button", { name: /Publicar Curso/ })).toBeVisible();
  });

  test("roles: usuario de outra equipe recebe 404 em curso, verificacao, publicar e exportar", async () => {
    const { token } = await apiLogin("bia");
    const betaTeam = await teamIdOf("bia", "Estúdio Beta");
    const base = `/api/v1/teams/${betaTeam}/courses/${course.id}`;
    for (const r of [await api(token, "GET", base), await api(token, "GET", `${base}/publication-check`), await api(token, "POST", `${base}/publish`), await api(token, "GET", `${base}/export?format=csv`)]) {
      expect(r.status).toBe(404);
    }
  });
});

// ---------------------------------------------------------------- mobile e escuro
test.describe("M3 mobile e tema escuro", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`UX-M3: tela de curso a 375 px (${theme}): sem rolagem horizontal; editar, mover, verificar e confirmar cabem na tela`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.emulateMedia({ colorScheme: theme });
      const course = await buildCourse(
        [
          { title: "Módulo com um nome bem comprido para testar quebra de linha no celular", lessons: [{ title: "Aula com um título também bastante comprido para o celular", contentUrl: GOOD }, { title: "Segunda aula", contentUrl: GOOD }] },
          { title: "Segundo módulo", lessons: [{ title: "Aula sem nada" }] },
        ],
        { title: uniq("Curso mobile com título bem comprido para quebrar") },
      );
      await openCourse(page, "ana", course);
      await noHorizontalScroll(page);
      await page.screenshot({ path: `${SHOTS}/m3-mobile-${theme}-curso.png`, fullPage: true });
      // botoes de acao dentro da tela
      for (const name of ["JSON", "CSV"]) {
        const box = await page.getByRole("button", { name, exact: true }).boundingBox();
        expect(box, name).toBeTruthy();
        expect(box!.x + box!.width).toBeLessThanOrEqual(375);
        expect(box!.x).toBeGreaterThanOrEqual(0);
      }
      const up = await page.getByRole("button", { name: "Mover módulo para baixo" }).first().boundingBox();
      expect(up!.x + up!.width).toBeLessThanOrEqual(375);
      // edicao inline
      await page.getByRole("button", { name: "Editar curso" }).click();
      await noHorizontalScroll(page);
      await page.screenshot({ path: `${SHOTS}/m3-mobile-${theme}-editar.png` });
      await page.getByRole("button", { name: "Cancelar" }).click();
      await page.getByRole("button", { name: /Renomear módulo Segundo/ }).click();
      await noHorizontalScroll(page);
      await page.getByRole("button", { name: "Cancelar" }).click();
      // dialogo de verificacao
      await page.getByRole("button", { name: /Publicar Curso/ }).click();
      const dialog = dialogOf(page);
      await expect(dialog.getByText(/Não é possível publicar/)).toBeVisible();
      const b = await dialog.boundingBox();
      expect(b!.x).toBeGreaterThanOrEqual(0);
      expect(b!.x + b!.width).toBeLessThanOrEqual(375);
      expect(b!.y + b!.height).toBeLessThanOrEqual(812);
      await page.screenshot({ path: `${SHOTS}/m3-mobile-${theme}-check.png` });
      await dialog.getByRole("button", { name: "Entendido" }).click();
      // formulario de aula
      await page.getByRole("button", { name: /Nova Aula/ }).first().click();
      const lessonDialog = dialogOf(page);
      await expect(lessonDialog.getByLabel(/Link do conteúdo/)).toBeVisible();
      const lb = await lessonDialog.boundingBox();
      expect(lb!.x).toBeGreaterThanOrEqual(0);
      expect(lb!.x + lb!.width).toBeLessThanOrEqual(375);
      await lessonDialog.getByRole("button", { name: "Salvar Aula" }).scrollIntoViewIfNeeded();
      await expect(lessonDialog.getByRole("button", { name: "Salvar Aula" })).toBeInViewport();
      await page.waitForTimeout(600); // fim da animacao do dialogo
      await page.screenshot({ path: `${SHOTS}/m3-mobile-${theme}-aula.png` });
    });

    test(`UX-M3: curso publicado a 375 px (${theme}): selo e Despublicar visiveis e legiveis`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.emulateMedia({ colorScheme: theme });
      const course = await buildCourse([{ title: "Mod pub", lessons: [{ title: "Aula pub", contentUrl: GOOD }] }]);
      const t = await teamIdOf("ana", team);
      await api((await apiLogin("ana")).token, "POST", `/api/v1/teams/${t}/courses/${course.id}/publish`);
      await openCourse(page, "ana", course);
      await expect(page.getByText(/Publicado em/)).toBeVisible();
      const desp = page.getByRole("button", { name: "Despublicar" });
      await desp.scrollIntoViewIfNeeded();
      await expect(desp).toBeInViewport();
      await noHorizontalScroll(page);
      // contraste do selo: texto nao pode ficar da mesma cor do fundo
      const colors = await page.getByText(/Publicado em/).evaluate((el) => {
        const cs = getComputedStyle(el);
        return { color: cs.color, bg: cs.backgroundColor };
      });
      expect(colors.color).not.toBe(colors.bg);
      await page.screenshot({ path: `${SHOTS}/m3-mobile-${theme}-publicado.png`, fullPage: true });
    });

    test(`UX-M3: desktop 1440 px (${theme}): curso com problemas, dialogo e botoes legiveis`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      const course = await buildCourse([{ title: "Vazio" }, { title: "Cheio", lessons: [{ title: "Sem material" }] }]);
      await openCourse(page, "ana", course);
      await noHorizontalScroll(page);
      await page.screenshot({ path: `${SHOTS}/m3-desktop-${theme}-curso.png`, fullPage: true });
      await page.getByRole("button", { name: /Publicar Curso/ }).click();
      await expect(dialogOf(page).getByText(/Não é possível publicar/)).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/m3-desktop-${theme}-check.png` });
    });
  }
});

// ---------------------------------------------------------------- regressao de visual (bugs conhecidos)
test.describe("M3 visual (regressao)", () => {
  test("UX-M3: dialogos de curso tem fundo opaco no tema claro (375 px e 1440 px)", async ({ page }) => {
    const course = await buildCourse([{ title: "Vazio" }]);
    for (const size of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(size);
      await page.emulateMedia({ colorScheme: "light" });
      await openCourse(page, "ana", course);
      await page.getByRole("button", { name: /Publicar Curso/ }).click();
      await expect(dialogOf(page).getByText(/Não é possível publicar/)).toBeVisible();
      await page.waitForTimeout(500);
      const bg = await dialogOf(page).evaluate((el) => getComputedStyle(el).backgroundColor);
      expect.soft(bg, `dialogo de curso deve ter fundo opaco no tema claro a ${size.width}px: ${bg}`).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    }
  });

  test("UX-M3: titulo curto da aula nao e cortado com reticencias a 375 px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const course = await buildCourse([{ title: "Mod", lessons: [{ title: "Segunda aula", contentUrl: GOOD }] }]);
    await openCourse(page, "ana", course);
    const el = courseCard(page).locator("div.truncate.font-medium", { hasText: "Segunda aula" });
    const cut = await el.evaluate((n) => n.scrollWidth > n.clientWidth);
    expect.soft(cut, "titulo da aula nao deve ser cortado a 375 px").toBe(false);
  });
});

// ---------------------------------------------------------------- integracao com materiais (RN06)
test.describe("M3 aula com material", () => {
  test("FT-51: aula sem link mas com material vinculado e valida para publicar (RN06); com projeto sem material, nao", async ({ page }) => {
    const projTitle = uniq("Projeto RN06");
    const proj = await apiCreateProject(projTitle, "ana", team);
    const t = await teamIdOf("ana", team);
    const { token } = await apiLogin("ana");
    const fd = new FormData();
    fd.append("file", new Blob(["material de teste"], { type: "text/plain" }), "material-rn06.txt");
    const up = await fetch(`${process.env.API_URL ?? "http://localhost:8080"}/api/v1/teams/${t}/cards/${proj.id}/materials`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
    expect(up.status).toBe(200);
    const mat = await up.json();
    const course = await buildCourse([{ title: "Mod RN06", lessons: [{ title: "Aula com material", projectId: proj.id }] }]);
    const lessonPath = `/api/v1/teams/${t}/courses/${course.id}/modules/${course.modules[0].id}/lessons/${course.modules[0].lessons[0].id}`;
    await openCourse(page, "ana", course);
    // sem material: bloqueia
    await page.getByRole("button", { name: /Publicar Curso/ }).click();
    await expect(dialogOf(page).getByText(/Não é possível publicar/)).toBeVisible();
    await dialogOf(page).getByRole("button", { name: "Entendido" }).click();
    // vincula material
    const l = await api(token, "POST", `${lessonPath}/materials`, { materialId: mat.id });
    expect(l.status).toBe(200);
    await page.reload();
    await openTab(page, "Cursos & Módulos");
    await page.locator("div.cursor-pointer").filter({ hasText: course.title }).first().click();
    await page.getByRole("button", { name: /Publicar Curso/ }).click();
    await expect(dialogOf(page).getByRole("button", { name: "Confirmar Publicação" })).toBeVisible();
  });
});

/*
 * Mapa plano de testes -> specs deste arquivo
 *  E2E-08  (curso: criar/estruturar) ...... FT-50 (criar aula), FT-48, FT-49 e m2-content (materiais da aula)
 *  E2E-11  (publicar curso) ................ "FT-52 / E2E-11: aula com YouTube ..." + FT-51 (verificacao)
 *  E2E-12  (exportar curso) ................ "FT-54 / E2E-12" (JSON e CSV)
 *  E2E-15  (papeis em cursos) .............. grupo "M3 papeis"
 *  FT-47   editar curso .................... "FT-47: ..." (4 testes)
 *  FT-48   renomear modulo ................. "FT-48: ..."
 *  FT-49   reordenar modulos/aulas ......... grupo "M3 reordenacao" (5 testes)
 *  FT-50   formulario da aula .............. grupo "M3 formulario da aula" (4 testes)
 *  FT-51   verificacao de publicacao ....... "FT-51: ..." (5 testes, inclui RN06 e INVALID_LINK)
 *  FT-52   publicar/despublicar/selo ....... "FT-52: ..." (3 testes)
 *  FT-53   publicar com 400/500 ............ "FT-53: ..." (2 testes)
 *  FT-54   exportar JSON/CSV ............... grupo "M3 exportacao" (6 testes)
 */
