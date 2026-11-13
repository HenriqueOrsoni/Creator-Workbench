"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useAppStore, type ProjectCard } from "../../store/useAppStore";
import { Pencil, Layout, AlignLeft, Tag } from "lucide-react";

interface EditIdeaDialogProps {
  idea: ProjectCard | null;
  onOpenChange: (open: boolean) => void;
}

/** Edita uma ideia da caixa de entrada antes de converter: título (mínimo 3), descrição e etiqueta. */
export function EditIdeaDialog({ idea, onOpenChange }: EditIdeaDialogProps) {
  const updateIdea = useAppStore((state) => state.updateIdea);
  const teamTags = useAppStore((state) => state.teamTags);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [tagId, setTagId] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const ideaId = idea?.id;
  React.useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      setDescription(idea.description || "");
      setTagId(idea.tagId || "");
    }
    // Recarrega o formulário só quando abre outra ideia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaId]);

  const titleOk = title.trim().length >= 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea || !titleOk) return;
    setSaving(true);
    const saved = await updateIdea(idea.id, {
      title: title.trim(),
      description: description.trim(),
      // Etiqueta só vai quando mudou ("" remove)
      ...(tagId !== (idea.tagId || "") ? { tagId } : {}),
    });
    setSaving(false);
    // Só fecha quando o servidor aceitou; em caso de erro a mensagem já foi exibida
    if (saved) onOpenChange(false);
  };

  return (
    <Dialog open={Boolean(idea)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-xl p-4 sm:p-6 bg-card border border-border shadow-lg font-sans">
        <DialogHeader>
          <DialogTitle className="text-base font-bold tracking-tight flex items-center gap-2 font-heading">
            <Pencil className="w-4 h-4 text-primary" />
            Editar Ideia
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Ajuste título, descrição e etiqueta antes de converter a ideia em projeto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          <div>
            <label htmlFor="edit-idea-title" className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
              <Layout size={13} className="text-primary" />
              Título da Ideia *
            </label>
            <Input
              id="edit-idea-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg h-9 text-xs border-border bg-background"
            />
            {title.length > 0 && !titleOk && (
              <p className="mt-1 text-[11px] text-destructive">O título deve ter pelo menos 3 caracteres.</p>
            )}
          </div>

          <div>
            <label htmlFor="edit-idea-desc" className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
              <AlignLeft size={13} className="text-primary" />
              Descrição / Notas
            </label>
            <Textarea
              id="edit-idea-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-lg text-xs min-h-[75px] border-border bg-background"
            />
          </div>

          <div>
            <label htmlFor="edit-idea-tag" className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1">
              <Tag size={13} className="text-primary" />
              Etiqueta
            </label>
            <select
              id="edit-idea-tag"
              aria-label="Etiqueta"
              value={tagId}
              onChange={(e) => setTagId(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 h-9 text-xs font-medium text-foreground outline-none focus:border-primary"
            >
              <option value="">Sem etiqueta</option>
              {teamTags.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <DialogFooter className="pt-3 border-t mt-4 flex items-center justify-end gap-2 border-border">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-xs h-9 px-3 rounded-lg">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving || !titleOk}
              className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg text-xs h-9 px-4"
            >
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
