"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { FEATURES } from "@/lib/features";
import { trialDaysLeft, trialEndsSoon } from "@/lib/plans";

/** Carrega o plano da equipe ativa e avisa quando passou do limite ou o teste está acabando. */
export function PlanBanner({ onOpenPlan }: { onOpenPlan: () => void }) {
  const { activeTeamId, teamPlan, fetchTeamPlan } = useAppStore();

  React.useEffect(() => {
    if (FEATURES.plans && activeTeamId) fetchTeamPlan();
  }, [activeTeamId, fetchTeamPlan]);

  if (!FEATURES.plans || !teamPlan) return null;

  const messages: string[] = [];
  if (teamPlan.overLimit) {
    messages.push("Sua equipe passou do limite do plano. Novas criações ficam bloqueadas até voltar ao limite ou trocar de plano.");
  }
  if (trialEndsSoon(teamPlan)) {
    const days = Math.max(0, trialDaysLeft(teamPlan) ?? 0);
    messages.push(
      days === 0
        ? "O teste da equipe termina hoje."
        : `O teste da equipe termina em ${days} ${days === 1 ? "dia" : "dias"}.`
    );
  }
  if (messages.length === 0) return null;

  return (
    <div
      role="alert"
      data-testid="plan-banner"
      className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground"
    >
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
      <div className="flex-1 space-y-1">
        {messages.map((m) => (
          <p key={m}>{m}</p>
        ))}
      </div>
      <Button size="sm" variant="outline" className="text-xs rounded-lg self-start sm:self-auto" onClick={onOpenPlan}>
        Ver planos
      </Button>
    </div>
  );
}
