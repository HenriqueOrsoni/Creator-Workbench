"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, MoreVertical, Settings2, Layout, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { useAppStore, KanbanItem } from "@/store/useAppStore";
import { IdeaDialog } from "./IdeaDialog";

interface CreativeIdeaCardProps {
  idea: KanbanItem;
  delay?: number;
}

export function CreativeIdeaCard({ idea, delay = 0 }: CreativeIdeaCardProps) {
  const deleteItem = useAppStore(state => state.deleteItem);
  const [isEditing, setIsEditing] = React.useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5, delay }}
      className="group font-sans h-full"
    >
      <Card className="p-8 border-none dark:border dark:border-zinc-700 shadow-[20px_20px_60px_#efefef] dark:shadow-none rounded-2xl bg-white dark:bg-zinc-800 hover:shadow-primary/10 dark:hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 h-full relative flex flex-col">
        <div className="absolute top-6 right-6">
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-300 hover:text-primary rounded-lg">
                <MoreVertical size={20} />
              </Button>
            } />
            <DropdownMenuContent className="bg-white border-zinc-100 rounded-xl shadow-xl p-2 min-w-[240px] font-sans">
              <DropdownMenuItem
                onSelect={() => setIsEditing(true)}
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:text-primary cursor-pointer rounded-lg transition-colors"
              >
                <Settings2 size={16} /> Configuração Estratégica
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-300 cursor-not-allowed rounded-lg opacity-50">
                <Layout size={16} /> Ver Brainstorm
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <IdeaDialog
            id={idea.id}
            title={idea.title}
            mode="convert"
            open={isEditing}
            onOpenChange={setIsEditing}
          />
        </div>

        <div className="space-y-6 text-left flex-1">
          <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-700 rounded-xl flex items-center justify-center text-zinc-900 dark:text-zinc-100 group-hover:bg-primary dark:group-hover:bg-primary group-hover:text-white transition-all duration-500">
            <Sparkles size={24} />
          </div>
          <h3 className={`font-black uppercase tracking-tight leading-tight font-heading dark:text-zinc-100 break-words line-clamp-2 min-h-[3.5rem] ${idea.title.length > 30 ? 'text-xl' : 'text-2xl'}`}>
            {idea.title.length > 60 ? `${idea.title.slice(0, 60)}...` : idea.title}
          </h3>
          <p className="text-xs text-zinc-400 font-medium line-clamp-2 break-words">{idea.description || "Nenhuma descrição fornecida."}</p>
        </div>

        <div className="flex gap-2 w-full mt-8">
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500/70 hover:text-red-600 h-11 w-11 rounded-lg transition-colors border border-red-500/10 hover:bg-red-50/50 dark:hover:bg-red-950/20"
            onClick={() => deleteItem(idea.id)}
          >
            <Trash2 size={20} />
          </Button>
          <Button
            className="flex-1 bg-zinc-900 dark:bg-zinc-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] px-8 h-12 hover:bg-primary dark:hover:bg-primary transition-all active:scale-95 font-heading dark:border dark:border-zinc-600"
            onClick={() => setIsEditing(true)}
          >
            Ativar Projeto
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
