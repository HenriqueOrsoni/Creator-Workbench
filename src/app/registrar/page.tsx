"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, AlertCircle, MailCheck, UserPlus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../components/shared/ThemeToggle";
import { ThemeColorPicker } from "../../components/shared/ThemeColorPicker";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, setCookie } from "@/lib/api";
import { toast } from "sonner";

const step1Schema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  email: z.string().min(1, "E-mail é obrigatório.").email("Endereço de e-mail inválido."),
});

const step2Schema = z
  .object({
    token: z.string().length(6, "O código deve conter exatamente 6 dígitos."),
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
    confirmPassword: z.string().min(6, "Confirme sua senha de acesso."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [userData, setUserData] = useState<{ name: string; email: string }>({ name: "", email: "" });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  const formStep1 = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: "", email: "" },
  });

  const formStep2 = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: { token: "", password: "", confirmPassword: "" },
  });

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const onStep1Submit = async (values: Step1Values) => {
    setIsLoading(true);
    setError(null);

    try {
      await apiRequest("POST", "/api/auth/register/request-token", values);
      setUserData(values);
      setStep(2);
      setCountdown(60);
      toast.success("Código de verificação enviado!");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido ao tentar enviar o código.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const onStep2Submit = async (values: Step2Values) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/auth/register/confirm", {
        email: userData.email,
        token: values.token,
        password: values.password,
      });
      
      if (response && response.token) {
        setCookie("creator_auth_token", response.token, 86400);
        if (response.userId) {
          setCookie("creator_user_id", response.userId.toString(), 86400);
        }
        toast.success("Cadastro realizado com sucesso!");
        router.push("/");
      } else {
        throw new Error("Token não retornado pelo servidor.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido ao confirmar cadastro.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendToken = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    setError(null);

    try {
      await apiRequest("POST", "/api/auth/register/request-token", {
        name: userData.name,
        email: userData.email,
      });
      setCountdown(60);
      toast.success("Novo código enviado para seu e-mail!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao reenviar código.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors relative selection:bg-primary/20">
      {/* HEADER */}
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

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* CARD */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 sm:p-8">
            <div className="mb-6 flex justify-between items-start">
              <div>
                <div className="w-10 h-10 bg-primary/10 border border-primary/20 text-primary rounded-lg flex items-center justify-center mb-3">
                  <UserPlus className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-xl font-bold tracking-tight font-heading text-foreground">
                  {step === 1 ? "Nova Credencial" : "Confirmar Acesso"}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {step === 1 ? "Cadastre seu operador no Creator Workbench." : `Código enviado para ${userData.email}`}
                </p>
              </div>

              {/* STEP INDICATORS */}
              <div className="flex gap-1.5 mt-2">
                <div className={`h-1.5 rounded-full transition-all ${step === 1 ? 'w-6 bg-primary' : 'w-2 bg-muted'}`} />
                <div className={`h-1.5 rounded-full transition-all ${step === 2 ? 'w-6 bg-primary' : 'w-2 bg-muted'}`} />
              </div>
            </div>

            {/* ERROR ALERT */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-lg flex items-start gap-2.5 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.form 
                  key="step1"
                  onSubmit={formStep1.handleSubmit(onStep1Submit)}
                  noValidate
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Nome do Operador
                    </label>
                    <input 
                      type="text" 
                      {...formStep1.register("name")}
                      required
                      className="w-full h-10 bg-background border border-border rounded-lg px-3.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors"
                      placeholder="Seu Nome Completo"
                    />
                    {formStep1.formState.errors.name && (
                      <p className="text-[11px] text-destructive font-medium mt-1">{formStep1.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      E-mail Institucional
                    </label>
                    <input 
                      type="email" 
                      {...formStep1.register("email")}
                      required
                      className="w-full h-10 bg-background border border-border rounded-lg px-3.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors"
                      placeholder="operador@creator.studio"
                    />
                    {formStep1.formState.errors.email && (
                      <p className="text-[11px] text-destructive font-medium mt-1">{formStep1.formState.errors.email.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-10 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 mt-2 shadow-xs"
                  >
                    {isLoading ? (
                      <span>Autenticando e-mail...</span>
                    ) : (
                      <>
                        Receber Código de Acesso
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </motion.form>
              ) : (
                <motion.form 
                  key="step2"
                  onSubmit={formStep2.handleSubmit(onStep2Submit)}
                  noValidate
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-primary/10 border border-primary/20 text-primary p-3 rounded-lg flex items-start gap-2.5 text-xs">
                    <MailCheck className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    <div>
                      <p className="font-semibold">Verifique sua caixa de entrada</p>
                      <p className="opacity-80 text-[11px] mt-0.5">Enviamos um código de 6 dígitos para <strong>{userData.email}</strong></p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-foreground">
                        Código Recebido
                      </label>
                      <button
                        type="button"
                        onClick={handleResendToken}
                        disabled={countdown > 0 || isResending}
                        className="text-xs font-medium text-primary disabled:text-muted-foreground disabled:cursor-not-allowed hover:underline"
                      >
                        {countdown > 0 ? `Reenviar (${countdown}s)` : "Reenviar código"}
                      </button>
                    </div>
                    <input 
                      type="text" 
                      {...formStep2.register("token")}
                      required
                      maxLength={6}
                      className="w-full h-11 bg-background border border-border rounded-lg px-3 text-center text-lg tracking-[0.4em] font-bold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 font-mono"
                      placeholder="000000"
                    />
                    {formStep2.formState.errors.token && (
                      <p className="text-[11px] text-destructive font-medium mt-1">{formStep2.formState.errors.token.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Criar Senha de Acesso
                    </label>
                    <input 
                      type="password" 
                      {...formStep2.register("password")}
                      required
                      className="w-full h-10 bg-background border border-border rounded-lg px-3.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors font-mono"
                      placeholder="••••••••"
                    />
                    {formStep2.formState.errors.password && (
                      <p className="text-[11px] text-destructive font-medium mt-1">{formStep2.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Confirmar Senha
                    </label>
                    <input 
                      type="password" 
                      {...formStep2.register("confirmPassword")}
                      required
                      className="w-full h-10 bg-background border border-border rounded-lg px-3.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors font-mono"
                      placeholder="••••••••"
                    />
                    {formStep2.formState.errors.confirmPassword && (
                      <p className="text-[11px] text-destructive font-medium mt-1">{formStep2.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-10 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 mt-2 shadow-xs"
                  >
                    {isLoading ? (
                      <span>Validando...</span>
                    ) : (
                      <>
                        Confirmar e Acessar
                        <Zap className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                  
                  <div className="pt-2 text-center">
                    <button 
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setError(null);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors font-medium"
                    >
                      Voltar e corrigir e-mail
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="pt-5 mt-6 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                Já é operador?{" "}
                <a href="/login" className="text-primary font-semibold hover:underline">
                  Iniciar Sessão
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
