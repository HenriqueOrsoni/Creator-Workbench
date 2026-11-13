"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/useAppStore";
import { formatCount, sparklinePoints } from "@/lib/video";
import { formatDateTime } from "@/lib/dates";

interface VideoPerformanceProps {
  cardId: string;
  videoUrl?: string;
  canEdit: boolean;
  /** Aba visível: só então busca os números. */
  active: boolean;
}

function formatPublishDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"];

function safeHref(url: string): string | null {
  try {
    const u = new URL(url);
    const okProtocol = u.protocol === "https:" || u.protocol === "http:";
    return okProtocol && YOUTUBE_HOSTS.includes(u.hostname.toLowerCase()) ? u.toString() : null;
  } catch {
    return null;
  }
}

export function VideoPerformance({ cardId, videoUrl, canEdit, active }: VideoPerformanceProps) {
  const stats = useAppStore(s => s.videoStats[cardId]);
  const setCardVideo = useAppStore(s => s.setCardVideo);
  const fetchVideoStats = useAppStore(s => s.fetchVideoStats);
  const refreshVideoStats = useAppStore(s => s.refreshVideoStats);

  const [input, setInput] = useState(videoUrl || "");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !videoUrl) return;
    const key = `${cardId}|${videoUrl}`;
    let cancelled = false;
    fetchVideoStats(cardId).finally(() => {
      if (!cancelled) setLoadedFor(key);
    });
    return () => {
      cancelled = true;
    };
  }, [active, cardId, videoUrl, fetchVideoStats]);

  const loading = !!videoUrl && loadedFor !== `${cardId}|${videoUrl}` && !stats;

  const save = async () => {
    setSaving(true);
    await setCardVideo(cardId, input);
    setSaving(false);
  };
  const remove = async () => {
    setSaving(true);
    const ok = await setCardVideo(cardId, "");
    setSaving(false);
    if (ok) setInput("");
  };
  const refresh = async () => {
    setRefreshing(true);
    await refreshVideoStats(cardId);
    setRefreshing(false);
  };

  const href = stats ? safeHref(stats.videoUrl) : null;
  const history = stats?.history ?? [];
  const points = sparklinePoints(history);
  const latest = stats?.latest ?? null;
  const tiles = [
    { label: "Visualizações", value: latest?.viewCount },
    { label: "Curtidas", value: latest?.likeCount },
    { label: "Comentários", value: latest?.commentCount }
  ];

  return (
    <div className="space-y-3" data-testid="video-performance">
      <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
        {canEdit ? (
          <label htmlFor={`video-url-${cardId}`} className="text-xs font-semibold text-foreground">
            Link do vídeo no YouTube
          </label>
        ) : (
          <p className="text-xs font-semibold text-foreground">Link do vídeo no YouTube</p>
        )}
        {canEdit ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id={`video-url-${cardId}`}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="min-w-0 text-xs"
              disabled={saving}
            />
            <div className="flex gap-2">
              <Button size="sm" className="text-xs font-semibold" onClick={save} disabled={saving || !input.trim()}>
                Salvar
              </Button>
              {videoUrl && (
                <Button size="sm" variant="outline" className="text-xs font-semibold" onClick={remove} disabled={saving}>
                  Remover
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p data-testid="video-url-readonly" className="text-xs text-muted-foreground break-all">
            {videoUrl || "Nenhum vídeo vinculado."}
          </p>
        )}
      </div>

      {!videoUrl ? (
        <p data-testid="video-empty" className="text-xs text-muted-foreground leading-relaxed">
          Vincule o vídeo publicado no YouTube para acompanhar visualizações, curtidas e comentários.
        </p>
      ) : (
        <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              {stats && latest ? (
                <>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-primary hover:underline break-words inline-flex items-start gap-1"
                    >
                      <span data-testid="video-title">{stats.title}</span>
                      <ExternalLink className="w-3 h-3 mt-1 shrink-0" aria-hidden="true" />
                    </a>
                  ) : (
                    <span data-testid="video-title" className="text-sm font-semibold break-words">{stats.title}</span>
                  )}
                  {stats.publishedAt && (
                    <p className="text-[11px] text-muted-foreground">
                      Publicado em {formatPublishDate(stats.publishedAt)}
                    </p>
                  )}
                </>
              ) : loading ? (
                <p className="text-xs text-muted-foreground">Carregando desempenho...</p>
              ) : (
                <p className="text-xs text-muted-foreground">Ainda não há números deste vídeo. Clique em Atualizar.</p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-semibold gap-1.5 shrink-0"
              onClick={refresh}
              disabled={refreshing}
              aria-busy={refreshing}
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              {refreshing ? "Atualizando..." : "Atualizar"}
            </Button>
          </div>

          {stats && latest && (
            <>
              <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2">
                {tiles.map(t => (
                  <div key={t.label} className="rounded-lg border border-border bg-card p-2.5 min-w-0">
                    <p className="text-[11px] text-muted-foreground">{t.label}</p>
                    <p data-testid={`stat-${t.label}`} className="text-lg font-bold text-foreground tabular-nums break-words">
                      {formatCount(t.value)}
                    </p>
                  </div>
                ))}
              </div>
              {latest && (
                <p className="text-[10px] text-muted-foreground">Atualizado em {formatDateTime(latest.capturedAt)}</p>
              )}

              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-foreground">Visualizações ao longo do tempo</p>
                {points ? (
                  <svg
                    viewBox="0 0 100 32"
                    preserveAspectRatio="none"
                    className="w-full h-12 text-primary"
                    role="img"
                    aria-label={`Tendência de visualizações em ${history.length} leituras, de ${formatCount(history[0].viewCount)} a ${formatCount(history[history.length - 1].viewCount)}`}
                    data-testid="video-sparkline"
                  >
                    <polyline
                      points={points}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      vectorEffect="non-scaling-stroke"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <p className="text-[11px] text-muted-foreground">A tendência aparece depois de mais de uma leitura.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
