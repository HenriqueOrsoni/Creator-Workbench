"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, type ControllerRenderProps } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "../ui/dialog";
import { Button } from "../ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "../ui/form";
import { Input } from "../ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { User, Mail, ShieldAlert, Key, Settings2, CheckCircle2 } from "lucide-react";
import { apiRequest, getCookie, setCookie, deleteCookie } from "@/lib/api";
import { toast } from "sonner";
import { FEATURES } from "@/lib/features";

const userSettingsSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  email: z.string().email("Endereço de e-mail inválido."),
});

type UserSettingsFormValues = z.infer<typeof userSettingsSchema>;

interface UserSettingsDialogProps {
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UserSettingsDialog({ trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange }: UserSettingsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Estados para Troca de Senha (FE-33)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Estados para Troca de E-mail (FE-34)
  const [newEmail, setNewEmail] = useState("");
  const [emailChangeToken, setEmailChangeToken] = useState("");
  const [emailChangeStep, setEmailChangeStep] = useState<1 | 2>(1);
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  const form = useForm<UserSettingsFormValues>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const fetchUserData = useCallback(async () => {
    const userId = getCookie("creator_user_id");
    if (!userId) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest("GET", `/api/v1/users/${userId}`);
      if (data) {
        form.reset({
          name: data.name || "",
          email: data.email || "",
        });
      }
    } catch (err) {
      setError((err as Error).message || "Erro ao carregar dados do usuário.");
    } finally {
      setIsLoading(false);
    }
  }, [form]);

  useEffect(() => {
    if (open) {
      fetchUserData();
    }
  }, [open, fetchUserData]);

  const onSubmit = async (values: UserSettingsFormValues) => {
    const userId = getCookie("creator_user_id");
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    // O PUT do perfil só altera o nome; senha e e-mail têm rotas próprias (aba Segurança e aba E-mail)
    try {
      await apiRequest("PUT", `/api/v1/users/${userId}`, { name: values.name });
      toast.success("Configurações atualizadas com sucesso!");
      setOpen(false);
    } catch (err) {
      const msg = (err as Error).message || "Erro ao atualizar dados.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = getCookie("creator_user_id");
    if (!userId) return;

    if (!currentPassword) {
      toast.error("Informe sua senha atual.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword.length > 72) {
      toast.error("A senha deve ter no máximo 72 caracteres.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await apiRequest("PUT", `/api/v1/users/${userId}/password`, {
        currentPassword,
        newPassword
      });
      // A troca de senha encerra as outras sessões; o servidor devolve o token novo desta
      if (res && typeof res.token === "string" && res.token) {
        setCookie("creator_auth_token", res.token, 86400);
        // Same lifetime as the new token, as login does, so both cookies expire together
        setCookie("creator_user_id", String(userId), 86400);
      }
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast.error((err as Error).message || "Erro ao alterar senha. Verifique sua senha atual.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = getCookie("creator_user_id");
    if (!userId) return;

    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Informe um endereço de e-mail válido.");
      return;
    }

    setIsChangingEmail(true);
    try {
      await apiRequest("POST", `/api/v1/users/${userId}/email-change`, {
        newEmail: newEmail.trim()
      });
      toast.success(`Enviamos um código de verificação para ${newEmail.trim()}`);
      setEmailChangeStep(2);
    } catch (err) {
      toast.error((err as Error).message || "Erro ao solicitar troca de e-mail.");
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleConfirmEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = getCookie("creator_user_id");
    if (!userId) return;

    if (!emailChangeToken || emailChangeToken.trim().length < 6) {
      toast.error("O código de verificação deve ter 6 dígitos.");
      return;
    }

    setIsChangingEmail(true);
    try {
      const updatedUser = await apiRequest("POST", `/api/v1/users/${userId}/email-change/confirm`, {
        token: emailChangeToken.trim()
      });
      toast.success("E-mail atualizado com sucesso!");
      if (updatedUser?.email) {
        form.setValue("email", updatedUser.email);
      }
      setEmailChangeStep(1);
      setNewEmail("");
      setEmailChangeToken("");
    } catch (err) {
      toast.error((err as Error).message || "Código de verificação inválido ou expirado.");
    } finally {
      setIsChangingEmail(false);
    }
  };

  const openDeleteDialog = () => {
    setConfirmEmail("");
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const confirmAccountDeletion = async () => {
    const userId = getCookie("creator_user_id");
    if (!userId) return;

    if (confirmEmail.trim().toLowerCase() !== form.getValues("email").trim().toLowerCase()) {
      setDeleteError("O e-mail digitado não confere com o e-mail da sua conta.");
      toast.error("E-mail incorreto. Digite seu e-mail cadastrado para confirmar.");
      return;
    }

    setIsLoading(true);
    setDeleteError(null);
    try {
      await apiRequest("DELETE", `/api/v1/users/${userId}`);
      deleteCookie("creator_auth_token");
      deleteCookie("creator_user_id");
      toast.success("Sua conta foi excluída com sucesso.");
      setIsDeleteModalOpen(false);
      setOpen(false);
      window.location.href = "/login";
    } catch (err) {
      const msg = (err as Error).message || "Erro ao excluir conta.";
      setDeleteError(msg);
      toast.error(msg);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ? trigger : <button className="hidden" aria-hidden="true" />} />
      <DialogContent className="sm:max-w-[480px] bg-card border border-border text-foreground shadow-lg rounded-xl font-sans">
        <DialogHeader className="space-y-1.5 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground font-heading">
            <Settings2 className="text-primary w-5 h-5" />
            Configurações da Conta
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-medium">
            Gerencie suas credenciais de acesso, segurança e perfil.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-xs font-medium font-sans">
            {error}
          </div>
        )}

        <Tabs defaultValue="profile" className="w-full">
          {FEATURES.accountSecurity && (
            <TabsList className="grid grid-cols-3 w-full bg-muted/60 p-1 rounded-lg text-xs">
              <TabsTrigger value="profile" className="text-xs font-semibold rounded-md">Perfil</TabsTrigger>
              <TabsTrigger value="password" className="text-xs font-semibold rounded-md">Segurança</TabsTrigger>
              <TabsTrigger value="email" className="text-xs font-semibold rounded-md">E-mail</TabsTrigger>
            </TabsList>
          )}

          {/* Aba de Perfil */}
          <TabsContent value="profile" className="space-y-4 pt-3">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }: { field: ControllerRenderProps<UserSettingsFormValues, "name"> }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <User size={13} className="text-primary" />
                        Nome Completo
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Seu Nome"
                          disabled={isLoading}
                          className="bg-background border-border rounded-lg h-10 text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }: { field: ControllerRenderProps<UserSettingsFormValues, "email"> }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <Mail size={13} className="text-primary" />
                        E-mail Institucional
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="usuario@creator.studio"
                          disabled
                          readOnly
                          title={FEATURES.accountSecurity ? "Para trocar o e-mail, use a aba E-mail" : undefined}
                          className="bg-background border-border rounded-lg h-10 text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />

                <div className="pt-3 border-t border-border flex flex-col gap-2.5">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg font-semibold text-xs h-10 shadow-xs"
                  >
                    Salvar Alterações
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={openDeleteDialog}
                    disabled={isLoading}
                    className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg font-medium text-xs h-9"
                  >
                    <ShieldAlert size={14} className="mr-1.5 text-destructive" /> Excluir Conta do Operador
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Aba de Segurança / Trocar Senha (FE-33) */}
          {FEATURES.accountSecurity && (
          <>
          <TabsContent value="password" className="space-y-4 pt-3">
            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Senha Atual
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  disabled={isChangingPassword}
                  className="bg-background border-border rounded-lg h-10 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Nova Senha (Mínimo de 6 caracteres)
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  maxLength={72}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                  disabled={isChangingPassword}
                  className="bg-background border-border rounded-lg h-10 text-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={isChangingPassword || !currentPassword || newPassword.length < 6}
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg font-semibold text-xs h-10 shadow-xs mt-2"
              >
                {isChangingPassword ? "Alterando..." : "Alterar Senha"}
              </Button>
            </form>
          </TabsContent>

          {/* Aba de Trocar E-mail (FE-34) */}
          <TabsContent value="email" className="space-y-4 pt-3">
            {emailChangeStep === 1 ? (
              <form onSubmit={handleRequestEmailChange} className="space-y-3.5">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Informe o novo endereço de e-mail. Enviaremos um código de verificação de 6 dígitos para confirmar a alteração.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Novo Endereço de E-mail
                  </label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="novo@exemplo.com"
                    disabled={isChangingEmail}
                    className="bg-background border-border rounded-lg h-10 text-sm"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isChangingEmail || !newEmail || !newEmail.includes("@")}
                  className="w-full bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg font-semibold text-xs h-10 shadow-xs"
                >
                  {isChangingEmail ? "Enviando Código..." : "Enviar Código de Verificação"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleConfirmEmailChange} className="space-y-3.5">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Código enviado para <strong>{newEmail}</strong>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Código de 6 Dígitos
                  </label>
                  <Input
                    value={emailChangeToken}
                    onChange={(e) => setEmailChangeToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    disabled={isChangingEmail}
                    className="bg-background border-border rounded-lg h-10 text-sm tracking-widest text-center font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEmailChangeStep(1)}
                    className="flex-1 rounded-lg text-xs font-medium h-10"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isChangingEmail || emailChangeToken.length < 6}
                    className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg font-semibold text-xs h-10 shadow-xs"
                  >
                    {isChangingEmail ? "Confirmando..." : "Confirmar Troca"}
                  </Button>
                </div>
              </form>
            )}
          </TabsContent>
          </>
          )}
        </Tabs>
      </DialogContent>

      {/* Modal de Confirmação de Exclusão de Conta (FE-16, FE-35) */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-xl p-6 bg-card border border-border shadow-lg font-sans">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 text-lg font-bold">
              <ShieldAlert size={18} /> Confirmar Exclusão de Conta
            </DialogTitle>
            <DialogDescription className="space-y-2 text-xs text-muted-foreground">
              <span className="block text-foreground font-medium">
                Esta ação é <strong>irreversível</strong>. Todos os seus dados pessoais e de acesso serão excluídos.
              </span>
              <span className="block text-muted-foreground text-[11px] leading-relaxed">
                Atenção: se você for o único Administrador de uma equipe, é obrigatório transferir a administração para outro membro antes de excluir sua conta. O trabalho realizado na equipe permanecerá preservado para os demais membros.
              </span>
              <span className="block pt-1 text-foreground">
                Para confirmar a exclusão, digite seu e-mail cadastrado: <strong>{form.getValues("email")}</strong>
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              type="email"
              value={confirmEmail}
              onChange={(e) => {
                setConfirmEmail(e.target.value);
                setDeleteError(null);
              }}
              placeholder="Digite seu e-mail para confirmar"
              className="h-10 rounded-lg text-sm border-border bg-background"
            />
            {deleteError && (
              <p className="text-xs text-destructive font-medium mt-1.5">{deleteError}</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="rounded-lg font-semibold text-xs h-9 px-4"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmAccountDeletion}
              disabled={isLoading || !confirmEmail}
              className="rounded-lg font-semibold text-xs h-9 px-4 bg-destructive text-white hover:bg-destructive/90"
            >
              {isLoading ? "Excluindo..." : "Excluir Definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
