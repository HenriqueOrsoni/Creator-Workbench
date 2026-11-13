"use client";

import React from "react";
import { Menu, Plus, Zap, Layout, Sparkles, Settings2, Trash2, LogOut, GraduationCap, Bell, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ThemeColorPicker } from "./ThemeColorPicker";
import { ThemeToggle } from "./ThemeToggle";
import { CreateIdeaDialog } from "./CreateIdeaDialog";
import { UserSettingsDialog } from "./UserSettingsDialog";
import { TeamSwitcher } from "./TeamSwitcher";
import { useAppStore } from "@/store/useAppStore";
import { deleteCookie, clearPersistedTeam } from "@/lib/api";
import { FEATURES } from "@/lib/features";
import { canEditProduction } from "@/lib/roles";
import { formatLocalDate } from "@/lib/dates";

function plural(n: number) {
  return `${n} ${n === 1 ? "dia" : "dias"}`;
}

export function overdueLabel(daysLeft: number) {
  const n = Math.abs(daysLeft);
  return n === 0 ? "Atrasado" : `Atrasado há ${plural(n)}`;
}

export function dueLabel(daysLeft: number) {
  if (daysLeft <= 0) return "Vence hoje";
  if (daysLeft === 1) return "Vence amanhã";
  return `Vence em ${plural(daysLeft)}`;
}

interface NavbarProps {
  activeTab?: string;
  onNavigate?: (tab: "kanban" | "inbox" | "courses" | "editor") => void;
}

export function Navbar({ activeTab = "kanban", onNavigate }: NavbarProps = {}) {
  const resetStore = useAppStore((state) => state.resetStore);
  const activeTeam = useAppStore((state) => state.activeTeam);
  const alerts = useAppStore((state) => state.alerts);
  const canCreate = canEditProduction(activeTeam?.role);

  const setCardToOpenId = useAppStore((state) => state.setCardToOpenId);
  const [alertsOpen, setAlertsOpen] = React.useState(false);

  // Clicar no alerta leva ao quadro e abre o card (o quadro faz a abertura)
  const openAlertCard = (cardId: string) => {
    setCardToOpenId(cardId);
    setAlertsOpen(false);
    onNavigate?.("kanban");
  };

  const overdueCount = alerts.filter(a => a.type === "CARD_OVERDUE" || a.type === "TASK_OVERDUE").length;
  const totalAlerts = alerts.length;

  const handleLogout = () => {
    // Limpa a equipe ativa guardada antes de qualquer nova busca (outro usuário pode entrar em seguida)
    resetStore();
    clearPersistedTeam();
    deleteCookie("creator_auth_token");
    deleteCookie("creator_user_id");
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
      window.location.href = "/login";
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full h-16 border-b border-border bg-background/90 backdrop-blur-md z-40 flex items-center justify-between px-4 sm:px-8 font-sans transition-colors">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Sheet>
          <SheetTrigger render={
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          } />
          <SheetContent side="left" className="bg-background border-r border-border p-6 flex flex-col gap-6 w-[280px]">
            <SheetHeader>
              <SheetTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2.5 font-heading">
                <div className="w-7 h-7 bg-primary/10 border border-primary/20 text-primary rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 fill-primary/20" />
                </div>
                <span>Workbench<span className="text-primary">_CR</span></span>
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1.5 flex-1 mt-4">
              <Button 
                variant="ghost" 
                onClick={() => onNavigate?.("kanban")}
                className={`justify-start text-xs font-semibold tracking-wide h-10 rounded-lg ${
                  activeTab === "kanban" ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Layout size={15} className="mr-3 text-primary" /> Dashboard Geral
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => onNavigate?.("inbox")}
                className={`justify-start text-xs font-semibold tracking-wide h-10 rounded-lg ${
                  activeTab === "inbox" ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Sparkles size={15} className="mr-3 text-primary" /> Ideação
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => onNavigate?.("courses")}
                className={`justify-start text-xs font-semibold tracking-wide h-10 rounded-lg ${
                  activeTab === "courses" ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <GraduationCap size={15} className="mr-3 text-primary" /> Cursos & Módulos
              </Button>
              <UserSettingsDialog
                trigger={
                  <Button variant="ghost" className="w-full justify-start text-xs font-semibold tracking-wide text-muted-foreground hover:text-foreground hover:bg-muted h-10 rounded-lg">
                    <Settings2 size={15} className="mr-3 text-primary" /> Configurações
                  </Button>
                }
              />
            </div>
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between px-2 mb-4">
                <span className="text-xs font-medium text-muted-foreground">Tema Visual</span>
                <ThemeToggle />
              </div>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-xs font-semibold tracking-wide text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 rounded-lg" 
                onClick={handleLogout}
              >
                <Trash2 size={15} className="mr-3" /> Encerrar Sessão
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <div className="hidden sm:flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary/10 border border-primary/20 text-primary rounded-lg flex items-center justify-center shadow-xs">
            <Zap className="w-4 h-4 fill-primary/30" />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground font-heading hidden sm:inline">
            Workbench<span className="text-primary font-black">_CR</span>
          </span>
        </div>

        <div className="hidden sm:block h-4 w-[1px] bg-border mx-1" />

        <div className="min-w-0">
          <TeamSwitcher />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="hidden md:flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50">
          <button 
            onClick={() => onNavigate?.("inbox")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "inbox"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            Ideação
          </button>
          <button 
            onClick={() => onNavigate?.("kanban")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "kanban"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            Produção
          </button>
          <button 
            onClick={() => onNavigate?.("courses")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "courses"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            Cursos
          </button>
        </div>

        {canCreate && (
          <CreateIdeaDialog
            trigger={
              <Button
                aria-label="Capturar Ideia"
                title="Capturar Ideia"
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg px-2.5 sm:px-3.5 h-9 text-xs tracking-wide shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 sm:hidden" aria-hidden="true" />
                <span className="hidden sm:inline">Capturar Ideia</span>
              </Button>
            }
          />
        )}

          {FEATURES.alerts && (
          <Popover open={alertsOpen} onOpenChange={setAlertsOpen}>
            <PopoverTrigger render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Alertas de Prazos"
                title="Alertas de Prazos"
                className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <Bell className="w-4 h-4" />
                {totalAlerts > 0 && (
                  <span
                    data-testid="alerts-badge"
                    className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                      overdueCount > 0 ? "bg-destructive animate-pulse" : "bg-amber-500"
                    }`}
                  />
                )}
              </Button>
            } />
            <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))] p-0 rounded-xl shadow-lg border border-border bg-card">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 font-heading">
                  <Bell className="w-3.5 h-3.5 text-primary" />
                  Alertas de Prazos ({totalAlerts})
                </span>
                {overdueCount > 0 && (
                  <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                    {overdueCount} atrasado{overdueCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto p-2 space-y-1.5">
                {totalAlerts === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Nenhum prazo pendente ou em atraso.
                  </div>
                ) : (
                  alerts.map((alert) => {
                    const isOverdue = alert.type === "CARD_OVERDUE" || alert.type === "TASK_OVERDUE";
                    return (
                      <button
                        type="button"
                        key={`${alert.type}-${alert.cardId}-${alert.taskId ?? "card"}`}
                        onClick={() => openAlertCard(alert.cardId)}
                        aria-label={`Abrir card ${alert.cardTitle}`}
                        className={`w-full text-left p-2 rounded-lg text-xs border transition-colors cursor-pointer hover:brightness-95 ${
                          isOverdue
                            ? "bg-destructive/5 border-destructive/20 text-foreground"
                            : "bg-amber-500/5 border-amber-500/20 text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                            isOverdue ? "text-destructive" : "text-amber-600 dark:text-amber-400"
                          }`}>
                            {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {isOverdue ? overdueLabel(alert.daysLeft) : dueLabel(alert.daysLeft)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatLocalDate(alert.dueDate)}
                          </span>
                        </div>
                        <p className="font-semibold text-xs truncate text-foreground">{alert.cardTitle}</p>
                        {alert.taskTitle && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            Tarefa: {alert.taskTitle}
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
          )}
        <div className="hidden sm:flex items-center gap-1">
          <ThemeToggle />
          <UserSettingsDialog
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Configurações de Usuário"
                className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <Settings2 className="w-4 h-4" />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            aria-label="Encerrar Sessão"
            title="Encerrar Sessão"
            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        {/* Hidden color picker for test compatibility */}
        <ThemeColorPicker />
      </div>
    </nav>
  );
}
