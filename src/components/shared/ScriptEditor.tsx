"use client";

import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  History,
  Sparkles,
  FileText,
  Download,
  Printer,
  Clock
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

/**
 * Componente: ScriptEditor
 * Editor de texto rico para roteirização conectado ao backend.
 * Estética Unificada: Creative (The Studio).
 */

interface ScriptEditorProps {
  kanbanItemId: string;
}

export function ScriptEditor({ kanbanItemId }: ScriptEditorProps) {
  const { exportScript } = useAppStore();
  const [snapshots, setSnapshots] = React.useState<Array<{ id: string; timestamp: number; content: string }>>([]);
  const [versionToRestore, setVersionToRestore] = React.useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Comece a roteirizar seu conteúdo aqui...",
      }),
    ],
    immediatelyRender: false,
    content: "",
    editorProps: {
      attributes: {
        class: "prose max-w-none focus:outline-none min-h-[500px] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-primary/20",
      },
    },
  });

  const text = editor && typeof editor.getText === "function"
    ? editor.getText()
    : (editor && typeof editor.getHTML === "function" ? editor.getHTML().replace(/<[^>]*>/g, "") : "");
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 140));

  const fetchScript = React.useCallback(async () => {
    if (!kanbanItemId || !editor) return;
    try {
      const data = await apiRequest("GET", `/api/v1/kanban/${kanbanItemId}/script`);
      if (data) {
        editor.commands.setContent(data.content || "");
      }
    } catch {
      console.warn("Nenhum roteiro salvo anteriormente. Iniciando em branco.");
      editor.commands.setContent("");
    }
  }, [kanbanItemId, editor]);

  interface BackendScriptVersion {
    id: string | number;
    createdAt: string;
    content: string;
  }

  const fetchVersions = React.useCallback(async () => {
    if (!kanbanItemId) return;
    try {
      const data = await apiRequest("GET", `/api/v1/kanban/${kanbanItemId}/script/versions`);
      if (Array.isArray(data)) {
        const mapped = data.map((v: BackendScriptVersion) => ({
          id: v.id.toString(),
          timestamp: new Date(v.createdAt).getTime(),
          content: v.content
        }));
        setSnapshots(mapped);
      }
    } catch (error) {
      console.error("Erro ao buscar histórico de versões:", error);
    }
  }, [kanbanItemId]);

  React.useEffect(() => {
    if (editor && kanbanItemId) {
      fetchScript();
      fetchVersions();
    }
  }, [kanbanItemId, editor, fetchScript, fetchVersions]);

  // --- Handlers de Ações ---

  const handleSave = async () => {
    if (!editor || !kanbanItemId) return;
    const content = editor.getHTML();
    try {
      await apiRequest("PUT", `/api/v1/kanban/${kanbanItemId}/script`, { content });
      toast.success("Roteiro salvo com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar roteiro: " + (error as Error).message);
    }
  };

  const handleExportMarkdown = async () => {
    if (!kanbanItemId) return;
    await handleSave();
    const data = await exportScript(kanbanItemId);
    let markdown = data?.markdownFormatted;
    let cardTitle = data?.cardTitle;

    if (!markdown) {
      // Fallback para geração no cliente caso o backend ainda não possua o endpoint de exportação
      const html = editor?.getHTML() || "";
      const cleanText = editor?.getText() || "";
      const words = cleanText.trim() ? cleanText.trim().split(/\s+/).length : 0;
      const minutes = Math.max(1, Math.ceil(words / 140));

      markdown = `# Roteiro de Produção\n\n` +
        `**Métricas de Locução:** ${words} palavras • ~${minutes} min (base: 140 ppm)\n\n---\n\n` +
        html
          .replace(/<h1>(.*?)<\/h1>/gi, "# $1\n\n")
          .replace(/<h2>(.*?)<\/h2>/gi, "## $1\n\n")
          .replace(/<h3>(.*?)<\/h3>/gi, "### $1\n\n")
          .replace(/<p>(.*?)<\/p>/gi, "$1\n\n")
          .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
          .replace(/<em>(.*?)<\/em>/gi, "*$1*")
          .replace(/<li>(.*?)<\/li>/gi, "- $1\n")
          .replace(/<[^>]*>/g, "");
      cardTitle = "roteiro";
    }

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeTitle = cardTitle ? cardTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "roteiro";
    link.download = `roteiro-${safeTitle}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Roteiro baixado em Markdown (.md)!");
  };

  const handlePrint = () => {
    window.print();
  };

  const takeSnapshot = async () => {
    if (!editor || !kanbanItemId) return;
    try {
      const content = editor.getHTML();
      await apiRequest("PUT", `/api/v1/kanban/${kanbanItemId}/script`, { content });
      await apiRequest("POST", `/api/v1/kanban/${kanbanItemId}/script/versions`);
      fetchVersions();
      toast.success("Snapshot de revisão criado com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar snapshot: " + (error as Error).message);
    }
  };

  const confirmRestoreSnapshot = async () => {
    if (!editor || !kanbanItemId || !versionToRestore) return;
    try {
      const data = await apiRequest("POST", `/api/v1/kanban/${kanbanItemId}/script/versions/${versionToRestore}/restore`);
      if (data) {
        editor.commands.setContent(data.content || "");
        toast.success("Versão do roteiro restaurada com sucesso!");
      }
    } catch (error) {
      toast.error("Erro ao restaurar versão: " + (error as Error).message);
    } finally {
      setVersionToRestore(null);
    }
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col bg-card shadow-xs rounded-xl overflow-hidden h-full border border-border">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border overflow-x-auto shrink-0">
        <div className="flex items-center gap-1 shrink-0">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            icon={<Bold size={16} />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            icon={<Italic size={16} />}
          />
          <div className="w-[1px] h-5 bg-border mx-1.5" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            icon={<Heading1 size={17} />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            icon={<Heading2 size={17} />}
          />
          <div className="w-[1px] h-5 bg-border mx-1.5" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            icon={<List size={16} />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            icon={<ListOrdered size={16} />}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground font-medium rounded-lg" />}>
              <History size={14} className="mr-1.5" /> Revisões ({snapshots.length})
            </SheetTrigger>
            <SheetContent className="bg-card border-l border-border text-foreground shadow-xl rounded-l-xl p-6">
              <SheetHeader>
                <SheetTitle className="text-lg font-bold text-foreground">Histórico de Versões</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-120px)] mt-6">
                <div className="space-y-3 pr-3">
                  {snapshots.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-center gap-4">
                      <div className="w-12 h-12 bg-muted/40 rounded-lg flex items-center justify-center">
                        <FileText size={24} className="text-muted-foreground" />
                      </div>
                      <p className="text-xs font-medium max-w-[200px]">Nenhum snapshot restaurável detectado.</p>
                    </div>
                  ) : (
                    snapshots.map((s) => (
                      <div
                        key={s.id}
                        className="p-3.5 bg-muted/30 hover:bg-muted/60 rounded-lg transition-all group cursor-pointer text-left border border-border"
                        onClick={() => setVersionToRestore(s.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 rounded-md text-[9px] uppercase tracking-wider px-2 py-0.5 font-semibold">
                            SNAPSHOT
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {new Date(s.timestamp).toLocaleDateString()} {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate leading-relaxed">
                          {s.content.replace(/<[^>]*>?/gm, '').slice(0, 60)}...
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <Button
            size="sm"
            variant="ghost"
            onClick={takeSnapshot}
            className="h-8 text-xs text-muted-foreground hover:text-foreground font-medium rounded-lg"
          >
            Snapshot
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleExportMarkdown}
            className="h-8 text-xs text-muted-foreground hover:text-foreground font-medium rounded-lg gap-1.5"
            title="Baixar roteiro em arquivo Markdown (.md)"
          >
            <Download size={13} /> Exportar .MD
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handlePrint}
            className="h-8 text-xs text-muted-foreground hover:text-foreground font-medium rounded-lg gap-1.5"
            title="Imprimir ou Salvar em PDF"
          >
            <Printer size={13} /> Imprimir
          </Button>

          <Button
            size="sm"
            className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 rounded-lg shadow-xs transition-all active:scale-95"
            onClick={handleSave}
          >
            Salvar
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 bg-background font-sans">
        <div className="max-w-4xl mx-auto py-8 px-8">
          <EditorContent editor={editor} />
        </div>
      </ScrollArea>

      <div className="px-4 py-2.5 bg-card border-t border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status: Live</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground pl-4 border-l border-border">
            <Clock size={13} className="text-primary" />
            <span>{wordCount} palavras • ~{estimatedMinutes} min de locução</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-primary" />
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Focado no Criador</span>
        </div>
      </div>

      {/* Diálogo de Confirmação de Restauração de Snapshot (FE-16) */}
      <Dialog 
        open={versionToRestore !== null} 
        onOpenChange={(open) => { 
          if (!open) setVersionToRestore(null); 
        }}
      >
        <DialogContent className="sm:max-w-md rounded-xl p-6 bg-card border border-border shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Confirmar Restauração</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tem certeza que deseja restaurar esta versão do roteiro? As alterações atuais não salvas serão substituídas pelo conteúdo deste snapshot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setVersionToRestore(null)}
              className="rounded-lg font-semibold text-xs h-9 px-4"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmRestoreSnapshot}
              className="rounded-lg font-semibold text-xs h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Restaurar Versão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToolbarButton({ onClick, icon, active = false }: { onClick: () => void, icon: React.ReactNode, active?: boolean }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn(
        "h-8 w-8 rounded-md transition-all",
        active ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {icon}
    </Button>
  );
}
