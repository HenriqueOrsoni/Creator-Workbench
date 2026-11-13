import { expect, type Page } from "@playwright/test";
import { api, APP } from "./helpers";

export interface Session {
  token: string;
  userId: number;
}

/** Entra no app com uma sessao qualquer (usuario cadastrado pelo teste), opcionalmente com a equipe ativa. */
export async function loginSession(page: Page, s: Session, teamId?: number | string, path = "/") {
  await page.context().addCookies([
    { name: "creator_auth_token", value: s.token, url: APP },
    { name: "creator_user_id", value: String(s.userId), url: APP },
  ]);
  if (teamId !== undefined) {
    await page.addInitScript((id) => {
      try {
        window.localStorage.setItem("creator-workbench-storage", JSON.stringify({ state: { activeTeamId: String(id) }, version: 0 }));
      } catch {
        /* ignora */
      }
    }, teamId);
  }
  await page.goto(path);
  await expect(page.getByRole("heading", { name: "Painel de Controle" })).toBeVisible();
  await page.waitForLoadState("networkidle").catch(() => {});
}

export async function apiTeams(token: string) {
  return (await api(token, "GET", "/api/v1/teams")).body as any[];
}

/** Data (AAAA-MM-DD) no calendario UTC do servidor, `days` dias a partir de hoje. */
export function serverDate(days = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Abre o dialogo "Gestao da Equipe" (botao de membros ao lado do seletor de equipe). */
export async function openTeamDialog(page: Page, tab?: "Membros" | "Convites" | "Etiquetas" | "Configurações") {
  await page.getByTitle("Gerenciar membros da equipe").click();
  const dialog = page.getByRole("dialog").filter({ hasText: "Gestão da Equipe" });
  await expect(dialog).toBeVisible();
  if (tab) await dialog.getByRole("tab", { name: new RegExp(`^${tab}`) }).click();
  return dialog;
}

export async function loginViaForm(page: Page, email: string, password: string) {
  await page.getByPlaceholder("operador@creator.studio").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /Iniciar Sessão/ }).click();
}
