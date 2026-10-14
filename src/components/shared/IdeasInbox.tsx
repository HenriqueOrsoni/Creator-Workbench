"use client";

import React from "react";
import { Sparkles, Plus, ArrowRight, Trash2, Lightbulb, Target, BookOpen, ThumbsUp, Tag, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore, ProjectCard } from "@/store/useAppStore";

export function IdeasInbox() {
  const { ideas, board, fetchIdeas, createInboxIdea, convertInboxIdea, deleteCard } = useAppStore();
  const [openCreate, setOpenCreate] = React.useState(false);
  const [convertingCard, setConvertingCard] = React.useState<ProjectCard | null>(null);
  const [selectedColumnId, setSelectedColumnId] = React.useState<string>("");

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [targetAudience, setTargetAudience] = React.useState("");
  const [pedagogicalObjective, setPedagogicalObjective] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const columns = board?.columns || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    await createInboxIdea({
      title: title.trim(),
      description: description.trim(),
      targetAudience: targetAudience.trim() || undefined,
      pedagogicalObjective: pedagogicalObjective.trim() || undefined
    });
    setLoading(false);

    setTitle("");
    setDescription("");
    setTargetAudience("");
    setPedagogicalObjective("");
    setOpenCreate(false);
  };

  const [votes, setVotes] = React.useState<Record<string, number>>({});
  const [votedCards, setVotedCards] = React.useState<Record<string, boolean>>({});
  const [selectedTag, setSelectedTag] = React.useState<string>("TODOS");
  const [sortBy, setSortBy] = React.useState<"recent" | "votes">("recent");

  const TAGS = ["TODOS", "Tutorial", "Podcast", "Curso", "Roteiro", "Artigo"];

  const handleToggleVote = (cardId: string) => {
    const isVoted = Boolean(votedCards[cardId]);
    setVotedCards(prev => ({ ...prev, [cardId]: !isVoted }));
    setVotes(prev => ({
      ...prev,
      [cardId]: Math.max(0, (prev[cardId] || 0) + (isVoted ? -1 : 1))
    }));
  };

  const displayedIdeas = React.useMemo(() => {
    const list = [...ideas];
    if (sortBy === "votes") {
      list.sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0));
    }
    return list;
  }, [ideas, votes, sortBy]);

  const handleConvert = async () => {
    if (!convertingCard) return;

    setLoading(true);
    const targetCol = selectedColumnId || (columns.length > 0 ? columns[0].id : undefined);
    await convertInboxIdea(convertingCard.id, targetCol);
    setLoading(false);
    setConvertingCard(null);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header da Caixa de Entrada */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-5 rounded-xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
            <Lightbulb className="w-3.5 h-3.5" /> Caixa de Entrada • Inbox
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground font-heading">
            Ideias & Brainstorming
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Capture reflexões livres sem poluir o fluxo de produção. Quando estiver pronto, converta em projeto.
          </p>
        </div>

        <Button
          onClick={() => setOpenCreate(true)}
          className="rounded-lg px-3.5 h-9 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs tracking-wide gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Nova Ideia
        </Button>
      </div>

      {/* Barra de Filtro de Etiquetas e Ordenação por Votos (FE-01, FE-02) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tag className="w-3.5 h-3.5 text-muted-foreground mr-1" />
          {TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                selectedTag === tag
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortBy(sortBy === "recent" ? "votes" : "recent")}
            className="rounded-lg text-xs font-medium gap-1.5 h-8 border-border bg-background"
          >
            <Filter className="w-3 h-3" />
            {sortBy === "recent" ? "Ordenar por: Recentes" : "Ordenar por: Mais Votadas"}
          </Button>
        </div>
      </div>

      {/* Grid de Ideias */}
      {displayedIdeas.length === 0 ? (
        <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed border-border">
          <Sparkles className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">
            Nenhuma ideia pendente na Caixa de Entrada
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Todas as ideias foram convertidas em projetos ou ainda não foram registradas.
          </p>
          <Button
            onClick={() => setOpenCreate(true)}
            variant="outline"
            className="mt-4 rounded-lg text-xs font-semibold gap-2 h-9"
          >
            <Plus className="w-3.5 h-3.5" /> Registrar Primeira Ideia
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedIdeas.map((idea) => (
            <Card
              key={idea.id}
              className="p-4 rounded-xl bg-card border border-border shadow-xs hover:border-primary/40 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <Badge variant="outline" className="text-[11px] font-semibold bg-muted/50 border-border text-muted-foreground rounded-md">
                    Ideia Bruta
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleVote(idea.id)}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold transition-colors ${
                        votedCards[idea.id]
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                      title="Votar nesta ideia (FE-02)"
                    >
                      <ThumbsUp className={`w-3 h-3 ${votedCards[idea.id] ? "fill-primary-foreground" : ""}`} />
                      <span>{votes[idea.id] || 0}</span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCard(idea.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-md"
                      title="Excluir ideia"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-foreground font-heading mb-1.5">
                  {idea.title}
                </h3>
                {idea.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-3 leading-relaxed">
                    {idea.description}
                  </p>
                )}

                {(idea.targetAudience || idea.pedagogicalObjective) && (
                  <div className="p-2.5 bg-muted/40 rounded-lg space-y-1 mb-3 text-xs">
                    {idea.targetAudience && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Target className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{idea.targetAudience}</span>
                      </div>
                    )}
                    {idea.pedagogicalObjective && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{idea.pedagogicalObjective}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border mt-1">
                <Button
                  onClick={() => {
                    setConvertingCard(idea);
                    if (columns.length > 0) {
                      setSelectedColumnId(columns[0].id);
                    }
                  }}
                  className="w-full rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-foreground gap-1.5 h-8.5 transition-colors"
                >
                  Converter em Projeto <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Criar Nova Ideia */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-[480px] rounded-xl p-6 bg-card border-border shadow-lg">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold tracking-tight flex items-center gap-2 font-heading">
                <Sparkles className="w-4 h-4 text-primary" />
                Capturar Nova Ideia
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Registre um insight na Caixa de Entrada antes de estruturá-lo em projeto.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 my-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Título da Ideia *
                </label>
                <Input
                  required
                  placeholder="Ex: Minicurso sobre Algoritmos de Busca"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-lg h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Descrição / Notas
                </label>
                <Textarea
                  placeholder="Anotações rápidas sobre tópicos, referências ou formatos..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-lg text-xs min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Público-Alvo
                  </label>
                  <Input
                    placeholder="Ex: Iniciantes em CS"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="rounded-lg h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Objetivo Pedagógico
                  </label>
                  <Input
                    placeholder="Ex: Compreender BFS e DFS"
                    value={pedagogicalObjective}
                    onChange={(e) => setPedagogicalObjective(e.target.value)}
                    className="rounded-lg h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpenCreate(false)} className="rounded-lg text-xs font-medium">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !title.trim()}
                className="rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                {loading ? "Salvando..." : "Guardar na Inbox"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Converter Ideia em Projeto */}
      <Dialog open={Boolean(convertingCard)} onOpenChange={(open) => !open && setConvertingCard(null)}>
        <DialogContent className="sm:max-w-[440px] rounded-xl p-6 bg-card border-border shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold tracking-tight flex items-center gap-2 font-heading">
              <ArrowRight className="w-4 h-4 text-primary" />
              Ativar Projeto no Quadro
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Escolha para qual coluna do quadro dinâmico o projeto &quot;{convertingCard?.title}&quot; deve entrar.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-2.5">
            <label className="block text-xs font-semibold text-foreground">
              Coluna Inicial do Quadro
            </label>
            <div className="grid grid-cols-2 gap-2">
              {columns.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setSelectedColumnId(col.id)}
                  className={`p-2.5 rounded-lg border text-xs font-semibold text-left transition-colors ${
                    selectedColumnId === col.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-zinc-400 dark:hover:border-zinc-700"
                  }`}
                >
                  {col.name}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => setConvertingCard(null)} className="rounded-lg text-xs font-medium">
              Cancelar
            </Button>
            <Button
              onClick={handleConvert}
              disabled={loading}
              className="rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {loading ? "Ativando..." : "Confirmar e Mover ao Quadro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
