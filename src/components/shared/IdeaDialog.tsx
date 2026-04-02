"use client";

import React from "react";
import { useForm, type ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogTrigger 
} from "../ui/dialog";
import { Button } from "../ui/button";
import { 
  Form, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage 
} from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useAppStore } from "../../store/useAppStore";
import { conversionSchema, type ConversionFormValues } from "../../lib/validation";
import { Sparkles, Target, BookOpen, Layout, Settings2 } from "lucide-react";

/**
 * Componente: IdeaDialog
 * Gerencia a conversão de ideias em projetos E a configuração de projetos ativos.
 * Estética Unificada: Creative (The Studio).
 */

interface IdeaDialogProps {
  id: string;
  title: string;
  targetAudience?: string;
  pedagogicalGoal?: string;
  trigger?: React.ReactElement;
  mode?: "convert" | "edit";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function IdeaDialog({ 
  id, 
  title, 
  targetAudience = "", 
  pedagogicalGoal = "", 
  trigger, 
  mode = "convert",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: IdeaDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;
  const convertToProject = useAppStore((state) => state.convertToProject);
  const updateProject = useAppStore((state) => state.updateProject);

  const form = useForm<ConversionFormValues>({
    resolver: zodResolver(conversionSchema),
    mode: "onChange",
    defaultValues: {
      title: title,
      targetAudience: targetAudience,
      pedagogicalGoal: pedagogicalGoal,
    },
  });

  // Sincroniza o formulário quando o modal abre ou os dados mudam
  React.useEffect(() => {
    if (open) {
      form.reset({
        title: title,
        targetAudience: targetAudience,
        pedagogicalGoal: pedagogicalGoal,
      });
    }
  }, [open, title, targetAudience, pedagogicalGoal, form]);

  function onSubmit(values: ConversionFormValues) {
    if (mode === "convert") {
      const success = convertToProject(id, values.title, values.targetAudience, values.pedagogicalGoal);
      if (success) setOpen(false);
    } else {
      updateProject(id, values.title, values.targetAudience, values.pedagogicalGoal);
      setOpen(false);
    }
  }

  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ? trigger : <button className="hidden" aria-hidden="true" />} />
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-900 border-none dark:border dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-[20px_20px_60px_#efefef] dark:shadow-none rounded-xl font-sans antialiased">
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center gap-2 text-2xl font-black uppercase tracking-tighter italic text-zinc-900 dark:text-zinc-100 text-left font-heading">
            {isEdit ? <Settings2 className="text-primary" /> : <Sparkles className="text-primary" />}
            {isEdit ? "Configurar_" : "Capturar_"}<span className="text-primary">Pipeline</span>
          </DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-widest text-zinc-400 font-bold text-left font-sans">
            {isEdit ? "Atualize as definições estratégicas do seu projeto." : "Transforme seu insight em um projeto de produção ativo."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }: { field: ControllerRenderProps<ConversionFormValues, "title"> }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold text-zinc-500 font-heading">
                    <Layout size={14} className="text-primary/50" />
                    Título {isEdit ? "do Projeto" : "Final"}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Minha Nova Série de Vídeos" 
                      className="bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 rounded-2xl focus:border-primary/50 text-zinc-900 dark:text-zinc-100 h-14 transition-all duration-300 font-sans font-bold shadow-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] italic font-bold font-sans" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetAudience"
              render={({ field }: { field: ControllerRenderProps<ConversionFormValues, "targetAudience"> }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold text-zinc-500 font-heading">
                    <Target size={14} className="text-primary/50" />
                    Público-Alvo
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Criadores de Conteúdo Iniciantes" 
                      className="bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 rounded-2xl focus:border-primary/50 text-zinc-900 dark:text-zinc-100 h-14 transition-all duration-300 font-sans shadow-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] italic font-bold font-sans" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pedagogicalGoal"
              render={({ field }: { field: ControllerRenderProps<ConversionFormValues, "pedagogicalGoal"> }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold text-zinc-500 font-heading">
                    <BookOpen size={14} className="text-primary/50" />
                    Objetivo Pedagógico
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Quais competências o aluno irá adquirir ao final desta aula?" 
                      className="bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 rounded-2xl focus:border-primary/50 text-zinc-900 dark:text-zinc-100 min-h-[120px] py-4 transition-all duration-300 font-sans shadow-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] italic font-bold font-sans" />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-6 border-t mt-4 flex items-center gap-4 border-zinc-100 dark:border-zinc-800">
               <Button 
                 type="button" 
                 variant="ghost" 
                 onClick={() => setOpen(false)}
                 className="uppercase tracking-[0.2em] text-[10px] h-12 px-6 font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-heading"
               >
                 Cancelar
               </Button>
               <Button 
                 type="submit" 
                 disabled={!form.formState.isValid}
                 className="bg-primary hover:opacity-90 text-white rounded-2xl shadow-lg shadow-primary/20 font-black uppercase tracking-[0.2em] text-[10px] h-12 px-8 flex-1 transition-all duration-300 font-heading"
               >
                 {isEdit ? "Salvar Alterações" : "Ativar Produção"}
               </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
