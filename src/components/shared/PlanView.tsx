"use client";

import React from "react";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/useAppStore";
import { canManagePlan } from "@/lib/roles";
import {
  formatBytes,
  formatLimit,
  formatPrice,
  planSourceLabel,
  type PlanName,
  type TrialPlan,
} from "@/lib/plans";

function UsageBar({ label, used, limit, bytes = false }: { label: string; used: number; limit: number | null; bytes?: boolean }) {
  const unlimited = limit === null;
  const percent = unlimited || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const over = !unlimited && used > limit;
  const full = !unlimited && used >= limit;
  const usedText = bytes ? formatBytes(used) : String(used);
  const limitText = formatLimit(limit, bytes ? "bytes" : "count");
  return (
    <div className="space-y-1.5" data-testid={`usage-${label}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground">{label}</span>
        <span className={over ? "text-destructive font-semibold" : "text-muted-foreground"}>
          {usedText} de {limitText}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={unlimited ? undefined : 100}
        aria-valuenow={unlimited ? undefined : percent}
        aria-valuetext={`${usedText} de ${limitText}`}
        className="h-2 w-full rounded-full bg-muted overflow-hidden"
      >
        <div
          className={`h-full rounded-full ${full ? "bg-destructive" : "bg-primary"}`}
          style={{ width: unlimited ? "0%" : `${percent}%` }}
        />
      </div>
    </div>
  );
}

const PAID: TrialPlan[] = ["SOLO", "PRO", "AGENCIA"];

export function PlanView() {
  const { activeTeam, teamPlan, plans, fetchPlans, fetchTeamPlan, startTrial } = useAppStore();
  const [starting, setStarting] = React.useState<TrialPlan | null>(null);
  const activeTeamId = activeTeam?.id;

  React.useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const [loadFailed, setLoadFailed] = React.useState(false);

  const loadPlan = React.useCallback(async () => {
    setLoadFailed(false);
    const result = await fetchTeamPlan();
    if (!result) setLoadFailed(true);
  }, [fetchTeamPlan]);

  React.useEffect(() => {
    if (activeTeamId) loadPlan();
  }, [activeTeamId, loadPlan]);

  const showTrial =
    canManagePlan(activeTeam?.role) && teamPlan?.trialAvailable === true && teamPlan.plan === "GRATUITO";

  const handleTrial = async (plan: TrialPlan) => {
    setStarting(plan);
    await startTrial(plan);
    setStarting(null);
  };

  if (!activeTeam) {
    return <p className="text-xs text-muted-foreground py-10 text-center">Selecione uma equipe para ver o plano.</p>;
  }

  return (
    <div className="space-y-6 max-w-5xl min-w-0">
      <section className="p-4 sm:p-5 rounded-xl border border-border bg-card space-y-4" aria-labelledby="plan-current-title">
        <div className="flex flex-wrap items-center gap-2">
          <Crown className="w-4 h-4 text-primary" />
          <h2 id="plan-current-title" className="text-sm font-bold font-heading">Plano da equipe</h2>
        </div>

        {teamPlan ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold font-heading" data-testid="current-plan-name">{teamPlan.planName}</span>
              <Badge variant="secondary" className="text-[11px]" data-testid="current-plan-source">
                {planSourceLabel(teamPlan)}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <UsageBar label="Membros" used={teamPlan.usage.members} limit={teamPlan.limits.maxUsers} />
              <UsageBar label="Projetos ativos" used={teamPlan.usage.activeProjects} limit={teamPlan.limits.maxActiveProjects} />
              <UsageBar label="Cursos" used={teamPlan.usage.courses} limit={teamPlan.limits.maxCourses} />
              <UsageBar label="Armazenamento" used={teamPlan.usage.storageBytes} limit={teamPlan.limits.storageBytes} bytes />
            </div>
            <p className="text-xs text-muted-foreground">
              Resumo automático: {teamPlan.limits.automaticSummary ? "disponível" : "indisponível neste plano"}.
            </p>
          </>
        ) : loadFailed ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-destructive">Não foi possível carregar o plano da equipe.</p>
            <Button size="sm" variant="outline" className="text-xs rounded-lg" onClick={loadPlan}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Carregando plano...</p>
        )}
      </section>

      <section className="p-4 sm:p-5 rounded-xl border border-border bg-card space-y-4" aria-labelledby="plan-compare-title">
        <h2 id="plan-compare-title" className="text-sm font-bold font-heading">Comparar planos</h2>
        {plans.length === 0 ? (
          <p className="text-xs text-muted-foreground">Carregando planos...</p>
        ) : (
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-semibold">Plano</th>
                  <th className="py-2 pr-3 font-semibold">Preço</th>
                  <th className="py-2 pr-3 font-semibold">Usuários</th>
                  <th className="py-2 pr-3 font-semibold">Projetos ativos</th>
                  <th className="py-2 pr-3 font-semibold">Cursos</th>
                  <th className="py-2 pr-3 font-semibold">Resumo automático</th>
                  <th className="py-2 pr-3 font-semibold">Armazenamento</th>
                  <th className="py-2 font-semibold"><span className="sr-only">Ação</span></th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => {
                  const paid = p.plan !== "GRATUITO";
                  const current = teamPlan?.plan === p.plan;
                  return (
                    <tr key={p.plan} className="border-b border-border last:border-0" data-testid={`plan-row-${p.plan}`}>
                      <td className="py-2.5 pr-3 font-semibold">
                        {p.name}
                        {current && <Badge className="ml-2 text-[10px]">Atual</Badge>}
                      </td>
                      <td className="py-2.5 pr-3">{formatPrice(p.monthlyPrice)}</td>
                      <td className="py-2.5 pr-3">{formatLimit(p.limits.maxUsers)}</td>
                      <td className="py-2.5 pr-3">{formatLimit(p.limits.maxActiveProjects)}</td>
                      <td className="py-2.5 pr-3">{formatLimit(p.limits.maxCourses)}</td>
                      <td className="py-2.5 pr-3">{p.limits.automaticSummary ? "Sim" : "Não"}</td>
                      <td className="py-2.5 pr-3">{formatLimit(p.limits.storageBytes, "bytes")}</td>
                      <td className="py-2.5">
                        {paid && showTrial && PAID.includes(p.plan as TrialPlan) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs rounded-lg whitespace-nowrap"
                            disabled={starting !== null}
                            onClick={() => handleTrial(p.plan as PlanName as TrialPlan)}
                          >
                            {starting === p.plan ? "Iniciando..." : "Testar por 14 dias"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Para contratar, fale com o administrador do sistema.
        </p>
        {!canManagePlan(activeTeam.role) && (
          <p className="text-xs text-muted-foreground">Somente o administrador da equipe pode iniciar o teste.</p>
        )}
      </section>
    </div>
  );
}
