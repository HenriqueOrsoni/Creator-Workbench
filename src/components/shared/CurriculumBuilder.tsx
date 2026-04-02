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
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";

/**
 * Componente: CurriculumBuilder
 * Estruturação Curricular hierárquica.
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
  courseTitle: string;
  modules: Module[];
}

export function CurriculumBuilder({ courseTitle, modules: initialModules }: CurriculumBuilderProps) {
  const [modules] = React.useState(initialModules);

  return (
    <div className="space-y-6 text-left font-sans antialiased">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic text-zinc-900 dark:text-zinc-100 font-heading">
            Estrutura_<span className="text-orange-500">Curricular</span>
          </h2>
          <p className="text-xs text-zinc-400 font-bold mt-1 uppercase tracking-widest font-sans break-words max-w-[300px] md:max-w-none">PROJETO: {courseTitle}</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full h-12 px-8 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-500/20 transition-all font-heading w-full sm:w-auto">
          <Plus size={16} className="mr-2" /> NOVO_MÓDULO
        </Button>
      </div>

      <Accordion multiple className="w-full space-y-6">
        {modules.map((module) => (
          <AccordionItem 
            key={module.id} 
            value={module.id} 
            className="border-none bg-white dark:bg-zinc-900 shadow-[10px_10px_30px_#efefef] dark:shadow-none dark:border dark:border-zinc-800 rounded-[32px] overflow-hidden transition-all hover:shadow-orange-500/5 group/module"
          >
            <AccordionTrigger className="px-8 py-6 hover:no-underline transition-colors group">
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                  <span className="font-bold text-orange-500 text-xs font-heading">{module.id.slice(0, 2)}</span>
                </div>
                <div>
                   <h3 className="font-black uppercase tracking-tight text-lg text-zinc-900 dark:text-zinc-100 group-hover:text-orange-500 transition-colors font-heading">
                     {module.title}
                   </h3>
                   <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-sans">{module.lessons.length} AULAS PLANEJADAS</span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-0">
               <div className="flex flex-col px-4 pb-4">
                  {module.lessons.map((lesson) => (
                    <div 
                      key={lesson.id} 
                      className="px-6 py-5 flex items-center justify-between rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group/lesson"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover/lesson:bg-orange-100 dark:group-hover/lesson:bg-orange-900/30 group-hover/lesson:text-orange-500 transition-colors">
                          {lesson.type === "video" ? <Video size={16} /> : <FileText size={16} />}
                        </div>
                        <span className="text-base font-bold text-zinc-600 dark:text-zinc-400 group-hover/lesson:text-zinc-900 dark:group-hover/lesson:text-zinc-100 transition-colors font-sans">{lesson.title}</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {lesson.published ? (
                          <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-600 text-[9px] uppercase tracking-widest rounded-full h-6 px-3 font-bold font-sans">
                            <CheckCircle2 size={10} className="mr-1" /> PUBLICADA
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 text-[9px] uppercase tracking-widest rounded-full h-6 px-3 font-bold font-sans">
                            <AlertCircle size={10} className="mr-1" /> RASCUNHO
                          </Badge>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300 hover:text-zinc-900">
                          <MoreVertical size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <button className="w-full py-6 text-xs font-bold text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all uppercase tracking-[0.2em] italic rounded-2xl mt-2 font-heading">
                    [+] ADICIONAR NOVA AULA AO FLUXO
                  </button>
               </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
