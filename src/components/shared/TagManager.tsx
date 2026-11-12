"use client";

import React from "react";
import { Tag, Trash2, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAppStore, TeamTag } from "@/store/useAppStore";
import { canManageTags } from "@/lib/roles";

const DEFAULT_COLOR = "#2E7D32";
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * Gestão de etiquetas da equipe (criar, renomear, mudar a cor e excluir).
 * Aparece somente para o Administrador; os demais papéis apenas usam as etiquetas nos cards.
 */
export function TagManager() {
  const { activeTeam, teamTags, createTeamTag, updateTeamTag, deleteTeamTag } = useAppStore();
  const [newName, setNewName] = React.useState("");
  const [newColor, setNewColor] = React.useState(DEFAULT_COLOR);
  const [creating, setCreating] = React.useState(false);
  const [drafts, setDrafts] = React.useState<Record<string, { name: string; color: string }>>({});
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [tagToDelete, setTagToDelete] = React.useState<TeamTag | null>(null);

  if (!canManageTags(activeTeam?.role)) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !HEX_COLOR.test(newColor)) return;
    setCreating(true);
    const created = await createTeamTag(newName.trim(), newColor);
    setCreating(false);
    if (created) {
      setNewName("");
      setNewColor(DEFAULT_COLOR);
    }
  };

  const draftOf = (tag: TeamTag) => drafts[tag.id] ?? { name: tag.name, color: tag.color };

  const handleSave = async (tag: TeamTag) => {
    const draft = draftOf(tag);
    const updates: { name?: string; color?: string } = {};
    if (draft.name.trim() !== tag.name) updates.name = draft.name.trim();
    if (draft.color.toLowerCase() !== tag.color.toLowerCase()) updates.color = draft.color;
    if (Object.keys(updates).length === 0) return;

    setSavingId(tag.id);
    const ok = await updateTeamTag(tag.id, updates);
    setSavingId(null);
    if (ok) {
      setDrafts(prev => {
        const next = { ...prev };
        delete next[tag.id];
        return next;
      });
    }
  };

  const confirmDelete = async () => {
    if (!tagToDelete) return;
    const ok = await deleteTeamTag(tagToDelete.id);
    if (ok) setTagToDelete(null);
  };

  return (
    <div className="space-y-3" data-testid="tag-manager">
      <form onSubmit={handleCreate} className="p-3.5 rounded-lg bg-muted/30 border border-border space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
          <Tag className="w-3.5 h-3.5 text-primary" />
          Nova Etiqueta
        </div>
        <div className="flex gap-2">
          <Input
            aria-label="Nome da nova etiqueta"
            placeholder="Ex: Webinar"
            maxLength={40}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-9 text-xs rounded-lg flex-1 border-border bg-background"
          />
          <input
            type="color"
            aria-label="Cor da nova etiqueta"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-9 w-12 rounded-lg border border-border bg-background cursor-pointer p-1"
          />
          <Button
            type="submit"
            disabled={creating || !newName.trim()}
            className="h-9 rounded-lg text-xs font-semibold px-3 bg-primary text-primary-foreground hover:bg-primary-hover gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> {creating ? "Criando..." : "Criar"}
          </Button>
        </div>
      </form>

      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
        {teamTags.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground font-medium">
            Nenhuma etiqueta cadastrada.
          </div>
        ) : (
          teamTags.map((tag) => {
            const draft = draftOf(tag);
            const changed = draft.name.trim() !== tag.name || draft.color.toLowerCase() !== tag.color.toLowerCase();
            return (
              <div
                key={tag.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border shadow-2xs"
              >
                <input
                  type="color"
                  aria-label={`Cor da etiqueta ${tag.name}`}
                  value={draft.color}
                  onChange={(e) => setDrafts(prev => ({ ...prev, [tag.id]: { ...draftOf(tag), color: e.target.value } }))}
                  className="h-8 w-10 rounded-md border border-border bg-background cursor-pointer p-0.5"
                />
                <Input
                  aria-label={`Nome da etiqueta ${tag.name}`}
                  maxLength={40}
                  value={draft.name}
                  onChange={(e) => setDrafts(prev => ({ ...prev, [tag.id]: { ...draftOf(tag), name: e.target.value } }))}
                  className="h-8 text-xs rounded-md flex-1 border-border bg-background"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!changed || !draft.name.trim() || savingId === tag.id}
                  onClick={() => handleSave(tag)}
                  className="h-8 w-8 text-muted-foreground hover:text-primary rounded-md disabled:opacity-30"
                  title="Salvar etiqueta"
                  aria-label={`Salvar etiqueta ${tag.name}`}
                >
                  <Save className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setTagToDelete(tag)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-md"
                  title="Excluir etiqueta"
                  aria-label={`Excluir etiqueta ${tag.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={Boolean(tagToDelete)} onOpenChange={(o) => !o && setTagToDelete(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-xl p-6 bg-card border border-border shadow-lg font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 font-heading text-destructive">
              <Trash2 className="w-4 h-4" />
              Excluir Etiqueta
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Tem certeza que deseja excluir a etiqueta <strong className="text-foreground font-semibold">&ldquo;{tagToDelete?.name}&rdquo;</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4 border-t border-border mt-2">
            <Button type="button" variant="ghost" onClick={() => setTagToDelete(null)} className="rounded-lg text-xs font-medium">
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} className="rounded-lg text-xs font-semibold">
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
