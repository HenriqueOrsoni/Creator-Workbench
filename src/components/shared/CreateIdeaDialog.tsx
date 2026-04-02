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
import { z } from "zod";
import { Plus, Sparkles, Layout, AlignLeft } from "lucide-react";

/**
 * Componente: CreateIdeaDialog
 * Captura intentional de novas ideias.
 * Substitui a criação aleatória.
 */

const ideaSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres."),
  description: z.string().min(5, "Adicione um pouco mais de detalhe à sua ideia."),
});

type IdeaFormValues = z.infer<typeof ideaSchema>;

interface CreateIdeaDialogProps {
  trigger?: React.ReactElement;
}

export function CreateIdeaDialog({ trigger }: CreateIdeaDialogProps) {
  const [open, setOpen] = React.useState(false);
  const addIdea = useAppStore((state) => state.addIdea);

  const form = useForm<IdeaFormValues>({
    resolver: zodResolver(ideaSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
    },
  });

  function onSubmit(values: IdeaFormValues) {
    addIdea(values.title, values.description);
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        trigger ? (trigger as React.ReactElement) : (
          <Button className="bg-primary hover:opacity-90 text-white rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 transition-all font-heading">
            <Plus size={16} className="mr-2" /> NOVA_IDEIA
          </Button>
        )
      } />
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-900 border-none dark:border dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-[20px_20px_60px_#efefef] dark:shadow-none rounded-xl font-sans antialiased">
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center gap-2 text-2xl font-black uppercase tracking-tighter italic text-zinc-900 dark:text-zinc-100 text-left font-heading">
            <Sparkles className="text-primary" />
            Capturar_<span className="text-primary">Insight</span>
          </DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-widest text-zinc-400 font-bold text-left font-sans">
            Dê um nome e uma direção para sua nova ideia criativa.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }: { field: ControllerRenderProps<IdeaFormValues, "title"> }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold text-zinc-500 font-heading">
                    <Layout size={14} className="text-primary/50" />
                    Título da Ideia
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
              name="description"
              render={({ field }: { field: ControllerRenderProps<IdeaFormValues, "description"> }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold text-zinc-500 font-heading">
                    <AlignLeft size={14} className="text-primary/50" />
                    Descrição Rápida
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Sobre o que é essa ideia? Quais os primeiros pensamentos?" 
                      className="bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 rounded-2xl focus:border-primary/50 text-zinc-900 dark:text-zinc-100 min-h-[120px] py-4 transition-all duration-300 font-sans shadow-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 text-[10px] italic font-bold font-sans" />
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
                 Descartar
               </Button>
               <Button 
                 type="submit" 
                 disabled={!form.formState.isValid}
                 className="bg-primary hover:opacity-90 text-white rounded-2xl shadow-lg shadow-primary/20 font-black uppercase tracking-[0.2em] text-[10px] h-12 px-8 flex-1 transition-all duration-300 font-heading"
               >
                 Salvar Ideia
               </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
