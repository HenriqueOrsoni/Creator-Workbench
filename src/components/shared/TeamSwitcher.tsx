"use client";

import React from "react";
import { Users, Plus, Check, Shield, Palette, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/useAppStore";

import { TeamMembersDialog } from "./TeamMembersDialog";

export function TeamSwitcher() {
  const { teams, activeTeam, activeTeamId, fetchTeams, setActiveTeamId, createTeam } = useAppStore();
  const [openSelect, setOpenSelect] = React.useState(false);
  const [openCreate, setOpenCreate] = React.useState(false);
  const [openMembers, setOpenMembers] = React.useState(false);
  const [newTeamName, setNewTeamName] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setLoading(true);
    const created = await createTeam(newTeamName.trim());
    setLoading(false);

    if (created) {
      setNewTeamName("");
      setOpenCreate(false);
      setOpenSelect(false);
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return <Shield className="w-3 h-3 text-amber-500" />;
      case "CREATOR":
        return <Palette className="w-3 h-3 text-sky-500" />;
      default:
        return <Eye className="w-3 h-3 text-emerald-500" />;
    }
  };

  return (
    <div className="flex items-center gap-1.5 font-sans">
      <Dialog open={openSelect} onOpenChange={setOpenSelect}>
        <DialogTrigger render={
          <Button
            variant="outline"
            className="flex items-center gap-2 h-9 px-3 rounded-lg border-border bg-background hover:bg-muted font-medium text-xs transition-colors shadow-xs"
          >
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="max-w-[130px] truncate">{activeTeam ? activeTeam.name : "Meu Estúdio"}</span>
            {activeTeam && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-semibold rounded-sm">
                {activeTeam.role}
              </Badge>
            )}
          </Button>
        } />
        <DialogContent className="sm:max-w-[420px] rounded-xl p-6 bg-card border-border shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold tracking-tight flex items-center gap-2 font-heading">
              <Users className="w-4 h-4 text-primary" />
              Equipes & Colaboração
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Alterne entre equipes ou crie novos espaços para seus projetos e cursos.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 my-4 max-h-[260px] overflow-y-auto pr-1">
            {teams.map((t) => {
              const isSelected = t.id === activeTeamId;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTeamId(t.id);
                    setOpenSelect(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-lg text-left transition-all border ${
                    isSelected
                      ? "bg-primary/10 border-primary text-primary dark:text-emerald-400 font-medium"
                      : "bg-muted/30 border-border hover:border-zinc-400 dark:hover:border-zinc-700 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs">
                      {t.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{t.name}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        {getRoleIcon(t.role)}
                        <span>{t.role}</span>
                        <span>•</span>
                        <span>{t.membersCount} {t.membersCount === 1 ? "membro" : "membros"}</span>
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setOpenSelect(false);
                setOpenMembers(true);
              }}
              className="w-full rounded-lg text-xs font-semibold gap-2 h-9"
            >
              <Users className="w-3.5 h-3.5" /> Gerenciar Membros
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setOpenSelect(false);
                setOpenCreate(true);
              }}
              className="w-full rounded-lg text-xs font-semibold gap-2 h-9 border-dashed"
            >
              <Plus className="w-3.5 h-3.5" /> Criar Equipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Botão de Atalho Direto para Membros */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpenMembers(true)}
        className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
        title="Gerenciar membros da equipe"
      >
        <Users className="w-4 h-4" />
      </Button>

      {/* Dialog de Membros da Equipe */}
      <TeamMembersDialog open={openMembers} onOpenChange={setOpenMembers} />

      {/* Dialog para criação de equipe */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-[400px] rounded-xl p-6 bg-card border-border shadow-lg">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold tracking-tight flex items-center gap-2 font-heading">
                <Plus className="w-4 h-4 text-primary" />
                Criar Nova Equipe
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Uma equipe possui seu próprio quadro Kanban dinâmico, caixa de entrada e cursos.
              </DialogDescription>
            </DialogHeader>

            <div className="my-5">
              <label htmlFor="team-name-input" className="block text-xs font-semibold text-foreground mb-1.5">
                Nome da Equipe
              </label>
              <Input
                id="team-name-input"
                placeholder="Ex: Laboratório de Mídias, Canal Tech"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="h-9 rounded-lg text-xs"
                autoFocus
              />
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenCreate(false)}
                className="rounded-lg text-xs font-medium"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !newTeamName.trim()}
                className="rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                {loading ? "Criando..." : "Criar Equipe"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
