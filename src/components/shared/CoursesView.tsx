"use client";

import React from "react";
import { GraduationCap, Plus, Trash2, Video, FileText, HelpCircle, ChevronRight, BookOpen, Layers, Link2, Download, Send } from "lucide-react";
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
    deleteCourse,
    createCourseModule,
    deleteCourseModule,
    createCourseLesson,
    deleteCourseLesson,
  } = useAppStore();

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

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !moduleTitle.trim()) return;

    setLoading(true);
    await createCourseModule(activeCourse.id, moduleTitle.trim());
    setLoading(false);
    setModuleTitle("");
    setOpenCreateModule(false);
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

  const handlePublishCourse = () => {
    if (!activeCourse) return;
    if (activeCourse.modules.length === 0) {
      toast.error("Não é possível publicar: o curso precisa ter pelo menos um módulo.");
      return;
    }
    const emptyModule = activeCourse.modules.find(m => m.lessons.length === 0);
    if (emptyModule) {
      toast.error(`Não é possível publicar: o módulo "${emptyModule.title}" está vazio.`);
      return;
    }
    toast.success(`Curso "${activeCourse.title}" validado e publicado com sucesso!`);
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

        <Button
          onClick={() => setOpenCreateCourse(true)}
          className="rounded-lg px-5 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs tracking-wide gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" /> Criar Novo Curso
        </Button>
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
                  </div>
                  <h3 className="text-xl font-bold text-foreground font-heading">
                    {activeCourse.title}
                  </h3>
                  {activeCourse.description && (
                    <p className="text-xs text-zinc-500 mt-1 max-w-xl leading-relaxed">
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
                    <Download className="w-3.5 h-3.5" /> Exportar JSON
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePublishCourse}
                    className="rounded-lg h-9 px-3 text-xs font-semibold gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                    title="Validar e publicar curso (FE-22)"
                  >
                    <Send className="w-3.5 h-3.5" /> Publicar Curso
                  </Button>
                  <Button
                    onClick={() => setOpenCreateModule(true)}
                    className="rounded-lg h-9 px-3.5 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Módulo
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCourse(activeCourse.id)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive rounded-lg"
                    title="Excluir curso"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Lista de Módulos */}
              <div className="space-y-3.5">
                {activeCourse.modules.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground font-medium border border-dashed border-border rounded-lg">
                    Este curso ainda não possui módulos. Clique em &quot;Adicionar Módulo&quot; para iniciar o roteiro!
                  </div>
                ) : (
                  activeCourse.modules.map((module) => (
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
                        </div>

                        <div className="flex items-center gap-1.5">
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
                            onClick={() => deleteCourseModule(activeCourse.id, module.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-md"
                            title="Excluir módulo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Aulas do Módulo */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                        {module.lessons.length === 0 ? (
                          <div className="col-span-full py-3 text-center text-[11px] text-muted-foreground font-medium">
                            Nenhuma aula neste módulo ainda.
                          </div>
                        ) : (
                          module.lessons.map((lesson) => {
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
                                      <div className="text-[9px] text-primary flex items-center gap-1 font-semibold truncate mt-0.5">
                                        <Link2 className="w-2.5 h-2.5 shrink-0" />
                                        <span>Projeto: {linkedProject.title}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteCourseLesson(activeCourse.id, module.id, lesson.id)}
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive rounded-md shrink-0"
                                  title="Excluir aula"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
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
                <label htmlFor="course-description-input" className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Descrição
                </label>
                <Textarea
                  id="course-description-input"
                  placeholder="Resumo pedagógico do curso..."
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  className="rounded-lg text-xs min-h-[80px] border-border"
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
                className="rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? "Criando..." : "Salvar Curso"}
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
                Adicionar Módulo
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Curso: {activeCourse?.title}
              </DialogDescription>
            </DialogHeader>

            <div className="my-5">
              <label htmlFor="module-title-input" className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Nome do Módulo *
              </label>
              <Input
                id="module-title-input"
                required
                placeholder="Ex: Módulo 1: Fundamentos da Linguagem"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                className="rounded-lg h-10 text-sm border-border"
              />
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpenCreateModule(false)} className="rounded-lg text-xs font-semibold">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !moduleTitle.trim()}
                className="rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? "Salvando..." : "Adicionar Módulo"}
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
                className="rounded-lg text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? "Salvando..." : "Salvar Aula"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
