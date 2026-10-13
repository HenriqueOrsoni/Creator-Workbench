"use client";

import React from "react";
import { Sparkles, Plus, ArrowRight, Trash2, Lightbulb, Target, BookOpen } from "lucide-react";
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/60 dark:bg-zinc-900/40 p-6 rounded-[28px] border border-zinc-200/60 dark:border-zinc-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary mb-1">
            <Lightbulb className="w-4 h-4" /> Caixa de Entrada • Inbox
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 font-heading">
            Ideias & Brainstorming
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Capture reflexões livres sem poluir o fluxo de produção. Quando estiver pronto, converta em projeto.
          </p>
        </div>

        <Button
          onClick={() => setOpenCreate(true)}
          className="rounded-2xl px-6 h-12 bg-zinc-900 hover:bg-zinc-800 dark:bg-primary text-white font-bold uppercase text-xs tracking-wider gap-2 shadow-lg shadow-primary/10"
        >
          <Plus className="w-4 h-4" /> Nova Ideia
        </Button>
      </div>

      {/* Grid de Ideias */}
      {ideas.length === 0 ? (
        <div className="text-center py-24 bg-zinc-50/50 dark:bg-zinc-900/20 rounded-[32px] border border-dashed border-zinc-200 dark:border-zinc-800">
          <Sparkles className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
          <h3 className="text-base font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Nenhuma ideia pendente na Caixa de Entrada
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
            Todas as ideias foram convertidas em projetos ou ainda não foram registradas.
          </p>
          <Button
            onClick={() => setOpenCreate(true)}
            variant="outline"
            className="mt-6 rounded-xl text-xs font-bold uppercase tracking-wider gap-2"
          >
            <Plus className="w-4 h-4" /> Registrar Primeira Ideia
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ideas.map((idea) => (
            <Card
              key={idea.id}
              className="p-6 rounded-[28px] bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:shadow-xl hover:border-primary/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800">
                    Ideia Bruta
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCard(idea.id)}
                    className="h-8 w-8 text-zinc-400 hover:text-red-500 rounded-lg"
                    title="Excluir ideia"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 font-heading mb-2">
                  {idea.title}
                </h3>
                {idea.description && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 mb-4 leading-relaxed">
                    {idea.description}
                  </p>
                )}

                {(idea.targetAudience || idea.pedagogicalObjective) && (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl space-y-1.5 mb-4 text-[11px]">
                    {idea.targetAudience && (
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <Target className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{idea.targetAudience}</span>
                      </div>
                    )}
                    {idea.pedagogicalObjective && (
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <BookOpen className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span className="truncate">{idea.pedagogicalObjective}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  onClick={() => {
                    setConvertingCard(idea);
                    if (columns.length > 0) {
                      setSelectedColumnId(columns[0].id);
                    }
                  }}
                  className="w-full rounded-xl text-xs font-black uppercase tracking-wider bg-zinc-900 text-white dark:bg-primary gap-2 h-10 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Converter em Projeto <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Criar Nova Ideia */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 font-heading">
                <Sparkles className="w-5 h-5 text-primary" />
                Capturar Nova Ideia
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Registre um insight na Caixa de Entrada antes de estruturá-lo em projeto.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-5">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                  Título da Ideia *
                </label>
                <Input
                  required
                  placeholder="Ex: Minicurso sobre Algoritmos de Busca"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl h-11 text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                  Descrição / Notas
                </label>
                <Textarea
                  placeholder="Anotações rápidas sobre tópicos, referências ou formatos..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-xl text-xs min-h-[90px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                    Público-Alvo
                  </label>
                  <Input
                    placeholder="Ex: Iniciantes em CS"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                    Objetivo Pedagógico
                  </label>
                  <Input
                    placeholder="Ex: Compreender BFS e DFS"
                    value={pedagogicalObjective}
                    onChange={(e) => setPedagogicalObjective(e.target.value)}
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpenCreate(false)} className="rounded-xl text-xs font-bold">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !title.trim()}
                className="rounded-xl text-xs font-bold uppercase tracking-wider bg-zinc-900 text-white dark:bg-primary"
              >
                {loading ? "Salvando..." : "Guardar na Inbox"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Converter Ideia em Projeto */}
      <Dialog open={Boolean(convertingCard)} onOpenChange={(open) => !open && setConvertingCard(null)}>
        <DialogContent className="sm:max-w-[440px] rounded-3xl p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 font-heading">
              <ArrowRight className="w-5 h-5 text-primary" />
              Ativar Projeto no Quadro
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Escolha para qual coluna do quadro dinâmico o projeto &quot;{convertingCard?.title}&quot; deve entrar.
            </DialogDescription>
          </DialogHeader>

          <div className="my-5 space-y-3">
            <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500">
              Coluna Inicial do Quadro
            </label>
            <div className="grid grid-cols-2 gap-2">
              {columns.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setSelectedColumnId(col.id)}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    selectedColumnId === col.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                  }`}
                >
                  {col.name}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => setConvertingCard(null)} className="rounded-xl text-xs font-bold">
              Cancelar
            </Button>
            <Button
              onClick={handleConvert}
              disabled={loading}
              className="rounded-xl text-xs font-bold uppercase tracking-wider bg-zinc-900 text-white dark:bg-primary"
            >
              {loading ? "Ativando..." : "Confirmar e Mover ao Quadro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
