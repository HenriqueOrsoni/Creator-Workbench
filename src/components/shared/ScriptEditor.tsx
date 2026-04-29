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
  Zap,
  Save,
  Undo2,
  FileText,
  Layout
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
import { cn } from "@/lib/utils";

/**
 * Componente: ScriptEditor
 * Editor de texto rico para roteirização.
 * Estética Unificada: Creative (The Studio).
 */

interface ScriptEditorProps {
  initialContent?: string;
  onSave?: (content: string) => void;
}

export function ScriptEditor({ initialContent = "", onSave }: ScriptEditorProps) {
  const [snapshots, setSnapshots] = React.useState<Array<{ id: string; timestamp: number; content: string }>>([]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Comece a roteirizar seu conteúdo aqui...",
      }),
    ],
    immediatelyRender: false,
    content: initialContent,
    editorProps: {
      attributes: {
        class: "prose max-w-none focus:outline-none min-h-[500px] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-primary/20",
      },
    },
  });

  const takeSnapshot = () => {
    if (!editor) return;
    const content = editor.getHTML();
    const newSnapshot = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      content,
    };
    setSnapshots([newSnapshot, ...snapshots]);
  };

  const restoreSnapshot = (content: string) => {
    if (!editor) return;
    editor.commands.setContent(content);
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col bg-white dark:bg-zinc-900 shadow-[20px_20px_60px_#efefef] dark:shadow-none rounded-[40px] overflow-hidden h-full border-none dark:border dark:border-zinc-800">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-8 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-50 dark:border-zinc-800 overflow-x-auto shrink-0">
        <div className="flex items-center gap-1 shrink-0">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            icon={<Bold size={18} />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            icon={<Italic size={18} />}
          />
          <div className="w-[1px] h-6 bg-zinc-100 dark:bg-zinc-800 mx-2" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            icon={<Heading1 size={20} />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            icon={<Heading2 size={20} />}
          />
          <div className="w-[1px] h-6 bg-zinc-100 dark:bg-zinc-800 mx-2" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            icon={<List size={18} />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            icon={<ListOrdered size={18} />}
          />
        </div>

        <div className="flex items-center gap-4 shrink-0 ml-4">
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="sm" className="h-10 text-[10px] text-zinc-400 hover:text-primary uppercase tracking-widest font-black transition-all" />}>
              <History size={16} className="mr-2" /> REVISÕES ({snapshots.length})
            </SheetTrigger>
            <SheetContent className="bg-white dark:bg-zinc-900 border-none dark:border-l dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl rounded-l-[40px] p-8">
              <SheetHeader>
                <SheetTitle className="text-2xl font-black italic uppercase tracking-tighter text-zinc-900 dark:text-zinc-100 italic">Histórico_<span className="text-primary">Fluxo</span></SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-120px)] mt-8">
                <div className="space-y-6 pr-4">
                  {snapshots.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-700 text-center gap-6">
                      <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-[32px] flex items-center justify-center">
                        <FileText size={40} className="text-zinc-200 dark:text-zinc-700" />
                      </div>
                      <p className="text-xs uppercase tracking-[0.2em] font-black max-w-[200px]">Nenhum snapshot restaurável detectado.</p>
                    </div>
                  ) : (
                    snapshots.map((s) => (
                      <div
                        key={s.id}
                        className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-[32px] hover:bg-primary-light dark:hover:bg-primary-dark transition-all group cursor-pointer text-left border-none dark:border dark:border-zinc-700"
                        onClick={() => restoreSnapshot(s.content)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline" className="bg-primary text-white border-none rounded-full text-[8px] uppercase tracking-widest px-3 py-1 font-black">
                            SNAPSHOT
                          </Badge>
                          <span className="text-[10px] text-zinc-400 font-bold">
                            {new Date(s.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 font-medium truncate leading-relaxed">
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
            className="h-10 text-[10px] text-zinc-400 hover:text-primary uppercase tracking-widest font-black transition-all"
          >
            SNAPSHOT
          </Button>

          <Button
            size="sm"
            className="h-10 bg-primary hover:opacity-90 text-white font-black uppercase text-[10px] tracking-widest px-8 rounded-full shadow-lg shadow-primary/20 transition-all active:scale-95"
            onClick={() => onSave?.(editor.getHTML())}
          >
            SALVAR
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 bg-white dark:bg-zinc-900 font-sans">
        <div className="max-w-4xl mx-auto py-12 px-12">
          <EditorContent editor={editor} />
        </div>
      </ScrollArea>

      <div className="px-8 py-4 bg-white dark:bg-zinc-900 border-t border-zinc-50 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase">Status: Live</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles size={12} className="text-primary" />
          <span className="text-[10px] font-black text-primary/70 tracking-[0.2em] uppercase italic">Focado no Criador</span>
        </div>
      </div>
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
        "h-10 w-10 rounded-2xl transition-all",
        active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
      )}
    >
      {icon}
    </Button>
  );
}
