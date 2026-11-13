"use client";

import React, { useState, useEffect } from "react";
import { Users, UserPlus, Trash2, Mail, Send, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAppStore, TeamMember, TeamInvite } from "@/store/useAppStore";
import { FEATURES } from "@/lib/features";
import { toast } from "sonner";
import { canManageTeam, formatRole } from "@/lib/roles";
import { TagManager } from "./TagManager";

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
    teamInvites,
    fetchTeamInvites,
    createTeamInvite,
    cancelTeamInvite,
    renameTeam,
    deleteTeam,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState("membros");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "CREATOR" | "REVIEWER">("CREATOR");
  const [loading, setLoading] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  // Gestão de Equipe (FE-26)
  const [customTeamName, setCustomTeamName] = useState<string | null>(null);
  const newTeamName = customTeamName !== null ? customTeamName : (activeTeam?.name || "");
  const [isRenaming, setIsRenaming] = useState(false);
  const [openDeleteTeamModal, setOpenDeleteTeamModal] = useState(false);
  const [deleteTeamNameConfirm, setDeleteTeamNameConfirm] = useState("");
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);

  // Convite por e-mail (FE-26)
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "CREATOR" | "REVIEWER">("CREATOR");
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (open && activeTeam) {
      fetchTeamMembers(activeTeam.id);
      if (FEATURES.invites) fetchTeamInvites();
    }
  }, [open, activeTeam, fetchTeamMembers, fetchTeamInvites]);

  const isAdmin = canManageTeam(activeTeam?.role);

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

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setSendingInvite(true);
    const success = await createTeamInvite(inviteEmail.trim(), inviteRole);
    setSendingInvite(false);
    if (success) {
      setInviteEmail("");
      setInviteRole("CREATOR");
    }
  };

  const handleRenameTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || newTeamName.trim() === activeTeam?.name) return;

    setIsRenaming(true);
    const ok = await renameTeam(newTeamName.trim());
    setIsRenaming(false);
    if (ok) {
      setCustomTeamName(null);
    }
  };

  const handleConfirmDeleteTeam = async () => {
    if (!activeTeam) return;
    if (deleteTeamNameConfirm.trim() !== activeTeam.name.trim()) {
      toast.error("O nome digitado não confere com o nome da equipe.");
      return;
    }

    setIsDeletingTeam(true);
    const deleted = await deleteTeam(activeTeam.id);
    setIsDeletingTeam(false);
    // Só fecha se o servidor excluiu; em caso de erro a mensagem já foi exibida
    if (deleted) {
      setOpenDeleteTeamModal(false);
      onOpenChange(false);
    }
  };

  const handleRoleChange = async (member: TeamMember, newRole: "ADMIN" | "CREATOR" | "REVIEWER") => {
    if (member.role === newRole) return;
    await updateTeamMemberRole(member.id, newRole);
  };

  const confirmRemove = async () => {
    if (memberToRemove) {
      await removeTeamMember(memberToRemove.id);
      setMemberToRemove(null);
    }
  };

  const getRoleLabel = (r: string) => formatRole(r);

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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[560px] rounded-xl p-6 bg-card border border-border shadow-lg font-sans">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 font-heading text-foreground">
              <Users className="w-5 h-5 text-primary" />
              Gestão da Equipe • {activeTeam?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Gerencie colaboradores, convites por e-mail e configurações de estúdio.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
            <TabsList className="flex w-full justify-start overflow-x-auto bg-muted/60 p-1 rounded-lg text-xs">
              <TabsTrigger value="membros" className="text-xs font-semibold rounded-md">
                Membros ({teamMembers.length})
              </TabsTrigger>
              {FEATURES.invites && (
                <TabsTrigger value="convites" className="text-xs font-semibold rounded-md">
                  Convites ({teamInvites.length})
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="etiquetas" className="text-xs font-semibold rounded-md">
                  Etiquetas
                </TabsTrigger>
              )}
              {isAdmin && FEATURES.teamManage && (
                <TabsTrigger value="configuracoes" className="text-xs font-semibold rounded-md">
                  Configurações
                </TabsTrigger>
              )}
            </TabsList>

            {/* Aba 1: Membros */}
            <TabsContent value="membros" className="space-y-3 pt-2">
              {/* Formulário de Adicionar Membro (Visível para Admins) */}
              {isAdmin && (
                <form onSubmit={handleAddMember} className="p-3.5 rounded-lg bg-muted/30 border border-border space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                    <UserPlus className="w-3.5 h-3.5 text-primary" />
                    Adicionar Colaborador Já Cadastrado
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2 relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        id="member-email-input"
                        type="email"
                        required
                        placeholder="e-mail do colaborador"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="rounded-lg h-9 pl-9 text-xs border-border bg-background"
                      />
                    </div>
                    <select
                      id="member-role-select"
                      value={role}
                      onChange={(e) => setRole(e.target.value as "ADMIN" | "CREATOR" | "REVIEWER")}
                      className="h-9 rounded-lg px-2 text-xs bg-background border border-border text-foreground font-medium"
                    >
                      <option value="CREATOR">Criador</option>
                      <option value="REVIEWER">Revisor</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full h-8 rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-xs"
                  >
                    {loading ? "Adicionando..." : "Adicionar Membro"}
                  </Button>
                </form>
              )}

              {/* Lista de Membros */}
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {teamMembers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground font-medium">
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
                        className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground truncate">
                                {member.name || member.email}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${getRoleBadgeVariant(member.role)}`}
                              >
                                {getRoleLabel(member.role)}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">
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
                              className="h-7 rounded-md px-1.5 text-[11px] bg-background border border-border text-foreground font-medium"
                            >
                              <option value="CREATOR">Criador</option>
                              <option value="REVIEWER">Revisor</option>
                              <option value="ADMIN">Administrador</option>
                            </select>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setMemberToRemove(member)}
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
            </TabsContent>

            {/* Aba 2: Convites Pendentes (FE-26) */}
            {FEATURES.invites && (
            <TabsContent value="convites" className="space-y-3 pt-2">
              {isAdmin && (
                <form onSubmit={handleSendInvite} className="p-3.5 rounded-lg bg-muted/30 border border-border space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                    <Send className="w-3.5 h-3.5 text-primary" />
                    Convidar por E-mail (Link válido por 7 dias)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      type="email"
                      required
                      placeholder="e-mail do convidado"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="sm:col-span-2 rounded-lg h-9 text-xs border-border bg-background"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "CREATOR" | "REVIEWER")}
                      className="h-9 rounded-lg px-2 text-xs bg-background border border-border text-foreground font-medium"
                    >
                      <option value="CREATOR">Criador</option>
                      <option value="REVIEWER">Revisor</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                  <Button
                    type="submit"
                    disabled={sendingInvite || !inviteEmail.trim()}
                    className="w-full h-8 rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs"
                  >
                    {sendingInvite ? "Enviando..." : "Enviar Convite por E-mail"}
                  </Button>
                </form>
              )}

              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {teamInvites.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Nenhum convite pendente no momento.
                  </div>
                ) : (
                  teamInvites.map((inv: TeamInvite) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground truncate">{inv.email}</span>
                          <Badge variant="outline" className="text-[10px] font-semibold uppercase py-0 px-1 bg-muted">
                            {getRoleLabel(inv.role)}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Expira em {new Date(inv.expiresAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>

                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelTeamInvite(inv.id)}
                          className="h-7 text-[11px] text-muted-foreground hover:text-destructive"
                        >
                          Cancelar Convite
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
            )}

            {/* Aba 3: Etiquetas (somente Administrador) */}
            {isAdmin && (
              <TabsContent value="etiquetas" className="pt-3">
                <TagManager />
              </TabsContent>
            )}

            {/* Aba 4: Configurações da Equipe (FE-26) */}
            {isAdmin && FEATURES.teamManage && (
              <TabsContent value="configuracoes" className="space-y-4 pt-3">
                <form onSubmit={handleRenameTeam} className="p-3.5 rounded-lg border border-border bg-card space-y-2.5">
                  <span className="text-xs font-semibold text-foreground block">
                    Renomear Equipe
                  </span>
                  <div className="flex gap-2">
                    <Input
                      value={newTeamName}
                      onChange={(e) => setCustomTeamName(e.target.value)}
                      placeholder="Nome da Equipe"
                      className="h-9 text-xs rounded-lg flex-1 border-border bg-background"
                    />
                    <Button
                      type="submit"
                      disabled={isRenaming || !newTeamName.trim() || newTeamName.trim() === activeTeam?.name}
                      className="h-9 rounded-lg text-xs font-semibold px-4 bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs"
                    >
                      {isRenaming ? "Salvando..." : "Salvar Nome"}
                    </Button>
                  </div>
                </form>

                <div className="p-3.5 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-destructive font-heading">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Zona de Perigo • Excluir Equipe
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Excluir a equipe apagará permanentemente o quadro, ideias, cursos e materiais dela. Esta ação não poderá ser desfeita.
                  </p>
                  <Button
                    type="button"
                    disabled={activeTeam?.personal === true}
                    variant="destructive"
                    onClick={() => {
                      setDeleteTeamNameConfirm("");
                      setOpenDeleteTeamModal(true);
                    }}
                    className="w-full h-9 rounded-lg text-xs font-semibold uppercase tracking-wider"
                  >
                    Excluir Equipe
                  </Button>
                  {activeTeam?.personal === true && (
                    <p className="text-[11px] text-muted-foreground">A equipe pessoal não pode ser excluída.</p>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Remoção de Membro (BF-22) */}
      <Dialog open={Boolean(memberToRemove)} onOpenChange={(o) => !o && setMemberToRemove(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-xl p-6 bg-card border border-border shadow-lg font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 font-heading text-destructive">
              <Trash2 className="w-4 h-4" />
              Remover Membro
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Tem certeza que deseja remover <strong className="text-foreground font-semibold">&ldquo;{memberToRemove?.name || memberToRemove?.email}&rdquo;</strong> da equipe?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4 border-t border-border mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMemberToRemove(null)}
              className="rounded-lg text-xs font-medium"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmRemove}
              className="rounded-lg text-xs font-semibold"
            >
              Confirmar Remoção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão de Equipe (FE-26: pede para digitar o nome da equipe) */}
      <Dialog open={openDeleteTeamModal} onOpenChange={setOpenDeleteTeamModal}>
        <DialogContent className="sm:max-w-[420px] rounded-xl p-6 bg-card border border-border shadow-lg font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 font-heading text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Excluir Equipe {activeTeam?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1 space-y-1.5">
              <span className="block text-foreground font-medium">
                Esta ação é irreversível e excluirá todo o conteúdo associado à equipe.
              </span>
              <span className="block">
                Para confirmar, digite exatamente o nome da equipe: <strong className="text-foreground">{activeTeam?.name}</strong>
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Input
              value={deleteTeamNameConfirm}
              onChange={(e) => setDeleteTeamNameConfirm(e.target.value)}
              placeholder="Digite o nome da equipe"
              className="h-10 rounded-lg text-xs border-border bg-background"
            />
          </div>

          <DialogFooter className="flex gap-2 pt-2 border-t border-border mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpenDeleteTeamModal(false)}
              className="rounded-lg text-xs font-medium"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingTeam || deleteTeamNameConfirm.trim() !== activeTeam?.name.trim()}
              onClick={handleConfirmDeleteTeam}
              className="rounded-lg text-xs font-semibold bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeletingTeam ? "Excluindo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
