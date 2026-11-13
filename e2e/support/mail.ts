import { execFileSync } from "node:child_process";
import { api, PASSWORD } from "./helpers";

/** Captura de e-mail (e2e/support/mail-sink.mjs): SMTP em :3025 (backend) e API HTTP em :3026. */
export const SINK = process.env.MAIL_SINK_URL ?? "http://localhost:3026";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  at: number;
}

export async function mailsTo(email: string): Promise<Mail[]> {
  const res = await fetch(`${SINK}/messages?to=${encodeURIComponent(email.toLowerCase())}`);
  return (await res.json()) as Mail[];
}

/** Espera chegar um e-mail para `email` (assunto casando `subject`), mais novo que `after`. */
export async function waitMail(email: string, subject: RegExp, after = 0, timeoutMs = 15_000): Promise<Mail> {
  const start = Date.now();
  for (;;) {
    const found = (await mailsTo(email)).filter((m) => subject.test(m.subject) && m.at >= after).pop();
    if (found) return found;
    if (Date.now() - start > timeoutMs) throw new Error(`e-mail para ${email} (${subject}) nao chegou em ${timeoutMs} ms`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

/** Codigo numerico de 6 digitos do corpo (cadastro, troca de e-mail, recuperacao de senha). */
export function codeFrom(mail: Mail): string {
  const m = /:\s*(\d{6})\b/.exec(mail.text);
  if (!m) throw new Error(`sem codigo no e-mail: ${mail.text}`);
  return m[1];
}

/** Token do link /convite?token=... do e-mail de convite. */
export function inviteTokenFrom(mail: Mail): string {
  const m = /\/convite\?token=([A-Za-z0-9_-]+)/.exec(mail.text);
  if (!m) throw new Error(`sem link de convite no e-mail: ${mail.text}`);
  return m[1];
}

/**
 * Cadastra um usuario pelo fluxo real (codigo por e-mail capturado). O backend cria tambem a equipe pessoal.
 * Dominio .test, senha padrao dos testes.
 */
export async function apiRegister(prefix: string, password = PASSWORD) {
  const email = `${prefix}.${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}.e2e@creatorworkbench.test`;
  const name = `Usuario ${prefix}`;
  const t0 = Date.now() - 1000;
  const req = await api(null, "POST", "/api/auth/register/request-token", { name, email });
  if (req.status >= 300) throw new Error(`pedir codigo: ${req.status} ${JSON.stringify(req.body)}`);
  const code = codeFrom(await waitMail(email, /Código de verificação/, t0));
  const conf = await api(null, "POST", "/api/auth/register/confirm", { email, token: code, password });
  if (conf.status >= 300) throw new Error(`confirmar cadastro: ${conf.status} ${JSON.stringify(conf.body)}`);
  const login = await api(null, "POST", "/api/auth/login", { email, password });
  if (login.status !== 200) throw new Error(`login: ${login.status} ${JSON.stringify(login.body)}`);
  return { email, name, password, token: login.body.token as string, userId: login.body.userId as number };
}

/** SQL direto no banco de testes (somente db_tcc_e2e). Precisa de MYSQL_BIN e MYSQL_PWD, como o seed. */
export function sql(statement: string): void {
  const db = process.env.E2E_DB ?? "db_tcc_e2e";
  if (db === "db_tcc") throw new Error("Recusado: nunca em db_tcc.");
  execFileSync(process.env.MYSQL_BIN ?? "mysql", ["-uroot", db], { input: statement, env: process.env });
}
