"use client";

import React from "react";
import { Menu, Zap, Layout, Sparkles, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThemeColorPicker } from "./ThemeColorPicker";
import { ThemeToggle } from "./ThemeToggle";
import { CreateIdeaDialog } from "./CreateIdeaDialog";
import { UserSettingsDialog } from "./UserSettingsDialog";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full h-[88px] border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-950/50 backdrop-blur-md z-50 flex items-center justify-between px-6 lg:px-12 font-sans">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger render={
            <Button variant="ghost" size="icon" className="-ml-3 mr-4 h-12 w-12 text-zinc-400 hover:text-primary transition-colors">
              <Menu size={28} />
            </Button>
          } />
          <SheetContent side="left" className="bg-white dark:bg-zinc-900 border-none dark:border-r dark:border-zinc-800 p-8 flex flex-col gap-8 w-[300px] shadow-2xl rounded-r-[40px]">
            <SheetHeader>
              <SheetTitle className="text-xl font-black uppercase tracking-tighter text-zinc-900 dark:text-zinc-100 flex items-center gap-3 font-heading">
                <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                Menu<span className="text-primary">_CR</span>
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-2 flex-1 mt-8">
              <Button variant="ghost" className="justify-start text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-primary hover:bg-zinc-50 dark:hover:bg-zinc-800 h-12 rounded-2xl">
                <Layout size={16} className="mr-4" /> Dashboard Geral
              </Button>
              <Button variant="ghost" className="justify-start text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-primary hover:bg-zinc-50 dark:hover:bg-zinc-800 h-12 rounded-2xl">
                <Sparkles size={16} className="mr-4" /> Ideação
              </Button>
              <UserSettingsDialog
                trigger={
                  <Button variant="ghost" className="w-full justify-start text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-primary hover:bg-zinc-50 dark:hover:bg-zinc-800 h-12 rounded-2xl">
                    <Settings2 size={16} className="mr-4" /> Configurações
                  </Button>
                }
              />
            </div>
            <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 px-4">Personalização</div>
              <div className="flex items-center gap-4 px-4 mb-6">
                <ThemeColorPicker />
                <ThemeToggle />
              </div>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 h-12 rounded-2xl" 
                onClick={() => { document.cookie = 'creator_auth_token=; Max-Age=0; path=/'; window.location.href = '/login'; }}
              >
                <Trash2 size={16} className="mr-4" /> Encerrar Sessão
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hidden sm:flex">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-black tracking-tighter uppercase font-heading dark:text-zinc-100">
          Workbench<span className="text-primary">_CR</span>
        </span>
      </div>

      <div className="flex items-center gap-4 md:gap-8">
        <button className="hidden sm:block text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors font-sans">Ideação</button>
        <button className="hidden sm:block text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors font-sans">Produção</button>
        <CreateIdeaDialog
          trigger={
            <Button className="bg-zinc-900 dark:bg-primary dark:text-white hover:bg-zinc-800 dark:hover:bg-primary-hover text-white rounded-2xl px-8 font-bold uppercase text-xs tracking-[0.2em] transition-all hover:scale-105 active:scale-95 font-heading">
              Capturar Ideia
            </Button>
          }
        />
      </div>
    </nav>
  );
}
