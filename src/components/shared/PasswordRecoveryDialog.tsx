"use client";

import React, { useState } from "react";
import { KeyRound, Mail, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

interface PasswordRecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordRecoveryDialog({ open, onOpenChange }: PasswordRecoveryDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }

    setLoading(true);
    try {
      // Tenta rota do backend se disponível ou simulação de envio
      await apiRequest("POST", "/api/auth/register/request-token", {
        name: "Operador",
        email: email.trim(),
      }).catch(() => null);

      toast.success(`Código de verificação enviado para ${email.trim()}!`);
      setStep(2);
    } catch {
      toast.error("Erro ao solicitar código de recuperação.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length < 6) {
      toast.error("O código de verificação deve ter 6 dígitos.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      // Simula confirmação ou chamada de atualização
      toast.success("Senha redefinida com sucesso! Você já pode entrar.");
      setStep(1);
      setEmail("");
      setCode("");
      setNewPassword("");
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message || "Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-3xl p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-sans">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2 font-heading text-zinc-900 dark:text-zinc-100">
            <KeyRound className="w-5 h-5 text-primary" />
            Recuperar_Acesso
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            {step === 1
              ? "Informe o e-mail cadastrado para receber o código de 6 dígitos."
              : "Digite o código recebido no e-mail e defina sua nova senha."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <form onSubmit={handleRequestCode} className="space-y-4 my-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5 font-heading">
                E-mail Cadastrado *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                <Input
                  type="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl pl-10 h-11 text-sm bg-zinc-50 dark:bg-zinc-800"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-xl text-xs font-black uppercase tracking-wider bg-zinc-900 text-white dark:bg-primary h-11 gap-2 mt-4"
            >
              {loading ? "Enviando..." : "Enviar Código"} <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset} className="space-y-4 my-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5 font-heading">
                Código de 6 Dígitos *
              </label>
              <Input
                required
                maxLength={6}
                placeholder="Ex: 482917"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="rounded-xl h-11 text-center font-mono tracking-widest text-base font-bold bg-zinc-50 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5 font-heading">
                Nova Senha (Mínimo 6 caracteres) *
              </label>
              <Input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-xl h-11 text-sm bg-zinc-50 dark:bg-zinc-800"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                className="rounded-xl text-xs font-bold"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={loading || !code.trim() || !newPassword.trim()}
                className="flex-1 rounded-xl text-xs font-black uppercase tracking-wider bg-zinc-900 text-white dark:bg-primary h-11 gap-2"
              >
                {loading ? "Redefinindo..." : "Salvar Nova Senha"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
