"use client";

import React from "react";
import { CheckSquare, Square, Plus, Trash2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAppStore, ProjectCard } from "@/store/useAppStore";

interface CardTaskDialogProps {
  card: ProjectCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardTaskDialog({ card, open, onOpenChange }: CardTaskDialogProps) {
  const { createTask, toggleTask, deleteTask, board } = useAppStore();
  const [newTitle, setNewTitle] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Pega o card atualizado do board se disponível
  const currentCard = React.useMemo(() => {
    if (!card || !board) return card;
    for (const col of board.columns) {
      const found = col.cards.find(c => c.id === card.id);
      if (found) return found;
    }
    return card;
  }, [card, board]);

  if (!currentCard) return null;

  const tasks = currentCard.tasks || [];
  const tasksDone = currentCard.tasksDone || 0;
  const tasksTotal = currentCard.tasksTotal || tasks.length;
  const progressPercent = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setLoading(true);
    await createTask(currentCard.id, newTitle.trim());
    setNewTitle("");
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-3xl p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-sans">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-1">
            <ListChecks className="w-4 h-4" /> Checklist de Tarefas
          </div>
          <DialogTitle className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 font-heading">
            {currentCard.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            O progresso do card é calculado automaticamente com base nas tarefas concluídas.
          </DialogDescription>
        </DialogHeader>

        {/* Barra de Progresso do Checklist */}
        <div className="my-3 p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-zinc-600 dark:text-zinc-400">
              {tasksDone} de {tasksTotal} tarefas concluídas
            </span>
            <span className="font-black text-primary">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Lista de Tarefas */}
        <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1 my-2">
          {tasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400 font-medium">
              Nenhuma tarefa adicionada ainda. Adicione as etapas de produção abaixo!
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/50 group hover:border-zinc-300 dark:hover:border-zinc-600 transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleTask(currentCard.id, task.id)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  {task.completed ? (
                    <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-zinc-400 shrink-0" />
                  )}
                  <span
                    className={`text-xs font-bold ${
                      task.completed
                        ? "line-through text-zinc-400 dark:text-zinc-500"
                        : "text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {task.title}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTask(currentCard.id, task.id)}
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all"
                  title="Excluir tarefa"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Form Adicionar Tarefa */}
        <form onSubmit={handleAddTask} className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <Input
            placeholder="Ex: Gravar áudio da intro, cortar silêncios..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="h-10 rounded-xl text-xs flex-1"
          />
          <Button
            type="submit"
            disabled={loading || !newTitle.trim()}
            className="rounded-xl text-xs font-bold uppercase tracking-wider bg-zinc-900 text-white dark:bg-primary gap-1 px-4 h-10"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
