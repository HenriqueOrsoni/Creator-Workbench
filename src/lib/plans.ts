/** Planos da equipe: tipos, mapeamento da API e textos. */

export type PlanName = "GRATUITO" | "SOLO" | "PRO" | "AGENCIA";
export type PlanSource = "FREE" | "TRIAL" | "MANUAL";
export const PLAN_LABELS: Record<PlanName, string> = {
  GRATUITO: "Gratuito",
  SOLO: "Solo",
  PRO: "Pro",
  AGENCIA: "Agência",
};

export type TrialPlan = "SOLO" | "PRO" | "AGENCIA";

/** null = ilimitado */
export interface PlanLimits {
  maxUsers: number | null;
  maxActiveProjects: number | null;
  maxCourses: number | null;
  automaticSummary: boolean;
  storageBytes: number | null;
}

export interface PlanUsage {
  members: number;
  activeProjects: number;
  courses: number;
  storageBytes: number;
}

export interface PlanInfo {
  plan: PlanName;
  name: string;
  monthlyPrice: number;
  limits: PlanLimits;
}

export interface TeamPlan {
  teamId: string;
  plan: PlanName;
  planName: string;
  source: PlanSource;
  expiresAt: string | null;
  trialAvailable: boolean;
  trialUsedAt: string | null;
  limits: PlanLimits;
  usage: PlanUsage;
  overLimit: boolean;
}

type Raw = Record<string, unknown>;

const orNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export function mapLimits(raw: Raw | null | undefined): PlanLimits {
  const l = raw ?? {};
  return {
    maxUsers: orNull(l.maxUsers),
    maxActiveProjects: orNull(l.maxActiveProjects),
    maxCourses: orNull(l.maxCourses),
    automaticSummary: Boolean(l.automaticSummary),
    storageBytes: orNull(l.storageBytes),
  };
}

export function mapPlanInfo(raw: Raw): PlanInfo {
  return {
    plan: raw.plan as PlanName,
    name: String(raw.name),
    monthlyPrice: Number(raw.monthlyPrice ?? 0),
    limits: mapLimits(raw.limits as Raw),
  };
}

export function mapTeamPlan(raw: Raw): TeamPlan {
  const u = (raw.usage ?? {}) as Raw;
  return {
    teamId: String(raw.teamId),
    plan: raw.plan as PlanName,
    planName: String(raw.planName),
    source: raw.source as PlanSource,
    expiresAt: (raw.expiresAt as string | null) ?? null,
    trialAvailable: Boolean(raw.trialAvailable),
    trialUsedAt: (raw.trialUsedAt as string | null) ?? null,
    limits: mapLimits(raw.limits as Raw),
    usage: {
      members: Number(u.members ?? 0),
      activeProjects: Number(u.activeProjects ?? 0),
      courses: Number(u.courses ?? 0),
      storageBytes: Number(u.storageBytes ?? 0),
    },
    overLimit: Boolean(raw.overLimit),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  const digits = value >= 10 || Number.isInteger(value) ? 0 : 1;
  return `${value.toFixed(digits).replace(".", ",")} ${units[i]}`;
}

export function formatPrice(value: number): string {
  if (!value) return "Grátis";
  return `R$ ${value.toFixed(2).replace(".", ",")}/mês`;
}

/** Limite em texto: null = Ilimitado. */
export function formatLimit(limit: number | null, kind: "count" | "bytes" = "count"): string {
  if (limit === null) return "Ilimitado";
  return kind === "bytes" ? formatBytes(limit) : String(limit);
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

export function planSourceLabel(plan: Pick<TeamPlan, "source" | "expiresAt">): string {
  const date = plan.expiresAt ? shortDate(plan.expiresAt) : "";
  if (plan.source === "TRIAL") return date ? `Teste até ${date}` : "Teste";
  if (plan.source === "MANUAL") return date ? `Ativado pelo administrador até ${date}` : "Ativado pelo administrador";
  return "Gratuito";
}

/** Dias até o fim do teste (null se não for teste). */
export function trialDaysLeft(plan: Pick<TeamPlan, "source" | "expiresAt">, now: Date = new Date()): number | null {
  if (plan.source !== "TRIAL" || !plan.expiresAt) return null;
  const end = new Date(plan.expiresAt).getTime();
  if (Number.isNaN(end)) return null;
  // Compara dias do calendário local: o teste que acaba hoje à noite é "hoje", não "amanhã"
  const startOf = (t: number) => {
    const d = new Date(t);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  return Math.round((startOf(end) - startOf(now.getTime())) / 86_400_000);
}

export function trialEndsSoon(plan: Pick<TeamPlan, "source" | "expiresAt">, now: Date = new Date()): boolean {
  const days = trialDaysLeft(plan, now);
  return days !== null && days <= 3;
}

/** O resumo automático existe neste plano? Desconhecido = sim (o servidor responde 402 se não). */
export function hasAutomaticSummary(plan: TeamPlan | null | undefined): boolean {
  return plan ? plan.limits.automaticSummary : true;
}
