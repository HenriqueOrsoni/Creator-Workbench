"use client";

import React from "react";
import {
  GraduationCap, Plus, Trash2, Video, FileText, HelpCircle,
  BookOpen, Link2, Download, Pencil, CheckCircle2, AlertCircle,
  FileSpreadsheet, Globe, ChevronRight, Layers, ChevronUp, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

export function CoursesView() {
  const {
    courses,
    activeCourse,
    board,
    fetchCourses,
    fetchCourseDetails,
    createCourse,
    updateCourse,
    deleteCourse,
    createCourseModule,
    updateCourseModule,
    deleteCourseModule,
    createCourseLesson,
    updateCourseLesson,
    deleteCourseLesson,
    checkCoursePublication,
    publishCourse,
    unpublishCourse,
    exportCourseCsv,
    reorderCourseModules,
    reorderCourseLessons,
    activeTeam,
  } = useAppStore();
  const isReviewer = activeTeam?.role === "REVIEWER";
  const canEditCourses = !isReviewer;

  const [openCreateCourse, setOpenCreateCourse] = React.useState(false);
  const [courseTitle, setCourseTitle] = React.useState("");
  const [courseDescription, setCourseDescription] = React.useState("");

  const [openCreateModule, setOpenCreateModule] = React.useState(false);
  const [moduleTitle, setModuleTitle] = React.useState("");

  const [openCreateLesson, setOpenCreateLesson] = React.useState(false);
  const [selectedModuleId, setSelectedModuleId] = React.useState<string>("");
  const [lessonTitle, setLessonTitle] = React.useState("");
  const [lessonType, setLessonType] = React.useState<"VIDEO" | "TEXT" | "QUIZ">("VIDEO");
  const [linkedProjectId, setLinkedProjectId] = React.useState<string>("");

  // Estados para Edição (FE-55 / FE-21)
  const [editingCourse, setEditingCourse] = React.useState<{ id: string; title: string; description: string } | null>(null);
  const [editingModule, setEditingModule] = React.useState<{ id: string; title: string } | null>(null);
  const [editingLesson, setEditingLesson] = React.useState<{
    moduleId: string;
    lessonId: string;
    title: string;
    type: "VIDEO" | "TEXT" | "QUIZ";
    projectId?: string;
    description?: string;
    contentUrl?: string;
  } | null>(null);

  // Estados para Publicação e Validação (FE-22)
  const [validationProblems, setValidationProblems] = React.useState<Array<{ type: string; message: string; moduleTitle?: string; lessonTitle?: string }>>([]);
  const [openValidationDialog, setOpenValidationDialog] = React.useState(false);
  const [openPublishConfirm, setOpenPublishConfirm] = React.useState(false);

  // Estados para Confirmação de Exclusão (BF-15)
  const [courseToDelete, setCourseToDelete] = React.useState<{ id: string; title: string } | null>(null);
  const [moduleToDelete, setModuleToDelete] = React.useState<{ moduleId: string; title: string } | null>(null);
  const [lessonToDelete, setLessonToDelete] = React.useState<{ moduleId: string; lessonId: string; title: string } | null>(null);

  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Lista todos os cards de projeto do quadro para permitir vínculo com lições
  const allProjects = React.useMemo(() => {
    if (!board) return [];
    return board.columns.flatMap(c => c.cards);
  }, [board]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) return;

    setLoading(true);
    const created = await createCourse(courseTitle.trim(), courseDescription.trim() || undefined);
    setLoading(false);

    if (created) {
      setCourseTitle("");
      setCourseDescription("");
      setOpenCreateCourse(false);
      fetchCourseDetails(created.id);
    }
  };

  const handleEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse || !editingCourse.title.trim()) return;

    setLoading(true);
    await updateCourse(editingCourse.id, editingCourse.title.trim(), editingCourse.description.trim() || undefined);
    setLoading(false);
    setEditingCourse(null);
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !moduleTitle.trim()) return;

    setLoading(true);
    await createCourseModule(activeCourse.id, moduleTitle.trim());
    setLoading(false);
    setModuleTitle("");
    setOpenCreateModule(false);
  };

  const handleEditModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !editingModule || !editingModule.title.trim()) return;

    setLoading(true);
    await updateCourseModule(activeCourse.id, editingModule.id, editingModule.title.trim());
    setLoading(false);
    setEditingModule(null);
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !selectedModuleId || !lessonTitle.trim()) return;

    setLoading(true);
    await createCourseLesson(
      activeCourse.id,
      selectedModuleId,
      lessonTitle.trim(),
      lessonType,
      linkedProjectId || undefined
    );
    setLoading(false);
    setLessonTitle("");
    setLinkedProjectId("");
    setOpenCreateLesson(false);
  };

  const handleEditLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !editingLesson || !editingLesson.title.trim()) return;

    setLoading(true);
    await updateCourseLesson(activeCourse.id, editingLesson.moduleId, editingLesson.lessonId, {
      title: editingLesson.title.trim(),
      type: editingLesson.type,
      projectId: editingLesson.projectId ? Number(editingLesson.projectId) : undefined,
    });
    setLoading(false);
    setEditingLesson(null);
  };

  const handleStartPublish = async () => {
    if (!activeCourse) return;
    setLoading(true);
    const result = await checkCoursePublication(activeCourse.id);
    setLoading(false);
    if (!result.publishable) {
      setValidationProblems(result.problems);
      setOpenValidationDialog(true);
    } else {
      setOpenPublishConfirm(true);
    }
  };

  const handleConfirmPublish = async () => {
    if (!activeCourse) return;
    setLoading(true);
    await publishCourse(activeCourse.id);
    setLoading(false);
    setOpenPublishConfirm(false);
  };

  const handleUnpublishCourse = async () => {
    if (!activeCourse) return;
    setLoading(true);
    await unpublishCourse(activeCourse.id);
    setLoading(false);
  };

  const handleMoveModule = async (index: number, direction: "up" | "down") => {
    if (!activeCourse) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeCourse.modules.length) return;
    const newModules = [...activeCourse.modules];
    const [moved] = newModules.splice(index, 1);
    newModules.splice(targetIndex, 0, moved);
    await reorderCourseModules(activeCourse.id, newModules.map(m => m.id));
  };

  const handleMoveLesson = async (moduleId: string, lessonIndex: number, direction: "up" | "down") => {
    if (!activeCourse) return;
    const mod = activeCourse.modules.find(m => m.id === moduleId);
    if (!mod) return;
    const targetIndex = direction === "up" ? lessonIndex - 1 : lessonIndex + 1;
    if (targetIndex < 0 || targetIndex >= mod.lessons.length) return;
    const newLessons = [...mod.lessons];
    const [moved] = newLessons.splice(lessonIndex, 1);
    newLessons.splice(targetIndex, 0, moved);
    await reorderCourseLessons(activeCourse.id, moduleId, newLessons.map(l => l.id));
  };

  const confirmDeleteCourse = async () => {
    if (!courseToDelete) return;
    await deleteCourse(courseToDelete.id);
    setCourseToDelete(null);
  };

  const confirmDeleteModule = async () => {
    if (!activeCourse || !moduleToDelete) return;
    await deleteCourseModule(activeCourse.id, moduleToDelete.moduleId);
    setModuleToDelete(null);
  };

  const confirmDeleteLesson = async () => {
    if (!activeCourse || !lessonToDelete) return;
    await deleteCourseLesson(activeCourse.id, lessonToDelete.moduleId, lessonToDelete.lessonId);
    setLessonToDelete(null);
  };

  const handleExportCourseStructure = () => {
    if (!activeCourse) return;
    const exportData = {
      courseId: activeCourse.id,
      title: activeCourse.title,
      description: activeCourse.description || "",
      createdAt: activeCourse.createdAt,
      modulesCount: activeCourse.modules.length,
      modules: activeCourse.modules.map(m => ({
        id: m.id,
        title: m.title,
        sortOrder: m.sortOrder,
        lessonsCount: m.lessons.length,
        lessons: m.lessons.map(l => ({
          id: l.id,
          title: l.title,
          type: l.type,
          published: l.published,
          projectId: l.projectId
        }))
      }))
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = activeCourse.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    a.download = `curso-${safeTitle}-estrutura.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Estrutura do curso exportada em JSON!");
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case "TEXT":
        return <FileText className="w-3.5 h-3.5 text-sky-500" />;
      case "QUIZ":
        return <HelpCircle className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Video className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header de Cursos */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
            <GraduationCap className="w-4 h-4" /> Gestão Curricular • Cursos da Equipe
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-heading">
            Cursos, Módulos & Aulas
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Hierarquia pedagógica: Curso contém Módulos, que contêm Aulas conectadas aos projetos de produção.
          </p>
        </div>

        {canEditCourses && (
          <Button
            onClick={() => setOpenCreateCourse(true)}
            className="rounded-lg px-5 h-10 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs tracking-wide gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Criar Novo Curso
          </Button>
        )}
      </div>

      {/* Grid de Seleção de Curso */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2">
            Cursos Cadastrados ({courses.length})
          </div>
          {courses.length === 0 ? (
            <div className="p-6 rounded-xl bg-muted/30 border border-dashed border-border text-center text-xs text-muted-foreground">
              Nenhum curso cadastrado ainda.
            </div>
          ) : (
            courses.map((c) => {
              const isSelected = activeCourse?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => fetchCourseDetails(c.id)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? "bg-primary/10 border-primary text-foreground shadow-xs font-semibold"
                      : "bg-card border-border hover:border-primary/40 text-foreground"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-medium text-xs truncate">{c.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {c.modulesCount} {c.modulesCount === 1 ? "módulo" : "módulos"}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? "text-primary translate-x-1" : "text-muted-foreground/50 group-hover:text-muted-foreground"}`} />
                </div>
              );
            })
          )}
        </div>

        {/* Detalhes do Curso Selecionado e Árvore de Módulos */}
        <div className="md:col-span-3">
          {!activeCourse ? (
            <div className="py-20 text-center bg-card rounded-xl border border-dashed border-border flex flex-col items-center justify-center p-6">
              <Layers className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">
                Selecione ou crie um curso ao lado
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Veja os módulos, organize a trilha pedagógica e conecte as gravações às suas aulas.
              </p>
            </div>
          ) : (
            <Card className="p-6 rounded-xl bg-card border-border shadow-xs space-y-6">
              {/* Header do Curso Ativo */}
              <div className="flex items-start justify-between gap-4 pb-6 border-b border-border">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
                      Curso Ativo
                    </Badge>
                    {activeCourse.status === "PUBLISHED" ? (
                      <Badge className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <Globe className="w-3 h-3 mr-1" /> Publicado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-border">
                        Rascunho
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-foreground font-heading">
                      {activeCourse.title}
                    </h3>
                    {canEditCourses && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingCourse({
                          id: activeCourse.id,
                          title: activeCourse.title,
                          description: activeCourse.description || ""
                        })}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                        title="Editar curso"
                        aria-label="Editar curso"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  {activeCourse.description && (
                    <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
                      {activeCourse.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={handleExportCourseStructure}
                    className="rounded-lg h-9 px-3 text-xs font-medium gap-1.5 border-border"
                    title="Exportar estrutura em JSON (FE-23)"
                  >
                    <Download className="w-3.5 h-3.5" /> JSON
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportCourseCsv(activeCourse.id)}
                    className="rounded-lg h-9 px-3 text-xs font-medium gap-1.5 border-border"
                    title="Exportar estrutura em CSV para Excel (FE-23)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> CSV
                  </Button>
                  {canEditCourses && (
                    <>
                      {activeCourse.status === "PUBLISHED" ? (
                        <Button
                          variant="outline"
                          onClick={handleUnpublishCourse}
                          disabled={loading}
                          className="rounded-lg h-9 px-3 text-xs font-medium text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                        >
                          Despublicar
                        </Button>
                      ) : (
                        <Button
                          onClick={handleStartPublish}
                          disabled={loading}
                          className="rounded-lg h-9 px-3.5 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          title="Verificar e Publicar Curso (FE-22)"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Publicar Curso
                        </Button>
                      )}
                      <Button
                        onClick={() => setOpenCreateModule(true)}
                        className="rounded-lg h-9 px-3.5 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Módulo
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCourseToDelete({ id: activeCourse.id, title: activeCourse.title })}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive rounded-lg"
                        title="Excluir curso"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Lista de Módulos */}
              <div className="space-y-3.5">
                {activeCourse.modules.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground font-medium border border-dashed border-border rounded-lg">
                    Este curso ainda não possui módulos. Clique em &quot;Adicionar Módulo&quot; para iniciar o roteiro!
                  </div>
                ) : (
                  activeCourse.modules.map((module, moduleIndex) => (
                    <div
                      key={module.id}
                      className="p-4 rounded-lg bg-muted/30 border border-border space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                            {module.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            ({module.lessons.length} {module.lessons.length === 1 ? "aula" : "aulas"})
                          </span>
                          {canEditCourses && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingModule({ id: module.id, title: module.title })}
                              className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md"
                              title="Renomear módulo"
                              aria-label={`Renomear módulo ${module.title}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          )}
                        </div>

                        {canEditCourses && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={moduleIndex === 0}
                              onClick={() => handleMoveModule(moduleIndex, "up")}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-md disabled:opacity-30"
                              title="Mover módulo para cima"
                              aria-label="Mover módulo para cima"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={moduleIndex === activeCourse.modules.length - 1}
                              onClick={() => handleMoveModule(moduleIndex, "down")}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-md disabled:opacity-30"
                              title="Mover módulo para baixo"
                              aria-label="Mover módulo para baixo"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedModuleId(module.id);
                                setOpenCreateLesson(true);
                              }}
                              className="h-7 rounded-md text-[10px] font-semibold uppercase tracking-wider gap-1 border-border"
                            >
                              <Plus className="w-3 h-3" /> Nova Aula
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setModuleToDelete({ moduleId: module.id, title: module.title })}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-md"
                              title="Excluir módulo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Aulas do Módulo */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                        {module.lessons.length === 0 ? (
                          <div className="col-span-full py-3 text-center text-[11px] text-muted-foreground font-medium">
                            Nenhuma aula neste módulo ainda.
                          </div>
                        ) : (
                          module.lessons.map((lesson, lessonIndex) => {
                            const linkedProject = allProjects.find(p => p.id === lesson.projectId);
                            return (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between p-2.5 rounded-md bg-card border border-border shadow-2xs"
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  {getLessonIcon(lesson.type)}
                                  <div className="min-w-0">
                                    <div className="text-xs font-medium truncate text-foreground">
                                      {lesson.title}
                                    </div>
                                    {linkedProject && (
                                      <div className="text-[10px] text-primary flex items-center gap-1 font-semibold truncate mt-0.5">
                                        <Link2 className="w-2.5 h-2.5 shrink-0" />
                                        <span>Projeto: {linkedProject.title}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {canEditCourses && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={lessonIndex === 0}
                                      onClick={() => handleMoveLesson(module.id, lessonIndex, "up")}
                                      className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md disabled:opacity-30"
                                      title="Mover aula para cima"
                                      aria-label="Mover aula para cima"
                                    >
                                      <ChevronUp className="w-2.5 h-2.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={lessonIndex === module.lessons.length - 1}
                                      onClick={() => handleMoveLesson(module.id, lessonIndex, "down")}
                                      className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md disabled:opacity-30"
                                      title="Mover aula para baixo"
                                      aria-label="Mover aula para baixo"
                                    >
                                      <ChevronDown className="w-2.5 h-2.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setEditingLesson({
                                        moduleId: module.id,
                                        lessonId: lesson.id,
                                        title: lesson.title,
                                        type: lesson.type,
                                        projectId: lesson.projectId
                                      })}
                                      className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md"
                                      title="Editar aula"
                                      aria-label={`Editar aula ${lesson.title}`}
                                    >
                                      <Pencil className="w-2.5 h-2.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setLessonToDelete({
                                        moduleId: module.id,
                                        lessonId: lesson.id,
                                        title: lesson.title
                                      })}
                                      className="h-6 w-6 text-muted-foreground hover:text-destructive rounded-md"
                                      title="Excluir aula"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog Criar Curso */}
      <Dialog open={openCreateCourse} onOpenChange={setOpenCreateCourse}>
        <DialogContent className="sm:max-w-[440px] rounded-xl p-6 bg-card border-border shadow-lg">
          <form onSubmit={handleCreateCourse}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 font-heading text-foreground">
                <GraduationCap className="w-5 h-5 text-primary" />
                Criar Novo Curso
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Estruture a trilha de aprendizado para seus criadores e alunos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-5">
              <div>
                <label htmlFor="course-title-input" className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Título do Curso *
                </label>
                <Input
                  id="course-title-input"
                  required
                  placeholder="Ex: Formação em Criação de Conteúdo Digital"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="rounded-lg h-10 text-sm border-border"
                />
              </div>

              <div>
                <label htmlFor="course-desc-input" className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Descrição do Curso
                </label>
                <Textarea
                  id="course-desc-input"
                  placeholder="Objetivos pedagógicos, pré-requisitos e resumo geral..."
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  className="rounded-lg text-sm min-h-[90px] border-border"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpenCreateCourse(false)} className="rounded-lg text-xs font-semibold">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !courseTitle.trim()}
                className="rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
              >
                {loading ? "Criando..." : "Salvar Curso"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Curso (FE-55) */}
      <Dialog open={Boolean(editingCourse)} onOpenChange={(open) => !open && setEditingCourse(null)}>
        <DialogContent className="sm:max-w-[440px] rounded-xl p-6 bg-card border-border shadow-lg">
          <form onSubmit={handleEditCourse}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 font-heading text-foreground">
                <Pencil className="w-5 h-5 text-primary" />
                Editar Curso
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Atualize o título e a descrição deste curso.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-5">
              <div>
                <label htmlFor="edit-course-title" className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Título do Curso *
                </label>
                <Input
                  id="edit-course-title"
                  required
                  value={editingCourse?.title || ""}
                  onChange={(e) => setEditingCourse(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="rounded-lg h-10 text-sm border-border"
                />
              </div>

              <div>
                <label htmlFor="edit-course-desc" className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Descrição do Curso
                </label>
                <Textarea
                  id="edit-course-desc"
                  value={editingCourse?.description || ""}
                  onChange={(e) => setEditingCourse(prev => prev ? { ...prev, description: e.target.value } : null)}
                  className="rounded-lg text-sm min-h-[90px] border-border"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingCourse(null)} className="rounded-lg text-xs font-semibold">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !editingCourse?.title.trim()}
                className="rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Criar Módulo */}
      <Dialog open={openCreateModule} onOpenChange={setOpenCreateModule}>
        <DialogContent className="sm:max-w-[400px] rounded-xl p-6 bg-card border-border shadow-lg">
          <form onSubmit={handleCreateModule}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 font-heading text-foreground">
                <BookOpen className="w-5 h-5 text-primary" />
                Adicionar Novo Módulo
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Agrupe aulas afins em uma unidade temática de aprendizado.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-5">
              <div>
                <label htmlFor="module-title-input" className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Nome do Módulo *
                </label>
                <Input
                  id="module-title-input"
                  required
                  placeholder="Ex: Módulo 1: Fundamentos da Criação"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  className="rounded-lg h-10 text-sm border-border"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpenCreateModule(false)} className="rounded-lg text-xs font-semibold">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !moduleTitle.trim()}
                className="rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
              >
                {loading ? "Criando..." : "Salvar Módulo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Renomear Módulo (FE-55) */}
      <Dialog open={Boolean(editingModule)} onOpenChange={(open) => !open && setEditingModule(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-xl p-6 bg-card border-border shadow-lg">
          <form onSubmit={handleEditModule}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 font-heading text-foreground">
                <Pencil className="w-5 h-5 text-primary" />
                Renomear Módulo
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Altere o nome deste módulo temático.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-5">
              <div>
                <label htmlFor="edit-module-title" className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Nome do Módulo *
                </label>
                <Input
                  id="edit-module-title"
                  required
                  value={editingModule?.title || ""}
                  onChange={(e) => setEditingModule(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="rounded-lg h-10 text-sm border-border"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingModule(null)} className="rounded-lg text-xs font-semibold">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !editingModule?.title.trim()}
                className="rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Criar Aula */}
      <Dialog open={openCreateLesson} onOpenChange={setOpenCreateLesson}>
        <DialogContent className="sm:max-w-[440px] rounded-xl p-6 bg-card border-border shadow-lg">
          <form onSubmit={handleCreateLesson}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 font-heading text-foreground">
                <Video className="w-5 h-5 text-primary" />
                Adicionar Nova Aula
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure o formato e conecte opcionalmente com um card de projeto existente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-5">
              <div>
                <label htmlFor="lesson-title-input" className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Título da Aula *
                </label>
                <Input
                  id="lesson-title-input"
                  required
                  placeholder="Ex: Aula 1: Apresentação e Boas Práticas"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="rounded-lg h-10 text-sm border-border"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Formato da Aula
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLessonType("VIDEO")}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      lessonType === "VIDEO" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" /> Vídeo
                  </button>
                  <button
                    type="button"
                    onClick={() => setLessonType("TEXT")}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      lessonType === "TEXT" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Texto
                  </button>
                  <button
                    type="button"
                    onClick={() => setLessonType("QUIZ")}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      lessonType === "QUIZ" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Quiz
                  </button>
                </div>
              </div>

              {allProjects.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Vincular a Projeto do Quadro (Opcional)
                  </label>
                  <select
                    value={linkedProjectId}
                    onChange={(e) => setLinkedProjectId(e.target.value)}
                    className="w-full h-10 rounded-lg px-3 text-xs bg-muted/40 border border-border text-foreground font-medium"
                  >
                    <option value="">Nenhum projeto vinculado</option>
                    {allProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.columnName || "Projeto"})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpenCreateLesson(false)} className="rounded-lg text-xs font-semibold">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !lessonTitle.trim()}
                className="rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
              >
                {loading ? "Salvando..." : "Salvar Aula"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Aula (FE-55) */}
      <Dialog open={Boolean(editingLesson)} onOpenChange={(open) => !open && setEditingLesson(null)}>
        <DialogContent className="sm:max-w-[440px] rounded-xl p-6 bg-card border-border shadow-lg">
          <form onSubmit={handleEditLesson}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 font-heading text-foreground">
                <Pencil className="w-5 h-5 text-primary" />
                Editar Aula
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Altere o título, o formato ou vincule a outro projeto.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-5">
              <div>
                <label htmlFor="edit-lesson-title" className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Título da Aula *
                </label>
                <Input
                  id="edit-lesson-title"
                  required
                  value={editingLesson?.title || ""}
                  onChange={(e) => setEditingLesson(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="rounded-lg h-10 text-sm border-border"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Formato da Aula
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingLesson(prev => prev ? { ...prev, type: "VIDEO" } : null)}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      editingLesson?.type === "VIDEO" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" /> Vídeo
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLesson(prev => prev ? { ...prev, type: "TEXT" } : null)}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      editingLesson?.type === "TEXT" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Texto
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLesson(prev => prev ? { ...prev, type: "QUIZ" } : null)}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      editingLesson?.type === "QUIZ" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Quiz
                  </button>
                </div>
              </div>

              {allProjects.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Vincular a Projeto do Quadro
                  </label>
                  <select
                    value={editingLesson?.projectId || ""}
                    onChange={(e) => setEditingLesson(prev => prev ? { ...prev, projectId: e.target.value } : null)}
                    className="w-full h-10 rounded-lg px-3 text-xs bg-muted/40 border border-border text-foreground font-medium"
                  >
                    <option value="">Nenhum projeto vinculado</option>
                    {allProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.columnName || "Projeto"})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingLesson(null)} className="rounded-lg text-xs font-semibold">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !editingLesson?.title.trim()}
                className="rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão de Curso (BF-15) */}
      <Dialog open={Boolean(courseToDelete)} onOpenChange={(o) => !o && setCourseToDelete(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-xl p-6 bg-card border border-border shadow-lg font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 font-heading text-destructive">
              <Trash2 className="w-4 h-4" />
              Excluir Curso
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Tem certeza que deseja excluir o curso <strong className="text-foreground font-semibold">&ldquo;{courseToDelete?.title}&rdquo;</strong> e todos os seus módulos e aulas? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4 border-t border-border mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCourseToDelete(null)}
              className="rounded-lg text-xs font-medium"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteCourse}
              className="rounded-lg text-xs font-semibold"
            >
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão de Módulo (BF-15) */}
      <Dialog open={Boolean(moduleToDelete)} onOpenChange={(o) => !o && setModuleToDelete(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-xl p-6 bg-card border border-border shadow-lg font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 font-heading text-destructive">
              <Trash2 className="w-4 h-4" />
              Excluir Módulo
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Tem certeza que deseja excluir o módulo <strong className="text-foreground font-semibold">&ldquo;{moduleToDelete?.title}&rdquo;</strong> e todas as suas aulas? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4 border-t border-border mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModuleToDelete(null)}
              className="rounded-lg text-xs font-medium"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteModule}
              className="rounded-lg text-xs font-semibold"
            >
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão de Aula (BF-15) */}
      <Dialog open={Boolean(lessonToDelete)} onOpenChange={(o) => !o && setLessonToDelete(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-xl p-6 bg-card border border-border shadow-lg font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 font-heading text-destructive">
              <Trash2 className="w-4 h-4" />
              Excluir Aula
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Tem certeza que deseja excluir a aula <strong className="text-foreground font-semibold">&ldquo;{lessonToDelete?.title}&rdquo;</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4 border-t border-border mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLessonToDelete(null)}
              className="rounded-lg text-xs font-medium"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteLesson}
              className="rounded-lg text-xs font-semibold"
            >
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Diálogo de Validação de Publicação (FE-22) */}
      <Dialog open={openValidationDialog} onOpenChange={setOpenValidationDialog}>
        <DialogContent className="sm:max-w-[460px] rounded-xl p-6 bg-card border border-border shadow-lg font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 font-heading text-destructive">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Não é possível publicar: {validationProblems.length} problema{validationProblems.length > 1 ? "s" : ""}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Para publicar o curso, corrija as seguintes pendências pedagógicas:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 my-3 max-h-60 overflow-y-auto">
            {validationProblems.map((prob, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-xs text-foreground flex items-start gap-2.5"
              >
                <div className="w-2 h-2 rounded-full bg-destructive mt-1.5 shrink-0" />
                <div>
                  <p className="font-semibold">{prob.message}</p>
                  {prob.lessonTitle && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Adicione um link de vídeo/conteúdo ou vincule um material de apoio a esta aula.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              onClick={() => setOpenValidationDialog(false)}
              className="rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Publicação de Curso (FE-22) */}
      <Dialog open={openPublishConfirm} onOpenChange={setOpenPublishConfirm}>
        <DialogContent className="sm:max-w-[420px] rounded-xl p-6 bg-card border border-border shadow-lg font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 font-heading text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              Publicar Curso
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Todos os módulos e aulas atendem aos requisitos pedagógicos. Deseja tornar o curso <strong className="text-foreground font-semibold">&ldquo;{activeCourse?.title}&rdquo;</strong> público para a equipe?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4 border-t border-border mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpenPublishConfirm(false)}
              className="rounded-lg text-xs font-medium"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={handleConfirmPublish}
              className="rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? "Publicando..." : "Confirmar Publicação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
