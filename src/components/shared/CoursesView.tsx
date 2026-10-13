"use client";

import React from "react";
import { GraduationCap, Plus, Trash2, Video, FileText, HelpCircle, ChevronRight, BookOpen, Layers, Link2 } from "lucide-react";
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
    <div className="space-y-8 font-sans">
      {/* Header de Cursos */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/60 dark:bg-zinc-900/40 p-6 rounded-[28px] border border-zinc-200/60 dark:border-zinc-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary mb-1">
            <GraduationCap className="w-4 h-4" /> Gestão Curricular • Cursos da Equipe
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 font-heading">
            Cursos, Módulos & Aulas
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Hierarquia pedagógica: Curso contém Módulos, que contêm Aulas conectadas aos projetos de produção.
          </p>
        </div>

        <Button
          onClick={() => setOpenCreateCourse(true)}
          className="rounded-2xl px-6 h-12 bg-zinc-900 hover:bg-zinc-800 dark:bg-primary text-white font-bold uppercase text-xs tracking-wider gap-2 shadow-lg shadow-primary/10"
        >
          <Plus className="w-4 h-4" /> Criar Novo Curso
        </Button>
      </div>

      {/* Grid de Seleção de Curso */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-3">
          <div className="text-[11px] font-black uppercase tracking-wider text-zinc-400 px-2">
            Cursos Cadastrados ({courses.length})
          </div>
          {courses.length === 0 ? (
            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/30 border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
              Nenhum curso cadastrado ainda.
            </div>
          ) : (
            courses.map((c) => {
              const isSelected = activeCourse?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => fetchCourseDetails(c.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? "bg-primary/10 border-primary text-primary dark:text-white shadow-md"
                      : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-bold text-xs truncate">{c.title}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      {c.modulesCount} {c.modulesCount === 1 ? "módulo" : "módulos"}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? "text-primary translate-x-1" : "text-zinc-300 group-hover:text-zinc-500"}`} />
                </div>
              );
            })
          )}
        </div>

        {/* Detalhes do Curso Selecionado e Árvore de Módulos */}
        <div className="md:col-span-3">
          {!activeCourse ? (
            <div className="py-24 text-center bg-white/40 dark:bg-zinc-900/20 rounded-[32px] border border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center p-6">
              <Layers className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Selecione ou crie um curso ao lado
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                Veja os módulos, organize a trilha pedagógica e conecte as gravações às suas aulas.
              </p>
            </div>
          ) : (
            <Card className="p-8 rounded-[32px] bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 space-y-6">
              {/* Header do Curso Ativo */}
              <div className="flex items-start justify-between gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800">
                      Curso Ativo
                    </Badge>
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 font-heading">
                    {activeCourse.title}
                  </h3>
                  {activeCourse.description && (
                    <p className="text-xs text-zinc-500 mt-1 max-w-xl leading-relaxed">
                      {activeCourse.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setOpenCreateModule(true)}
                    className="rounded-xl h-10 px-4 text-xs font-bold uppercase tracking-wider gap-2 bg-zinc-900 text-white dark:bg-primary"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Módulo
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCourse(activeCourse.id)}
                    className="h-10 w-10 text-zinc-400 hover:text-red-500 rounded-xl"
                    title="Excluir curso"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Lista de Módulos */}
              <div className="space-y-4">
                {activeCourse.modules.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-400 font-medium border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    Este curso ainda não possui módulos. Clique em &quot;Adicionar Módulo&quot; para iniciar o roteiro!
                  </div>
                ) : (
                  activeCourse.modules.map((module) => (
                    <div
                      key={module.id}
                      className="p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <span className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                            {module.title}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-bold">
                            ({module.lessons.length} {module.lessons.length === 1 ? "aula" : "aulas"})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedModuleId(module.id);
                              setOpenCreateLesson(true);
                            }}
                            className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider gap-1"
                          >
                            <Plus className="w-3 h-3" /> Nova Aula
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCourseModule(activeCourse.id, module.id)}
                            className="h-8 w-8 text-zinc-400 hover:text-red-500 rounded-lg"
                            title="Excluir módulo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Aulas do Módulo */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-6">
                        {module.lessons.length === 0 ? (
                          <div className="col-span-full py-4 text-center text-[11px] text-zinc-400 font-medium">
                            Nenhuma aula neste módulo ainda.
                          </div>
                        ) : (
                          module.lessons.map((lesson) => {
                            const linkedProject = allProjects.find(p => p.id === lesson.projectId);
                            return (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  {getLessonIcon(lesson.type)}
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold truncate text-zinc-800 dark:text-zinc-200">
                                      {lesson.title}
                                    </div>
                                    {linkedProject && (
                                      <div className="text-[9px] text-primary flex items-center gap-1 font-bold truncate mt-0.5">
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
                                  className="h-7 w-7 text-zinc-400 hover:text-red-500 rounded-lg shrink-0"
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
        <DialogContent className="sm:max-w-[440px] rounded-3xl p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <form onSubmit={handleCreateCourse}>
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 font-heading">
                <GraduationCap className="w-5 h-5 text-primary" />
                Criar Novo Curso
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Estruture a trilha de aprendizado para seus criadores e alunos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-5">
              <div>
                <label htmlFor="course-title-input" className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                  Título do Curso *
                </label>
                <Input
                  id="course-title-input"
                  required
                  placeholder="Ex: Formação em Criação de Conteúdo Digital"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="rounded-xl h-11 text-sm"
                />
              </div>
              <div>
                <label htmlFor="course-description-input" className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                  Descrição
                </label>
                <Textarea
                  id="course-description-input"
                  placeholder="Resumo pedagógico do curso..."
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  className="rounded-xl text-xs min-h-[80px]"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpenCreateCourse(false)} className="rounded-xl text-xs font-bold">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !courseTitle.trim()}
                className="rounded-xl text-xs font-bold uppercase tracking-wider bg-zinc-900 text-white dark:bg-primary"
              >
                {loading ? "Criando..." : "Salvar Curso"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Criar Módulo */}
      <Dialog open={openCreateModule} onOpenChange={setOpenCreateModule}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <form onSubmit={handleCreateModule}>
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 font-heading">
                <BookOpen className="w-5 h-5 text-primary" />
                Adicionar Módulo
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Curso: {activeCourse?.title}
              </DialogDescription>
            </DialogHeader>

            <div className="my-5">
              <label htmlFor="module-title-input" className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                Nome do Módulo *
              </label>
              <Input
                id="module-title-input"
                required
                placeholder="Ex: Módulo 1: Fundamentos da Linguagem"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                className="rounded-xl h-11 text-sm"
              />
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpenCreateModule(false)} className="rounded-xl text-xs font-bold">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !moduleTitle.trim()}
                className="rounded-xl text-xs font-bold uppercase tracking-wider bg-zinc-900 text-white dark:bg-primary"
              >
                {loading ? "Salvando..." : "Adicionar Módulo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Criar Aula */}
      <Dialog open={openCreateLesson} onOpenChange={setOpenCreateLesson}>
        <DialogContent className="sm:max-w-[440px] rounded-3xl p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <form onSubmit={handleCreateLesson}>
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 font-heading">
                <Video className="w-5 h-5 text-primary" />
                Adicionar Nova Aula
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Configure o formato e conecte opcionalmente com um card de projeto existente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-5">
              <div>
                <label htmlFor="lesson-title-input" className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                  Título da Aula *
                </label>
                <Input
                  id="lesson-title-input"
                  required
                  placeholder="Ex: Aula 1: Apresentação e Boas Práticas"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="rounded-xl h-11 text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                  Formato da Aula
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLessonType("VIDEO")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      lessonType === "VIDEO" ? "border-primary bg-primary/10 text-primary" : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" /> Vídeo
                  </button>
                  <button
                    type="button"
                    onClick={() => setLessonType("TEXT")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      lessonType === "TEXT" ? "border-primary bg-primary/10 text-primary" : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Texto
                  </button>
                  <button
                    type="button"
                    onClick={() => setLessonType("QUIZ")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      lessonType === "QUIZ" ? "border-primary bg-primary/10 text-primary" : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Quiz
                  </button>
                </div>
              </div>

              {allProjects.length > 0 && (
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                    Vincular a Projeto do Quadro (Opcional)
                  </label>
                  <select
                    value={linkedProjectId}
                    onChange={(e) => setLinkedProjectId(e.target.value)}
                    className="w-full h-11 rounded-xl px-3 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-medium"
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
              <Button type="button" variant="ghost" onClick={() => setOpenCreateLesson(false)} className="rounded-xl text-xs font-bold">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !lessonTitle.trim()}
                className="rounded-xl text-xs font-bold uppercase tracking-wider bg-zinc-900 text-white dark:bg-primary"
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
