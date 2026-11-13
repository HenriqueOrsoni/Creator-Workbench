"use client";

import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogTrigger 
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useAppStore } from "../../store/useAppStore";
import { Plus, Sparkles, Layout, AlignLeft, Target, BookOpen, Tag } from "lucide-react";

interface CreateIdeaDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactElement;
}

export function CreateIdeaDialog({ open: openProp, onOpenChange, trigger }: CreateIdeaDialogProps) {
  const isControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = isControlled ? openProp : internalOpen;

  const setOpen = React.useCallback((val: boolean) => {
    if (isControlled) {
      onOpenChange?.(val);
    } else {
      setInternalOpen(val);
    }
  }, [isControlled, onOpenChange]);

  const { createInboxIdea, teamTags } = useAppStore();
  const [loading, setLoading] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [targetAudience, setTargetAudience] = React.useState("");
  const [pedagogicalObjective, setPedagogicalObjective] = React.useState("");
  const [tag, setTag] = React.useState("");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTargetAudience("");
    setPedagogicalObjective("");
    setTag("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 3) return;

    setLoading(true);
    try {
      const created = await createInboxIdea({
        title: title.trim(),
        description: description.trim(),
        targetAudience: targetAudience.trim() || undefined,
        pedagogicalObjective: pedagogicalObjective.trim() || undefined,
        // As etiquetas vêm do servidor; o card guarda o id da etiqueta
        tagId: tag ? Number(tag) : undefined,
      });

      // Só limpa e fecha quando o servidor criou a ideia; em caso de erro a mensagem já foi exibida
      if (created) {
        resetForm();
        setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : !isControlled ? (
        <DialogTrigger render={
          <Button
            aria-label="Nova ideia"
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg px-3.5 h-9 text-xs tracking-wide shadow-xs transition-colors flex items-center gap-1.5 font-sans"
          >
            <Plus size={16} /> Nova Ideia
          </Button>
        } />
      ) : null}

      <DialogContent className="sm:max-w-[500px] bg-card border border-border text-foreground shadow-lg rounded-xl font-sans p-6">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border">
          <DialogTitle className="text-base font-bold tracking-tight flex items-center gap-2 font-heading text-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            Capturar Nova Ideia
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Registre um insight na Caixa de Entrada antes de estruturá-lo em projeto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-3">
          <div>
            <label htmlFor="idea-title" className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
              <Layout size={13} className="text-primary" />
              Título da Ideia *
            </label>
            <Input 
              id="idea-title"
              required
              placeholder="Ex: Minicurso sobre Algoritmos de Busca" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg h-9 text-xs border-border bg-background"
            />
          </div>

          <div>
            <label htmlFor="idea-desc" className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
              <AlignLeft size={13} className="text-primary" />
              Descrição / Notas
            </label>
            <Textarea 
              id="idea-desc"
              placeholder="Anotações rápidas sobre tópicos, referências ou formatos..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-lg text-xs min-h-[75px] border-border bg-background"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="idea-audience" className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
                <Target size={13} className="text-primary" />
                Público-Alvo
              </label>
              <Input 
                id="idea-audience"
                placeholder="Ex: Iniciantes em CS" 
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="rounded-lg h-9 text-xs border-border bg-background"
              />
            </div>

            <div>
              <label htmlFor="idea-objective" className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
                <BookOpen size={13} className="text-primary" />
                Objetivo Pedagógico
              </label>
              <Input 
                id="idea-objective"
                placeholder="Ex: Compreender BFS e DFS" 
                value={pedagogicalObjective}
                onChange={(e) => setPedagogicalObjective(e.target.value)}
                className="rounded-lg h-9 text-xs border-border bg-background"
              />
            </div>
          </div>

          <div>
            <label htmlFor="idea-tag" className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
              <Tag size={13} className="text-primary" />
              Etiqueta
            </label>
            <select
              id="idea-tag"
              aria-label="Etiqueta"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 h-9 text-xs font-medium text-foreground outline-none focus:border-primary"
            >
              <option value="">Sem etiqueta</option>
              {teamTags.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <DialogFooter className="pt-3 border-t mt-4 flex items-center justify-end gap-2 border-border">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
              className="text-xs h-9 px-3 rounded-lg text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !title.trim() || title.trim().length < 3}
              aria-label="Guardar na Inbox (Salvar Ideia)"
              className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg text-xs h-9 px-4 transition-colors"
            >
              {loading ? "Salvando..." : "Guardar na Inbox"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
