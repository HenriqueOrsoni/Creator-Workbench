"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";

const PUBLIC_ROUTES = ["/login", "/registrar"];
const emptySubscribe = () => () => {};

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const hasToken = useSyncExternalStore(
    emptySubscribe,
    () => document.cookie.includes("creator_auth_token"),
    () => false
  );

  useEffect(() => {
    if (!hasToken && !isPublicRoute) {
      router.replace("/login");
    } else if (hasToken && isPublicRoute) {
      router.replace("/");
    }
  }, [pathname, router, isPublicRoute, hasToken]);

  if (!isClient) {
    return isPublicRoute ? <>{children}</> : <div className="min-h-screen bg-background text-zinc-400 flex items-center justify-center text-sm font-bold uppercase tracking-widest font-sans">Autenticando...</div>;
  }

  if (!hasToken && !isPublicRoute) {
    return <div className="min-h-screen bg-background text-zinc-400 flex items-center justify-center text-sm font-bold uppercase tracking-widest font-sans">Autenticando...</div>;
  }

  if (hasToken && isPublicRoute) {
    return <div className="min-h-screen bg-background text-zinc-400 flex items-center justify-center text-sm font-bold uppercase tracking-widest font-sans">Carregando painel...</div>;
  }

  return <>{children}</>;
}
