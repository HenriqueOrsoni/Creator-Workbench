"use client";

import React from "react";
import { Download, Link2, Paperclip, Unlink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/useAppStore";
import { canEditProduction } from "@/lib/roles";
import { isPreviewable, materialMeta } from "@/lib/materials";

interface LessonMaterialsDialogProps {
  courseId: string;
  moduleId: string;
  lessonId: string;
  onClose: () => void;
}

/**
 * Materiais de uma aula: todos os membros veem e baixam; Administrador e Criador
 * vinculam (a partir dos materiais do projeto da aula) e desvinculam.
 * Nomes de arquivo são exibidos como texto puro.
 */
export function LessonMaterialsDialog({ courseId, moduleId, lessonId, onClose }: LessonMaterialsDialogProps) {
  const {
    activeCourse,
    activeTeam,
    board,
    cardMaterials,
    fetchCardMaterials,
    downloadMaterial,
    previewMaterial,
    linkMaterialToLesson,
    unlinkMaterialFromLesson,
  } = useAppStore();

  const canEdit = canEditProduction(activeTeam?.role);
  const lesson = activeCourse?.modules
    .find((m) => m.id === moduleId)
    ?.lessons.find((l) => l.id === lessonId);
  const lessonProjectId = lesson?.projectId;

  // Começa pelo projeto da aula, mas qualquer projeto da equipe pode ser escolhido
  const [pickedProject, setPickedProject] = React.useState<string | null>(null);
  const projectId = pickedProject ?? lessonProjectId ?? "";
  const projects = (board?.columns ?? []).flatMap((c) => c.cards).filter((c) => c.type === "PROJECT");

  const [selectedId, setSelectedId] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (projectId && canEdit) fetchCardMaterials(projectId, { ignoreNotFound: true });
  }, [projectId, canEdit, fetchCardMaterials]);

  if (!lesson) return null;

  const linked = lesson.materials ?? [];
  const linkedIds = new Set(linked.map((m) => m.id));
  const available = (projectId ? cardMaterials[projectId] ?? [] : []).filter((m) => !linkedIds.has(m.id));

  const handleLink = async () => {
    if (!selectedId) return;
    setBusy(true);
    const ok = await linkMaterialToLesson(courseId, moduleId, lessonId, selectedId);
    setBusy(false);
    if (ok) setSelectedId("");
  };

  const handleUnlink = async (materialId: string) => {
    setBusy(true);
    await unlinkMaterialFromLesson(courseId, moduleId, lessonId, materialId);
    setBusy(false);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="min-w-0 overflow-x-hidden sm:max-w-[480px] max-h-[90vh] overflow-y-auto rounded-xl p-4 sm:p-6 bg-card border-border shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 font-heading text-foreground">
            <Paperclip className="w-5 h-5 text-primary" />
            Materiais da aula
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground break-words">
            {lesson.title}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4 mt-2">
          <div className="min-w-0 space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Vinculados ({linked.length})
            </span>
            {linked.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">
                Nenhum material vinculado a esta aula.
              </p>
            ) : (
              <ul className="min-w-0 space-y-1.5">
                {linked.map((m) => (
                  <li
                    key={m.id}
                    className="flex min-w-0 items-center justify-between gap-2 p-2.5 rounded-lg bg-card border border-border"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate" title={m.fileName}>{m.fileName}</p>
                      <p className="text-[10px] text-muted-foreground break-words" data-testid="material-meta">{materialMeta(m)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isPreviewable(m) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => previewMaterial(m)}
                          aria-label={`Visualizar ${m.fileName}`}
                          title="Visualizar"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => downloadMaterial(m)}
                        aria-label={`Baixar ${m.fileName}`}
                        title="Baixar material"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      {canEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={busy}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleUnlink(m.id)}
                          aria-label={`Desvincular ${m.fileName}`}
                          title="Desvincular da aula"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canEdit && (
            <div className="space-y-1.5 pt-3 border-t border-border">
              <label
                htmlFor="lesson-material-select"
                className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Vincular material do projeto
              </label>
              <select
                aria-label="Projeto do material"
                value={projectId}
                onChange={(e) => {
                  setPickedProject(e.target.value);
                  setSelectedId("");
                }}
                className="h-9 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
              >
                <option value="">Selecione um projeto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              {!projectId ? (
                <p className="text-xs text-muted-foreground">
                  Escolha um projeto para ver os materiais dele.
                </p>
              ) : available.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum material disponível neste projeto. Envie arquivos na aba Materiais do card.
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    id="lesson-material-select"
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="h-9 flex-1 min-w-0 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
                  >
                    <option value="">Selecione um arquivo</option>
                    {available.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fileName}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!selectedId || busy}
                    onClick={handleLink}
                    className="h-9 gap-1.5 rounded-lg text-xs font-semibold"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Vincular
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
