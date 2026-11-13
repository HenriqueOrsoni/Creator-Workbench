import { expect, type Page, type Locator } from "@playwright/test";
import { execFileSync } from "node:child_process";

export const API = process.env.API_URL ?? "http://localhost:8080";
export const APP = process.env.APP_URL ?? "http://localhost:3000";
export const PASSWORD = "Teste@123";

export const USERS = {
  ana: { email: "ana.admin.e2e@creatorworkbench.test", name: "Ana Administradora", role: "Administrador" },
  caio: { email: "caio.criador.e2e@creatorworkbench.test", name: "Caio Criador", role: "Criador" },
  rui: { email: "rui.revisor.e2e@creatorworkbench.test", name: "Rui Revisor", role: "Revisor" },
  bia: { email: "bia.admin.e2e@creatorworkbench.test", name: "Bia Administradora", role: "Administrador" },
  /** Administrador do sistema (APP_ADMIN_EMAILS): so serve para ativar planos de equipe. */
  sistema: { email: "admin.sistema@creatorworkbench.test", name: "Admin Sistema", role: "Administrador" },
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

/**
 * Muda o plano de uma equipe pela rota do administrador do sistema (PUT /api/v1/admin/teams/{id}/plan).
 * Desde o M5 toda equipe nasce no Gratuito (1 usuario, 3 projetos ativos, 1 curso, sem resumo, 100 MB).
 */
export async function apiSetPlan(teamId: number | string, plan: "GRATUITO" | "SOLO" | "PRO" | "AGENCIA", expiresAt?: string) {
  const { token } = await apiLogin("sistema");
  const r = await api(token, "PUT", `/api/v1/admin/teams/${teamId}/plan`, expiresAt ? { plan, expiresAt } : { plan });
  if (r.status !== 200) throw new Error(`ativar plano ${plan}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

/**
 * Cria uma equipe nova (Ana administra) com Caio (Criador) e Rui (Revisor); isola os testes que mudam colunas.
 * A equipe e movida para AGENCIA logo depois de criada (sem limites; e libera o dono a criar outras equipes).
 * Use `plan: "GRATUITO"` para ficar no plano de entrada e testar os limites.
 */
/**
 * Cria a participacao de um usuario na equipe direto no banco de testes (db_tcc_e2e).
 * Desde a decisao 22 do backend, `POST /teams/{t}/members` so envia um convite (nao cria membro);
 * por isso o harness insere a linha em team_members. Precisa de MYSQL_BIN e MYSQL_PWD, como o seed.
 */
export function sqlAddMember(teamId: number, email: string, role: "ADMIN" | "CREATOR" | "REVIEWER") {
  const db = process.env.E2E_DB ?? "db_tcc_e2e";
  if (db === "db_tcc") throw new Error("Recusado: nunca em db_tcc.");
  const statement = `INSERT INTO team_members (team_id, user_id, role, joined_at) SELECT ${Number(teamId)}, u.id, '${role}', UTC_TIMESTAMP() FROM users u WHERE u.email = '${email.replace(/'/g, "")}' AND NOT EXISTS (SELECT 1 FROM team_members m WHERE m.team_id = ${Number(teamId)} AND m.user_id = u.id);`;
  execFileSync(process.env.MYSQL_BIN ?? "mysql", ["-uroot", db], { input: statement, env: process.env });
}

export async function apiCreateTeam(name: string, owner: UserKey = "ana", plan: "GRATUITO" | "SOLO" | "PRO" | "AGENCIA" = "AGENCIA") {
  const { token } = await apiLogin(owner);
  const r = await api(token, "POST", "/api/v1/teams", { name });
  if (r.status !== 200) throw new Error(`criar equipe: ${r.status} ${JSON.stringify(r.body)}`);
  if (plan !== "GRATUITO") await apiSetPlan(r.body.id, plan);
  if (plan === "GRATUITO") {
    teamCache.set(`${owner}:${name}`, r.body.id);
    return r.body.id as number;
  }
  sqlAddMember(r.body.id, USERS.caio.email, "CREATOR");
  sqlAddMember(r.body.id, USERS.rui.email, "REVIEWER");
  teamCache.set(`${owner}:${name}`, r.body.id);
  return r.body.id as number;
}
