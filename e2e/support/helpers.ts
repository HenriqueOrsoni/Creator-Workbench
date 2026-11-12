import { expect, type Page, type Locator } from "@playwright/test";

export const API = process.env.API_URL ?? "http://localhost:8080";
export const APP = process.env.APP_URL ?? "http://localhost:3000";
export const PASSWORD = "Teste@123";

export const USERS = {
  ana: { email: "ana.admin.e2e@creatorworkbench.test", name: "Ana Administradora", role: "Administrador" },
  caio: { email: "caio.criador.e2e@creatorworkbench.test", name: "Caio Criador", role: "Criador" },
  rui: { email: "rui.revisor.e2e@creatorworkbench.test", name: "Rui Revisor", role: "Revisor" },
  bia: { email: "bia.admin.e2e@creatorworkbench.test", name: "Bia Administradora", role: "Administrador" },
} as const;
export type UserKey = keyof typeof USERS;

export const TEAM_ALFA = "Estúdio Alfa";
export const TEAM_BETA = "Estúdio Beta";

export const SHOTS = "e2e/screenshots";

/** Sufixo unico para os dados criados nos testes (o banco e compartilhado entre os specs). */
export function uniq(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

export interface ApiResult<T = any> {
  status: number;
  body: T;
}

export async function api<T = any>(token: string | null, method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  const res = await fetch(API + path, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json; charset=utf-8" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* corpo nao JSON */
  }
  return { status: res.status, body: parsed };
}

const tokenCache = new Map<string, { token: string; userId: number }>();
export async function apiLogin(user: UserKey) {
  const cached = tokenCache.get(user);
  if (cached) return cached;
  const r = await api(null, "POST", "/api/auth/login", { email: USERS[user].email, password: PASSWORD });
  if (r.status !== 200) throw new Error(`login ${user} falhou: ${r.status} ${JSON.stringify(r.body)}`);
  const data = { token: r.body.token as string, userId: r.body.userId as number };
  tokenCache.set(user, data);
  return data;
}

const teamCache = new Map<string, number>();
export async function teamIdOf(user: UserKey, teamName: string): Promise<number> {
  const key = `${user}:${teamName}`;
  if (teamCache.has(key)) return teamCache.get(key)!;
  const { token } = await apiLogin(user);
  const r = await api(token, "GET", "/api/v1/teams");
  const team = (r.body as any[]).find((t) => t.name === teamName);
  if (!team) throw new Error(`equipe ${teamName} nao encontrada para ${user}`);
  teamCache.set(key, team.id);
  return team.id;
}

/** Cria uma ideia pela API (Admin da equipe Alfa por padrao). */
export async function apiCreateIdea(
  data: { title: string; description?: string; targetAudience?: string; pedagogicalObjective?: string; tagId?: number },
  user: UserKey = "ana",
  team = TEAM_ALFA,
) {
  const { token } = await apiLogin(user);
  const t = await teamIdOf(user, team);
  const r = await api(token, "POST", `/api/v1/teams/${t}/ideas`, data);
  if (r.status !== 200) throw new Error(`criar ideia: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

/** Cria uma ideia e a converte em projeto (primeira coluna por padrao). Retorna o card. */
export async function apiCreateProject(title: string, user: UserKey = "ana", team = TEAM_ALFA) {
  const idea = await apiCreateIdea({ title, description: "Projeto criado pelo E2E", targetAudience: "Estudantes", pedagogicalObjective: "Aprender os fundamentos do tema" }, user, team);
  const { token } = await apiLogin(user);
  const t = await teamIdOf(user, team);
  const r = await api(token, "POST", `/api/v1/teams/${t}/cards/${idea.id}/convert`, { targetAudience: "Estudantes", pedagogicalObjective: "Aprender os fundamentos do tema" });
  if (r.status !== 200) throw new Error(`converter: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

export async function apiBoard(user: UserKey = "ana", team = TEAM_ALFA) {
  const { token } = await apiLogin(user);
  const t = await teamIdOf(user, team);
  return (await api(token, "GET", `/api/v1/teams/${t}/board`)).body;
}

export async function apiAddTask(cardId: number | string, title: string, user: UserKey = "ana", team = TEAM_ALFA) {
  const { token } = await apiLogin(user);
  const t = await teamIdOf(user, team);
  const r = await api(token, "POST", `/api/v1/teams/${t}/cards/${cardId}/tasks`, { title });
  if (r.status !== 200) throw new Error(`criar tarefa: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

/**
 * Entra no app ja autenticado (cookie + equipe ativa gravada), sem passar pela tela de login.
 * A tela de login e testada em auth.spec.ts.
 */
export async function loginAs(page: Page, user: UserKey, team: string = TEAM_ALFA, path = "/") {
  const { token, userId } = await apiLogin(user);
  const tid = await teamIdOf(user, team);
  await page.context().addCookies([
    { name: "creator_auth_token", value: token, url: APP },
    { name: "creator_user_id", value: String(userId), url: APP },
  ]);
  await page.addInitScript((id) => {
    try {
      if (!window.localStorage.getItem("creator-workbench-storage")) {
        window.localStorage.setItem("creator-workbench-storage", JSON.stringify({ state: { activeTeamId: String(id) }, version: 0 }));
      }
    } catch {
      /* ignora */
    }
  }, tid);
  await page.goto(path);
  await expect(page.getByRole("heading", { name: "Painel de Controle" })).toBeVisible();
  // aguarda o quadro da equipe
  await expect(page.getByText(team, { exact: false }).first()).toBeVisible();
  // espera as cargas iniciais terminarem (quadro, ideias, cursos, etiquetas, alertas) para os testes nao disputarem com elas
  await page.waitForLoadState("networkidle").catch(() => {});
}

export async function openTab(page: Page, name: "Quadro Kanban" | "Caixa de Entrada" | "Cursos & Módulos" | "Estúdio de Escrita") {
  await page.getByRole("tab", { name }).click();
}

export function toast(page: Page): Locator {
  return page.locator("[data-sonner-toast]");
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(toast(page).filter({ hasText: text }).first()).toBeVisible();
}

export async function expectNoErrorToast(page: Page) {
  await expect(page.locator('[data-sonner-toast][data-type="error"]')).toHaveCount(0);
}

/** Card do quadro pelo titulo (o titulo e exibido em caixa alta via CSS; o texto do DOM e o original). */
export function boardCard(page: Page, title: string): Locator {
  return page.locator('[data-slot="card"]').filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}

export function boardColumn(page: Page, columnName: string): Locator {
  return page.locator("div.snap-start").filter({ has: page.getByRole("heading", { name: columnName, exact: true }) });
}

/** Coleta erros de console e respostas 5xx durante o teste. */
export function collectProblems(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 500) problems.push(`HTTP ${r.status()} ${r.url()}`);
  });
  return problems;
}

/** Card da Caixa de Entrada pelo titulo. */
export function inboxCard(page: Page, title: string): Locator {
  return page.locator('[data-slot="card"]').filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}

/** Cria uma equipe nova (Ana administra) com Caio (Criador) e Rui (Revisor); isola os testes que mudam colunas. */
export async function apiCreateTeam(name: string, owner: UserKey = "ana") {
  const { token } = await apiLogin(owner);
  const r = await api(token, "POST", "/api/v1/teams", { name });
  if (r.status !== 200) throw new Error(`criar equipe: ${r.status} ${JSON.stringify(r.body)}`);
  await api(token, "POST", `/api/v1/teams/${r.body.id}/members`, { email: USERS.caio.email, role: "CREATOR" });
  await api(token, "POST", `/api/v1/teams/${r.body.id}/members`, { email: USERS.rui.email, role: "REVIEWER" });
  teamCache.set(`${owner}:${name}`, r.body.id);
  return r.body.id as number;
}
