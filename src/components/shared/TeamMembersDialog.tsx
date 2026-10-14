"use client";

import React, { useState, useEffect } from "react";
import { Users, UserPlus, Trash2, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppStore, TeamMember } from "@/store/useAppStore";

interface TeamMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamMembersDialog({ open, onOpenChange }: TeamMembersDialogProps) {
  const {
    activeTeam,
    teamMembers,
    fetchTeamMembers,
    addTeamMember,
    updateTeamMemberRole,
    removeTeamMember,
  } = useAppStore();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "CREATOR" | "REVIEWER">("CREATOR");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && activeTeam) {
      fetchTeamMembers(activeTeam.id);
    }
  }, [open, activeTeam, fetchTeamMembers]);

  const isAdmin = activeTeam?.role === "ADMIN";

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const success = await addTeamMember(email.trim(), role);
    setLoading(false);
    if (success) {
      setEmail("");
      setRole("CREATOR");
    }
  };

  const handleRoleChange = async (member: TeamMember, newRole: "ADMIN" | "CREATOR" | "REVIEWER") => {
    if (member.role === newRole) return;
    await updateTeamMemberRole(member.id, newRole);
  };

  const handleRemove = async (memberId: string) => {
    if (confirm("Deseja realmente remover este membro da equipe?")) {
      await removeTeamMember(memberId);
    }
  };

  const getRoleLabel = (r: string) => {
    switch (r) {
      case "ADMIN":
        return "Administrador";
      case "CREATOR":
        return "Criador";
      case "REVIEWER":
        return "Revisor";
      default:
        return r;
    }
  };

  const getRoleBadgeVariant = (r: string) => {
    switch (r) {
      case "ADMIN":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "CREATOR":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
      case "REVIEWER":
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800";
      default:
        return "bg-zinc-100 text-zinc-600 border-zinc-200";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] rounded-xl p-6 bg-card border border-border shadow-lg">
        <DialogHeader className="pb-3 border-b border-border">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 font-heading text-foreground">
            <Users className="w-5 h-5 text-primary" />
            Membros da Equipe
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {activeTeam?.name} • Gerencie permissões e adicione colaboradores para produzir e revisar conteúdos.
          </DialogDescription>
        </DialogHeader>

        {/* Formulário de Adicionar Membro (Visível para Admins) */}
        {isAdmin && (
          <form onSubmit={handleAddMember} className="my-3 p-4 rounded-lg bg-muted/30 border border-border space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
              <UserPlus className="w-4 h-4 text-primary" />
              Convidar Novo Membro
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2 relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="member-email-input"
                  type="email"
                  required
                  placeholder="e-mail do colaborador"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg h-10 pl-9 text-xs border-border bg-background"
                />
              </div>
              <select
                id="member-role-select"
                value={role}
                onChange={(e) => setRole(e.target.value as "ADMIN" | "CREATOR" | "REVIEWER")}
                className="h-10 rounded-lg px-3 text-xs bg-background border border-border text-foreground font-medium"
              >
                <option value="CREATOR">Criador</option>
                <option value="REVIEWER">Revisor</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full h-9 rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-xs"
            >
              {loading ? "Adicionando..." : "Adicionar Membro"}
            </Button>
          </form>
        )}

        {/* Lista de Membros */}
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {teamMembers.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground font-medium">
              Nenhum membro encontrado.
            </div>
          ) : (
            teamMembers.map((member) => {
              const initials = member.name
                ? member.name.substring(0, 2).toUpperCase()
                : member.email.substring(0, 2).toUpperCase();

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {member.name || member.email}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${getRoleBadgeVariant(member.role)}`}
                        >
                          {getRoleLabel(member.role)}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <select
                        aria-label={`Papel de ${member.name || member.email}`}
                        value={member.role}
                        onChange={(e) => handleRoleChange(member, e.target.value as "ADMIN" | "CREATOR" | "REVIEWER")}
                        className="h-7 rounded-md px-2 text-[11px] bg-background border border-border text-foreground font-medium"
                      >
                        <option value="CREATOR">Criador</option>
                        <option value="REVIEWER">Revisor</option>
                        <option value="ADMIN">Admin</option>
                      </select>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(member.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-md"
                        title="Remover da equipe"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
