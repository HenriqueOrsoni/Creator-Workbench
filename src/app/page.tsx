"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Plus, Layout, KanbanSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAppStore } from "../store/useAppStore";
import { CreateIdeaDialog } from "../components/shared/CreateIdeaDialog";
import dynamic from "next/dynamic";

const CurriculumBuilder = dynamic(() => import("../components/shared/CurriculumBuilder").then(mod => ({ default: mod.CurriculumBuilder })), {
  loading: () => <div className="flex items-center justify-center py-24 text-zinc-400 text-sm font-bold uppercase tracking-widest font-sans">Carregando...</div>,
});

const ScriptEditor = dynamic(() => import("../components/shared/ScriptEditor").then(mod => ({ default: mod.ScriptEditor })), {
  loading: () => <div className="flex items-center justify-center py-24 text-zinc-400 text-sm font-bold uppercase tracking-widest font-sans">Carregando...</div>,
});
import { Navbar } from "../components/shared/Navbar";
import { StatsCard } from "../components/shared/StatsCard";
import { KanbanBoard } from "../components/shared/KanbanBoard";
import { Button } from "../components/ui/button";

/**
 * Creator Workbench - Central Única Digital
 * Design Unificado: "The Studio" (Creative).
 * Localizado para PT-BR.
 */

export default function UnifiedPage() {
  const { items, fetchItems, selectedProjectId } = useAppStore();
  const [activeTab, setActiveTab] = React.useState("kanban");

  const ideas = items.filter(i => i.state === "IDEATION");
  const projects = items.filter(i => i.state !== "IDEATION");

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  return (
    <div className="min-h-screen bg-background text-zinc-900 dark:text-zinc-100 selection:bg-primary/20 overflow-x-hidden font-sans antialiased relative transition-colors duration-500">
      <div className="absolute inset-0 bg-dot-grid dark:bg-dot-grid-dark opacity-[0.4] dark:opacity-[0.2] pointer-events-none -z-20" />
      <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary-light/50 dark:bg-primary-dark/20 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="fixed bottom-[-5%] left-[-10%] w-[400px] h-[400px] bg-primary-light/30 dark:bg-zinc-900/30 rounded-full blur-[100px] -z-10" />

      <Navbar />

      <main className="pt-[140px] pb-24 grid grid-cols-1 px-6 lg:px-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-[8vw] lg:text-[4.5vw] leading-[0.85] font-black tracking-tighter uppercase mb-6 font-heading group">
                Dream.<br />
                <span className="text-primary italic ml-[2vw]">
                  Create.
                </span>
              </h1>
              <TabsList className="bg-zinc-100/50 dark:bg-zinc-800 p-2 rounded-2xl h-18 gap-2">
                <TabsTrigger value="kanban" className="rounded-xl px-12 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-lg dark:data-[state=active]:shadow-none dark:data-[state=active]:border dark:data-[state=active]:border-zinc-600 font-black uppercase text-xs tracking-widest transition-all font-sans dark:text-zinc-400 dark:data-[state=active]:text-zinc-100">Quadro Kanban</TabsTrigger>
                <TabsTrigger value="curriculum" className="rounded-xl px-12 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-lg dark:data-[state=active]:shadow-none dark:data-[state=active]:border dark:data-[state=active]:border-zinc-600 font-black uppercase text-xs tracking-widest transition-all font-sans dark:text-zinc-400 dark:data-[state=active]:text-zinc-100">Matriz Curricular</TabsTrigger>
                <TabsTrigger value="editor" className="rounded-xl px-12 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-lg dark:data-[state=active]:shadow-none dark:data-[state=active]:border dark:data-[state=active]:border-zinc-600 font-black uppercase text-xs tracking-widest transition-all font-sans dark:text-zinc-400 dark:data-[state=active]:text-zinc-100">Estúdio de Escrita</TabsTrigger>
              </TabsList>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-4 lg:gap-8"
            >
              <StatsCard
                value={ideas.length}
                label="Ideias_Insight"
                icon={Sparkles}
                iconHoverClass="group-hover:bg-primary"
              />
              <StatsCard
                value={projects.length}
                label="Status_Produção"
                icon={Layout}
                iconHoverClass="group-hover:bg-zinc-900"
              />
            </motion.div>
          </div>

          <TabsContent value="kanban" className="mt-0 outline-none">
            <KanbanBoard onSelectTab={(tab) => setActiveTab(tab)} />
          </TabsContent>

          <TabsContent value="curriculum" className="mt-0 outline-none">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-[20px_20px_60px_#efefef] dark:shadow-none border border-zinc-100 dark:border-zinc-800 max-w-4xl mx-auto">
              {activeProject ? (
                <CurriculumBuilder
                  kanbanItemId={activeProject.id}
                  courseTitle={activeProject.title}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-zinc-400 text-sm font-bold uppercase tracking-widest font-sans gap-6 text-center">
                  <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-300 dark:text-zinc-600">
                    <KanbanSquare size={28} />
                  </div>
                  <span>Nenhum projeto ativo selecionado</span>
                  <Button 
                    onClick={() => setActiveTab("kanban")}
                    className="bg-primary text-white rounded-full font-black uppercase tracking-widest text-[9px] px-8 h-12"
                  >
                    Selecionar Projeto no Kanban
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="editor" className="mt-0 outline-none h-[calc(100vh-300px)]">
            {activeProject ? (
              <ScriptEditor key={activeProject.id} kanbanItemId={activeProject.id} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-sm font-bold uppercase tracking-widest font-sans gap-6 text-center bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-12">
                <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-300 dark:text-zinc-600">
                  <KanbanSquare size={28} />
                </div>
                <span>Nenhum projeto ativo selecionado</span>
                <Button 
                  onClick={() => setActiveTab("kanban")}
                  className="bg-primary text-white rounded-full font-black uppercase tracking-widest text-[9px] px-8 h-12"
                >
                  Selecionar Projeto no Kanban
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <div className="fixed bottom-12 right-12 z-[100]">
        <CreateIdeaDialog
          trigger={
            <motion.button
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              className="w-20 h-20 bg-zinc-900 dark:bg-zinc-800 rounded-full flex items-center justify-center text-white shadow-2xl relative group focus:outline-none dark:border dark:border-zinc-700"
            >
              <Plus size={32} />
              <div className="absolute inset-0 bg-primary rounded-full scale-0 group-hover:scale-100 -z-10 transition-transform duration-300" />
            </motion.button>
          }
        />
      </div>
    </div>
  );
}


