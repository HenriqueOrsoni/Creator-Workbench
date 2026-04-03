import { create } from "zustand";
import { persist } from "zustand/middleware";
import { OklchColor } from "@/lib/color-utils";

/**
 * Creator Workbench - Global Store
 * Gerencia o estado de Ideação e Produção.
 * Focado na Economia Criativa.
 */

export interface KanbanItem {
  id: string;
  title: string;
  description: string;
  status: "Ideation" | "In_Production" | "Review" | "Done";
  type: "Idea" | "Project";
  createdAt: number;
  // Campos de conversão (RN01)
  targetAudience?: string;
  pedagogicalGoal?: string;
  progress: number;
}

interface AppState {
  items: KanbanItem[];
  addIdea: (title: string, description: string) => void;
  convertToProject: (id: string, title: string, audience?: string, goal?: string) => boolean;
  updateProject: (id: string, title: string, audience: string, goal: string) => void;
  updateProgress: (id: string, progress: number) => void;
  deleteItem: (id: string) => void;
  accentHue: number;
  accentChroma: number;
  accentLuminance: number;
  favoriteColors: OklchColor[];
  setAccentHue: (hue: number) => void;
  setAccentColor: (h: number, c: number, l: number) => void;
  toggleFavorite: (color: OklchColor) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      items: [
        {
          id: "1",
          title: "Série: Criatividade Viral",
          description: "Planejamento de 10 vídeos curtos sobre psicologia do compartilhamento.",
          status: "In_Production",
          type: "Project",
          createdAt: Date.now(),
          progress: 3,
          targetAudience: "Criadores de Conteúdo Iniciantes",
          pedagogicalGoal: "Dominar gatilhos mentais para retenção."
        },
        {
          id: "2",
          title: "Podcast: O Futuro da Educação",
          description: "Roteiro para o episódio piloto focado em IA Generativa.",
          status: "Ideation",
          type: "Idea",
          createdAt: Date.now(),
          progress: 0
        },
        {
          id: "3",
          title: "Workshop: Design Sprint para YouTubers",
          description: "Metodologia ágil aplicada à produção de infoprodutos.",
          status: "Ideation",
          type: "Idea",
          createdAt: Date.now(),
          progress: 0
        }
      ],

      addIdea: (title, description) => {
        const newItem: KanbanItem = {
          id: crypto.randomUUID(),
          title,
          description,
          status: "Ideation",
          type: "Idea",
          createdAt: Date.now(),
          progress: 0
        };
        set((state) => ({ items: [newItem, ...state.items] }));
      },

      convertToProject: (id, title, audience = "", goal = "") => {
        const state = get();
        const item = state.items.find((i) => i.id === id);
        
        if (!item || !title) return false;

        set((state) => ({
          items: state.items.map((i) =>
            i.id === id
              ? {
                  ...i,
                  title,
                  status: "In_Production",
                  type: "Project",
                  targetAudience: audience || "Definição Pendente",
                  pedagogicalGoal: goal || "Definição Pendente",
                  progress: 1
                }
              : i
          ),
        }));
        return true;
      },

      updateProject: (id, title, audience, goal) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id 
              ? { ...i, title, targetAudience: audience, pedagogicalGoal: goal } 
              : i
          ),
        }));
      },

      updateProgress: (id, progress) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, progress } : i
          ),
        }));
      },

      deleteItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));
      },
      accentHue: 45, // Default Orange OKLCH Hue
      accentChroma: 0.19,
      accentLuminance: 0.65,
      favoriteColors: [],
      setAccentHue: (hue) => {
        set({ accentHue: hue });
        if (typeof document !== "undefined") {
          document.documentElement.style.setProperty("--brand-hue", hue.toString());
        }
      },
      setAccentColor: (h, c, l) => {
        set({ accentHue: h, accentChroma: c, accentLuminance: l });
        if (typeof document !== "undefined") {
          document.documentElement.style.setProperty("--brand-hue", h.toString());
          document.documentElement.style.setProperty("--brand-chroma", c.toString());
          document.documentElement.style.setProperty("--brand-luminance", l.toString());
        }
      },
      toggleFavorite: (color) => {
        const { favoriteColors } = get();
        const isFavorite = favoriteColors.some(
          (f) => f.h === color.h && f.c === color.c && f.l === color.l
        );

        if (isFavorite) {
          set({
            favoriteColors: favoriteColors.filter(
              (f) => !(f.h === color.h && f.c === color.c && f.l === color.l)
            ),
          });
        } else {
          // Limit to 18 favorites
          const newFavorites = [color, ...favoriteColors].slice(0, 18);
          set({ favoriteColors: newFavorites });
        }
      },
    }),
    {
      name: "creator-workbench-storage",
    }
  )
);
