"use client";

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  Video,
  FileText,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  Eye,
  EyeOff
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

/**
 * Componente: CurriculumBuilder
 * Estruturação Curricular hierárquica integrada ao backend.
 * Estética Unificada: Creative (The Studio).
 */

interface Lesson {
  id: string;
  title: string;
  type: "video" | "text" | "quiz";
  published: boolean;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface CurriculumBuilderProps {
  kanbanItemId: string;
  courseTitle: string;
}

interface BackendLesson {
  id: string | number;
  title: string;
  type: string;
  published: boolean;
}

interface BackendModule {
  id: string | number;
  title: string;
  lessons?: BackendLesson[];
}

export function CurriculumBuilder({ kanbanItemId, courseTitle }: CurriculumBuilderProps) {
  const [modules, setModules] = React.useState<Module[]>([]);

  // --- Estados do Dialog Customizado ---
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogType, setDialogType] = React.useState<"create-module" | "rename-module" | "create-lesson" | "rename-lesson" | "delete-module" | "delete-lesson" | null>(null);
  const [targetId, setTargetId] = React.useState("");
  const [parentId, setParentId] = React.useState(""); // Ex: moduleId para aulas
  const [nameInput, setNameInput] = React.useState("");
  const [typeInput, setTypeInput] = React.useState<"video" | "text" | "quiz">("video");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  const fetchModules = React.useCallback(async () => {
    if (!kanbanItemId) return;
    try {
      const data = await apiRequest("GET", `/api/v1/kanban/${kanbanItemId}/curriculum/modules`);
      if (Array.isArray(data)) {
        const mapped = data.map((mod: BackendModule) => ({
          id: mod.id.toString(),
          title: mod.title,
          lessons: (mod.lessons || []).map((les: BackendLesson) => ({
            id: les.id.toString(),
            title: les.title,
            type: les.type.toLowerCase() as "video" | "text" | "quiz",
            published: les.published
          }))
        }));
        setModules(mapped);
      }
    } catch (error) {
      console.error("Erro ao buscar matriz curricular:", error);
    }
  }, [kanbanItemId]);

  React.useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  // --- Handlers de Abertura dos Dialogs ---
  const handleOpenAddModule = () => {
    setNameInput("");
    setErrorMsg(null);
    setDialogType("create-module");
    setDialogOpen(true);
  };

  const handleOpenRenameModule = (moduleId: string, currentTitle: string) => {
    setNameInput(currentTitle);
    setTargetId(moduleId);
    setErrorMsg(null);
    setDialogType("rename-module");
    setDialogOpen(true);
  };

  const handleOpenDeleteModule = (moduleId: string) => {
    setTargetId(moduleId);
    setErrorMsg(null);
    setDialogType("delete-module");
    setDialogOpen(true);
  };

  const handleOpenAddLesson = (moduleId: string) => {
    setNameInput("");
    setTypeInput("video");
    setParentId(moduleId);
    setErrorMsg(null);
    setDialogType("create-lesson");
    setDialogOpen(true);
  };

  const handleOpenRenameLesson = (moduleId: string, lessonId: string, currentTitle: string) => {
    setNameInput(currentTitle);
    setParentId(moduleId);
    setTargetId(lessonId);
    setErrorMsg(null);
    setDialogType("rename-lesson");
    setDialogOpen(true);
  };

  const handleOpenDeleteLesson = (moduleId: string, lessonId: string) => {
    setParentId(moduleId);
    setTargetId(lessonId);
    setErrorMsg(null);
    setDialogType("delete-lesson");
    setDialogOpen(true);
  };

  // --- Submissão Unificada dos Formulários ---
  const handleDialogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialogType) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (dialogType === "create-module") {
        if (!nameInput.trim()) return;
        await apiRequest("POST", `/api/v1/kanban/${kanbanItemId}/curriculum/modules`, {
          title: nameInput.trim()
        });
      } else if (dialogType === "rename-module") {
        if (!nameInput.trim()) return;
        await apiRequest("PUT", `/api/v1/kanban/${kanbanItemId}/curriculum/modules/${targetId}`, {
          title: nameInput.trim()
        });
      } else if (dialogType === "delete-module") {
        await apiRequest("DELETE", `/api/v1/kanban/${kanbanItemId}/curriculum/modules/${targetId}`);
      } else if (dialogType === "create-lesson") {
        if (!nameInput.trim()) return;
        await apiRequest("POST", `/api/v1/kanban/${kanbanItemId}/curriculum/modules/${parentId}/lessons`, {
          title: nameInput.trim(),
          type: typeInput.toUpperCase()
        });
      } else if (dialogType === "rename-lesson") {
        if (!nameInput.trim()) return;
        await apiRequest("PUT", `/api/v1/kanban/${kanbanItemId}/curriculum/modules/${parentId}/lessons/${targetId}`, {
          title: nameInput.trim()
        });
      } else if (dialogType === "delete-lesson") {
        await apiRequest("DELETE", `/api/v1/kanban/${kanbanItemId}/curriculum/modules/${parentId}/lessons/${targetId}`);
      }

      await fetchModules();
      setDialogOpen(false);
    } catch (error) {
      setErrorMsg("Erro ao realizar operação: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublishLesson = async (moduleId: string, lesson: Lesson) => {
    try {
      setGlobalError(null);
      await apiRequest("PUT", `/api/v1/kanban/${kanbanItemId}/curriculum/modules/${moduleId}/lessons/${lesson.id}`, {
        published: !lesson.published
      });
      fetchModules();
    } catch (error) {
      setGlobalError("Erro ao alterar estado de publicação: " + (error as Error).message);
    }
  };

  // Título e Descrição dinâmicos para o Dialog
  const getDialogMetadata = () => {
    switch (dialogType) {
      case "create-module":
        return { title: "Criar Novo Módulo", description: "Defina o nome do novo módulo da sua grade curricular." };
      case "rename-module":
        return { title: "Renomear Módulo", description: "Atualize o nome deste módulo." };
      case "delete-module":
        return { title: "Excluir Módulo", description: "Esta ação é irreversível e excluirá todas as aulas vinculadas a ele." };
      case "create-lesson":
        return { title: "Adicionar Nova Aula", description: "Escolha o nome e o tipo do conteúdo da nova aula." };
      case "rename-lesson":
        return { title: "Renomear Aula", description: "Atualize o nome desta aula." };
      case "delete-lesson":
        return { title: "Excluir Aula", description: "Tem certeza que deseja excluir esta aula permanentemente?" };
      default:
        return { title: "", description: "" };
    }
  };

  const metadata = getDialogMetadata();

  return (
    <div className="space-y-6 text-left font-sans antialiased">
      {globalError && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-500/10 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={20} />
            <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">{globalError}</span>
          </div>
          <button onClick={() => setGlobalError(null)} className="text-xs font-black uppercase text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            [x]
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-heading">
            Estrutura <span className="text-primary">Curricular</span>
          </h2>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Projeto: {courseTitle}</p>
        </div>
        <Button 
          onClick={handleOpenAddModule}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-9 px-4 font-semibold text-xs tracking-wide shadow-xs self-start sm:self-auto"
        >
          <Plus size={15} className="mr-1.5" /> NOVO_MÓDULO
        </Button>
      </div>

      {modules.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground font-medium text-xs border border-dashed border-border rounded-xl">
          Nenhum módulo cadastrado. Adicione um novo módulo para começar.
        </div>
      ) : (
        <Accordion multiple className="w-full space-y-4">
          {modules.map((module) => (
            <AccordionItem
              key={module.id}
              value={module.id}
              className="border border-border bg-card shadow-xs rounded-xl overflow-hidden transition-all group/module"
            >
              <div className="flex items-center justify-between pr-4 bg-card">
                <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors group flex-1">
                  <div className="flex items-center gap-3.5 text-left">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="font-bold text-primary text-xs font-heading">
                        {module.title.slice(0, 2).match(/^\d+$/) ? module.title.slice(0, 2) : "M"}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold tracking-tight text-base text-foreground group-hover:text-primary transition-colors font-heading break-all line-clamp-1">
                        {module.title}
                      </h3>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {module.lessons.length} {module.lessons.length === 1 ? "aula planejada" : "aulas planejadas"}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg">
                      <MoreVertical size={16} />
                    </Button>
                  } />
                  <DropdownMenuContent className="bg-popover border border-border rounded-lg shadow-md p-1 min-w-[180px] font-sans">
                    <DropdownMenuItem 
                      onClick={() => handleOpenRenameModule(module.id, module.title)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground cursor-pointer rounded-md transition-colors"
                    >
                      <Edit2 size={14} /> Renomear Módulo
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleOpenDeleteModule(module.id)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-destructive cursor-pointer rounded-md transition-colors"
                    >
                      <Trash2 size={14} /> Excluir Módulo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <AccordionContent className="p-0">
                <div className="flex flex-col px-4 pb-4 space-y-1">
                  {module.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="px-4 py-3 flex items-center justify-between rounded-lg hover:bg-muted/40 transition-colors group/lesson border border-transparent hover:border-border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover/lesson:bg-primary-accent dark:group-hover/lesson:bg-primary-dark/30 group-hover/lesson:text-primary transition-colors">
                          {lesson.type === "video" ? (
                            <Video size={16} />
                          ) : lesson.type === "text" ? (
                            <FileText size={16} />
                          ) : (
                            <HelpCircle size={16} />
                          )}
                        </div>
                        <span className="text-base font-bold text-zinc-600 dark:text-zinc-400 group-hover/lesson:text-zinc-900 dark:group-hover/lesson:text-zinc-100 transition-colors font-sans">
                          {lesson.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        {lesson.published ? (
                          <Badge variant="outline" className="bg-primary-light border-primary-hover text-primary text-[9px] uppercase tracking-widest rounded-full h-6 px-3 font-bold font-sans">
                            <CheckCircle2 size={10} className="mr-1" /> PUBLICADA
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 text-[9px] uppercase tracking-widest rounded-full h-6 px-3 font-bold font-sans">
                            <AlertCircle size={10} className="mr-1" /> RASCUNHO
                          </Badge>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100">
                              <MoreVertical size={16} />
                            </Button>
                          } />
                          <DropdownMenuContent className="bg-white border-zinc-100 rounded-xl shadow-xl p-2 min-w-[200px] font-sans">
                            <DropdownMenuItem 
                              onClick={() => handleTogglePublishLesson(module.id, lesson)}
                              className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-primary cursor-pointer rounded-lg transition-colors"
                            >
                              {lesson.published ? (
                                <>
                                  <EyeOff size={16} /> Tornar Rascunho
                                </>
                              ) : (
                                <>
                                  <Eye size={16} /> Publicar Aula
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleOpenRenameLesson(module.id, lesson.id, lesson.title)}
                              className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-primary cursor-pointer rounded-lg transition-colors"
                            >
                              <Edit2 size={16} /> Renomear Aula
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleOpenDeleteLesson(module.id, lesson.id)}
                              className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-600 cursor-pointer rounded-lg transition-colors"
                            >
                              <Trash2 size={16} /> Excluir Aula
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={() => handleOpenAddLesson(module.id)}
                    className="w-full py-3 text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 border border-dashed border-border hover:border-primary/40 transition-all rounded-lg mt-2 flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> Adicionar Nova Aula ao Módulo
                  </button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* --- Dialog Customizado Unificado --- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card border border-border !p-6 rounded-xl shadow-lg font-sans max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold text-foreground font-heading">
              {metadata.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium mt-1 leading-relaxed">
              {metadata.description}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDialogSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2.5">
                <AlertCircle className="text-destructive shrink-0" size={16} />
                <span className="text-xs font-medium text-destructive">{errorMsg}</span>
              </div>
            )}
            {/* Renderizar Inputs com base no tipo de Dialog */}
            {(dialogType === "create-module" || dialogType === "rename-module" || dialogType === "create-lesson" || dialogType === "rename-lesson") && (
              <div className="space-y-2">
                <Label className="block text-xs font-semibold text-muted-foreground">
                  {dialogType.includes("module") ? "Nome do Módulo *" : "Nome da Aula *"}
                </Label>
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={dialogType.includes("module") ? "Ex: Módulo 01 - Fundamentos" : "Ex: Aula 01 - Introdução"}
                  required
                  className="w-full bg-background border border-border rounded-lg h-10 px-3.5 text-foreground text-sm font-medium focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 focus:outline-none"
                />
              </div>
            )}

            {dialogType === "create-lesson" && (
              <div className="space-y-2">
                <Label className="block text-xs font-semibold text-muted-foreground">
                  Tipo do Conteúdo
                </Label>
                <Select value={typeInput} onValueChange={(val) => { if (val) setTypeInput(val as "video" | "text" | "quiz"); }}>
                  <SelectTrigger className="w-full bg-background border border-border rounded-lg h-10 px-3.5 text-foreground text-xs font-medium focus:outline-none flex justify-between items-center">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border rounded-lg shadow-md p-1 min-w-[180px]">
                    <SelectItem value="video" className="px-3 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-md cursor-pointer transition-colors">Vídeo Aula</SelectItem>
                    <SelectItem value="text" className="px-3 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-md cursor-pointer transition-colors">Conteúdo Escrito</SelectItem>
                    <SelectItem value="quiz" className="px-3 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-md cursor-pointer transition-colors">Questionário / Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Ações de exclusão de aviso */}
            {(dialogType === "delete-module" || dialogType === "delete-lesson") && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2.5">
                <AlertCircle className="text-destructive shrink-0" size={16} />
                <span className="text-xs font-medium text-destructive">Atenção: Esta ação removerá definitivamente os dados associados.</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 mt-6 bg-transparent border-none p-0 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold rounded-lg h-10 px-4"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "text-xs text-primary-foreground font-semibold rounded-lg h-10 px-5 shadow-xs",
                  dialogType?.startsWith("delete") 
                    ? "bg-destructive hover:bg-destructive/90 text-white" 
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
              >
                {isSubmitting ? "Processando..." : dialogType?.startsWith("delete") ? "Confirmar Exclusão" : "Confirmar Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
