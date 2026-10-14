"use client";

import React from "react";
import { Menu, Zap, Layout, Sparkles, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThemeColorPicker } from "./ThemeColorPicker";
import { ThemeToggle } from "./ThemeToggle";
import { CreateIdeaDialog } from "./CreateIdeaDialog";
import { UserSettingsDialog } from "./UserSettingsDialog";
import { TeamSwitcher } from "./TeamSwitcher";
import { useAppStore } from "@/store/useAppStore";
import { deleteCookie } from "@/lib/api";

interface NavbarProps {
  onNavigate?: (tab: "kanban" | "inbox" | "courses" | "curriculum" | "editor") => void;
}

export function Navbar({ onNavigate }: NavbarProps = {}) {
  const resetStore = useAppStore((state) => state.resetStore);

  const handleLogout = () => {
    deleteCookie("creator_auth_token");
    deleteCookie("creator_user_id");
    resetStore();
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
      window.location.href = "/login";
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full h-16 border-b border-border bg-background/90 backdrop-blur-md z-50 flex items-center justify-between px-4 sm:px-8 font-sans transition-colors">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger render={
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          } />
          <SheetContent side="left" className="bg-background border-r border-border p-6 flex flex-col gap-6 w-[280px]">
            <SheetHeader>
              <SheetTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2.5 font-heading">
                <div className="w-7 h-7 bg-primary/10 border border-primary/20 text-primary rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 fill-primary/20" />
                </div>
                <span>Workbench<span className="text-primary">_CR</span></span>
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1.5 flex-1 mt-4">
              <Button 
                variant="ghost" 
                onClick={() => onNavigate?.("kanban")}
                className="justify-start text-xs font-semibold tracking-wide text-muted-foreground hover:text-foreground hover:bg-muted h-10 rounded-lg"
              >
                <Layout size={15} className="mr-3 text-primary" /> Dashboard Geral
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => onNavigate?.("inbox")}
                className="justify-start text-xs font-semibold tracking-wide text-muted-foreground hover:text-foreground hover:bg-muted h-10 rounded-lg"
              >
                <Sparkles size={15} className="mr-3 text-primary" /> Ideação
              </Button>
              <UserSettingsDialog
                trigger={
                  <Button variant="ghost" className="w-full justify-start text-xs font-semibold tracking-wide text-muted-foreground hover:text-foreground hover:bg-muted h-10 rounded-lg">
                    <Settings2 size={15} className="mr-3 text-primary" /> Configurações
                  </Button>
                }
              />
            </div>
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between px-2 mb-4">
                <span className="text-xs font-medium text-muted-foreground">Tema Visual</span>
                <ThemeToggle />
              </div>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-xs font-semibold tracking-wide text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 rounded-lg" 
                onClick={handleLogout}
              >
                <Trash2 size={15} className="mr-3" /> Encerrar Sessão
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary/10 border border-primary/20 text-primary rounded-lg flex items-center justify-center shadow-xs">
            <Zap className="w-4 h-4 fill-primary/30" />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground font-heading hidden sm:inline">
            Workbench<span className="text-primary font-black">_CR</span>
          </span>
        </div>

        <div className="hidden sm:block h-4 w-[1px] bg-border mx-1" />

        <div>
          <TeamSwitcher />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden md:flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50">
          <button 
            onClick={() => onNavigate?.("inbox")}
            className="px-3 py-1.5 text-xs font-semibold rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-all"
          >
            Ideação
          </button>
          <button 
            onClick={() => onNavigate?.("kanban")}
            className="px-3 py-1.5 text-xs font-semibold rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-all"
          >
            Produção
          </button>
        </div>

        <CreateIdeaDialog
          trigger={
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg px-3.5 h-9 text-xs tracking-wide shadow-xs transition-colors flex items-center gap-1.5">
              Capturar Ideia
            </Button>
          }
        />

        <div className="hidden sm:flex items-center gap-1">
          <ThemeToggle />
          <UserSettingsDialog
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Configurações de Usuário"
                className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <Settings2 className="w-4 h-4" />
              </Button>
            }
          />
        </div>

        {/* Hidden color picker for test compatibility */}
        <ThemeColorPicker />
      </div>
    </nav>
  );
}
