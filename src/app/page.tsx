"use client";

import React from "react";
import { Plus, Layout, KanbanSquare, GraduationCap, Lightbulb } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAppStore } from "../store/useAppStore";
import { CreateIdeaDialog } from "../components/shared/CreateIdeaDialog";
import dynamic from "next/dynamic";

const CurriculumBuilder = dynamic(() => import("../components/shared/CurriculumBuilder").then(mod => ({ default: mod.CurriculumBuilder })), {
  loading: () => <div className="flex items-center justify-center py-20 text-muted-foreground text-xs font-medium">Carregando Matriz Curricular...</div>,
});

const ScriptEditor = dynamic(() => import("../components/shared/ScriptEditor").then(mod => ({ default: mod.ScriptEditor })), {
  loading: () => <div className="flex items-center justify-center py-20 text-muted-foreground text-xs font-medium">Carregando Estúdio de Escrita...</div>,
});

const IdeasInbox = dynamic(() => import("../components/shared/IdeasInbox").then(mod => ({ default: mod.IdeasInbox })), {
  loading: () => <div className="flex items-center justify-center py-20 text-muted-foreground text-xs font-medium">Carregando Caixa de Entrada...</div>,
});

const CoursesView = dynamic(() => import("../components/shared/CoursesView").then(mod => ({ default: mod.CoursesView })), {
  loading: () => <div className="flex items-center justify-center py-20 text-muted-foreground text-xs font-medium">Carregando Cursos...</div>,
});

import { Navbar } from "../components/shared/Navbar";
import { StatsCard } from "../components/shared/StatsCard";
import { KanbanBoard } from "../components/shared/KanbanBoard";
import { Button } from "../components/ui/button";

export default function UnifiedPage() {
  const { items, ideas, courses, fetchItems, fetchTeams, selectedProjectId } = useAppStore();
  const [activeTab, setActiveTab] = React.useState("kanban");

  const legacyIdeas = items.filter(i => i.state === "IDEATION");
  const projects = items.filter(i => i.state !== "IDEATION");
  const totalIdeasCount = ideas.length > 0 ? ideas.length : legacyIdeas.length;

  React.useEffect(() => {
    fetchItems();
    fetchTeams();
  }, [fetchItems, fetchTeams]);

  const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased relative transition-colors selection:bg-primary/20">
      <Navbar onNavigate={(tab) => setActiveTab(tab)} />

      <main className="pt-20 sm:pt-24 pb-16 px-4 sm:px-8 lg:px-12 max-w-[1600px] mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* HEADER & CONTROLS */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 border-b border-border pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Operações Digitais</span>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-xs text-muted-foreground font-medium">Workspace Criativo</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
                Painel de Controle
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
                Planejamento pedagógico, esteira de produção Kanban e gestão curricular.
              </p>
            </div>

            {/* METRICS ROW */}
            <div className="flex gap-3 sm:gap-4 flex-wrap">
              <StatsCard
                value={totalIdeasCount}
                label="Ideias no Inbox"
                icon={Lightbulb}
              />
              <StatsCard
                value={projects.length}
                label="Projetos em Produção"
                icon={Layout}
              />
              <StatsCard
                value={courses.length}
                label="Cursos Cadastrados"
                icon={GraduationCap}
              />
            </div>
          </div>

          {/* TAB NAVIGATION PILLS */}
          <div className="mb-6 overflow-x-auto pb-1">
            <TabsList className="bg-muted/60 p-1 rounded-lg border border-border h-auto inline-flex gap-1">
              <TabsTrigger 
                value="kanban" 
                className="rounded-md px-3.5 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
              >
                Quadro Kanban
              </TabsTrigger>
              <TabsTrigger 
                value="inbox" 
                className="rounded-md px-3.5 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
              >
                Caixa de Entrada
              </TabsTrigger>
              <TabsTrigger 
                value="courses" 
                className="rounded-md px-3.5 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
              >
                Cursos & Módulos
              </TabsTrigger>
              <TabsTrigger 
                value="curriculum" 
                className="rounded-md px-3.5 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
              >
                Matriz Curricular
              </TabsTrigger>
              <TabsTrigger 
                value="editor" 
                className="rounded-md px-3.5 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
              >
                Estúdio de Escrita
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB CONTENTS */}
          <TabsContent value="kanban" className="mt-0 outline-none">
            <KanbanBoard onSelectTab={(tab) => setActiveTab(tab)} />
          </TabsContent>

          <TabsContent value="inbox" className="mt-0 outline-none">
            <IdeasInbox />
          </TabsContent>

          <TabsContent value="courses" className="mt-0 outline-none">
            <CoursesView />
          </TabsContent>

          <TabsContent value="curriculum" className="mt-0 outline-none">
            <div className="bg-card p-6 sm:p-8 rounded-xl border border-border max-w-4xl mx-auto shadow-xs">
              {activeProject ? (
                <CurriculumBuilder
                  kanbanItemId={activeProject.id}
                  courseTitle={activeProject.title}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs font-medium gap-4 text-center">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                    <KanbanSquare size={22} />
                  </div>
                  <span>Nenhum projeto ativo selecionado</span>
                  <Button 
                    onClick={() => setActiveTab("kanban")}
                    className="bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg font-semibold text-xs px-4 h-9 shadow-xs"
                  >
                    Selecionar Projeto no Kanban
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="editor" className="mt-0 outline-none">
            {activeProject ? (
              <ScriptEditor key={activeProject.id} kanbanItemId={activeProject.id} />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs font-medium gap-4 text-center bg-card border border-border rounded-xl p-8 max-w-4xl mx-auto shadow-xs">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                  <KanbanSquare size={22} />
                </div>
                <span>Nenhum projeto ativo selecionado para redação de roteiro</span>
                <Button 
                  onClick={() => setActiveTab("kanban")}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg font-semibold text-xs px-4 h-9 shadow-xs"
                >
                  Selecionar Projeto no Kanban
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* FLOATING ACTION BUTTON */}
      <div className="fixed bottom-6 right-6 z-40">
        <CreateIdeaDialog
          trigger={
            <button
              className="w-11 h-11 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg flex items-center justify-center shadow-md transition-colors focus:outline-none"
              title="Capturar Nova Ideia"
            >
              <Plus className="w-5 h-5" />
            </button>
          }
        />
      </div>
    </div>
  );
}
