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
      // O servidor responde igual para qualquer e-mail, sem revelar quais estão cadastrados
      await apiRequest("POST", "/api/auth/password/forgot", { email: email.trim() });
      toast.success("Se o e-mail estiver cadastrado, você receberá um código de 6 dígitos.");
      setStep(2);
    } catch (err) {
      toast.error((err as Error).message || "Erro ao solicitar código de recuperação.");
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
      await apiRequest("POST", "/api/auth/password/reset", {
        email: email.trim(),
        token: code.trim(),
        newPassword,
      });
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
      <DialogContent className="sm:max-w-[420px] rounded-xl p-6 bg-card border border-border shadow-lg font-sans">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 font-heading text-foreground">
            <KeyRound className="w-5 h-5 text-primary" />
            Recuperar_Acesso
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {step === 1
              ? "Informe o e-mail cadastrado para receber o código de 6 dígitos."
              : "Digite o código recebido no e-mail e defina sua nova senha."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <form onSubmit={handleRequestCode} className="space-y-4 my-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                E-mail Cadastrado *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  type="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg pl-9 h-10 text-sm border-border bg-background"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 h-10 gap-2 mt-4 shadow-xs"
            >
              {loading ? "Enviando..." : "Enviar Código"} <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset} className="space-y-4 my-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Código de 6 Dígitos *
              </label>
              <Input
                required
                maxLength={6}
                placeholder="Ex: 482917"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="rounded-lg h-10 text-center font-mono tracking-widest text-base font-semibold border-border bg-background"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Nova Senha (Mínimo 6 caracteres) *
              </label>
              <Input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-lg h-10 text-sm border-border bg-background"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                className="rounded-lg text-xs font-semibold h-10 px-4"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={loading || !code.trim() || !newPassword.trim()}
                className="flex-1 rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 h-10 gap-2 shadow-xs"
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
