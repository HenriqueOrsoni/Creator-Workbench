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
      <DialogContent className="sm:max-w-[480px] rounded-xl p-6 bg-card border border-border shadow-lg font-sans">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
            <ListChecks className="w-4 h-4" /> Checklist de Tarefas
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground font-heading">
            {currentCard.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            O progresso do card é calculado automaticamente com base nas tarefas concluídas.
          </DialogDescription>
        </DialogHeader>

        {/* Barra de Progresso do Checklist */}
        <div className="my-3 p-3.5 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center justify-between text-xs font-medium mb-2">
            <span className="text-muted-foreground">
              {tasksDone} de {tasksTotal} tarefas concluídas
            </span>
            <span className="font-bold text-primary">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Lista de Tarefas */}
        <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-1 my-2">
          {tasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground font-medium">
              Nenhuma tarefa adicionada ainda. Adicione as etapas de produção abaixo!
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border group hover:border-primary/40 transition-all shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => toggleTask(currentCard.id, task.id)}
                  className="flex items-center gap-2.5 flex-1 text-left"
                >
                  {task.completed ? (
                    <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      task.completed
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {task.title}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTask(currentCard.id, task.id)}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive rounded-md transition-all"
                  title="Excluir tarefa"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Form Adicionar Tarefa */}
        <form onSubmit={handleAddTask} className="flex gap-2 pt-3 border-t border-border">
          <Input
            placeholder="Ex: Gravar áudio da intro, cortar silêncios..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="h-10 rounded-lg text-xs flex-1 border-border bg-background"
          />
          <Button
            type="submit"
            disabled={loading || !newTitle.trim()}
            className="rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 gap-1 px-4 h-10 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
