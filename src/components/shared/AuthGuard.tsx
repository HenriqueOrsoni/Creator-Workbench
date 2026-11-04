"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";

const PUBLIC_ROUTES = ["/login", "/registrar", "/convite"];
const emptySubscribe = () => () => {};

function checkAuthToken(): boolean {
  if (typeof document === "undefined") return false;
  const match = document.cookie.match(/(?:^|;\s*)creator_auth_token=([^;]+)/);
  if (!match) return false;
  const token = match[1];
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        document.cookie = "creator_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const hasToken = useSyncExternalStore(
    emptySubscribe,
    checkAuthToken,
    () => false
  );

  useEffect(() => {
    if (!hasToken && !isPublicRoute) {
      router.replace("/login");
    } else if (hasToken && (pathname === "/login" || pathname === "/registrar")) {
      router.replace("/");
    }
  }, [pathname, router, isPublicRoute, hasToken]);

  if (!isClient) {
    return isPublicRoute ? <>{children}</> : <div className="min-h-screen bg-background text-muted-foreground flex items-center justify-center text-sm font-bold uppercase tracking-widest font-sans">Autenticando...</div>;
  }

  if (!hasToken && !isPublicRoute) {
    return <div className="min-h-screen bg-background text-muted-foreground flex items-center justify-center text-sm font-bold uppercase tracking-widest font-sans">Autenticando...</div>;
  }

  if (hasToken && (pathname === "/login" || pathname === "/registrar")) {
    return <div className="min-h-screen bg-background text-muted-foreground flex items-center justify-center text-sm font-bold uppercase tracking-widest font-sans">Carregando painel...</div>;
  }

  return <>{children}</>;
}
