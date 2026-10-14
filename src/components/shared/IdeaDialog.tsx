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
import { useAppStore, type KanbanItem } from "../../store/useAppStore";
import { conversionSchema, projectUpdateSchema } from "../../lib/validation";
import { Sparkles, Target, BookOpen, Layout, Settings2, BarChart2, CheckCircle2, Calendar } from "lucide-react";

/**
 * Componente: IdeaDialog
 * Gerencia a conversão de ideias em projetos E a configuração de projetos ativos.
 * Estética Unificada: Creative (The Studio).
 */

interface IdeaFormValues {
  title: string;
  targetAudience: string;
  pedagogicalObjective: string;
  state?: "IDEATION" | "IN_PRODUCTION" | "REVIEW" | "DONE";
  progress?: number;
  dueDate?: string;
}

interface IdeaDialogProps {
  id?: string;
  title?: string;
  item?: KanbanItem | null;
  targetAudience?: string;
  pedagogicalObjective?: string;
  trigger?: React.ReactElement;
  mode?: "convert" | "edit";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function IdeaDialog({ 
  id, 
  title, 
  item,
  targetAudience = "", 
  pedagogicalObjective = "", 
  trigger, 
  mode = "convert",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: IdeaDialogProps) {
  const effectiveId = id || item?.id || "";
  const effectiveTitle = title || item?.title || "";
  const effectiveAudience = targetAudience || item?.targetAudience || "";
  const effectiveObjective = pedagogicalObjective || item?.pedagogicalObjective || "";

  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;
  const convertToProject = useAppStore((state) => state.convertToProject);
  const updateProject = useAppStore((state) => state.updateProject);
  const project = useAppStore((state) => state.items.find(i => i.id === effectiveId));

  const form = useForm<IdeaFormValues>({
    resolver: zodResolver(mode === "edit" ? projectUpdateSchema : conversionSchema),
    mode: "onChange",
    defaultValues: {
      title: effectiveTitle,
      targetAudience: effectiveAudience,
      pedagogicalObjective: effectiveObjective,
      state: project?.state || "IN_PRODUCTION",
      progress: project?.progress || 0,
      dueDate: "",
    },
  });

  // Sincroniza o formulário quando o modal abre ou os dados mudam
  React.useEffect(() => {
    if (open) {
      form.reset({
        title: effectiveTitle,
        targetAudience: effectiveAudience,
        pedagogicalObjective: effectiveObjective,
        state: project?.state || "IN_PRODUCTION",
        progress: project?.progress || 0,
        dueDate: "",
      });
    }
  }, [open, effectiveTitle, effectiveAudience, effectiveObjective, project, form]);

  async function onSubmit(values: IdeaFormValues) {
    if (mode === "convert") {
      const success = await convertToProject(effectiveId, values.title, values.targetAudience, values.pedagogicalObjective);
      if (success) setOpen(false);
    } else {
      await updateProject(
        effectiveId, 
        values.title, 
        values.targetAudience, 
        values.pedagogicalObjective, 
        values.state, 
        Number(values.progress)
      );
      setOpen(false);
    }
  }

  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ? trigger : <button className="hidden" aria-hidden="true" />} />
      <DialogContent className="sm:max-w-[480px] bg-card border border-border text-foreground shadow-lg rounded-xl font-sans">
        <DialogHeader className="space-y-1.5 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground font-heading">
            {isEdit ? <Settings2 className="w-5 h-5 text-primary" /> : <Sparkles className="w-5 h-5 text-primary" />}
            {isEdit ? "Configurar Projeto" : "Converter para Projeto"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-medium">
            {isEdit ? "Atualize as definições estratégicas e o status do seu projeto." : "Transforme seu insight em um card ativo na esteira de produção."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }: { field: ControllerRenderProps<IdeaFormValues, "title"> }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Layout size={13} className="text-primary" />
                    Título {isEdit ? "do Projeto" : "Final"} *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Minha Nova Série de Vídeos" 
                      className="bg-background border-border rounded-lg h-10 text-sm"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetAudience"
              render={({ field }: { field: ControllerRenderProps<IdeaFormValues, "targetAudience"> }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Target size={13} className="text-primary" />
                    Público-Alvo
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Criadores de Conteúdo Iniciantes" 
                      className="bg-background border-border rounded-lg h-10 text-sm"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pedagogicalObjective"
              render={({ field }: { field: ControllerRenderProps<IdeaFormValues, "pedagogicalObjective"> }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <BookOpen size={13} className="text-primary" />
                    Objetivo Pedagógico
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Quais competências ou aprendizados serão adquiridos?" 
                      className="bg-background border-border rounded-lg min-h-[85px] text-xs py-2.5"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {isEdit && (
              <>
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }: { field: ControllerRenderProps<IdeaFormValues, "state"> }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <CheckCircle2 size={13} className="text-primary" />
                        Status da Coluna
                      </FormLabel>
                      <FormControl>
                        <select
                          className="w-full bg-background border border-border rounded-lg px-3 h-10 text-xs font-medium text-foreground outline-none focus:border-primary"
                          {...field}
                        >
                          <option value="IDEATION">Ideação</option>
                          <option value="IN_PRODUCTION">Em Produção</option>
                          <option value="REVIEW">Em Revisão</option>
                          <option value="DONE">Concluído</option>
                        </select>
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="progress"
                  render={({ field }: { field: ControllerRenderProps<IdeaFormValues, "progress"> }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <BarChart2 size={13} className="text-primary" />
                        Progresso do Projeto
                      </FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-lg px-3.5 h-10">
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            className="w-full accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                          <span className="text-xs font-bold text-foreground min-w-[36px] text-right">{field.value ?? 0}%</span>
                        </div>
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }: { field: ControllerRenderProps<IdeaFormValues, "dueDate"> }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <Calendar size={13} className="text-primary" />
                        Prazo de Entrega (Opcional)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          className="bg-background border-border rounded-lg px-3 h-10 text-xs font-medium"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
               <Button 
                 type="button" 
                 variant="ghost" 
                 onClick={() => setOpen(false)}
                 className="rounded-lg text-xs font-semibold h-10 px-4 text-muted-foreground hover:text-foreground"
               >
                 Cancelar
               </Button>
               <Button 
                 type="submit" 
                 disabled={!form.formState.isValid}
                 className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-xs h-10 px-5 shadow-xs"
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
