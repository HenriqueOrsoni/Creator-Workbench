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
import { projectUpdateSchema } from "../../lib/validation";
import { Target, BookOpen, Layout, Settings2, Calendar } from "lucide-react";

/**
 * Componente: IdeaDialog
 * Configura um projeto do quadro: título, público-alvo, objetivo pedagógico e prazo.
 * O estado vem da coluna e o progresso das tarefas, por isso não são editados aqui.
 * (A conversão de ideias em projeto acontece na Caixa de Entrada.)
 */

interface IdeaFormValues {
  title: string;
  targetAudience: string;
  pedagogicalObjective: string;
  dueDate?: string;
}

interface IdeaDialogProps {
  id?: string;
  title?: string;
  item?: KanbanItem | null;
  targetAudience?: string;
  pedagogicalObjective?: string;
  trigger?: React.ReactElement;
  mode?: "edit";
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
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: IdeaDialogProps) {
  const effectiveId = id || item?.id || "";
  const effectiveTitle = title || item?.title || "";
  const effectiveAudience = targetAudience || item?.targetAudience || "";
  const effectiveObjective = pedagogicalObjective || item?.pedagogicalObjective || "";
  const effectiveDueDate = item?.dueDate || "";

  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;
  const updateProject = useAppStore((state) => state.updateProject);

  const form = useForm<IdeaFormValues>({
    resolver: zodResolver(projectUpdateSchema),
    mode: "onChange",
    defaultValues: {
      title: effectiveTitle,
      targetAudience: effectiveAudience,
      pedagogicalObjective: effectiveObjective,
      dueDate: effectiveDueDate,
    },
  });

  // Sincroniza o formulário quando o modal abre ou os dados mudam
  React.useEffect(() => {
    if (open) {
      form.reset({
        title: effectiveTitle,
        targetAudience: effectiveAudience,
        pedagogicalObjective: effectiveObjective,
        dueDate: effectiveDueDate,
      });
    }
  }, [open, effectiveTitle, effectiveAudience, effectiveObjective, effectiveDueDate, form]);

  async function onSubmit(values: IdeaFormValues) {
    // Só fecha o modal quando o servidor aceitou a edição; em caso de erro a mensagem já foi exibida
    const saved = await updateProject(
      effectiveId,
      values.title,
      values.targetAudience,
      values.pedagogicalObjective,
      values.dueDate || ""
    );
    if (saved) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ? trigger : <button className="hidden" aria-hidden="true" />} />
      <DialogContent className="sm:max-w-[480px] bg-card border border-border text-foreground shadow-lg rounded-xl font-sans">
        <DialogHeader className="space-y-1.5 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground font-heading">
            <Settings2 className="w-5 h-5 text-primary" />
            Configurar Projeto
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-medium">
            Atualize título, público-alvo, objetivo e prazo do projeto.
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
                    Título do Projeto *
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
                 Salvar Alterações
               </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
