import { create } from "zustand";
import { persist } from "zustand/middleware";
import { OklchColor } from "@/lib/color-utils";
import { apiRequest } from "@/lib/api";

/**
 * Creator Workbench - Global Store
 * Gerencia o estado de Ideação e Produção sincronizado com o backend.
 * Focado na Economia Criativa.
 */

export interface KanbanItem {
  id: string;
  title: string;
  description: string;
  state: "IDEATION" | "IN_PRODUCTION" | "REVIEW" | "DONE";
  createdAt: number;
  targetAudience?: string;
  pedagogicalObjective?: string;
  progress: number;
}

export interface BackendKanbanItem {
  id: string | number;
  title: string;
  description?: string;
  state: string;
  createdAt: string;
  targetAudience?: string;
  pedagogicalObjective?: string;
  progress?: number;
}

// Mapeamento bidirecional entre os enums e campos do backend e do frontend
function mapBackendToFrontendItem(item: BackendKanbanItem): KanbanItem {
  return {
    id: item.id.toString(),
    title: item.title,
    description: item.description || "",
    state: item.state as "IDEATION" | "IN_PRODUCTION" | "REVIEW" | "DONE",
    createdAt: new Date(item.createdAt).getTime(),
    targetAudience: item.targetAudience || "",
    pedagogicalObjective: item.pedagogicalObjective || "",
    progress: item.progress || 0
  };
}

interface AppState {
  items: KanbanItem[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  fetchItems: () => Promise<void>;
  addIdea: (title: string, description: string) => Promise<void>;
  convertToProject: (id: string, title: string, audience?: string, objective?: string) => Promise<boolean>;
  updateProject: (id: string, title: string, audience: string, objective: string, state?: "IDEATION" | "IN_PRODUCTION" | "REVIEW" | "DONE", progress?: number) => Promise<void>;
  updateState: (id: string, state: "IDEATION" | "IN_PRODUCTION" | "REVIEW" | "DONE") => Promise<void>;
  updateProgress: (id: string, progress: number) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
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
      items: [],
      selectedProjectId: null,
      
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),

      fetchItems: async () => {
        try {
          const rawItems = await apiRequest("GET", "/api/v1/kanban");
          if (Array.isArray(rawItems)) {
            const mapped = rawItems.map(mapBackendToFrontendItem);
            set({ items: mapped });
            
            // Auto-seleciona o primeiro projeto ativo se nenhum estiver selecionado
            const projects = mapped.filter(i => i.state !== "IDEATION");
            if (projects.length > 0 && !get().selectedProjectId) {
              set({ selectedProjectId: projects[0].id });
            }
          }
        } catch (error) {
          console.error("Erro ao buscar itens do Kanban:", error);
        }
      },

      addIdea: async (title, description) => {
        try {
          const rawItem = await apiRequest("POST", "/api/v1/kanban", { title, description });
          if (rawItem) {
            const mapped = mapBackendToFrontendItem(rawItem);
            set((state) => ({ items: [mapped, ...state.items] }));
          }
        } catch (error) {
          console.error("Erro ao criar ideia:", error);
        }
      },

      convertToProject: async (id, title, audience = "", objective = "") => {
        try {
          const rawItem = await apiRequest("POST", `/api/v1/kanban/${id}/convert`, {
            title,
            targetAudience: audience,
            pedagogicalObjective: objective
          });
          if (rawItem) {
            const mapped = mapBackendToFrontendItem(rawItem);
            set((state) => ({
              items: state.items.map((i) => (i.id === id ? mapped : i)),
              selectedProjectId: state.selectedProjectId || id // Seleciona se não houver um ativo
            }));
            return true;
          }
          return false;
        } catch (error) {
          console.error("Erro ao converter ideia em projeto:", error);
          return false;
        }
      },

      updateProject: async (id, title, audience, objective, state, progress) => {
        try {
          const rawItem = await apiRequest("PUT", `/api/v1/kanban/${id}`, {
            title,
            targetAudience: audience,
            pedagogicalObjective: objective,
            state,
            progress
          });
          if (rawItem) {
            const mapped = mapBackendToFrontendItem(rawItem);
            set((currentState) => ({
              items: currentState.items.map((i) => (i.id === id ? mapped : i))
            }));
          }
        } catch (error) {
          console.error("Erro ao atualizar projeto:", error);
        }
      },

      updateState: async (id, state) => {
        try {
          const rawItem = await apiRequest("PUT", `/api/v1/kanban/${id}`, { state });
          if (rawItem) {
            const mapped = mapBackendToFrontendItem(rawItem);
            set((currentState) => ({
              items: currentState.items.map((i) => (i.id === id ? mapped : i))
            }));
          }
        } catch (error) {
          console.error("Erro ao atualizar estado:", error);
        }
      },

      updateProgress: async (id, progress) => {
        try {
          const rawItem = await apiRequest("PUT", `/api/v1/kanban/${id}`, { progress });
          if (rawItem) {
            const mapped = mapBackendToFrontendItem(rawItem);
            set((state) => ({
              items: state.items.map((i) => (i.id === id ? mapped : i))
            }));
          }
        } catch (error) {
          console.error("Erro ao atualizar progresso:", error);
        }
      },

      deleteItem: async (id) => {
        try {
          await apiRequest("DELETE", `/api/v1/kanban/${id}`);
          set((state) => ({
            items: state.items.filter((i) => i.id !== id),
            selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId
          }));
        } catch (error) {
          console.error("Erro ao deletar item:", error);
        }
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
      partialize: (state) => ({
        accentHue: state.accentHue,
        accentChroma: state.accentChroma,
        accentLuminance: state.accentLuminance,
        favoriteColors: state.favoriteColors,
      }),
    }
  )
);
