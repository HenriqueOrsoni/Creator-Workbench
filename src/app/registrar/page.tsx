"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, AlertCircle, Plus, MailCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ThemeToggle } from "../../components/shared/ThemeToggle";
import { ThemeColorPicker } from "../../components/shared/ThemeColorPicker";

// ============================================================================
// BACK-END INTEGRATION MOCKS (A serem substituídos pela API real)
// ============================================================================
const requestRegistrationToken = async (data: { name: string; email: string }) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Quando o Back-End chegar, ele enviará o e-mail real aqui
      if (data.email.includes("@")) {
        resolve({ success: true, message: "Token enviado para o e-mail." });
      } else {
        reject(new Error("Formato de e-mail inválido."));
      }
    }, 1500);
  });
};

const verifyAndRegisterUser = async (data: { email: string; token: string; password: string }) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Quando o Back-End chegar, ele validará o token que o usuário digitou
      if (data.token === "123456") { // Mock de um token válido
        resolve({ token: "fake-jwt-token-123", user: { email: data.email, role: "Admin" } });
      } else {
        reject(new Error("Código de segurança inválido ou expirado. Tente '123456'."));
      }
    }, 1500);
  });
};
// ============================================================================

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2>(1);
  
  // Step 1 Data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  
  // Step 2 Data
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await requestRegistrationToken({ name, email });
      setStep(2); // Avança para a etapa 2 com uma animação
    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao tentar enviar o código.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await verifyAndRegisterUser({ email, token, password });
      
      // Simula o login automático do AuthGuard para ele entrar na plataforma
      document.cookie = "creator_auth_token=fake-jwt-token-123; path=/; max-age=86400";
      console.log("Cadastro de sucesso! Dados:", response);
      
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao tentar registrar.");
    } finally {
      setIsLoading(false);
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
                  onSubmit={handleRequestToken}
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
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary/30 focus:bg-white dark:focus:bg-zinc-800 transition-all outline-none dark:text-zinc-100 placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                      placeholder="Seu Nome Completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">
                      E-mail Institucional
                    </label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary/30 focus:bg-white dark:focus:bg-zinc-800 transition-all outline-none dark:text-zinc-100 placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                      placeholder="operador@creator.studio"
                    />
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
                  onSubmit={handleRegister}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-2xl flex items-start gap-3 mb-6">
                    <MailCheck className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">Verifique sua caixa de entrada</p>
                      <p className="text-xs opacity-80 mt-1">Enviamos um código de 6 dígitos para <strong>{email}</strong></p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">
                      Código Recebido (Use 123456 no teste)
                    </label>
                    <input 
                      type="text" 
                      value={token}
                      onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border-2 border-transparent rounded-2xl px-6 py-4 text-center text-xl tracking-[0.5em] font-black focus:border-primary/30 focus:bg-white dark:focus:bg-zinc-800 transition-all outline-none dark:text-zinc-100 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 font-mono"
                      placeholder="000000"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">
                      Criar Senha de Acesso
                    </label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary/30 focus:bg-white dark:focus:bg-zinc-800 transition-all outline-none dark:text-zinc-100 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 font-mono tracking-widest"
                      placeholder="••••••••"
                    />
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
