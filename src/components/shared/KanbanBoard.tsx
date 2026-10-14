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
  BookOpenCheck,
  ListChecks,
  Plus,
  Calendar
} from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { useAppStore, KanbanItem, ProjectCard } from "../../store/useAppStore";
import { IdeaDialog } from "./IdeaDialog";
import { CardTaskDialog } from "./CardTaskDialog";

interface KanbanBoardProps {
  onSelectTab?: (tab: string) => void;
}

const LEGACY_COLUMNS = [
  { 
    id: "IDEATION", 
    title: "Ideação", 
    color: "bg-zinc-400 dark:bg-zinc-600", 
    border: "border-zinc-200 dark:border-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400"
  },
  { 
    id: "IN_PRODUCTION", 
    title: "Em Produção", 
    color: "bg-amber-500", 
    border: "border-amber-200 dark:border-amber-900/50",
    text: "text-amber-600 dark:text-amber-500"
  },
  { 
    id: "REVIEW", 
    title: "Em Revisão", 
    color: "bg-sky-500", 
    border: "border-sky-200 dark:border-sky-900/50",
    text: "text-sky-600 dark:text-sky-500"
  },
  { 
    id: "DONE", 
    title: "Concluído", 
    color: "bg-emerald-500", 
    border: "border-emerald-200 dark:border-emerald-900/50",
    text: "text-emerald-600 dark:text-emerald-500"
  }
];

export function KanbanBoard({ onSelectTab }: KanbanBoardProps) {
  const {
    items,
    board,
    updateState,
    deleteItem,
    moveCard,
    deleteCard,
    addColumn,
    selectedProjectId,
    setSelectedProjectId
  } = useAppStore();

  const [activeConvertId, setActiveConvertId] = React.useState<string | null>(null);
  const [activeEditId, setActiveEditId] = React.useState<string | null>(null);
  const [selectedItemForDialog, setSelectedItemForDialog] = React.useState<KanbanItem | null>(null);
  const [itemToDelete, setItemToDelete] = React.useState<KanbanItem | null>(null);
  const [selectedCardForTasks, setSelectedCardForTasks] = React.useState<ProjectCard | null>(null);

  const [openAddColumn, setOpenAddColumn] = React.useState(false);
  const [newColumnName, setNewColumnName] = React.useState("");

  // Determina se usamos o quadro dinâmico do backend ou o fallback legado
  const useDynamicColumns = Boolean(board && board.columns && board.columns.length > 0);

  const dynamicColumns = React.useMemo(() => {
    if (!useDynamicColumns || !board) {
      return LEGACY_COLUMNS.map(col => ({
        id: col.id,
        name: col.title,
        color: col.color,
        cards: items.filter(i => i.state === col.id)
      }));
    }

    const colors = ["bg-amber-500", "bg-sky-500", "bg-emerald-500", "bg-rose-500", "bg-indigo-500"];
    return board.columns.map((col, idx) => ({
      id: col.id,
      name: col.name,
      color: colors[idx % colors.length],
      cards: col.cards.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        state: (col.name === "Concluído" ? "DONE" : "IN_PRODUCTION") as KanbanItem["state"],
        createdAt: new Date(c.createdAt).getTime(),
        targetAudience: c.targetAudience,
        pedagogicalObjective: c.pedagogicalObjective,
        progress: c.progress,
        tasksTotal: c.tasksTotal,
        tasksDone: c.tasksDone,
        columnId: col.id,
        rawCard: c
      }))
    }));
  }, [useDynamicColumns, board, items]);

interface BoardCardItem extends KanbanItem {
  columnId?: string;
  rawCard?: ProjectCard;
}

  const handleMoveLeft = async (item: BoardCardItem, colIndex: number) => {
    if (useDynamicColumns && colIndex > 0) {
      const prevCol = dynamicColumns[colIndex - 1];
      await moveCard(item.id, prevCol.id);
      return;
    }

    if (item.state === "DONE") {
      await updateState(item.id, "REVIEW");
    } else if (item.state === "REVIEW") {
      await updateState(item.id, "IN_PRODUCTION");
    } else if (item.state === "IN_PRODUCTION") {
      await updateState(item.id, "IDEATION");
    }
  };

  const handleMoveRight = async (item: BoardCardItem, colIndex: number) => {
    if (useDynamicColumns && colIndex < dynamicColumns.length - 1) {
      const nextCol = dynamicColumns[colIndex + 1];
      await moveCard(item.id, nextCol.id);
      return;
    }

    if (item.state === "IDEATION") {
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

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    if (useDynamicColumns) {
      await deleteCard(itemToDelete.id);
    } else {
      await deleteItem(itemToDelete.id);
    }
    setItemToDelete(null);
  };

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;

    await addColumn(newColumnName.trim());
    setNewColumnName("");
    setOpenAddColumn(false);
  };

  const openTaskChecklist = (card: BoardCardItem) => {
    const projectCard: ProjectCard = card.rawCard || {
      id: card.id,
      title: card.title,
      description: card.description,
      type: "PROJECT",
      sortOrder: 0,
      progress: card.progress,
      tasksTotal: card.tasksTotal || 0,
      tasksDone: card.tasksDone || 0,
      createdAt: new Date().toISOString()
    };
    setSelectedCardForTasks(projectCard);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Barra Superior do Quadro Dinâmico */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs font-bold uppercase tracking-wider py-1 px-3 bg-white/70 dark:bg-zinc-800/70">
            {board ? board.teamName : "Quadro Geral"}
          </Badge>
          <span className="text-xs text-zinc-400 font-medium">
            {dynamicColumns.reduce((acc, col) => acc + col.cards.length, 0)} cards em produção
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpenAddColumn(true)}
          className="rounded-xl text-xs font-bold uppercase tracking-wider gap-1.5 h-9 border-dashed"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar Coluna
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start overflow-x-auto pb-4">
        {dynamicColumns.map((col, colIndex) => {
          const colItems = col.cards;
          return (
            <div 
              key={col.id}
              className="flex flex-col bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800 rounded-[32px] p-6 min-h-[500px] lg:min-h-[600px] transition-all hover:border-primary/5"
            >
              {/* Header da Coluna */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${col.color || "bg-primary"}`} />
                  <h3 className="font-black uppercase tracking-tight text-sm text-zinc-900 dark:text-zinc-100 font-heading">
                    {col.name}
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
                                  onClick={() => setItemToDelete(item)}
                                  className="h-8 w-8 text-zinc-400 hover:text-red-500 rounded-lg"
                                  title="Excluir item"
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

                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400">
                                  <Calendar size={11} className="text-zinc-400 shrink-0" />
                                  <span>{new Date(item.createdAt).toLocaleDateString("pt-BR")}</span>
                                </div>

                                {/* Barra de Progresso Real Calculada */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-zinc-400">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openTaskChecklist(item);
                                      }}
                                      className="flex items-center gap-1 hover:text-primary transition-colors text-left"
                                      title="Abrir checklist de tarefas"
                                    >
                                      <ListChecks size={11} className="text-primary" />
                                      <span>
                                        {item.tasksTotal ? `${item.tasksDone}/${item.tasksTotal} tarefas` : "Tarefas"}
                                      </span>
                                    </button>
                                    <span>{item.progress}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
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
                                {(colIndex > 0 || item.state !== "IDEATION") && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMoveLeft(item, colIndex)}
                                    className="h-7 w-7 text-zinc-300 hover:text-primary rounded-md border border-zinc-100 dark:border-zinc-700"
                                    title="Mover para coluna anterior"
                                  >
                                    <ArrowLeft size={12} />
                                  </Button>
                                )}
                                
                                {(colIndex < dynamicColumns.length - 1 || item.state !== "DONE") && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMoveRight(item, colIndex)}
                                    className="h-7 w-7 text-zinc-300 hover:text-primary rounded-md border border-zinc-100 dark:border-zinc-700"
                                    title="Mover para próxima coluna"
                                  >
                                    <ArrowRight size={12} />
                                  </Button>
                                )}
                              </div>

                              {/* Ação Principal Dependente do Status */}
                              {item.state === "IDEATION" ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedItemForDialog(item);
                                    setActiveConvertId(item.id);
                                  }}
                                  className="h-8 px-3 text-[10px] font-black uppercase tracking-wider text-primary hover:bg-primary/5 rounded-xl border border-primary/20 gap-1.5"
                                >
                                  <span>Ativar Projeto</span>
                                  <ArrowUpRight size={12} />
                                </Button>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openTaskChecklist(item);
                                    }}
                                    className="h-7 w-7 text-zinc-400 hover:text-primary rounded-md border border-zinc-100 dark:border-zinc-700"
                                    title="Tarefas do card"
                                  >
                                    <ListChecks size={12} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (onSelectTab) onSelectTab("curriculum");
                                    }}
                                    className="h-7 px-2 text-[9px] font-bold uppercase tracking-wider text-zinc-400 hover:text-primary rounded-md border border-zinc-100 dark:border-zinc-700 gap-1"
                                    title="Abrir Matriz Curricular"
                                  >
                                    <BookOpenCheck size={11} />
                                  </Button>
                                </div>
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

      {/* Checklist de Tarefas do Card */}
      <CardTaskDialog
        card={selectedCardForTasks}
        open={Boolean(selectedCardForTasks)}
        onOpenChange={(open) => !open && setSelectedCardForTasks(null)}
      />

      {/* Modal de Conversão e Edição de Ideias */}
      {selectedItemForDialog && (
        <IdeaDialog
          item={selectedItemForDialog}
          mode={activeConvertId ? "convert" : "edit"}
          open={Boolean(activeConvertId || activeEditId)}
          onOpenChange={(open) => {
            if (!open) {
              setActiveConvertId(null);
              setActiveEditId(null);
              setSelectedItemForDialog(null);
            }
          }}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={Boolean(itemToDelete)} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 font-heading">
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Tem certeza que deseja remover o item &quot;{itemToDelete?.title}&quot;? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setItemToDelete(null)}
              className="rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              className="rounded-xl text-xs font-bold uppercase tracking-wider"
            >
              Sim, Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar Coluna */}
      <Dialog open={openAddColumn} onOpenChange={setOpenAddColumn}>
        <DialogContent className="sm:max-w-[380px] rounded-3xl p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <form onSubmit={handleCreateColumn}>
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 font-heading">
                <Plus className="w-5 h-5 text-primary" />
                Nova Coluna no Quadro
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Personalize as etapas de produção da sua equipe.
              </DialogDescription>
            </DialogHeader>

            <div className="my-5">
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                Nome da Coluna *
              </label>
              <Input
                required
                placeholder="Ex: Roteirização, Pós-Produção, Dublagem"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                className="rounded-xl h-11 text-sm"
                autoFocus
              />
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpenAddColumn(false)} className="rounded-xl text-xs font-bold">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!newColumnName.trim()}
                className="rounded-xl text-xs font-bold uppercase tracking-wider bg-zinc-900 text-white dark:bg-primary"
              >
                Criar Coluna
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
