"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, AlertCircle, Plus, MailCheck } from "lucide-react";
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
  
  // States
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
      // Solicitar token de cadastro no backend
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
      // Confirmar cadastro no backend
      const response = await apiRequest("POST", "/api/auth/register/confirm", {
        email: userData.email,
        token: values.token,
        password: values.password,
      });
      
      if (response && response.token) {
        // Salva o token real no cookie
        setCookie("creator_auth_token", response.token, 86400);
        if (response.userId) {
          setCookie("creator_user_id", response.userId.toString(), 86400);
        }
        toast.success("Cadastro confirmado com sucesso!");
        router.push("/");
      } else {
        throw new Error("Token não retornado pelo servidor.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido ao tentar registrar.";
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
      toast.success("Novo código de verificação enviado para o seu e-mail!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao reenviar código.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-zinc-900 dark:text-zinc-100 selection:bg-primary/20 overflow-x-hidden font-sans antialiased relative transition-colors duration-500 flex flex-col">
      <div className="absolute inset-0 bg-dot-grid dark:bg-dot-grid-dark opacity-[0.4] dark:opacity-[0.2] pointer-events-none -z-20" />
      <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary-light/50 dark:bg-primary-dark/20 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="fixed bottom-[-5%] left-[-10%] w-[400px] h-[400px] bg-primary-light/30 dark:bg-zinc-900/30 rounded-full blur-[100px] -z-10" />

      {/* NAVBAR */}
      <nav className="w-full h-[88px] border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-950/50 backdrop-blur-md z-50 flex items-center justify-between px-6 lg:px-12 font-sans absolute top-0 left-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl md:text-2xl font-black tracking-tighter uppercase font-heading dark:text-zinc-100">Workbench<span className="text-primary">_CR</span></span>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <ThemeColorPicker />
          <ThemeToggle />
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col lg:flex-row pt-[88px] w-full max-w-[1600px] mx-auto">
        {/* LEFT SECTION - Massive Typography */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 pt-16 lg:pt-0 z-10">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30 mb-8 lg:mb-12">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-[18vw] lg:text-[8vw] leading-[0.85] font-black tracking-tighter uppercase mb-6 font-heading group">
              Join.<br />
              <span className="text-primary italic ml-[2vw] inline-block hover:scale-105 transition-transform duration-500 cursor-default">
                Studio.
              </span>
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest text-xs sm:text-sm max-w-md ml-[1vw]">
              Inscrição de novos operadores para o painel de gerenciamento estratégico.
            </p>
          </motion.div>
        </div>

        {/* RIGHT SECTION - Registration Form */}
        <div className="w-full lg:w-[600px] flex items-center justify-center p-8 sm:p-12 lg:p-16 z-10 mt-8 lg:mt-0">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="w-full max-w-[500px] bg-white dark:bg-zinc-800 p-8 sm:p-12 rounded-[2.5rem] shadow-[20px_20px_60px_#efefef] dark:shadow-none border border-white dark:border-zinc-700 hover:border-primary/20 transition-all duration-500 group"
          >
            <div className="mb-8 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight font-heading dark:text-zinc-100 mb-2">
                  Nova Credencial
                </h2>
                <div className="flex gap-2 mt-2">
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${step === 1 ? 'w-12 bg-primary' : 'w-4 bg-zinc-200 dark:bg-zinc-700'}`}></div>
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${step === 2 ? 'w-12 bg-primary' : 'w-4 bg-zinc-200 dark:bg-zinc-700'}`}></div>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="overflow-hidden mb-5"
                >
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 p-4 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-bold">{error}</p>
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
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">
                      Nome do Operador
                    </label>
                    <input 
                      type="text" 
                      {...formStep1.register("name")}
                      required
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary/30 focus:bg-white dark:focus:bg-zinc-800 transition-all outline-none dark:text-zinc-100 placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                      placeholder="Seu Nome Completo"
                    />
                    {formStep1.formState.errors.name && (
                      <p className="text-xs text-red-500 font-bold ml-2 mt-1">{formStep1.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">
                      E-mail Institucional
                    </label>
                    <input 
                      type="email" 
                      {...formStep1.register("email")}
                      required
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary/30 focus:bg-white dark:focus:bg-zinc-800 transition-all outline-none dark:text-zinc-100 placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                      placeholder="operador@creator.studio"
                    />
                    {formStep1.formState.errors.email && (
                      <p className="text-xs text-red-500 font-bold ml-2 mt-1">{formStep1.formState.errors.email.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-zinc-900 dark:bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] h-16 hover:bg-zinc-800 dark:hover:bg-primary-hover transition-all active:scale-95 font-heading flex items-center justify-center gap-4 group/btn mt-6"
                  >
                    {isLoading ? (
                      <span className="animate-pulse">Autenticando e-mail...</span>
                    ) : (
                      <>
                        Receber Código de Acesso
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-2 transition-transform" />
                      </>
                    )}
                  </Button>
                </motion.form>
              ) : (
                <motion.form 
                  key="step2"
                  onSubmit={formStep2.handleSubmit(onStep2Submit)}
                  noValidate
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-2xl flex items-start gap-3 mb-4">
                    <MailCheck className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">Verifique sua caixa de entrada</p>
                      <p className="text-xs opacity-80 mt-1">Enviamos um código de 6 dígitos para <strong>{userData.email}</strong></p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-2 mr-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        Código Recebido
                      </label>
                      <button
                        type="button"
                        onClick={handleResendToken}
                        disabled={countdown > 0 || isResending}
                        className="text-[10px] font-bold uppercase tracking-widest text-primary disabled:text-zinc-400 disabled:cursor-not-allowed hover:underline"
                      >
                        {countdown > 0 ? `Reenviar código (${countdown}s)` : "Reenviar código"}
                      </button>
                    </div>
                    <input 
                      type="text" 
                      {...formStep2.register("token")}
                      required
                      maxLength={6}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border-2 border-transparent rounded-2xl px-6 py-4 text-center text-xl tracking-[0.5em] font-black focus:border-primary/30 focus:bg-white dark:focus:bg-zinc-800 transition-all outline-none dark:text-zinc-100 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 font-mono"
                      placeholder="000000"
                    />
                    {formStep2.formState.errors.token && (
                      <p className="text-xs text-red-500 font-bold ml-2 mt-1">{formStep2.formState.errors.token.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">
                      Criar Senha de Acesso (Mínimo 6 caracteres)
                    </label>
                    <input 
                      type="password" 
                      {...formStep2.register("password")}
                      required
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary/30 focus:bg-white dark:focus:bg-zinc-800 transition-all outline-none dark:text-zinc-100 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 font-mono tracking-widest"
                      placeholder="••••••••"
                    />
                    {formStep2.formState.errors.password && (
                      <p className="text-xs text-red-500 font-bold ml-2 mt-1">{formStep2.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">
                      Confirmar Senha
                    </label>
                    <input 
                      type="password" 
                      {...formStep2.register("confirmPassword")}
                      required
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary/30 focus:bg-white dark:focus:bg-zinc-800 transition-all outline-none dark:text-zinc-100 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 font-mono tracking-widest"
                      placeholder="••••••••"
                    />
                    {formStep2.formState.errors.confirmPassword && (
                      <p className="text-xs text-red-500 font-bold ml-2 mt-1">{formStep2.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-zinc-900 dark:bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] h-16 hover:bg-zinc-800 dark:hover:bg-primary-hover transition-all active:scale-95 font-heading flex items-center justify-center gap-4 group/btn mt-6"
                  >
                    {isLoading ? (
                      <span className="animate-pulse">Validando Credencial...</span>
                    ) : (
                      <>
                        Confirmar e Acessar
                        <Zap className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
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
                      className="text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-primary transition-colors"
                    >
                      Voltar e corrigir e-mail
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="pt-6 text-center mt-4 border-t border-zinc-100 dark:border-zinc-700/50">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                Já é operador?{' '}
                <a href="/login" className="text-primary hover:underline hover:opacity-80 transition-all ml-1">
                  Iniciar Sessão
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
