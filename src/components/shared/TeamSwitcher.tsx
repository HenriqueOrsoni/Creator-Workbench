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
            className="flex items-center gap-2 h-10 px-3.5 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 hover:border-primary/40 font-bold text-xs uppercase tracking-wider"
          >
            <Users className="w-4 h-4 text-primary" />
            <span className="max-w-[130px] truncate">{activeTeam ? activeTeam.name : "Carregando equipe..."}</span>
            {activeTeam && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-black">
                {activeTeam.role}
              </Badge>
            )}
          </Button>
        } />
        <DialogContent className="sm:max-w-[420px] rounded-3xl p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 font-heading">
              <Users className="w-5 h-5 text-primary" />
              Equipes & Colaboração
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
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
                  className={`flex items-center justify-between p-3 rounded-2xl text-left transition-all border ${
                    isSelected
                      ? "bg-primary/10 border-primary text-primary dark:text-white"
                      : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200/60 dark:border-zinc-700/60 hover:border-zinc-400 text-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-black text-xs">
                      {t.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{t.name}</div>
                      <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
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

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              variant="outline"
              onClick={() => {
                setOpenSelect(false);
                setOpenMembers(true);
              }}
              className="w-full rounded-xl text-xs font-bold uppercase tracking-wider gap-2 h-10"
            >
              <Users className="w-4 h-4" /> Gerenciar Membros
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setOpenSelect(false);
                setOpenCreate(true);
              }}
              className="w-full rounded-xl text-xs font-bold uppercase tracking-wider gap-2 h-10 border-dashed"
            >
              <Plus className="w-4 h-4" /> Criar Equipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Botão de Atalho Direto para Membros */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpenMembers(true)}
        className="h-10 w-10 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        title="Gerenciar membros da equipe"
      >
        <Users className="w-4 h-4" />
      </Button>

      {/* Dialog de Membros da Equipe */}
      <TeamMembersDialog open={openMembers} onOpenChange={setOpenMembers} />

      {/* Dialog para criação de equipe */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 font-heading">
                <Plus className="w-5 h-5 text-primary" />
                Criar Nova Equipe
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Uma equipe possui seu próprio quadro Kanban dinâmico, caixa de entrada e cursos.
              </DialogDescription>
            </DialogHeader>

            <div className="my-5">
              <label htmlFor="team-name-input" className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-2">
                Nome da Equipe
              </label>
              <Input
                id="team-name-input"
                placeholder="Ex: Laboratório de Mídias, Canal Tech"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="h-11 rounded-xl text-sm"
                autoFocus
              />
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenCreate(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !newTeamName.trim()}
                className="rounded-xl text-xs font-bold uppercase tracking-wider bg-zinc-900 text-white dark:bg-primary"
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
