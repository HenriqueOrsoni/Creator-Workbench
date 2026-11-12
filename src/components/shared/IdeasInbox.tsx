"use client";

import React from "react";
import { Sparkles, Plus, ArrowRight, Trash2, Lightbulb, Target, BookOpen, ThumbsUp, Tag, Filter, Search } from "lucide-react";
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
import { useAppStore, ProjectCard } from "@/store/useAppStore";
import { CreateIdeaDialog } from "./CreateIdeaDialog";
import { canEditProduction } from "@/lib/roles";

export function IdeasInbox() {
  const { ideas, board, fetchIdeas, convertInboxIdea, deleteCard, voteIdea, activeTeam, teamTags, fetchTeamTags, ideaFilters, setIdeaFilters } = useAppStore();
  const canCreate = canEditProduction(activeTeam?.role);
  const [openCreate, setOpenCreate] = React.useState(false);
  const [ideaToDelete, setIdeaToDelete] = React.useState<ProjectCard | null>(null);
  const [convertingCard, setConvertingCard] = React.useState<ProjectCard | null>(null);
  const [selectedColumnId, setSelectedColumnId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    fetchIdeas();
    fetchTeamTags();
  }, [fetchIdeas, fetchTeamTags]);

  const columns = board?.columns || [];

  // Busca, etiqueta e ordenação são aplicadas pelo servidor (?q=&tagId=&sort=)
  const selectedTagId = ideaFilters.tagId;
  const sortBy = ideaFilters.sort;
  const [searchText, setSearchText] = React.useState(ideaFilters.q);

  React.useEffect(() => {
    if (searchText.trim() === ideaFilters.q.trim()) return;
    const timer = setTimeout(() => {
      setIdeaFilters({ q: searchText });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, ideaFilters.q, setIdeaFilters]);

  const selectedTagName = teamTags.find(t => t.id === selectedTagId)?.name;

  // Votos ficam salvos no servidor (um voto por membro em cada ideia)
  const handleToggleVote = (cardId: string) => {
    voteIdea(cardId);
  };

  const displayedIdeas = ideas;

  const [convertAudience, setConvertAudience] = React.useState("");
  const [convertObjective, setConvertObjective] = React.useState("");
  // Mesmos mínimos do formulário de edição do projeto (conversionSchema), para o projeto poder ser editado depois
  const audienceOk = convertAudience.trim().length >= 3;
  const objectiveOk = convertObjective.trim().length >= 10;
  const canConvert = audienceOk && objectiveOk;

  const openConvert = (idea: ProjectCard) => {
    setConvertingCard(idea);
    setConvertAudience(idea.targetAudience || "");
    setConvertObjective(idea.pedagogicalObjective || "");
    if (columns.length > 0) {
      setSelectedColumnId(columns[0].id);
    }
  };

  const handleConvert = async () => {
    if (!convertingCard || !canConvert) return;

    setLoading(true);
    const targetCol = selectedColumnId || (columns.length > 0 ? columns[0].id : undefined);
    const converted = await convertInboxIdea(convertingCard.id, targetCol, {
      targetAudience: convertAudience.trim(),
      pedagogicalObjective: convertObjective.trim()
    });
    setLoading(false);
    if (converted) {
      setConvertingCard(null);
    }
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

        {canCreate && (
          <Button
            onClick={() => setOpenCreate(true)}
            className="rounded-lg px-3.5 h-9 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs tracking-wide gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nova Ideia
          </Button>
        )}
      </div>

      {/* Barra de Filtro de Etiquetas, Busca por Texto e Ordenação (FE-01, FE-02, FE-03) */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tag className="w-3.5 h-3.5 text-muted-foreground mr-1" />
          <button
            type="button"
            onClick={() => setIdeaFilters({ tagId: "" })}
            className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
              selectedTagId === ""
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Todas
          </button>
          {teamTags.map(tag => (
            <button
              type="button"
              key={tag.id}
              onClick={() => setIdeaFilters({ tagId: tag.id })}
              className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                selectedTagId === tag.id
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-56">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar ideias..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-8 h-8 text-xs rounded-lg bg-background border-border"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIdeaFilters({ sort: sortBy === "recent" ? "votes" : "recent" })}
            className="rounded-lg text-xs font-medium gap-1.5 h-8 border-border bg-background shrink-0"
          >
            <Filter className="w-3 h-3" />
            {sortBy === "recent" ? "Recentes" : "Mais Votadas"}
          </Button>
        </div>
      </div>

      {/* Grid de Ideias */}
      {displayedIdeas.length === 0 ? (
        <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed border-border">
          <Sparkles className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">
            {selectedTagId === "" && !ideaFilters.q.trim()
              ? "Nenhuma ideia pendente na Caixa de Entrada"
              : selectedTagName
                ? `Nenhuma ideia encontrada com a etiqueta "${selectedTagName}"`
                : "Nenhuma ideia encontrada para a busca"}
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
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[11px] font-semibold bg-muted/50 border-border text-muted-foreground rounded-md">
                      Ideia Bruta
                    </Badge>
                    {idea.tag && (
                      <span
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold text-white"
                        style={{ backgroundColor: idea.tagColor || "#64748B" }}
                      >
                        {idea.tag}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleVote(idea.id)}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold transition-colors ${
                        idea.votedByMe
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                      title={idea.votedByMe ? "Remover meu voto" : "Votar nesta ideia"}
                    >
                      <ThumbsUp className={`w-3 h-3 ${idea.votedByMe ? "fill-primary-foreground" : ""}`} />
                      <span>{idea.votes || 0}</span>
                    </button>
                    {canCreate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIdeaToDelete(idea)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-md"
                        title="Excluir ideia"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
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

              {canCreate && (
                <div className="pt-3 border-t border-border mt-1">
                  <Button
                    onClick={() => openConvert(idea)}
                    className="w-full rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-foreground gap-1.5 h-8.5 transition-colors"
                  >
                    Converter em Projeto <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Unificado de Criação de Ideia (BF-01 & BF-02) */}
      <CreateIdeaDialog open={openCreate} onOpenChange={setOpenCreate} />

      {/* Dialog de Confirmação de Exclusão de Ideia (BF-15) */}
      <Dialog open={Boolean(ideaToDelete)} onOpenChange={(open) => !open && setIdeaToDelete(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-xl p-6 bg-card border border-border shadow-lg font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 font-heading text-destructive">
              <Trash2 className="w-4 h-4" />
              Excluir Ideia
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Tem certeza que deseja excluir a ideia <strong className="text-foreground font-semibold">&ldquo;{ideaToDelete?.title}&rdquo;</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4 border-t border-border mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIdeaToDelete(null)}
              className="rounded-lg text-xs font-medium"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (ideaToDelete) {
                  deleteCard(ideaToDelete.id);
                  setIdeaToDelete(null);
                }
              }}
              className="rounded-lg text-xs font-semibold"
            >
              Confirmar Exclusão
            </Button>
          </DialogFooter>
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

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Público-Alvo *
              </label>
              <Input
                placeholder="Ex: Iniciantes em CS"
                value={convertAudience}
                onChange={(e) => setConvertAudience(e.target.value)}
                className="rounded-lg h-9 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Objetivo Pedagógico *
              </label>
              <Input
                placeholder="Ex: Compreender BFS e DFS"
                value={convertObjective}
                onChange={(e) => setConvertObjective(e.target.value)}
                className="rounded-lg h-9 text-xs"
              />
            </div>
          </div>
          {(convertAudience || convertObjective) && !canConvert && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {!audienceOk ? "Público-alvo: mínimo 3 caracteres. " : ""}
              {!objectiveOk ? "Objetivo pedagógico: mínimo 10 caracteres." : ""}
            </p>
          )}

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
              disabled={loading || !canConvert}
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
