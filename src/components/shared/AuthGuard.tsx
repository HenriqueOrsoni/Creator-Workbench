"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const PUBLIC_ROUTES = ["/login", "/registrar"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const [isAuthorized, setIsAuthorized] = useState(isPublicRoute);

  useEffect(() => {
    const hasToken = document.cookie.includes("creator_auth_token");

    if (!hasToken && !isPublicRoute) {
      router.replace("/login");
    } else if (hasToken && isPublicRoute) {
      router.replace("/");
    } else {
      setIsAuthorized(true);
    }
  }, [pathname, router, isPublicRoute]);

  // Se não estiver autorizado (ou estiver no meio de um redirecionamento),
  // exibe uma tela preta para evitar o "piscar" da tela protegida
  if (!isAuthorized) {
    return <div className="min-h-screen bg-background text-zinc-400 flex items-center justify-center text-sm font-bold uppercase tracking-widest font-sans">Autenticando...</div>;
  }

  return <>{children}</>;
}
