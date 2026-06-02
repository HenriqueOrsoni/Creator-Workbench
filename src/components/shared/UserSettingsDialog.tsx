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
      alert("Configurações atualizadas com sucesso!");
      setOpen(false);
    } catch (err) {
      setError((err as Error).message || "Erro ao atualizar dados.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const userId = getCookie("creator_user_id");
    if (!userId) return;

    const confirmFirst = window.confirm("ATENÇÃO: Tem certeza absoluta que deseja excluir a sua conta? Esta ação é irreversível!");
    if (!confirmFirst) return;

    const confirmSecond = window.prompt("Para confirmar a exclusão, digite o e-mail cadastrado:");
    if (confirmSecond !== form.getValues("email")) {
      alert("E-mail incorreto. Exclusão de conta cancelada.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await apiRequest("DELETE", `/api/v1/users/${userId}`);
      deleteCookie("creator_auth_token");
      deleteCookie("creator_user_id");
      alert("Sua conta foi excluída com sucesso.");
      window.location.href = "/login";
    } catch (err) {
      setError((err as Error).message || "Erro ao excluir conta.");
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
                onClick={handleDeleteAccount}
                disabled={isLoading}
                className="w-full text-zinc-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-2xl font-bold uppercase tracking-[0.2em] text-[9px] h-12 transition-all duration-300 font-heading"
              >
                <ShieldAlert size={14} className="mr-2" /> Excluir Conta do Operador
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
