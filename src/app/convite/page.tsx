"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Zap, CheckCircle2, AlertCircle, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, getCookie } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";
import Link from "next/link";

interface InviteData {
  teamName: string;
  role: "ADMIN" | "CREATOR" | "REVIEWER";
  email: string;
  invitedByName: string;
  expiresAt: string;
}

export function ConviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const fetchTeams = useAppStore((state) => state.fetchTeams);
  const setActiveTeamId = useAppStore((state) => state.setActiveTeamId);

  const isLoggedIn = Boolean(getCookie("creator_auth_token"));

  useEffect(() => {
    if (!token) {
      setError("Token de convite não informado.");
      setLoading(false);
      return;
    }

    const loadInvite = async () => {
      try {
        const data = await apiRequest("GET", `/api/auth/invites/${token}`);
        if (data) {
          setInvite(data);
        }
      } catch (err) {
        setError((err as Error).message || "Convite inválido ou expirado.");
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [token]);

  const handleAcceptInvite = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const acceptedTeam = await apiRequest("POST", `/api/v1/invites/${token}/accept`);
      toast.success(`Você agora faz parte da equipe ${acceptedTeam?.name || "nova"}!`);
      await fetchTeams();
      if (acceptedTeam?.id) {
        await setActiveTeamId(acceptedTeam.id.toString());
      }
      router.push("/");
    } catch (err) {
      toast.error((err as Error).message || "Erro ao aceitar convite.");
      setAccepting(false);
    }
  };

  const getRoleLabel = (r: string) => {
    switch (r) {
      case "ADMIN":
        return "Administrador";
      case "CREATOR":
        return "Criador";
      case "REVIEWER":
        return "Revisor";
      default:
        return r;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Verificando convite de equipe...</p>
        </div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground font-sans">
        <Card className="max-w-md w-full p-8 rounded-2xl border-border bg-card shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold font-heading">Convite Inválido ou Expirado</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {error || "O link de convite acessado não é mais válido ou atingiu o prazo de 7 dias."}
          </p>
          <div className="pt-2">
            <Link href="/login">
              <Button className="w-full rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-foreground h-10 shadow-xs">
                Ir para a Página Inicial
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground font-sans">
      <Card className="max-w-md w-full p-8 rounded-2xl border-border bg-card shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
            <Zap className="w-6 h-6 fill-primary/20" />
          </div>
          <h1 className="text-2xl font-bold font-heading tracking-tight text-foreground">
            Convite para Equipe
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Você foi convidado por <strong className="text-foreground">{invite.invitedByName}</strong> para colaborar na produção pedagógica.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Equipe:</span>
            <span className="font-bold text-foreground font-heading">{invite.teamName}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Papel:</span>
            <Badge variant="outline" className="text-[10px] font-semibold uppercase bg-primary/10 text-primary border-primary/20">
              {getRoleLabel(invite.role)}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Destinatário:</span>
            <span className="font-medium text-foreground">{invite.email}</span>
          </div>
        </div>

        {isLoggedIn ? (
          <div className="space-y-3">
            <Button
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="w-full h-11 rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary hover:bg-primary-hover text-primary-foreground gap-2 shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              {accepting ? "Aceitando..." : "Aceitar Convite e Acessar"}
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              Você já está autenticado e o acesso será liberado imediatamente.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs text-center text-muted-foreground mb-1">
              Faça login com a conta <strong>{invite.email}</strong> para aceitar o convite:
            </p>
            <Link href={`/login?redirect=${encodeURIComponent(`/convite?token=${token}`)}`} className="block">
              <Button className="w-full h-10 rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary hover:bg-primary-hover text-primary-foreground gap-2 shadow-xs">
                <LogIn className="w-4 h-4" /> Entrar na Minha Conta
              </Button>
            </Link>
            <Link href={`/registrar?redirect=${encodeURIComponent(`/convite?token=${token}`)}`} className="block">
              <Button variant="outline" className="w-full h-10 rounded-lg text-xs font-semibold uppercase tracking-wider gap-2 border-border">
                <UserPlus className="w-4 h-4" /> Criar uma Nova Conta
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ConvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ConviteContent />
    </Suspense>
  );
}
