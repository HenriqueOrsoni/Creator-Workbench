// Prepara o banco de testes E2E (db_tcc_e2e): usuarios e as duas equipes.
// Uso: node e2e/support/seed.mjs   (backend em :8080 apontando para db_tcc_e2e; mysql no PATH ou MYSQL_BIN)
// Variaveis: MYSQL_BIN, MYSQL_PWD (senha do root local), E2E_DB (padrao db_tcc_e2e), API_URL
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const API = process.env.API_URL ?? "http://localhost:8080";
const DB = process.env.E2E_DB ?? "db_tcc_e2e";
const MYSQL = process.env.MYSQL_BIN ?? "mysql";
const here = path.dirname(fileURLToPath(import.meta.url));

if (DB === "db_tcc") throw new Error("Recusado: o seed nunca roda em db_tcc.");

const sql = readFileSync(path.join(here, "seed.sql"), "utf8");
execFileSync(MYSQL, ["-uroot", DB], { input: sql, env: process.env });

const PASSWORD = "Teste@123";
async function call(method, url, token, body) {
  const res = await fetch(API + url, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}
const login = async (email) => (await call("POST", "/api/auth/login", null, { email, password: PASSWORD })).token;

const E = (n) => `${n}.e2e@creatorworkbench.test`;
const ana = await login(E("ana.admin"));
const bia = await login(E("bia.admin"));

async function ensureTeam(token, name) {
  const teams = await call("GET", "/api/v1/teams", token);
  const found = teams.find((t) => t.name === name);
  return found ?? (await call("POST", "/api/v1/teams", token, { name }));
}
const sys = await login("admin.sistema@creatorworkbench.test");
// Desde o M5 toda equipe nasce no Gratuito (1 usuario, 3 projetos, 1 curso, sem resumo) e so uma equipe gratuita
// compartilhada por usuario e permitida. O seed move as equipes de teste para AGENCIA pela rota do admin do sistema.
const setPlan = (teamId, plan) => call("PUT", `/api/v1/admin/teams/${teamId}/plan`, sys, { plan });
const alfa = await ensureTeam(ana, "Estúdio Alfa");
await setPlan(alfa.id, "AGENCIA");
const beta = await ensureTeam(bia, "Estúdio Beta");
await setPlan(beta.id, "AGENCIA");

async function ensureMember(token, teamId, email, role) {
  const members = await call("GET", `/api/v1/teams/${teamId}/members`, token);
  if (members.some((m) => (m.email ?? "").toLowerCase() === email)) return;
  await call("POST", `/api/v1/teams/${teamId}/members`, token, { email, role });
}
await ensureMember(ana, alfa.id, E("caio.criador"), "CREATOR");
await ensureMember(ana, alfa.id, E("rui.revisor"), "REVIEWER");

console.log(JSON.stringify({ alfa: alfa.id, beta: beta.id }));
