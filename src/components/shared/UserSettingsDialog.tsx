"use client";

import React from "react";
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
import { User, Mail, ShieldAlert, Key, Settings2 } from "lucide-react";
import { apiRequest, getCookie, deleteCookie } from "@/lib/api";
import { toast } from "sonner";

const userSettingsSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  email: z.string().email("Endereço de e-mail inválido."),
  password: z.string().optional().or(z.literal("")),
});

type UserSettingsFormValues = z.infer<typeof userSettingsSchema>;

interface UserSettingsDialogProps {
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UserSettingsDialog({ trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange }: UserSettingsDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [confirmEmail, setConfirmEmail] = React.useState("");
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const form = useForm<UserSettingsFormValues>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const fetchUserData = React.useCallback(async () => {
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
          password: "",
        });
      }
    } catch (err) {
      setError((err as Error).message || "Erro ao carregar dados do usuário.");
    } finally {
      setIsLoading(false);
    }
  }, [form]);

  React.useEffect(() => {
    if (open) {
      fetchUserData();
    }
  }, [open, fetchUserData]);

  const onSubmit = async (values: UserSettingsFormValues) => {
    const userId = getCookie("creator_user_id");
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    // Prepare body payload (only send non-empty password)
    const payload: Record<string, string> = {
      name: values.name,
      email: values.email,
    };
    if (values.password && values.password.trim() !== "") {
      payload.password = values.password;
    }

    try {
      await apiRequest("PUT", `/api/v1/users/${userId}`, payload);
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
      <DialogContent className="sm:max-w-[440px] bg-card border border-border text-foreground shadow-lg rounded-xl font-sans">
        <DialogHeader className="space-y-1.5 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground font-heading">
            <Settings2 className="text-primary w-5 h-5" />
            Configurações da Conta
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-medium">
            Gerencie suas credenciais de acesso e perfil profissional.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-xs font-medium font-sans">
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
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
              name="password"
              render={({ field }: { field: ControllerRenderProps<UserSettingsFormValues, "password"> }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Key size={13} className="text-primary" />
                    Nova Senha (Deixe em branco para manter)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      disabled={isLoading}
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
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-xs h-10 shadow-xs"
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
                Esta ação é <strong>irreversível</strong>. Todos os seus dados, roteiros e projetos serão permanentemente removidos.
              </span>
              <span className="block pt-1">
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
