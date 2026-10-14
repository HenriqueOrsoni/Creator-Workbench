"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../components/shared/ThemeToggle";
import { ThemeColorPicker } from "../../components/shared/ThemeColorPicker";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, setCookie } from "@/lib/api";
import { PasswordRecoveryDialog } from "../../components/shared/PasswordRecoveryDialog";

const loginSchema = z.object({
  email: z.string().min(1, "E-mail é obrigatório.").email("Endereço de e-mail inválido."),
  password: z.string().min(1, "Senha é obrigatória."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openRecovery, setOpenRecovery] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/auth/login", data);
      
      if (response && response.token) {
        setCookie("creator_auth_token", response.token, 86400);
        if (response.userId) {
          setCookie("creator_user_id", response.userId.toString(), 86400);
        }
        router.push("/");
      } else {
        throw new Error("Token não retornado pelo servidor.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido ao tentar acessar o sistema.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors relative selection:bg-primary/20">
      {/* HEADER / TOP BAR */}
      <header className="w-full h-16 border-b border-border bg-background/80 backdrop-blur-md px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary/10 border border-primary/20 text-primary rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 fill-primary/30" />
          </div>
          <span className="text-base font-bold tracking-tight font-heading text-foreground">
            Workbench<span className="text-primary font-black">_CR</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <ThemeColorPicker />
        </div>
      </header>

      {/* CENTERED LOGIN CONTAINER */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* LOGIN CARD */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 sm:p-8">
            <div className="mb-6">
              <div className="w-10 h-10 bg-primary/10 border border-primary/20 text-primary rounded-lg flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-xl font-bold tracking-tight font-heading text-foreground">
                Acesso ao Estúdio
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Ambiente de gestão de operações para conteúdo educacional.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* ERROR ALERT */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-lg flex items-start gap-2.5 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Credencial de Operador
                </label>
                <input 
                  type="email" 
                  {...register("email")}
                  required
                  className="w-full h-10 bg-background border border-border rounded-lg px-3.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors"
                  placeholder="operador@creator.studio"
                />
                {errors.email && (
                  <p className="text-[11px] text-destructive font-medium mt-1">{errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-foreground">
                    Código de Acesso
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setOpenRecovery(true)} 
                    className="text-xs text-primary font-medium hover:underline transition-colors"
                  >
                    Recuperar?
                  </button>
                </div>
                <input 
                  type="password" 
                  {...register("password")}
                  required
                  className="w-full h-10 bg-background border border-border rounded-lg px-3.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors font-mono"
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="text-[11px] text-destructive font-medium mt-1">{errors.password.message}</p>
                )}
              </div>

              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 mt-2 shadow-xs"
              >
                {isLoading ? (
                  <span>Autenticando...</span>
                ) : (
                  <>
                    Iniciar Sessão
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </form>

            <div className="pt-5 mt-6 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                Não possui credencial?{" "}
                <a href="/registrar" className="text-primary font-semibold hover:underline">
                  Solicitar Cadastro
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* DIALOG DE RECUPERAÇÃO DE SENHA */}
      <PasswordRecoveryDialog open={openRecovery} onOpenChange={setOpenRecovery} />
    </div>
  );
}
