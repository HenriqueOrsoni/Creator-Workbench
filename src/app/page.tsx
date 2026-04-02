"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Plus,
  Zap,
  Trash2,
  Layout,
  ArrowUpRight,
  MoreVertical,
  Settings2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "../components/ui/dropdown-menu";
import Image from "next/image";
import { useAppStore } from "../store/useAppStore";
import { IdeaDialog } from "../components/shared/IdeaDialog";
import { CreateIdeaDialog } from "../components/shared/CreateIdeaDialog";
import { CurriculumBuilder } from "../components/shared/CurriculumBuilder";
import { ScriptEditor } from "../components/shared/ScriptEditor";
import { ThemeToggle } from "../components/shared/ThemeToggle";

/**
 * Creator Workbench - Central Única Digital
 * Design Unificado: "The Studio" (Creative).
 * Localizado para PT-BR.
 */

export default function UnifiedPage() {
  const { items } = useAppStore();
  const ideas = items.filter(i => i.status === "Ideation");
  const projects = items.filter(i => i.status !== "Ideation");

  return (
    <div className="min-h-screen bg-background text-zinc-900 dark:text-zinc-100 selection:bg-orange-500/20 overflow-x-hidden font-sans antialiased relative transition-colors duration-500">
      <div className="absolute inset-0 bg-dot-grid dark:bg-dot-grid-dark opacity-[0.4] dark:opacity-[0.2] pointer-events-none -z-20" />
      <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] bg-orange-100/50 dark:bg-orange-950/20 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="fixed bottom-[-5%] left-[-10%] w-[400px] h-[400px] bg-orange-50/50 dark:bg-zinc-900/30 rounded-full blur-[100px] -z-10" />

      <nav className="fixed top-0 left-0 w-full h-[88px] border-b border-zinc-200/50 bg-white/40 backdrop-blur-md z-50 flex items-center justify-between px-12 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase font-heading dark:text-zinc-100">Workbench<span className="text-orange-500">_CR</span></span>
        </div>

        <div className="flex items-center gap-8">
          <button className="text-sm font-bold uppercase tracking-widest hover:text-orange-500 transition-colors font-sans">Ideação</button>
          <button className="text-sm font-bold uppercase tracking-widest hover:text-orange-500 transition-colors font-sans">Produção</button>
          <CreateIdeaDialog
            trigger={
              <Button className="bg-zinc-900 dark:bg-orange-500 dark:text-white hover:bg-zinc-800 dark:hover:bg-orange-600 text-white rounded-2xl px-8 font-bold uppercase text-xs tracking-[0.2em] transition-all hover:scale-105 active:scale-95 font-heading">
                Capturar Ideia
              </Button>
            }
          />
          <ThemeToggle />
        </div>
      </nav>

      <main className="pt-[140px] pb-24 grid grid-cols-1 px-6 lg:px-24">
        <Tabs defaultValue="inbox" className="w-full">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-[8vw] lg:text-[4.5vw] leading-[0.85] font-black tracking-tighter uppercase mb-4 font-heading group">
                Dream.<br />
                <span className="text-orange-500 italic ml-[2vw] relative">
                  Create.
                  <div className="absolute -bottom-2 lg:-bottom-4 left-0 w-full h-[0.5rem] bg-orange-500/20 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left" />
                </span>
              </h1>
              <TabsList className="bg-zinc-100/50 dark:bg-zinc-800 p-2 rounded-2xl h-18 gap-2">
                <TabsTrigger value="inbox" className="rounded-xl px-12 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-lg dark:data-[state=active]:shadow-none dark:data-[state=active]:border dark:data-[state=active]:border-zinc-600 font-black uppercase text-xs tracking-widest transition-all font-sans dark:text-zinc-400 dark:data-[state=active]:text-zinc-100">Caixa de Entrada</TabsTrigger>
                <TabsTrigger value="active" className="rounded-xl px-12 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-lg dark:data-[state=active]:shadow-none dark:data-[state=active]:border dark:data-[state=active]:border-zinc-600 font-black uppercase text-xs tracking-widest transition-all font-sans dark:text-zinc-400 dark:data-[state=active]:text-zinc-100">Projetos Ativos</TabsTrigger>
                <TabsTrigger value="editor" className="rounded-xl px-12 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-lg dark:data-[state=active]:shadow-none dark:data-[state=active]:border dark:data-[state=active]:border-zinc-600 font-black uppercase text-xs tracking-widest transition-all font-sans dark:text-zinc-400 dark:data-[state=active]:text-zinc-100">Estúdio de Escrita</TabsTrigger>
              </TabsList>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-4 lg:gap-8"
            >
              <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-[20px_20px_60px_#efefef] dark:shadow-none border border-white dark:border-zinc-700 flex flex-col justify-between w-[160px] h-[160px] group hover:border-orange-500/20 transition-all">
                <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-700 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="text-3xl font-black font-heading line-height-1 leading-none dark:text-zinc-100">{ideas.length}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1">Ideias_Insight</div>
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-[20px_20px_60px_#efefef] dark:shadow-none border border-white dark:border-zinc-700 flex flex-col justify-between w-[160px] h-[160px] group hover:border-orange-500/20 transition-all">
                <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-700 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                  <Layout size={20} />
                </div>
                <div>
                  <div className="text-3xl font-black font-heading line-height-1 leading-none dark:text-zinc-100">{projects.length}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1">Status_Produção</div>
                </div>
              </div>
            </motion.div>
          </div>

          <TabsContent value="inbox" className="mt-0 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence>
                {ideas.map((idea, i) => (
                  <CreativeIdeaCard key={idea.id} idea={idea} delay={i * 0.1} />
                ))}
              </AnimatePresence>
            </div>
          </TabsContent>

          <TabsContent value="active" className="mt-0 outline-none space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <h2 className="text-4xl font-black uppercase tracking-tighter italic flex items-center gap-4 font-heading dark:text-zinc-100">
                  <Layout className="text-orange-500" /> Pipeline_Ativo
                </h2>
                <div className="space-y-4">
                  {projects.map((project) => (
                    <ProjectListItem key={project.id} project={project} />
                  ))}
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-[20px_20px_60px_#efefef] dark:shadow-none border border-white dark:border-zinc-700 hover:border-orange-500/20 transition-all">
                <CurriculumBuilder
                  courseTitle={projects[0]?.title || "SELECIONE_PROJETO"}
                  modules={[
                    {
                      id: "M1",
                      title: "01_INTRODUÇÃO_AO_CONCEITO",
                      lessons: [
                        { id: "L1", title: "Visão Geral e Mindset", type: "video", published: true },
                        { id: "L2", title: "Ferramentas do Fluxo", type: "video", published: false },
                      ]
                    }
                  ]}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="editor" className="mt-0 outline-none h-[calc(100vh-300px)]">
            <ScriptEditor />
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
              <div className="absolute inset-0 bg-orange-500 rounded-full scale-0 group-hover:scale-100 -z-10 transition-transform duration-300" />
            </motion.button>
          }
        />
      </div>
    </div>
  );
}

function CreativeIdeaCard({ idea, delay = 0 }: { idea: import("@/store/useAppStore").KanbanItem, delay?: number }) {
  const deleteItem = useAppStore(state => state.deleteItem);
  const [isEditing, setIsEditing] = React.useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5, delay }}
      className="group font-sans"
    >
      <Card className="p-8 border-none dark:border dark:border-zinc-700 shadow-[20px_20px_60px_#efefef] dark:shadow-none rounded-2xl bg-white dark:bg-zinc-800 hover:shadow-orange-500/10 dark:hover:shadow-orange-500/5 hover:-translate-y-1 transition-all duration-300 h-full relative">
        <div className="absolute top-6 right-6">
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-300 hover:text-orange-500 rounded-lg">
                <MoreVertical size={20} />
              </Button>
            } />
            <DropdownMenuContent className="bg-white border-zinc-100 rounded-xl shadow-xl p-2 min-w-[240px] font-sans">
              <DropdownMenuItem
                onSelect={() => setIsEditing(true)}
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:text-orange-500 cursor-pointer rounded-lg transition-colors"
              >
                <Settings2 size={16} /> Configuração Estratégica
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-300 cursor-not-allowed rounded-lg opacity-50">
                <Layout size={16} /> Ver Brainstorm
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <IdeaDialog
            id={idea.id}
            title={idea.title}
            mode="convert"
            open={isEditing}
            onOpenChange={setIsEditing}
          />
        </div>

        <div className="space-y-6 text-left">
          <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-700 rounded-xl flex items-center justify-center text-zinc-900 dark:text-zinc-100 group-hover:bg-orange-500 dark:group-hover:bg-orange-500 group-hover:text-white transition-all duration-500">
            <Sparkles size={24} />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tight leading-tight font-heading dark:text-zinc-100">{idea.title}</h3>
          <p className="text-xs text-zinc-400 font-medium line-clamp-2">{idea.description || "Nenhuma descrição fornecida."}</p>

          <div className="flex gap-2 w-full">
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500/70 hover:text-red-600 h-11 w-11 rounded-lg transition-colors border border-red-500/10 hover:bg-red-50/50 dark:hover:bg-red-950/20"
              onClick={() => deleteItem(idea.id)}
            >
              <Trash2 size={20} />
            </Button>
            <Button 
                className="flex-1 bg-zinc-900 dark:bg-zinc-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] px-8 h-12 hover:bg-orange-500 dark:hover:bg-orange-500 transition-all active:scale-95 font-heading dark:border dark:border-zinc-600"
                onClick={() => useAppStore.getState().convertToProject(idea.id, idea.title)}
            >
                Ativar Projeto
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function ProjectListItem({ project }: { project: import("@/store/useAppStore").KanbanItem }) {
  const deleteItem = useAppStore(state => state.deleteItem);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  return (
    <div className="flex items-center justify-between p-6 bg-white dark:bg-zinc-800 rounded-2xl shadow-[10px_10px_30px_#efefef] dark:shadow-none dark:border dark:border-zinc-700 group hover:shadow-orange-500/5 transition-all font-sans">
      <div className="flex items-center gap-4 text-left">
        <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-700 rounded-xl flex items-center justify-center text-zinc-900 dark:text-zinc-100 group-hover:bg-orange-500 dark:group-hover:bg-orange-500 group-hover:text-white transition-all duration-500">
          <Zap size={20} />
        </div>
        <div>
          <h4 className="font-black uppercase tracking-tight font-heading dark:text-zinc-100">{project.title}</h4>
          <Badge variant="outline" className="bg-zinc-50 dark:bg-zinc-800 border-none text-zinc-400 text-[8px] uppercase tracking-widest font-black">
            {project.status === "In_Production" ? "EM PRODUÇÃO" : project.status}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <div className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-1">Progresso</div>
          <div className="w-24 h-1 bg-zinc-50 rounded-lg overflow-hidden">
            <div className="h-full bg-orange-500" style={{ width: `${project.progress * 20}%` }} />
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-red-500/70 hover:text-red-600 h-10 w-10 transition-colors border border-red-500/10 hover:bg-red-50/50 dark:hover:bg-red-950/20"
          onClick={() => deleteItem(project.id)}
        >
          <Trash2 size={18} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" size="icon" className="text-zinc-300 hover:text-orange-500 h-10 w-10 rounded-lg">
              <MoreVertical size={20} />
            </Button>
          } />
          <DropdownMenuContent className="bg-white border-zinc-100 rounded-xl shadow-xl p-2 min-w-[240px] font-sans">
            <DropdownMenuItem
              onSelect={() => setIsSettingsOpen(true)}
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-orange-500 cursor-pointer rounded-lg transition-colors"
            >
              <Settings2 size={16} /> Configuração Estratégica
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-orange-500 cursor-pointer rounded-lg transition-colors">
              <Layout size={16} /> Histórico de Versões
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-orange-500 cursor-pointer rounded-lg transition-colors">
              <ArrowUpRight size={16} /> Exportar Roteiro
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-50 my-1" />
            <DropdownMenuItem className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-800 cursor-pointer rounded-lg transition-colors"
              onClick={() => deleteItem(project.id)}
            >
              <Trash2 size={16} /> Arquivar Produção
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <IdeaDialog
          id={project.id}
          title={project.title}
          targetAudience={project.targetAudience}
          pedagogicalGoal={project.pedagogicalGoal}
          mode="edit"
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
        />

        <Button variant="ghost" size="icon" className="text-zinc-200 hover:text-orange-500 rounded-lg">
          <ArrowUpRight size={20} />
        </Button>
      </div>
    </div>
  );
}
