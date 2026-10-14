import { create } from "zustand";
import { persist } from "zustand/middleware";
import { OklchColor } from "@/lib/color-utils";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

/**
 * Creator Workbench - Global Store
 * Gerencia o estado de Ideação, Produção, Equipes e Cursos.
 * Fase 2: Modelo de Domínio Expandido.
 */

export interface Team {
  id: string;
  name: string;
  role: "ADMIN" | "CREATOR" | "REVIEWER";
  membersCount: number;
  createdAt: string;
}

export interface CardTask {
  id: string;
  cardId: string;
  title: string;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ProjectCard {
  id: string;
  teamId?: string;
  title: string;
  description: string;
  type: "IDEA" | "PROJECT";
  columnId?: string;
  columnName?: string;
  sortOrder: number;
  progress: number;
  tasksTotal: number;
  tasksDone: number;
  targetAudience?: string;
  pedagogicalObjective?: string;
  tasks?: CardTask[];
  createdAt: string;
  updatedAt?: string;
}

export interface BoardColumn {
  id: string;
  name: string;
  sortOrder: number;
  cards: ProjectCard[];
}

export interface Course {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  modulesCount?: number;
  createdAt: string;
}

export interface CourseLesson {
  id: string;
  moduleId: string;
  title: string;
  type: "VIDEO" | "TEXT" | "QUIZ";
  published: boolean;
  sortOrder: number;
  projectId?: string;
  createdAt?: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
  lessons: CourseLesson[];
  createdAt?: string;
}

export interface CourseDetail extends Course {
  modules: CourseModule[];
}

// Compatibilidade legada para o Kanban anterior
export interface KanbanItem {
  id: string;
  title: string;
  description: string;
  state: "IDEATION" | "IN_PRODUCTION" | "REVIEW" | "DONE";
  createdAt: number;
  targetAudience?: string;
  pedagogicalObjective?: string;
  progress: number;
  tasksTotal?: number;
  tasksDone?: number;
  columnId?: string;
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
  tasksTotal?: number;
  tasksDone?: number;
  columnId?: string | number;
}

export interface ApiTaskDto {
  id: string | number;
  cardId: string | number;
  title: string;
  completed?: boolean;
  sortOrder: number;
  createdAt?: string;
}

export interface ApiCardDto {
  id: string | number;
  teamId?: string | number;
  title: string;
  description?: string;
  type?: "IDEA" | "PROJECT";
  columnId?: string | number;
  sortOrder?: number;
  progress?: number;
  tasksTotal?: number;
  tasksDone?: number;
  targetAudience?: string;
  pedagogicalObjective?: string;
  tasks?: ApiTaskDto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiColumnDto {
  id: string | number;
  name: string;
  sortOrder: number;
  cards?: ApiCardDto[];
}

export interface ApiCourseDto {
  id: string | number;
  teamId: string | number;
  title: string;
  description?: string;
  modulesCount?: number;
  createdAt: string;
}

export interface ApiLessonDto {
  id: string | number;
  moduleId?: string | number;
  title: string;
  type?: "VIDEO" | "TEXT" | "QUIZ";
  published?: boolean;
  sortOrder: number;
  projectId?: string | number;
  createdAt?: string;
}

export interface ApiModuleDto {
  id: string | number;
  courseId?: string | number;
  title: string;
  sortOrder: number;
  lessons?: ApiLessonDto[];
  createdAt?: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "ADMIN" | "CREATOR" | "REVIEWER";
  joinedAt: string;
}

export interface ApiTeamMemberDto {
  id: string | number;
  userId: string | number;
  name: string;
  email: string;
  role: "ADMIN" | "CREATOR" | "REVIEWER";
  joinedAt: string;
}

export interface ScriptExportData {
  cardId: string;
  cardTitle: string;
  targetAudience: string;
  pedagogicalObjective: string;
  rawContent: string;
  markdownFormatted: string;
  wordCount: number;
  estimatedMinutes: number;
}

export interface ScriptVersionData {
  id: string;
  versionNumber: number;
  content: string;
  createdAt: string;
}

export interface ApiScriptVersionDto {
  id: string | number;
  versionNumber?: number;
  content: string;
  createdAt: string;
}

function mapBackendToFrontendItem(item: BackendKanbanItem): KanbanItem {
  return {
    id: item.id.toString(),
    title: item.title,
    description: item.description || "",
    state: (item.state as "IDEATION" | "IN_PRODUCTION" | "REVIEW" | "DONE") || "IDEATION",
    createdAt: new Date(item.createdAt).getTime(),
    targetAudience: item.targetAudience || "",
    pedagogicalObjective: item.pedagogicalObjective || "",
    progress: item.progress || 0,
    tasksTotal: item.tasksTotal || 0,
    tasksDone: item.tasksDone || 0,
    columnId: item.columnId ? item.columnId.toString() : undefined
  };
}

interface AppState {
  // Estado Legado (para testes e componentes retrocompatíveis)
  items: KanbanItem[];
  selectedProjectId: string | null;
  error: string | null;
  clearError: () => void;
  resetStore: () => void;
  setSelectedProjectId: (id: string | null) => void;
  fetchItems: () => Promise<void>;
  addIdea: (title: string, description: string) => Promise<void>;
  convertToProject: (id: string, title: string, audience?: string, objective?: string) => Promise<boolean>;
  updateProject: (id: string, title: string, audience: string, objective: string, state?: "IDEATION" | "IN_PRODUCTION" | "REVIEW" | "DONE", progress?: number) => Promise<void>;
  updateState: (id: string, state: "IDEATION" | "IN_PRODUCTION" | "REVIEW" | "DONE") => Promise<void>;
  updateProgress: (id: string, progress: number) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  // Fase 2 & 3: Equipes & Membros
  teams: Team[];
  activeTeamId: string | null;
  activeTeam: Team | null;
  teamMembers: TeamMember[];
  fetchTeams: () => Promise<void>;
  setActiveTeamId: (teamId: string) => Promise<void>;
  createTeam: (name: string) => Promise<Team | null>;
  fetchTeamMembers: (teamId?: string) => Promise<void>;
  addTeamMember: (email: string, role: "ADMIN" | "CREATOR" | "REVIEWER") => Promise<boolean>;
  updateTeamMemberRole: (memberId: string, role: "ADMIN" | "CREATOR" | "REVIEWER") => Promise<boolean>;
  removeTeamMember: (memberId: string) => Promise<boolean>;

  // Fase 2: Quadro Dinâmico & Caixa de Entrada (Inbox)
  board: { teamId: string; teamName: string; columns: BoardColumn[] } | null;
  ideas: ProjectCard[];
  fetchBoard: () => Promise<void>;
  fetchIdeas: () => Promise<void>;
  createBoardCard: (data: { title: string; description?: string; columnId?: string; targetAudience?: string; pedagogicalObjective?: string }) => Promise<ProjectCard | null>;
  createInboxIdea: (data: { title: string; description?: string; targetAudience?: string; pedagogicalObjective?: string }) => Promise<ProjectCard | null>;
  convertInboxIdea: (cardId: string, columnId?: string) => Promise<boolean>;
  moveCard: (cardId: string, columnId: string, sortOrder?: number) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  addColumn: (name: string) => Promise<void>;

  // Fase 2: Checklist & Tarefas dos Cards
  createTask: (cardId: string, title: string) => Promise<CardTask | null>;
  toggleTask: (cardId: string, taskId: string) => Promise<void>;
  deleteTask: (cardId: string, taskId: string) => Promise<void>;

  // Fase 2: Cursos, Módulos e Lições
  courses: Course[];
  activeCourse: CourseDetail | null;
  fetchCourses: () => Promise<void>;
  fetchCourseDetails: (courseId: string) => Promise<void>;
  createCourse: (title: string, description?: string) => Promise<Course | null>;
  deleteCourse: (courseId: string) => Promise<void>;
  createCourseModule: (courseId: string, title: string) => Promise<void>;
  deleteCourseModule: (courseId: string, moduleId: string) => Promise<void>;
  createCourseLesson: (courseId: string, moduleId: string, title: string, type?: "VIDEO" | "TEXT" | "QUIZ", projectId?: string) => Promise<void>;
  deleteCourseLesson: (courseId: string, moduleId: string, lessonId: string) => Promise<void>;

  // Fase 3: Estúdio de Roteiro Avançado (Exportação e Versões)
  exportScript: (cardId: string) => Promise<ScriptExportData | null>;
  fetchScriptVersions: (cardId: string) => Promise<ScriptVersionData[]>;
  restoreScriptVersion: (cardId: string, versionId: string) => Promise<boolean>;

  // Personalização
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
      error: null,
      teams: [],
      activeTeamId: null,
      activeTeam: null,
      teamMembers: [],
      board: null,
      ideas: [],
      courses: [],
      activeCourse: null,

      clearError: () => set({ error: null }),
      resetStore: () => set({
        items: [],
        selectedProjectId: null,
        error: null,
        teams: [],
        activeTeamId: null,
        activeTeam: null,
        teamMembers: [],
        board: null,
        ideas: [],
        courses: [],
        activeCourse: null,
      }),

      setSelectedProjectId: (id) => set({ selectedProjectId: id }),

      // --- Equipes ---
      fetchTeams: async () => {
        try {
          set({ error: null });
          const rawTeams = await apiRequest("GET", "/api/v1/teams");
          if (Array.isArray(rawTeams) && rawTeams.length > 0) {
            const mappedTeams: Team[] = rawTeams.map(t => ({
              id: t.id.toString(),
              name: t.name,
              role: t.role || "CREATOR",
              membersCount: t.membersCount || 1,
              createdAt: t.createdAt
            }));

            let activeId = get().activeTeamId;
            if (!activeId || !mappedTeams.some(t => t.id === activeId)) {
              activeId = mappedTeams[0].id;
            }

            const active = mappedTeams.find(t => t.id === activeId) || null;
            set({ teams: mappedTeams, activeTeamId: activeId, activeTeam: active });

            if (activeId) {
              await get().fetchBoard();
              await get().fetchIdeas();
              await get().fetchCourses();
            }
            return;
          }
        } catch {
          // Backend sem endpoint de equipes ainda: fallback silencioso para estúdio padrão
        }

        if (get().teams.length === 0) {
          const defaultTeam: Team = {
            id: "1",
            name: "Meu Estúdio",
            role: "ADMIN",
            membersCount: 1,
            createdAt: new Date().toISOString()
          };
          set({
            teams: [defaultTeam],
            activeTeamId: "1",
            activeTeam: defaultTeam
          });
        }
      },

      setActiveTeamId: async (teamId) => {
        const found = get().teams.find(t => t.id === teamId) || null;
        set({ activeTeamId: teamId, activeTeam: found });
        await get().fetchBoard();
        await get().fetchIdeas();
        await get().fetchCourses();
      },

      createTeam: async (name) => {
        try {
          const raw = await apiRequest("POST", "/api/v1/teams", { name });
          if (raw) {
            const newTeam: Team = {
              id: raw.id.toString(),
              name: raw.name,
              role: raw.role || "ADMIN",
              membersCount: raw.membersCount || 1,
              createdAt: raw.createdAt
            };
            set(state => ({
              teams: [...state.teams, newTeam],
              activeTeamId: newTeam.id,
              activeTeam: newTeam
            }));
            toast.success("Equipe criada com sucesso!");
            await get().fetchBoard();
            await get().fetchIdeas();
            return newTeam;
          }
          return null;
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao criar equipe";
          toast.error(msg);
          return null;
        }
      },

      fetchTeamMembers: async (teamId) => {
        const targetTeamId = teamId || get().activeTeamId;
        if (!targetTeamId) return;

        try {
          const rawMembers = await apiRequest("GET", `/api/v1/teams/${targetTeamId}/members`);
          if (Array.isArray(rawMembers)) {
            const mappedMembers: TeamMember[] = rawMembers.map((m: ApiTeamMemberDto) => ({
              id: m.id.toString(),
              userId: m.userId.toString(),
              name: m.name,
              email: m.email,
              role: m.role || "CREATOR",
              joinedAt: m.joinedAt
            }));
            set({ teamMembers: mappedMembers });
          }
        } catch (error) {
          console.error("Erro ao carregar membros da equipe:", error);
        }
      },

      addTeamMember: async (email, role) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/members`, { email, role });
          if (raw) {
            toast.success("Membro adicionado à equipe com sucesso!");
            await get().fetchTeamMembers(teamId);
            return true;
          }
          return false;
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao adicionar membro";
          toast.error(msg);
          return false;
        }
      },

      updateTeamMemberRole: async (memberId, role) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("PATCH", `/api/v1/teams/${teamId}/members/${memberId}`, { role });
          toast.success("Papel do membro atualizado!");
          await get().fetchTeamMembers(teamId);
          return true;
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao atualizar papel";
          toast.error(msg);
          return false;
        }
      },

      removeTeamMember: async (memberId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("DELETE", `/api/v1/teams/${teamId}/members/${memberId}`);
          toast.success("Membro removido da equipe com sucesso!");
          await get().fetchTeamMembers(teamId);
          return true;
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao remover membro";
          toast.error(msg);
          return false;
        }
      },

      // --- Quadro Dinâmico & Caixa de Entrada ---
      fetchBoard: async () => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          set({ error: null });
          const rawBoard = await apiRequest("GET", `/api/v1/teams/${teamId}/board`);
          if (rawBoard && Array.isArray(rawBoard.columns)) {
            const mappedColumns: BoardColumn[] = rawBoard.columns.map((col: ApiColumnDto) => ({
              id: col.id.toString(),
              name: col.name,
              sortOrder: col.sortOrder,
              cards: Array.isArray(col.cards) ? col.cards.map((c: ApiCardDto) => ({
                id: c.id.toString(),
                teamId: c.teamId?.toString(),
                title: c.title,
                description: c.description || "",
                type: c.type || "PROJECT",
                columnId: c.columnId ? c.columnId.toString() : col.id.toString(),
                columnName: col.name,
                sortOrder: c.sortOrder || 0,
                progress: c.progress || 0,
                tasksTotal: c.tasksTotal || 0,
                tasksDone: c.tasksDone || 0,
                targetAudience: c.targetAudience,
                pedagogicalObjective: c.pedagogicalObjective,
                tasks: Array.isArray(c.tasks) ? c.tasks.map((t: ApiTaskDto) => ({
                  id: t.id.toString(),
                  cardId: t.cardId.toString(),
                  title: t.title,
                  completed: Boolean(t.completed),
                  sortOrder: t.sortOrder,
                  createdAt: t.createdAt
                })) : [],
                createdAt: c.createdAt || new Date().toISOString(),
                updatedAt: c.updatedAt
              })) : []
            }));

            // Sincroniza também items para retrocompatibilidade
            const flattenedCards: KanbanItem[] = [];
            mappedColumns.forEach(col => {
              col.cards.forEach(card => {
                flattenedCards.push({
                  id: card.id,
                  title: card.title,
                  description: card.description,
                  state: col.name === "Concluído" ? "DONE" : "IN_PRODUCTION",
                  createdAt: new Date(card.createdAt).getTime(),
                  targetAudience: card.targetAudience,
                  pedagogicalObjective: card.pedagogicalObjective,
                  progress: card.progress,
                  tasksTotal: card.tasksTotal,
                  tasksDone: card.tasksDone,
                  columnId: col.id
                });
              });
            });

            set({
              board: {
                teamId: rawBoard.teamId.toString(),
                teamName: rawBoard.teamName,
                columns: mappedColumns
              },
              items: flattenedCards
            });

            if (flattenedCards.length > 0 && !get().selectedProjectId) {
              set({ selectedProjectId: flattenedCards[0].id });
            }
          }
        } catch (error) {
          console.error("Erro ao buscar quadro dinâmico:", error);
        }
      },

      fetchIdeas: async () => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          const rawIdeas = await apiRequest("GET", `/api/v1/teams/${teamId}/ideas`);
          if (Array.isArray(rawIdeas)) {
            const mappedIdeas: ProjectCard[] = rawIdeas.map((c: ApiCardDto) => ({
              id: c.id.toString(),
              teamId: c.teamId?.toString(),
              title: c.title,
              description: c.description || "",
              type: "IDEA",
              sortOrder: c.sortOrder || 0,
              progress: c.progress || 0,
              tasksTotal: c.tasksTotal || 0,
              tasksDone: c.tasksDone || 0,
              targetAudience: c.targetAudience,
              pedagogicalObjective: c.pedagogicalObjective,
              createdAt: c.createdAt || new Date().toISOString(),
              updatedAt: c.updatedAt
            }));
            set({ ideas: mappedIdeas });
          }
        } catch (error) {
          console.error("Erro ao carregar ideias:", error);
        }
      },

      createBoardCard: async (data) => {
        const teamId = get().activeTeamId;
        if (!teamId) return null;

        try {
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/cards`, data);
          if (raw) {
            toast.success("Card de projeto criado!");
            await get().fetchBoard();
            return raw;
          }
          return null;
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao criar card";
          toast.error(msg);
          return null;
        }
      },

      createInboxIdea: async (data) => {
        const teamId = get().activeTeamId;
        if (!teamId) return null;

        try {
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/ideas`, data);
          if (raw) {
            toast.success("Ideia guardada na Caixa de Entrada!");
            await get().fetchIdeas();
            return raw;
          }
          return null;
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao criar ideia";
          toast.error(msg);
          return null;
        }
      },

      convertInboxIdea: async (cardId, columnId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          const url = columnId
            ? `/api/v1/teams/${teamId}/cards/${cardId}/convert?targetColumnId=${columnId}`
            : `/api/v1/teams/${teamId}/cards/${cardId}/convert`;

          await apiRequest("POST", url);
          toast.success("Ideia convertida em projeto no quadro!");
          await get().fetchIdeas();
          await get().fetchBoard();
          return true;
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao converter ideia";
          toast.error(msg);
          return false;
        }
      },

      moveCard: async (cardId, columnId, sortOrder = 0) => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          await apiRequest("PATCH", `/api/v1/teams/${teamId}/cards/${cardId}/move`, {
            columnId: Number(columnId),
            sortOrder
          });
          await get().fetchBoard();
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao mover card";
          toast.error(msg);
        }
      },

      deleteCard: async (cardId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          await apiRequest("DELETE", `/api/v1/teams/${teamId}/cards/${cardId}`);
          toast.success("Card excluído com sucesso!");
          await get().fetchBoard();
          await get().fetchIdeas();
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao excluir card";
          toast.error(msg);
        }
      },

      addColumn: async (name) => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          await apiRequest("POST", `/api/v1/teams/${teamId}/columns`, { name });
          toast.success(`Coluna "${name}" criada!`);
          await get().fetchBoard();
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao criar coluna";
          toast.error(msg);
        }
      },

      // --- Checklist & Tarefas ---
      createTask: async (cardId, title) => {
        const teamId = get().activeTeamId;
        if (!teamId) return null;

        try {
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/cards/${cardId}/tasks`, { title });
          if (raw) {
            toast.success("Tarefa adicionada!");
            await get().fetchBoard();
            return raw;
          }
          return null;
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao adicionar tarefa";
          toast.error(msg);
          return null;
        }
      },

      toggleTask: async (cardId, taskId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          await apiRequest("PATCH", `/api/v1/teams/${teamId}/cards/${cardId}/tasks/${taskId}/toggle`);
          await get().fetchBoard();
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao alternar tarefa";
          toast.error(msg);
        }
      },

      deleteTask: async (cardId, taskId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          await apiRequest("DELETE", `/api/v1/teams/${teamId}/cards/${cardId}/tasks/${taskId}`);
          toast.success("Tarefa removida!");
          await get().fetchBoard();
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao remover tarefa";
          toast.error(msg);
        }
      },

      // --- Cursos, Módulos e Lições ---
      fetchCourses: async () => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          const rawCourses = await apiRequest("GET", `/api/v1/teams/${teamId}/courses`);
          if (Array.isArray(rawCourses)) {
            const mappedCourses: Course[] = rawCourses.map((c: ApiCourseDto) => ({
              id: c.id.toString(),
              teamId: c.teamId.toString(),
              title: c.title,
              description: c.description,
              modulesCount: c.modulesCount || 0,
              createdAt: c.createdAt
            }));
            set({ courses: mappedCourses });
          }
        } catch (error) {
          console.error("Erro ao carregar cursos:", error);
        }
      },

      fetchCourseDetails: async (courseId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          const raw = await apiRequest("GET", `/api/v1/teams/${teamId}/courses/${courseId}`);
          if (raw) {
            const detail: CourseDetail = {
              id: raw.id.toString(),
              teamId: raw.teamId.toString(),
              title: raw.title,
              description: raw.description,
              createdAt: raw.createdAt,
              modules: Array.isArray(raw.modules) ? raw.modules.map((m: ApiModuleDto) => ({
                id: m.id.toString(),
                courseId: m.courseId ? m.courseId.toString() : raw.id.toString(),
                title: m.title,
                sortOrder: m.sortOrder,
                lessons: Array.isArray(m.lessons) ? m.lessons.map((l: ApiLessonDto) => ({
                  id: l.id.toString(),
                  moduleId: l.moduleId ? l.moduleId.toString() : m.id.toString(),
                  title: l.title,
                  type: (l.type || "VIDEO") as CourseLesson["type"],
                  published: Boolean(l.published),
                  sortOrder: l.sortOrder,
                  projectId: l.projectId ? l.projectId.toString() : undefined,
                  createdAt: l.createdAt
                })) : []
              })) : []
            };
            set({ activeCourse: detail });
          }
        } catch (error) {
          console.error("Erro ao carregar detalhes do curso:", error);
        }
      },

      createCourse: async (title, description) => {
        const teamId = get().activeTeamId;
        if (!teamId) return null;

        try {
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/courses`, { title, description });
          if (raw) {
            toast.success("Curso pedagógico criado!");
            await get().fetchCourses();
            return raw;
          }
          return null;
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao criar curso";
          toast.error(msg);
          return null;
        }
      },

      deleteCourse: async (courseId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          await apiRequest("DELETE", `/api/v1/teams/${teamId}/courses/${courseId}`);
          toast.success("Curso removido!");
          if (get().activeCourse?.id === courseId) {
            set({ activeCourse: null });
          }
          await get().fetchCourses();
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao excluir curso";
          toast.error(msg);
        }
      },

      createCourseModule: async (courseId, title) => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          await apiRequest("POST", `/api/v1/teams/${teamId}/courses/${courseId}/modules`, { title });
          toast.success("Módulo adicionado!");
          await get().fetchCourseDetails(courseId);
          await get().fetchCourses();
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao adicionar módulo";
          toast.error(msg);
        }
      },

      deleteCourseModule: async (courseId, moduleId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          await apiRequest("DELETE", `/api/v1/teams/${teamId}/courses/${courseId}/modules/${moduleId}`);
          toast.success("Módulo removido!");
          await get().fetchCourseDetails(courseId);
          await get().fetchCourses();
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao excluir módulo";
          toast.error(msg);
        }
      },

      createCourseLesson: async (courseId, moduleId, title, type = "VIDEO", projectId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          await apiRequest("POST", `/api/v1/teams/${teamId}/courses/${courseId}/modules/${moduleId}/lessons`, {
            title,
            type,
            projectId: projectId ? Number(projectId) : undefined
          });
          toast.success("Aula adicionada!");
          await get().fetchCourseDetails(courseId);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao adicionar aula";
          toast.error(msg);
        }
      },

      deleteCourseLesson: async (courseId, moduleId, lessonId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          await apiRequest("DELETE", `/api/v1/teams/${teamId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`);
          toast.success("Aula removida!");
          await get().fetchCourseDetails(courseId);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao excluir aula";
          toast.error(msg);
        }
      },

      // --- Métodos Legados ---
      fetchItems: async () => {
        try {
          set({ error: null });
          const rawItems = await apiRequest("GET", "/api/v1/kanban");
          if (Array.isArray(rawItems)) {
            const mapped = rawItems.map(mapBackendToFrontendItem);
            set({ items: mapped });
            const projects = mapped.filter(i => i.state !== "IDEATION");
            if (projects.length > 0 && !get().selectedProjectId) {
              set({ selectedProjectId: projects[0].id });
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao carregar itens do Kanban";
          set({ error: message });
          toast.error(message);
          console.error("Erro ao buscar itens do Kanban:", error);
        }
      },

      addIdea: async (title, description) => {
        try {
          set({ error: null });
          const rawItem = await apiRequest("POST", "/api/v1/kanban", { title, description });
          if (rawItem) {
            const mapped = mapBackendToFrontendItem(rawItem);
            set((state) => ({ items: [mapped, ...state.items] }));
            toast.success("Ideia registrada com sucesso!");
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao criar ideia";
          set({ error: message });
          toast.error(message);
          console.error("Erro ao criar ideia:", error);
        }
      },

      convertToProject: async (id, title, audience = "", objective = "") => {
        try {
          set({ error: null });
          const rawItem = await apiRequest("POST", `/api/v1/kanban/${id}/convert`, {
            title,
            targetAudience: audience,
            pedagogicalObjective: objective
          });
          if (rawItem) {
            const mapped = mapBackendToFrontendItem(rawItem);
            set((state) => ({
              items: state.items.map((i) => (i.id === id ? mapped : i)),
              selectedProjectId: state.selectedProjectId || id
            }));
            toast.success("Projeto ativado no pipeline de produção!");
            return true;
          }
          return false;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao converter ideia em projeto";
          set({ error: message });
          toast.error(message);
          console.error("Erro ao converter ideia em projeto:", error);
          return false;
        }
      },

      updateProject: async (id, title, audience, objective, state, progress) => {
        try {
          set({ error: null });
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
            toast.success("Projeto atualizado!");
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao atualizar projeto";
          set({ error: message });
          toast.error(message);
          console.error("Erro ao atualizar projeto:", error);
        }
      },

      updateState: async (id, state) => {
        try {
          set({ error: null });
          const rawItem = await apiRequest("PUT", `/api/v1/kanban/${id}`, { state });
          if (rawItem) {
            const mapped = mapBackendToFrontendItem(rawItem);
            set((currentState) => ({
              items: currentState.items.map((i) => (i.id === id ? mapped : i))
            }));
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao atualizar estado";
          set({ error: message });
          toast.error(message);
          console.error("Erro ao atualizar estado:", error);
        }
      },

      updateProgress: async (id, progress) => {
        try {
          set({ error: null });
          const rawItem = await apiRequest("PUT", `/api/v1/kanban/${id}`, { progress });
          if (rawItem) {
            const mapped = mapBackendToFrontendItem(rawItem);
            set((state) => ({
              items: state.items.map((i) => (i.id === id ? mapped : i))
            }));
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao atualizar progresso";
          set({ error: message });
          toast.error(message);
          console.error("Erro ao atualizar progresso:", error);
        }
      },

      deleteItem: async (id) => {
        try {
          set({ error: null });
          await apiRequest("DELETE", `/api/v1/kanban/${id}`);
          set((state) => ({
            items: state.items.filter((i) => i.id !== id),
            selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId
          }));
          toast.success("Item excluído com sucesso!");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao excluir item";
          set({ error: message });
          toast.error(message);
          console.error("Erro ao deletar item:", error);
        }
      },

      // --- Estúdio de Roteiro Avançado (Exportação e Versões) ---
      exportScript: async (cardId) => {
        try {
          const raw = await apiRequest("GET", `/api/v1/kanban/${cardId}/script/export`);
          if (raw) {
            return {
              cardId: raw.cardId.toString(),
              cardTitle: raw.cardTitle,
              targetAudience: raw.targetAudience,
              pedagogicalObjective: raw.pedagogicalObjective,
              rawContent: raw.rawContent || "",
              markdownFormatted: raw.markdownFormatted || "",
              wordCount: raw.wordCount || 0,
              estimatedMinutes: raw.estimatedMinutes || 0
            };
          }
          return null;
        } catch (error) {
          console.error("Erro ao exportar roteiro:", error);
          toast.error("Erro ao exportar roteiro");
          return null;
        }
      },

      fetchScriptVersions: async (cardId) => {
        try {
          const rawVersions = await apiRequest("GET", `/api/v1/kanban/${cardId}/script/versions`);
          if (Array.isArray(rawVersions)) {
            return rawVersions.map((v: ApiScriptVersionDto, idx: number) => ({
              id: v.id.toString(),
              versionNumber: v.versionNumber || (rawVersions.length - idx),
              content: v.content || "",
              createdAt: v.createdAt
            }));
          }
          return [];
        } catch (error) {
          console.error("Erro ao buscar versões do roteiro:", error);
          return [];
        }
      },

      restoreScriptVersion: async (cardId, versionId) => {
        try {
          await apiRequest("POST", `/api/v1/kanban/${cardId}/script/versions/${versionId}/restore`);
          toast.success("Versão restaurada com sucesso!");
          return true;
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao restaurar versão";
          toast.error(msg);
          return false;
        }
      },

      // --- Estilo / Personalização ---
      accentHue: 45,
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
        activeTeamId: state.activeTeamId,
      }),
    }
  )
);
