"use client";

import React from "react";
import { Zap, Trash2, MoreVertical, Settings2, Layout, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useAppStore, KanbanItem } from "@/store/useAppStore";
import { IdeaDialog } from "./IdeaDialog";

interface ProjectListItemProps {
  project: KanbanItem;
}

const STATE_LABELS: Record<string, string> = {
  IDEATION: "IDEAÇÃO",
  IN_PRODUCTION: "EM PRODUÇÃO",
  REVIEW: "EM REVISÃO",
  DONE: "CONCLUÍDO",
};

export function ProjectListItem({ project }: ProjectListItemProps) {
  const deleteItem = useAppStore(state => state.deleteItem);
  const selectedProjectId = useAppStore(state => state.selectedProjectId);
  const setSelectedProjectId = useAppStore(state => state.setSelectedProjectId);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const isActive = selectedProjectId === project.id;

  return (
    <div className={`flex items-center justify-between p-6 bg-white dark:bg-zinc-800 rounded-2xl shadow-[10px_10px_30px_#efefef] dark:shadow-none dark:border group hover:shadow-primary/5 transition-all font-sans ${isActive ? 'border-primary/50 dark:border-primary/50 border-2' : 'border-transparent dark:border-zinc-700 border'}`}>
      <div className="flex items-center gap-4 text-left">
        <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-700 rounded-xl flex items-center justify-center text-zinc-900 dark:text-zinc-100 group-hover:bg-primary dark:group-hover:bg-primary group-hover:text-white transition-all duration-500">
          <Zap size={20} />
        </div>
        <div>
          <h4 className="font-black uppercase tracking-tight font-heading dark:text-zinc-100">{project.title}</h4>
          <Badge variant="outline" className="bg-zinc-50 dark:bg-zinc-800 border-none text-zinc-400 text-[8px] uppercase tracking-widest font-black">
            {STATE_LABELS[project.state] || project.state}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <div className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-1">Progresso {project.progress}%</div>
          <div className="w-24 h-1 bg-zinc-50 dark:bg-zinc-700 rounded-lg overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${project.progress}%` }} />
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-red-500/70 hover:text-red-600 h-10 w-10 transition-colors border border-red-500/10 hover:bg-red-50/50 dark:hover:bg-red-950/20"
          onClick={() => deleteItem(project.id)}
        >
          <Trash2 size={18} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" size="icon" className="text-zinc-300 hover:text-primary h-10 w-10 rounded-lg">
              <MoreVertical size={20} />
            </Button>
          } />
          <DropdownMenuContent className="bg-white border-zinc-100 rounded-xl shadow-xl p-2 min-w-[240px] font-sans">
            <DropdownMenuItem
              onSelect={() => setIsSettingsOpen(true)}
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-primary cursor-pointer rounded-lg transition-colors"
            >
              <Settings2 size={16} /> Configuração Estratégica
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-primary cursor-pointer rounded-lg transition-colors">
              <Layout size={16} /> Histórico de Versões
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-primary cursor-pointer rounded-lg transition-colors">
              <ArrowUpRight size={16} /> Exportar Roteiro
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-50 my-1" />
            <DropdownMenuItem className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-800 cursor-pointer rounded-lg transition-colors"
              onClick={() => deleteItem(project.id)}
            >
              <Trash2 size={16} /> Arquivar Produção
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <IdeaDialog
          id={project.id}
          title={project.title}
          targetAudience={project.targetAudience}
          pedagogicalObjective={project.pedagogicalObjective}
          mode="edit"
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
        />

        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-10 w-10 rounded-lg transition-colors ${isActive ? 'text-primary' : 'text-zinc-200 hover:text-primary'}`}
          onClick={() => setSelectedProjectId(project.id)}
        >
          <ArrowUpRight size={20} />
        </Button>
      </div>
    </div>
  );
}
