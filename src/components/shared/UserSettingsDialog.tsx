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
      <DialogContent className="sm:max-w-[450px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-none dark:border dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-[20px_20px_60px_#efefef] dark:shadow-none rounded-xl font-sans antialiased">
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center gap-2 text-2xl font-black uppercase tracking-tighter italic text-zinc-900 dark:text-zinc-100 text-left font-heading">
            <Settings2 className="text-primary animate-spin-slow" />
            Configurações_<span className="text-primary">Operador</span>
          </DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-widest text-zinc-400 font-bold text-left font-sans">
            Gerencie suas credenciais de acesso e segurança de perfil.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold font-sans">
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }: { field: ControllerRenderProps<UserSettingsFormValues, "name"> }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold text-zinc-500 font-heading">
                    <User size={14} className="text-primary/50" />
                    Nome Completo
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Seu Nome"
                      disabled={isLoading}
                      className="bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 rounded-2xl focus:border-primary/50 text-zinc-900 dark:text-zinc-100 h-12 transition-all duration-300 font-sans shadow-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] italic font-bold font-sans" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }: { field: ControllerRenderProps<UserSettingsFormValues, "email"> }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold text-zinc-500 font-heading">
                    <Mail size={14} className="text-primary/50" />
                    E-mail Institucional
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="operador@creator.studio"
                      disabled={isLoading}
                      className="bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 rounded-2xl focus:border-primary/50 text-zinc-900 dark:text-zinc-100 h-12 transition-all duration-300 font-sans shadow-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] italic font-bold font-sans" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }: { field: ControllerRenderProps<UserSettingsFormValues, "password"> }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold text-zinc-500 font-heading">
                    <Key size={14} className="text-primary/50" />
                    Nova Senha (Deixe em branco para manter)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      disabled={isLoading}
                      className="bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 rounded-2xl focus:border-primary/50 text-zinc-900 dark:text-zinc-100 h-12 transition-all duration-300 font-sans shadow-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] italic font-bold font-sans" />
                </FormItem>
              )}
            />

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:opacity-90 text-white rounded-2xl shadow-lg shadow-primary/20 font-black uppercase tracking-[0.2em] text-[10px] h-12 transition-all duration-300 font-heading"
              >
                Salvar Alterações
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={openDeleteDialog}
                disabled={isLoading}
                className="w-full text-zinc-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-2xl font-bold uppercase tracking-[0.2em] text-[9px] h-12 transition-all duration-300 font-heading"
              >
                <ShieldAlert size={14} className="mr-2" /> Excluir Conta do Operador
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* Modal de Confirmação de Exclusão de Conta (FE-16, FE-35) */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <ShieldAlert size={18} /> Confirmar Exclusão de Conta
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block text-zinc-700 dark:text-zinc-300">
                Esta ação é <strong>irreversível</strong>. Todos os seus dados, roteiros e projetos serão permanentemente removidos.
              </span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400 pt-2">
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
              className="h-11 rounded-xl text-sm"
            />
            {deleteError && (
              <p className="text-xs text-red-500 font-medium mt-1.5">{deleteError}</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="rounded-xl font-bold"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmAccountDeletion}
              disabled={isLoading || !confirmEmail}
              className="rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? "Excluindo..." : "Excluir Definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
