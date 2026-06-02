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
  DialogFooter,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter italic text-zinc-900 dark:text-zinc-100 font-heading">
            Estrutura_<span className="text-primary">Curricular</span>
          </h2>
          <p className="text-xs text-zinc-400 font-bold mt-1 uppercase tracking-widest font-sans">PROJETO: {courseTitle}</p>
        </div>
        <Button 
          onClick={handleOpenAddModule}
          className="bg-primary hover:opacity-90 text-white rounded-full h-12 px-8 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 transition-all font-heading self-start sm:self-auto"
        >
          <Plus size={16} className="mr-2" /> NOVO_MÓDULO
        </Button>
      </div>

      {modules.length === 0 ? (
        <div className="py-16 text-center text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[32px]">
          Nenhum módulo cadastrado. Adicione um novo módulo para começar.
        </div>
      ) : (
        <Accordion multiple className="w-full space-y-6">
          {modules.map((module) => (
            <AccordionItem
              key={module.id}
              value={module.id}
              className="border-none bg-white dark:bg-zinc-900 shadow-[10px_10px_30px_#efefef] dark:shadow-none dark:border dark:border-zinc-800 rounded-[32px] overflow-hidden transition-all hover:shadow-primary/5 group/module"
            >
              <div className="flex items-center justify-between pr-6 bg-white dark:bg-zinc-900">
                <AccordionTrigger className="px-8 py-6 hover:no-underline transition-colors group flex-1">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-12 h-12 bg-primary-light rounded-2xl flex items-center justify-center">
                      <span className="font-bold text-primary text-xs font-heading">
                        {module.title.slice(0, 2).match(/^\d+$/) ? module.title.slice(0, 2) : "M"}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-black uppercase tracking-tight text-lg text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors font-heading break-all line-clamp-1">
                        {module.title}
                      </h3>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-sans">
                        {module.lessons.length} AULAS PLANEJADAS
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl">
                      <MoreVertical size={20} />
                    </Button>
                  } />
                  <DropdownMenuContent className="bg-white border-zinc-100 rounded-xl shadow-xl p-2 min-w-[200px] font-sans">
                    <DropdownMenuItem 
                      onClick={() => handleOpenRenameModule(module.id, module.title)}
                      className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-primary cursor-pointer rounded-lg transition-colors"
                    >
                      <Edit2 size={16} /> Renomear Módulo
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleOpenDeleteModule(module.id)}
                      className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-600 cursor-pointer rounded-lg transition-colors"
                    >
                      <Trash2 size={16} /> Excluir Módulo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <AccordionContent className="p-0">
                <div className="flex flex-col px-4 pb-4">
                  {module.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="px-6 py-5 flex items-center justify-between rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group/lesson"
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
                    className="w-full py-6 text-xs font-bold text-zinc-400 hover:text-primary hover:bg-primary-light dark:hover:bg-primary-dark/20 transition-all uppercase tracking-[0.2em] italic rounded-2xl mt-2 font-heading"
                  >
                    [+] ADICIONAR NOVA AULA AO FLUXO
                  </button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* --- Dialog Customizado Unificado --- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900 !p-8 rounded-[32px] border-none shadow-2xl font-sans max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-zinc-900 dark:text-zinc-100">
              {metadata.title.split(' ')[0]}_<span className="text-primary">{metadata.title.split(' ').slice(1).join(' ')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-2 leading-relaxed">
              {metadata.description}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDialogSubmit} className="space-y-6">
            {errorMsg && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-500/10 rounded-2xl flex items-center gap-3">
                <AlertCircle className="text-red-500 shrink-0" size={20} />
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">{errorMsg}</span>
              </div>
            )}
            {/* Renderizar Inputs com base no tipo de Dialog */}
            {(dialogType === "create-module" || dialogType === "rename-module" || dialogType === "create-lesson" || dialogType === "rename-lesson") && (
              <div className="space-y-3">
                <Label className="block mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                  {dialogType.includes("module") ? "Nome do Módulo" : "Nome da Aula"}
                </Label>
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={dialogType.includes("module") ? "Ex: Módulo 01 - Fundamentos" : "Ex: Aula 01 - Introdução"}
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl !h-12 !px-5 text-zinc-900 dark:text-zinc-100 font-bold placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 focus:outline-none"
                />
              </div>
            )}

            {dialogType === "create-lesson" && (
              <div className="space-y-3">
                <Label className="block mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                  Tipo do Conteúdo
                </Label>
                <Select value={typeInput} onValueChange={(val) => { if (val) setTypeInput(val as "video" | "text" | "quiz"); }}>
                  <SelectTrigger className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl !h-12 !px-5 text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none flex justify-between items-center">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-xl p-2 min-w-[200px]">
                    <SelectItem value="video" className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors">Vídeo Aula</SelectItem>
                    <SelectItem value="text" className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors">Conteúdo Escrito</SelectItem>
                    <SelectItem value="quiz" className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors">Questionário / Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Ações de exclusão de aviso */}
            {(dialogType === "delete-module" || dialogType === "delete-lesson") && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-500/10 rounded-2xl flex items-center gap-3">
                <AlertCircle className="text-red-500 shrink-0" size={20} />
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Atenção: Esta ação removerá definitivamente os dados do banco.</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-8 bg-transparent border-none p-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="flex-1 text-[10px] text-zinc-400 hover:text-zinc-600 uppercase tracking-widest font-black transition-all rounded-full h-12"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "flex-1 text-[10px] text-white font-black uppercase tracking-widest rounded-full h-12 transition-all shadow-lg",
                  dialogType?.startsWith("delete") 
                    ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" 
                    : "bg-primary hover:opacity-90 shadow-primary/20"
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
