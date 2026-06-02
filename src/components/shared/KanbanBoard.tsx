"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  ArrowRight, 
  ArrowUpRight, 
  Settings2, 
  Trash2, 
  Target, 
  BookOpen, 
  BookOpenCheck
} from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useAppStore, KanbanItem } from "../../store/useAppStore";
import { IdeaDialog } from "./IdeaDialog";

interface KanbanBoardProps {
  onSelectTab?: (tab: string) => void;
}

const COLUMNS = [
  { 
    id: "IDEATION" as const, 
    title: "Ideação", 
    color: "bg-zinc-400 dark:bg-zinc-600", 
    border: "border-zinc-200 dark:border-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400"
  },
  { 
    id: "IN_PRODUCTION" as const, 
    title: "Em Produção", 
    color: "bg-amber-500", 
    border: "border-amber-200 dark:border-amber-900/50",
    text: "text-amber-600 dark:text-amber-500"
  },
  { 
    id: "REVIEW" as const, 
    title: "Em Revisão", 
    color: "bg-sky-500", 
    border: "border-sky-200 dark:border-sky-900/50",
    text: "text-sky-600 dark:text-sky-500"
  },
  { 
    id: "DONE" as const, 
    title: "Concluído", 
    color: "bg-emerald-500", 
    border: "border-emerald-200 dark:border-emerald-900/50",
    text: "text-emerald-600 dark:text-emerald-500"
  }
];

export function KanbanBoard({ onSelectTab }: KanbanBoardProps) {
  const { items, updateState, deleteItem, selectedProjectId, setSelectedProjectId } = useAppStore();
  const [activeConvertId, setActiveConvertId] = React.useState<string | null>(null);
  const [activeEditId, setActiveEditId] = React.useState<string | null>(null);
  const [selectedItemForDialog, setSelectedItemForDialog] = React.useState<KanbanItem | null>(null);

  const getItemsByColumn = (state: string) => {
    return items.filter(item => item.state === state);
  };

  const handleMoveLeft = async (item: KanbanItem) => {
    if (item.state === "DONE") {
      await updateState(item.id, "REVIEW");
    } else if (item.state === "REVIEW") {
      await updateState(item.id, "IN_PRODUCTION");
    } else if (item.state === "IN_PRODUCTION") {
      await updateState(item.id, "IDEATION");
    }
  };

  const handleMoveRight = async (item: KanbanItem) => {
    if (item.state === "IDEATION") {
      // Abre o modal de conversão
      setSelectedItemForDialog(item);
      setActiveConvertId(item.id);
    } else if (item.state === "IN_PRODUCTION") {
      await updateState(item.id, "REVIEW");
    } else if (item.state === "REVIEW") {
      await updateState(item.id, "DONE");
    }
  };

  const handleOpenEdit = (item: KanbanItem) => {
    setSelectedItemForDialog(item);
    setActiveEditId(item.id);
  };

  const handleSelectProject = (id: string, tab: string) => {
    setSelectedProjectId(id);
    if (onSelectTab) {
      onSelectTab(tab);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colItems = getItemsByColumn(col.id);
          return (
            <div 
              key={col.id}
              className="flex flex-col bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800 rounded-[32px] p-6 min-h-[500px] lg:min-h-[600px] transition-all hover:border-primary/5"
            >
              {/* Header da Coluna */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${col.color}`} />
                  <h3 className="font-black uppercase tracking-tight text-sm text-zinc-900 dark:text-zinc-100 font-heading">
                    {col.title}
                  </h3>
                </div>
                <Badge variant="outline" className="bg-zinc-100 dark:bg-zinc-800 border-none font-bold text-zinc-400 text-xs px-2.5 py-0.5 rounded-full">
                  {colItems.length}
                </Badge>
              </div>

              {/* Lista de Cards com Animação */}
              <div className="flex-1 flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {colItems.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex-1 flex items-center justify-center py-20 text-center text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest text-[9px] border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl"
                    >
                      Nenhum item
                    </motion.div>
                  ) : (
                    colItems.map((item) => {
                      const isActive = selectedProjectId === item.id;
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Card 
                            onClick={() => setSelectedProjectId(item.id)}
                            className={`cursor-pointer p-6 border-none dark:border bg-white dark:bg-zinc-800 shadow-[5px_5px_15px_rgba(240,240,240,0.5)] dark:shadow-none rounded-2xl hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 relative flex flex-col gap-4 group ${isActive ? 'ring-2 ring-primary' : 'dark:border-zinc-700'}`}
                          >
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-4">
                              <h4 className="font-black uppercase tracking-tight font-heading text-sm text-zinc-900 dark:text-zinc-100 break-all leading-tight line-clamp-2 flex-1">
                                {item.title}
                              </h4>
                              
                              <div className="flex items-center gap-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleOpenEdit(item)}
                                  className="h-8 w-8 text-zinc-400 hover:text-primary rounded-lg"
                                >
                                  <Settings2 size={14} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => deleteItem(item.id)}
                                  className="h-8 w-8 text-zinc-400 hover:text-red-500 rounded-lg"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>

                            {/* Card Description */}
                            {item.description && (
                              <p className="text-xs text-zinc-400 dark:text-zinc-400 font-medium break-all line-clamp-2">
                                {item.description}
                              </p>
                            )}

                            {/* Detalhes de Projetos (State != IDEATION) */}
                            {item.state !== "IDEATION" && (
                              <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-700/50">
                                {item.targetAudience && (
                                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                    <Target size={12} className="text-primary/50 shrink-0" />
                                    <span className="truncate">{item.targetAudience}</span>
                                  </div>
                                )}
                                
                                {item.pedagogicalObjective && (
                                  <div className="flex items-start gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                    <BookOpen size={12} className="text-primary/50 shrink-0 mt-0.5" />
                                    <span className="line-clamp-1">{item.pedagogicalObjective}</span>
                                  </div>
                                )}

                                {/* Barra de Progresso Real */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-zinc-300">
                                    <span>Progresso</span>
                                    <span>{item.progress}%</span>
                                  </div>
                                  <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-primary transition-all duration-300" 
                                      style={{ width: `${item.progress}%` }} 
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Card Actions */}
                            <div className="flex items-center justify-between gap-2 pt-2 mt-auto">
                              {/* Setas de Movimento de Status */}
                              <div className="flex items-center gap-1">
                                {item.state !== "IDEATION" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMoveLeft(item)}
                                    className="h-7 w-7 text-zinc-300 hover:text-primary rounded-md border border-zinc-100 dark:border-zinc-700"
                                    title="Mover para coluna anterior"
                                  >
                                    <ArrowLeft size={12} />
                                  </Button>
                                )}
                                
                                {item.state !== "DONE" && item.state !== "IDEATION" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMoveRight(item)}
                                    className="h-7 w-7 text-zinc-300 hover:text-primary rounded-md border border-zinc-100 dark:border-zinc-700"
                                    title="Mover para próxima coluna"
                                  >
                                    <ArrowRight size={12} />
                                  </Button>
                                )}
                              </div>

                              {/* Ações de Edição do Projeto Ativo (Roteiro e Matriz) */}
                              {item.state !== "IDEATION" && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSelectProject(item.id, "curriculum")}
                                    className="h-7 px-2.5 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary border-zinc-100 dark:border-zinc-700 rounded-lg flex items-center gap-1"
                                    title="Abrir Matriz Curricular"
                                  >
                                    Matriz
                                    <BookOpenCheck size={10} />
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSelectProject(item.id, "editor")}
                                    className="h-7 px-2.5 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary border-zinc-100 dark:border-zinc-700 rounded-lg flex items-center gap-1"
                                    title="Abrir Roteiro no Estúdio"
                                  >
                                    Roteiro
                                    <ArrowUpRight size={10} />
                                  </Button>
                                </div>
                              )}

                              {item.state === "IDEATION" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMoveRight(item)}
                                  className="h-7 px-3 text-[9px] font-black uppercase tracking-widest bg-zinc-900 hover:bg-primary hover:text-white dark:bg-zinc-700 text-white rounded-lg transition-colors border-none"
                                >
                                  Ativar Projeto
                                </Button>
                              )}
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Diálogos Globais do Kanban */}
      {selectedItemForDialog && activeConvertId && (
        <IdeaDialog
          id={selectedItemForDialog.id}
          title={selectedItemForDialog.title}
          targetAudience={selectedItemForDialog.targetAudience}
          pedagogicalObjective={selectedItemForDialog.pedagogicalObjective}
          mode="convert"
          open={activeConvertId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setActiveConvertId(null);
              setSelectedItemForDialog(null);
            }
          }}
        />
      )}

      {selectedItemForDialog && activeEditId && (
        <IdeaDialog
          id={selectedItemForDialog.id}
          title={selectedItemForDialog.title}
          targetAudience={selectedItemForDialog.targetAudience}
          pedagogicalObjective={selectedItemForDialog.pedagogicalObjective}
          mode="edit"
          open={activeEditId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setActiveEditId(null);
              setSelectedItemForDialog(null);
            }
          }}
        />
      )}
    </div>
  );
}
