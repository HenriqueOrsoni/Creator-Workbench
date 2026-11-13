"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  CheckSquare, Square, Plus, Trash2, ListChecks, Paperclip,
  Sparkles, History, CheckCircle2, ArrowUp, ArrowDown,
  UploadCloud, Download, User, Calendar, MessageSquare, Pencil, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useAppStore,
  ProjectCard,
  CardMovementHistory,
  CardTask
} from "@/store/useAppStore";
import { toast } from "sonner";
import { canEditProduction, canReviewCards } from "@/lib/roles";
import { formatLocalDate, formatDateTime } from "@/lib/dates";
import { FEATURES } from "@/lib/features";

interface CardTaskDialogProps {
  card: ProjectCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardTaskDialog({ card, open, onOpenChange }: CardTaskDialogProps) {
  const {
    createTask,
    toggleTask,
    deleteTask,
    updateCardTaskDetails,
    reorderCardTasks,
    fetchCardHistory,
    submitCardReview,
    cardMaterials,
    fetchCardMaterials,
    uploadMaterial,
    deleteMaterial,
    downloadMaterial,
    cardSummaries,
    cardReviews,
    fetchCardReviews,
    fetchCardSummary,
    generateCardSummary,
    teamMembers,
    board,
    activeTeam
  } = useAppStore();

  // Revisor é somente leitura: não edita, move, exclui nem envia arquivos (BF-07)
  const canEditTasks = canEditProduction(activeTeam?.role);
  const canReview = canReviewCards(activeTeam?.role);

  const [activeTab, setActiveTab] = useState("tarefas");
  const [newTitle, setNewTitle] = useState("");
  // Edição do título da tarefa (Enter ou sair do campo salva; Esc cancela)
  const [editingTask, setEditingTask] = useState<{ id: string; title: string } | null>(null);
  // Espelho síncrono da edição: garante um único salvamento (Enter + blur) e nenhum após Esc
  const editingTaskRef = useRef<{ id: string; title: string } | null>(null);
  const startEditingTask = (task: { id: string; title: string }) => {
    editingTaskRef.current = { id: task.id, title: task.title };
    setEditingTask({ id: task.id, title: task.title });
  };
  const changeEditingTitle = (id: string, title: string) => {
    editingTaskRef.current = { id, title };
    setEditingTask({ id, title });
  };
  const cancelEditingTask = () => {
    editingTaskRef.current = null;
    setEditingTask(null);
  };
  const [loading, setLoading] = useState(false);

  // Estados para Materiais (FE-10, FE-11)
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Estados para Histórico (FE-05)
  const [history, setHistory] = useState<CardMovementHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Estados para Resumo com IA (FE-17)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Estados para Revisão (FE-27)
  const [reviewDecision, setReviewDecision] = useState<"APPROVED" | "CHANGES_REQUESTED">("APPROVED");
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Pega o card atualizado do board se disponível
  const currentCard = useMemo(() => {
    if (!card || !board) return card;
    for (const col of board.columns) {
      const found = col.cards.find(c => c.id === card.id);
      if (found) return found;
    }
    return card;
  }, [card, board]);

  const materials = useMemo(() => {
    if (!currentCard) return [];
    return cardMaterials[currentCard.id] || [];
  }, [cardMaterials, currentCard]);

  const reviews = useMemo(() => {
    if (!currentCard) return [];
    return cardReviews[currentCard.id] || [];
  }, [cardReviews, currentCard]);

  const summary = useMemo(() => {
    if (!currentCard) return null;
    return cardSummaries[currentCard.id] || null;
  }, [cardSummaries, currentCard]);

  // Carrega dados sob demanda conforme a aba ativa
  useEffect(() => {
    if (!open || !currentCard?.id) return;
    if (activeTab === "materiais" && FEATURES.materials) {
      fetchCardMaterials(currentCard.id);
    } else if (activeTab === "resumo" && FEATURES.summary) {
      fetchCardSummary(currentCard.id).finally(() => setLoadingSummary(false));
    } else if (activeTab === "revisao" && FEATURES.review) {
      fetchCardReviews(currentCard.id).finally(() => setLoadingReviews(false));
    } else if (activeTab === "historico") {
      let cancelled = false;
      fetchCardHistory(currentCard.id)
        .then(h => {
          if (!cancelled) setHistory(h);
        })
        .finally(() => {
          if (!cancelled) setLoadingHistory(false);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [open, activeTab, currentCard?.id, fetchCardMaterials, fetchCardSummary, fetchCardReviews, fetchCardHistory]);

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

  const commitTaskTitle = async (task: CardTask) => {
    const draft = editingTaskRef.current;
    editingTaskRef.current = null;
    setEditingTask(null);
    if (!draft || draft.id !== task.id) return;
    const title = draft.title.trim();
    if (!title || title === task.title) return;
    await updateCardTaskDetails(currentCard.id, task.id, { title });
  };

  // Prazo: só salva uma data completa (AAAA-MM-DD); remover é uma ação explícita
  const commitTaskDueDate = async (task: CardTask, value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value === (task.dueDate || "")) return;
    await updateCardTaskDetails(currentCard.id, task.id, { dueDate: value });
  };

  const handleMoveTask = async (taskId: string, direction: "up" | "down") => {
    const currentIndex = tasks.findIndex(t => t.id === taskId);
    if (currentIndex === -1) return;
    if (direction === "up" && currentIndex === 0) return;
    if (direction === "down" && currentIndex === tasks.length - 1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const newTasks = [...tasks];
    const [moved] = newTasks.splice(currentIndex, 1);
    newTasks.splice(targetIndex, 0, moved);

    await reorderCardTasks(currentCard.id, newTasks.map(t => t.id));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = "";

    setIsUploading(true);
    setUploadProgress(20);
    const progressTimer = setInterval(() => {
      setUploadProgress(prev => (prev !== null && prev < 90 ? prev + 25 : prev));
    }, 150);

    const uploaded = await uploadMaterial(currentCard.id, file);
    clearInterval(progressTimer);
    setUploadProgress(100);
    setTimeout(() => {
      setIsUploading(false);
      setUploadProgress(null);
    }, 400);

    if (uploaded) {
      await fetchCardMaterials(currentCard.id);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    await generateCardSummary(currentCard.id);
    setIsGeneratingSummary(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewDecision === "CHANGES_REQUESTED" && !reviewComment.trim()) {
      toast.error("O comentário é obrigatório quando solicitar alterações.");
      return;
    }

    setIsSubmittingReview(true);
    await submitCardReview(currentCard.id, reviewDecision, reviewComment.trim());
    setIsSubmittingReview(false);
    setReviewComment("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto rounded-xl p-4 sm:p-6 bg-card border border-border shadow-lg font-sans">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <ListChecks className="w-4 h-4" /> Detalhes do Projeto
            </div>
            {currentCard.reviewStatus && currentCard.reviewStatus !== "NONE" && (
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  currentCard.reviewStatus === "APPROVED"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                }`}
              >
                {currentCard.reviewStatus === "APPROVED" ? "Aprovado" : "Alterações Solicitadas"}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground font-heading">
            {currentCard.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {currentCard.pedagogicalObjective || "Gerencie tarefas, materiais pedagógicos, revisão e histórico de produção."}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val);
            // Mostra "Carregando..." até a API responder (a busca roda no efeito acima)
            if (val === "historico") {
              setLoadingHistory(true);
            }
            if (val === "resumo") {
              setLoadingSummary(true);
            }
            if (val === "revisao") {
              setLoadingReviews(true);
            }
          }}
          className="w-full mt-2"
        >
          <TabsList className="flex w-full justify-start overflow-x-auto bg-muted/50 p-1 rounded-lg text-xs">
            <TabsTrigger value="tarefas" className="text-xs font-semibold rounded-md shrink-0">
              Tarefas ({tasks.length})
            </TabsTrigger>
            {FEATURES.materials && (
              <TabsTrigger value="materiais" className="text-xs font-semibold rounded-md">
                Materiais ({materials.length})
              </TabsTrigger>
            )}
            {FEATURES.summary && (
              <TabsTrigger value="resumo" className="text-xs font-semibold rounded-md">
                Resumo IA
              </TabsTrigger>
            )}
            {FEATURES.review && (
              <TabsTrigger value="revisao" className="text-xs font-semibold rounded-md">
                Revisão
              </TabsTrigger>
            )}
            <TabsTrigger value="historico" className="text-xs font-semibold rounded-md">
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Aba 1: Tarefas */}
          <TabsContent value="tarefas" className="space-y-3 pt-3">
            {/* Barra de Progresso do Checklist */}
            <div className="p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
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
            <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground font-medium">
                  Nenhuma tarefa adicionada ainda. Adicione as etapas de produção abaixo!
                </div>
              ) : (
                tasks.map((task: CardTask, idx: number) => (
                  <div
                    key={task.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 rounded-lg bg-card border border-border group hover:border-primary/40 transition-all shadow-2xs gap-2"
                  >
                    {editingTask?.id === task.id ? (
                      <Input
                        autoFocus
                        aria-label={`Título da tarefa ${task.title}`}
                        value={editingTask.title}
                        onChange={(e) => changeEditingTitle(task.id, e.target.value)}
                        onBlur={() => commitTaskTitle(task)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitTaskTitle(task);
                          } else if (e.key === "Escape") {
                            cancelEditingTask();
                          }
                        }}
                        className="h-7 text-xs flex-1 min-w-0"
                      />
                    ) : (
                    <button
                      type="button"
                      onClick={() => toggleTask(currentCard.id, task.id)}
                      className="flex items-center gap-2 flex-1 text-left min-w-0 cursor-pointer"
                    >
                      {task.completed ? (
                        <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <span
                          className={`text-xs font-medium block truncate ${
                            task.completed ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                          {task.assignee && (
                            <span className="flex items-center gap-1 font-semibold text-primary">
                              <User className="w-2.5 h-2.5" /> {task.assignee.name}
                            </span>
                          )}
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" /> {formatLocalDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    )}

                    {canEditTasks && (
                      <div className="flex flex-wrap items-center gap-1 sm:shrink-0">
                        {teamMembers.length > 0 && (
                          <select
                            value={task.assignee?.memberId || "0"}
                            onChange={(e) => updateCardTaskDetails(currentCard.id, task.id, {
                              assigneeMemberId: Number(e.target.value)
                            })}
                            className="h-6 max-w-[9rem] rounded text-[10px] bg-muted/40 border border-border text-foreground px-1"
                            title="Atribuir responsável"
                            aria-label={`Responsável pela tarefa ${task.title}`}
                          >
                            <option value="0">Sem responsável</option>
                            {teamMembers.map(m => (
                              <option key={m.id} value={m.id}>{m.name.split(" ")[0]}</option>
                            ))}
                          </select>
                        )}
                        <input
                          type="date"
                          key={`${task.id}-${task.dueDate || ""}`}
                          aria-label={`Prazo da tarefa ${task.title}`}
                          defaultValue={task.dueDate || ""}
                          onBlur={(e) => commitTaskDueDate(task, e.target.value)}
                          className="h-6 max-w-[9rem] rounded text-[10px] bg-muted/40 border border-border text-foreground px-1"
                          title="Prazo da tarefa (salvo ao sair do campo)"
                        />
                        {task.dueDate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateCardTaskDetails(currentCard.id, task.id, { dueDate: "" })}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive rounded-md"
                            title="Remover prazo"
                            aria-label={`Remover prazo da tarefa ${task.title}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditingTask(task)}
                          className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md"
                          title="Editar título"
                          aria-label={`Editar título da tarefa ${task.title}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={idx === 0}
                          onClick={() => handleMoveTask(task.id, "up")}
                          className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md disabled:opacity-20"
                          title="Mover para cima"
                          aria-label={`Mover tarefa ${task.title} para cima`}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={idx === tasks.length - 1}
                          onClick={() => handleMoveTask(task.id, "down")}
                          className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md disabled:opacity-20"
                          title="Mover para baixo"
                          aria-label={`Mover tarefa ${task.title} para baixo`}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTask(currentCard.id, task.id)}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive rounded-md"
                          title="Excluir tarefa"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Form Adicionar Tarefa */}
            {canEditTasks && (
              <form onSubmit={handleAddTask} className="flex gap-2 pt-2 border-t border-border">
                <Input
                  id="new-task-title"
                  aria-label="Título da nova tarefa"
                  placeholder="Ex: Gravar áudio da intro, cortar silêncios..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="h-9 rounded-lg text-xs flex-1 border-border bg-background"
                />
                <Button
                  type="submit"
                  disabled={loading || !newTitle.trim()}
                  className="rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 gap-1 px-3.5 h-9 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              </form>
            )}
          </TabsContent>

          {/* Aba 2: Materiais de Apoio (FE-10, FE-11, FE-12) */}
          {FEATURES.materials && (
          <TabsContent value="materiais" className="space-y-3 pt-3">
            {canEditTasks && (
              <div className="border border-dashed border-border rounded-xl p-4 text-center bg-muted/20 hover:bg-muted/30 transition-colors">
                <input
                  type="file"
                  id={`file-upload-${currentCard.id}`}
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.webp,.gif"
                />
                <label
                  htmlFor={`file-upload-${currentCard.id}`}
                  className="cursor-pointer flex flex-col items-center gap-1.5"
                >
                  <UploadCloud className="w-6 h-6 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    Clique para enviar material de apoio
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    PDF, Office (Word, Excel, PowerPoint), TXT e imagens até 20 MB
                  </span>
                </label>

                {isUploading && (
                  <div className="mt-3 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-200"
                      style={{ width: `${uploadProgress || 50}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
              {materials.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Nenhum arquivo anexado a este projeto ainda.
                </div>
              ) : (
                materials.map((mat) => (
                  <div
                    key={mat.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{mat.fileName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {Math.round(mat.sizeBytes / 1024)} KB • Por {mat.uploadedBy?.name || "Membro"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => downloadMaterial(mat)}
                        className="h-7 w-7 text-muted-foreground hover:text-primary rounded-md"
                        title="Baixar material"
                        aria-label={`Baixar ${mat.fileName}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      {canEditTasks && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMaterial(mat.id, currentCard.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-md"
                          title="Excluir arquivo"
                          aria-label={`Excluir ${mat.fileName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          )}

          {/* Aba 3: Resumo com Inteligência Artificial (FE-17) */}
          {FEATURES.summary && (
          <TabsContent value="resumo" className="space-y-3 pt-3">
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 font-heading">
                  <Sparkles className="w-4 h-4 text-primary" /> Síntese Pedagógica com IA
                </span>
                {canEditTasks && (
                  <Button
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                    aria-busy={isGeneratingSummary}
                    size="sm"
                    className="rounded-lg text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs"
                  >
                    <Sparkles className="w-3 h-3" />
                    {isGeneratingSummary ? "Gerando (até 30s)..." : summary ? "Gerar novo resumo" : "Gerar Resumo"}
                  </Button>
                )}
              </div>

              {summary ? (
                <div className="space-y-2">
                  {/* Texto puro: o resumo vem de um modelo e pode conter marcação */}
                  <p
                    data-testid="summary-text"
                    className="text-xs text-foreground leading-relaxed bg-card p-3 rounded-lg border border-border whitespace-pre-wrap break-words"
                  >
                    {summary.summary}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Gerado em {formatDateTime(summary.generatedAt)} a partir do {summary.basedOn === "SCRIPT" ? "roteiro de produção" : "briefing"}.
                  </p>
                </div>
              ) : loadingSummary ? (
                <p className="text-xs text-muted-foreground">Carregando resumo...</p>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nenhum resumo gerado para este projeto.
                  {canEditTasks
                    ? " Escreva pelo menos 100 palavras no roteiro e clique em Gerar Resumo."
                    : ""}
                </p>
              )}
            </div>
          </TabsContent>
          )}

          {/* Aba 4: Revisão Pedagógica (FE-27) */}
          {FEATURES.review && (
          <TabsContent value="revisao" className="space-y-3 pt-3">
            <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Status Atual da Revisão
                </span>
                <Badge variant="outline" className="text-xs font-semibold">
                  {currentCard.reviewStatus === "APPROVED"
                    ? "Aprovado"
                    : currentCard.reviewStatus === "CHANGES_REQUESTED"
                    ? "Alterações Solicitadas"
                    : "Pendente de Revisão"}
                </Badge>
              </div>

              {canReview && (
                <form onSubmit={handleSubmitReview} className="space-y-3 pt-2 border-t border-border">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Decisão do Revisor
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewDecision("APPROVED")}
                        className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          reviewDecision === "APPROVED"
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                            : "border-border text-muted-foreground hover:bg-muted/40"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewDecision("CHANGES_REQUESTED")}
                        className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          reviewDecision === "CHANGES_REQUESTED"
                            ? "border-amber-500 bg-amber-500/10 text-amber-600"
                            : "border-border text-muted-foreground hover:bg-muted/40"
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Pedir Alterações
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="review-comment" className="block text-xs font-semibold text-muted-foreground mb-1">
                      Comentários / Observações Pedagógicas {reviewDecision === "CHANGES_REQUESTED" && "*"}
                    </label>
                    <Input
                      id="review-comment"
                      aria-label="Comentários de revisão"
                      maxLength={2000}
                      placeholder={reviewDecision === "CHANGES_REQUESTED" ? "Descreva o que precisa ser ajustado..." : "Observações opcionais"}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="h-9 rounded-lg text-xs border-border bg-background"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmittingReview || (reviewDecision === "CHANGES_REQUESTED" && !reviewComment.trim())}
                    className="w-full bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg font-semibold text-xs h-9 shadow-xs"
                  >
                    {isSubmittingReview ? "Enviando Decisão..." : "Registrar Decisão de Revisão"}
                  </Button>
                </form>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground">Histórico de revisões</span>
              {loadingReviews && reviews.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Carregando revisões...</p>
              ) : reviews.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Nenhuma revisão registrada ainda.</p>
              ) : (
                <ul className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                  {reviews.map((r) => (
                    <li key={r.id} className="p-2.5 rounded-lg border border-border bg-card space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            r.decision === "APPROVED"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          }`}
                        >
                          {r.decision === "APPROVED" ? "Aprovado" : "Alterações Solicitadas"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatDateTime(r.createdAt)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Por {r.reviewer?.name || "Revisor removido"}</p>
                      {r.comment && (
                        <p className="text-xs text-foreground whitespace-pre-wrap break-words">{r.comment}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
          )}

          {/* Aba 5: Histórico de Movimentações (FE-05) */}
          <TabsContent value="historico" className="space-y-2 pt-3">
            <div className="max-h-[240px] overflow-y-auto space-y-2 pr-1">
              {loadingHistory ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Carregando histórico...
                </div>
              ) : history.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Nenhum registro de movimentação encontrado.
                </div>
              ) : (
                history.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-border bg-muted/20 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <History className="w-3.5 h-3.5 text-primary shrink-0" />
                      <div>
                        <span className="font-semibold text-foreground">
                          Movido para &ldquo;{item.columnName}&rdquo;
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          Por {item.movedBy?.name || "Sem autor registrado"}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDateTime(item.enteredAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
