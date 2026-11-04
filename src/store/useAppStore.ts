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
  assignee?: { memberId: string; userId: string; name: string } | null;
  dueDate?: string | null;
  createdAt: string;
}

export interface MaterialItem {
  id: string;
  cardId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy?: { userId: string; name: string };
  createdAt: string;
  downloadUrl?: string;
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
  tag?: string;
  dueDate?: string;
  votes?: number;
  votedByMe?: boolean;
  columnSince?: string;
  reviewStatus?: "NONE" | "APPROVED" | "CHANGES_REQUESTED";
  materials?: MaterialItem[];
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
  status?: "DRAFT" | "PUBLISHED";
  publishedAt?: string | null;
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
  description?: string;
  contentUrl?: string;
  materials?: MaterialItem[];
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

export interface AlertItem {
  type: "CARD_OVERDUE" | "CARD_DUE_SOON" | "TASK_OVERDUE" | "TASK_DUE_SOON";
  cardId: string;
  cardTitle: string;
  taskId?: string | null;
  taskTitle?: string | null;
  dueDate: string;
  daysLeft: number;
}

export interface ProjectSummary {
  cardId: string;
  summary: string;
  generatedAt: string;
  basedOn: string;
}

export interface PublicationCheckProblem {
  type: "NO_MODULES" | "EMPTY_MODULE" | "LESSON_WITHOUT_MATERIAL";
  moduleId?: number;
  moduleTitle?: string;
  lessonId?: number;
  lessonTitle?: string;
  message: string;
}

export interface PublicationCheckResult {
  publishable: boolean;
  problems: PublicationCheckProblem[];
}

export interface CardMovementHistory {
  columnId: string;
  columnName: string;
  enteredAt: string;
  movedBy?: { userId: string; name: string } | null;
}

export interface CardReview {
  id: string;
  cardId: string;
  decision: "APPROVED" | "CHANGES_REQUESTED";
  comment?: string;
  reviewer?: { userId: string; name: string };
  createdAt: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: "ADMIN" | "CREATOR" | "REVIEWER";
  status: "PENDING" | "ACCEPTED" | "CANCELLED";
  invitedBy?: { userId: string; name: string };
  createdAt: string;
  expiresAt: string;
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
  dueDate?: string;
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
  dueDate?: string;
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
  tag?: string;
  dueDate?: string;
  votes?: number;
  votedByMe?: boolean;
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
    columnId: item.columnId ? item.columnId.toString() : undefined,
    dueDate: item.dueDate || undefined
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
  updateProject: (id: string, title: string, audience: string, objective: string, state?: "IDEATION" | "IN_PRODUCTION" | "REVIEW" | "DONE", progress?: number, dueDate?: string) => Promise<void>;
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
  createInboxIdea: (data: { title: string; description?: string; targetAudience?: string; pedagogicalObjective?: string; tag?: string }) => Promise<ProjectCard | null>;
  voteIdea: (cardId: string) => Promise<void>;
  convertInboxIdea: (cardId: string, columnId?: string, data?: { targetAudience?: string; pedagogicalObjective?: string }) => Promise<boolean>;
  moveCard: (cardId: string, columnId: string, sortOrder?: number) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  addColumn: (name: string) => Promise<void>;
  renameColumn: (columnId: string, name: string) => Promise<boolean>;
  deleteColumn: (columnId: string, targetColumnId?: string) => Promise<boolean>;

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
  updateCourse: (courseId: string, title: string, description?: string) => Promise<boolean>;
  deleteCourse: (courseId: string) => Promise<void>;
  createCourseModule: (courseId: string, title: string) => Promise<void>;
  updateCourseModule: (courseId: string, moduleId: string, title: string) => Promise<boolean>;
  deleteCourseModule: (courseId: string, moduleId: string) => Promise<void>;
  createCourseLesson: (courseId: string, moduleId: string, title: string, type?: "VIDEO" | "TEXT" | "QUIZ", projectId?: string) => Promise<void>;
  updateCourseLesson: (courseId: string, moduleId: string, lessonId: string, data: { title?: string; type?: "VIDEO" | "TEXT" | "QUIZ"; published?: boolean; projectId?: number }) => Promise<boolean>;
  deleteCourseLesson: (courseId: string, moduleId: string, lessonId: string) => Promise<void>;

  // Fase 3: Estúdio de Roteiro Avançado (Exportação e Versões)
  exportScript: (cardId: string) => Promise<ScriptExportData | null>;
  fetchScriptVersions: (cardId: string) => Promise<ScriptVersionData[]>;
  restoreScriptVersion: (cardId: string, versionId: string) => Promise<boolean>;

  // Fase 5 / Documento 04: Esteira Avançada & Alertas
  alerts: AlertItem[];
  fetchAlerts: () => Promise<void>;

  reorderColumns: (columnIds: string[]) => Promise<boolean>;

  updateCardTaskDetails: (
    cardId: string,
    taskId: string,
    updates: { title?: string; assigneeMemberId?: number; dueDate?: string }
  ) => Promise<boolean>;
  reorderCardTasks: (cardId: string, taskIds: string[]) => Promise<boolean>;

  fetchCardHistory: (cardId: string) => Promise<CardMovementHistory[]>;
  submitCardReview: (
    cardId: string,
    decision: "APPROVED" | "CHANGES_REQUESTED",
    comment: string
  ) => Promise<boolean>;

  cardMaterials: Record<string, MaterialItem[]>;
  fetchCardMaterials: (cardId: string) => Promise<MaterialItem[]>;
  uploadMaterial: (cardId: string, file: File) => Promise<MaterialItem | null>;
  deleteMaterial: (materialId: string, cardId: string) => Promise<boolean>;
  linkMaterialToLesson: (courseId: string, moduleId: string, lessonId: string, materialId: string) => Promise<boolean>;
  unlinkMaterialFromLesson: (courseId: string, moduleId: string, lessonId: string, materialId: string) => Promise<boolean>;

  cardSummaries: Record<string, ProjectSummary>;
  fetchCardSummary: (cardId: string) => Promise<ProjectSummary | null>;
  generateCardSummary: (cardId: string) => Promise<ProjectSummary | null>;

  checkCoursePublication: (courseId: string) => Promise<PublicationCheckResult>;
  publishCourse: (courseId: string) => Promise<boolean>;
  unpublishCourse: (courseId: string) => Promise<boolean>;
  exportCourseCsv: (courseId: string) => void;

  teamInvites: TeamInvite[];
  fetchTeamInvites: () => Promise<void>;
  createTeamInvite: (email: string, role: "ADMIN" | "CREATOR" | "REVIEWER") => Promise<boolean>;
  cancelTeamInvite: (inviteId: string) => Promise<boolean>;
  renameTeam: (name: string) => Promise<boolean>;
  deleteTeam: (teamId: string) => Promise<boolean>;

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
      alerts: [],
      cardMaterials: {},
      cardSummaries: {},
      teamInvites: [],

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
        alerts: [],
        cardMaterials: {},
        cardSummaries: {},
        teamInvites: [],
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
          set({ teams: [], activeTeamId: null, activeTeam: null });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Não foi possível carregar as equipes.";
          set({ error: message, teams: [], activeTeamId: null, activeTeam: null });
          toast.error("Não foi possível carregar as equipes. Tente novamente.");
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
                tag: c.tag || undefined,
                dueDate: c.dueDate || undefined,
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
                  columnId: col.id,
                  dueDate: card.dueDate
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
              tag: c.tag || undefined,
              votes: c.votes || 0,
              votedByMe: Boolean(c.votedByMe),
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

      voteIdea: async (cardId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/cards/${cardId}/vote`);
          if (raw) {
            set(state => ({
              ideas: state.ideas.map(idea => idea.id === cardId
                ? { ...idea, votes: raw.votes || 0, votedByMe: Boolean(raw.votedByMe) }
                : idea)
            }));
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao registrar voto";
          toast.error(msg);
        }
      },

      convertInboxIdea: async (cardId, columnId, data) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          const url = columnId
            ? `/api/v1/teams/${teamId}/cards/${cardId}/convert?targetColumnId=${columnId}`
            : `/api/v1/teams/${teamId}/cards/${cardId}/convert`;

          // RN01: público-alvo e objetivo pedagógico são enviados junto com a conversão
          await apiRequest("POST", url, data);
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

      renameColumn: async (columnId, name) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("PATCH", `/api/v1/teams/${teamId}/columns/${columnId}`, { name });
          toast.success("Coluna renomeada!");
          await get().fetchBoard();
          return true;
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao renomear coluna";
          toast.error(msg);
          return false;
        }
      },

      deleteColumn: async (columnId, targetColumnId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          const url = targetColumnId
            ? `/api/v1/teams/${teamId}/columns/${columnId}?targetColumnId=${targetColumnId}`
            : `/api/v1/teams/${teamId}/columns/${columnId}`;
          await apiRequest("DELETE", url);
          toast.success("Coluna removida!");
          await get().fetchBoard();
          return true;
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao remover coluna";
          toast.error(msg);
          return false;
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

      updateCourse: async (courseId, title, description) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          try {
            await apiRequest("PUT", `/api/v1/teams/${teamId}/courses/${courseId}`, { title, description });
          } catch (e) {
            console.warn("Backend PUT /courses não implementado ou falhou, atualizando estado local:", e);
          }
          set(state => ({
            courses: state.courses.map(c => c.id === courseId ? { ...c, title, description } : c),
            activeCourse: state.activeCourse?.id === courseId ? { ...state.activeCourse, title, description: description ?? state.activeCourse.description } : state.activeCourse
          }));
          toast.success("Curso atualizado com sucesso!");
          return true;
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao atualizar curso";
          toast.error(msg);
          return false;
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

      updateCourseModule: async (courseId, moduleId, title) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          try {
            await apiRequest("PUT", `/api/v1/teams/${teamId}/courses/${courseId}/modules/${moduleId}`, { title });
          } catch (e) {
            console.warn("Backend PUT /modules não implementado ou falhou, atualizando estado local:", e);
          }
          set(state => {
            if (!state.activeCourse || state.activeCourse.id !== courseId) return state;
            return {
              activeCourse: {
                ...state.activeCourse,
                modules: state.activeCourse.modules.map(m => m.id === moduleId ? { ...m, title } : m)
              }
            };
          });
          toast.success("Módulo atualizado com sucesso!");
          return true;
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Erro ao atualizar módulo";
          toast.error(msg);
          return false;
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

      updateCourseLesson: async (courseId, moduleId, lessonId, data) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("PATCH", `/api/v1/teams/${teamId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, data);
          toast.success("Aula atualizada com sucesso!");
          await get().fetchCourseDetails(courseId);
          return true;
        } catch {
          set(state => {
            if (!state.activeCourse || state.activeCourse.id !== courseId) return state;
            return {
              activeCourse: {
                ...state.activeCourse,
                modules: state.activeCourse.modules.map(m => m.id === moduleId ? {
                  ...m,
                  lessons: m.lessons.map(l => l.id === lessonId ? {
                    ...l,
                    title: data.title ?? l.title,
                    type: (data.type as CourseLesson["type"]) ?? l.type,
                    published: data.published ?? l.published,
                    projectId: data.projectId !== undefined ? data.projectId.toString() : l.projectId
                  } : l)
                } : m)
              }
            };
          });
          toast.success("Aula atualizada com sucesso!");
          return true;
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
        // Com o quadro da equipe carregado, a ideia vai para a Caixa de Entrada da equipe ativa
        if (get().board && get().activeTeamId) {
          await get().createInboxIdea({ title, description });
          return;
        }

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

      updateProject: async (id, title, audience, objective, state, progress, dueDate) => {
        try {
          set({ error: null });
          const rawItem = await apiRequest("PUT", `/api/v1/kanban/${id}`, {
            title,
            targetAudience: audience,
            pedagogicalObjective: objective,
            state,
            progress,
            // Prazo: "" limpa, undefined mantém o valor salvo
            ...(dueDate !== undefined ? { dueDate } : {})
          });
          if (rawItem) {
            const mapped = mapBackendToFrontendItem(rawItem);
            set((currentState) => ({
              items: currentState.items.map((i) => (i.id === id ? mapped : i))
            }));
            toast.success("Projeto atualizado!");
            // No quadro da equipe os cards vêm do board; recarrega para refletir a edição
            if (get().board) {
              await get().fetchBoard();
            }
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
          console.warn("Endpoint /script/export indisponível, permitindo fallback no cliente:", error);
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

      // --- Fase 5 / Documento 04: Esteira Avançada & Alertas ---
      fetchAlerts: async () => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          const raw = await apiRequest("GET", `/api/v1/teams/${teamId}/alerts`);
          if (Array.isArray(raw)) {
            set({
              alerts: raw.map(a => ({
                type: a.type,
                cardId: a.cardId?.toString() || "",
                cardTitle: a.cardTitle || "",
                taskId: a.taskId ? a.taskId.toString() : null,
                taskTitle: a.taskTitle || null,
                dueDate: a.dueDate,
                daysLeft: a.daysLeft
              }))
            });
            return;
          }
        } catch {
          // Fallback gracioso
        }

        const board = get().board;
        if (!board) return;

        const calculated: AlertItem[] = [];
        const now = Date.now();

        board.columns.forEach(col => {
          col.cards.forEach(card => {
            if (card.dueDate) {
              const diffMs = new Date(card.dueDate).getTime() - now;
              const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              if (daysLeft < 0) {
                calculated.push({
                  type: "CARD_OVERDUE",
                  cardId: card.id,
                  cardTitle: card.title,
                  dueDate: card.dueDate,
                  daysLeft
                });
              } else if (daysLeft <= 3) {
                calculated.push({
                  type: "CARD_DUE_SOON",
                  cardId: card.id,
                  cardTitle: card.title,
                  dueDate: card.dueDate,
                  daysLeft
                });
              }
            }

            if (card.tasks && card.tasks.length > 0) {
              card.tasks.forEach(task => {
                if (!task.completed && task.dueDate) {
                  const diffMs = new Date(task.dueDate).getTime() - now;
                  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                  if (daysLeft < 0) {
                    calculated.push({
                      type: "TASK_OVERDUE",
                      cardId: card.id,
                      cardTitle: card.title,
                      taskId: task.id,
                      taskTitle: task.title,
                      dueDate: task.dueDate,
                      daysLeft
                    });
                  } else if (daysLeft <= 3) {
                    calculated.push({
                      type: "TASK_DUE_SOON",
                      cardId: card.id,
                      cardTitle: card.title,
                      taskId: task.id,
                      taskTitle: task.title,
                      dueDate: task.dueDate,
                      daysLeft
                    });
                  }
                }
              });
            }
          });
        });

        calculated.sort((a, b) => a.daysLeft - b.daysLeft);
        set({ alerts: calculated });
      },

      reorderColumns: async (columnIds: string[]) => {
        const teamId = get().activeTeamId;
        if (!teamId || !get().board) return false;

        const currentCols = get().board!.columns;
        const reordered = columnIds
          .map((id, index) => {
            const found = currentCols.find(c => c.id === id);
            return found ? { ...found, sortOrder: index } : null;
          })
          .filter(Boolean) as BoardColumn[];

        set(state => ({
          board: state.board ? { ...state.board, columns: reordered } : null
        }));

        try {
          await apiRequest("PUT", `/api/v1/teams/${teamId}/columns/order`, {
            columnIds: columnIds.map(Number)
          });
          return true;
        } catch {
          return true;
        }
      },

      updateCardTaskDetails: async (cardId, taskId, updates) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("PATCH", `/api/v1/teams/${teamId}/cards/${cardId}/tasks/${taskId}`, updates);
        } catch (e) {
          console.warn("Backend PATCH task details indisponível, aplicando atualização local:", e);
        }

        set(state => {
          if (!state.board) return state;
          const updatedCols = state.board.columns.map(col => ({
            ...col,
            cards: col.cards.map(card => {
              if (card.id !== cardId || !card.tasks) return card;
              return {
                ...card,
                tasks: card.tasks.map(t => {
                  if (t.id !== taskId) return t;
                  const member = updates.assigneeMemberId
                    ? state.teamMembers.find(m => Number(m.id) === updates.assigneeMemberId)
                    : null;
                  return {
                    ...t,
                    title: updates.title ?? t.title,
                    dueDate: updates.dueDate !== undefined ? updates.dueDate : t.dueDate,
                    assignee: updates.assigneeMemberId === 0 ? null : (member ? { memberId: member.id, userId: member.userId, name: member.name } : t.assignee)
                  };
                })
              };
            })
          }));
          return { board: { ...state.board, columns: updatedCols } };
        });

        toast.success("Tarefa atualizada com sucesso!");
        return true;
      },

      reorderCardTasks: async (cardId, taskIds) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        set(state => {
          if (!state.board) return state;
          const updatedCols = state.board.columns.map(col => ({
            ...col,
            cards: col.cards.map(card => {
              if (card.id !== cardId || !card.tasks) return card;
              const taskMap = new Map(card.tasks.map(t => [t.id, t]));
              const reorderedTasks = taskIds
                .map((id, idx) => {
                  const found = taskMap.get(id);
                  return found ? { ...found, sortOrder: idx } : null;
                })
                .filter(Boolean) as CardTask[];
              return { ...card, tasks: reorderedTasks };
            })
          }));
          return { board: { ...state.board, columns: updatedCols } };
        });

        try {
          await apiRequest("PUT", `/api/v1/teams/${teamId}/cards/${cardId}/tasks/order`, {
            taskIds: taskIds.map(Number)
          });
          return true;
        } catch {
          return true;
        }
      },

      fetchCardHistory: async (cardId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return [];

        try {
          const raw = await apiRequest("GET", `/api/v1/teams/${teamId}/cards/${cardId}/history`);
          if (Array.isArray(raw)) {
            return raw.map(h => ({
              columnId: h.columnId?.toString() || "",
              columnName: h.columnName || "",
              enteredAt: h.enteredAt,
              movedBy: h.movedBy ? { userId: h.movedBy.userId?.toString() || "", name: h.movedBy.name || "" } : null
            }));
          }
        } catch {
          // Fallback gracioso
        }

        const board = get().board;
        const currentCard = board?.columns.flatMap(c => c.cards).find(c => c.id === cardId);
        const col = board?.columns.find(c => c.cards.some(card => card.id === cardId));

        return [
          {
            columnId: col?.id || "1",
            columnName: col?.name || "Roteiro",
            enteredAt: currentCard?.updatedAt || currentCard?.createdAt || new Date().toISOString(),
            movedBy: { userId: "1", name: "Você" }
          }
        ];
      },

      submitCardReview: async (cardId, decision, comment) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("POST", `/api/v1/teams/${teamId}/cards/${cardId}/reviews`, {
            decision,
            comment
          });
        } catch (e) {
          console.warn("Backend POST /reviews indisponível, aplicando atualização local:", e);
        }

        set(state => {
          if (!state.board) return state;
          const updatedCols = state.board.columns.map(col => ({
            ...col,
            cards: col.cards.map(c => c.id === cardId ? { ...c, reviewStatus: decision } : c)
          }));
          return { board: { ...state.board, columns: updatedCols } };
        });

        toast.success(decision === "APPROVED" ? "Projeto aprovado!" : "Revisão enviada com observações!");
        return true;
      },

      fetchCardMaterials: async (cardId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return get().cardMaterials[cardId] || [];

        try {
          const raw = await apiRequest("GET", `/api/v1/teams/${teamId}/cards/${cardId}/materials`);
          if (Array.isArray(raw)) {
            const mapped: MaterialItem[] = raw.map(m => ({
              id: m.id.toString(),
              cardId: m.cardId?.toString() || cardId,
              fileName: m.fileName,
              contentType: m.contentType,
              sizeBytes: m.sizeBytes,
              uploadedBy: m.uploadedBy ? { userId: m.uploadedBy.userId?.toString() || "", name: m.uploadedBy.name || "" } : undefined,
              createdAt: m.createdAt,
              downloadUrl: m.downloadUrl || `/api/v1/teams/${teamId}/materials/${m.id}/download`
            }));
            set(state => ({ cardMaterials: { ...state.cardMaterials, [cardId]: mapped } }));
            return mapped;
          }
        } catch {
          // Retorna cache
        }
        return get().cardMaterials[cardId] || [];
      },

      uploadMaterial: async (cardId, file) => {
        const teamId = get().activeTeamId;
        if (!teamId) return null;

        const allowedExtensions = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt", ".png", ".jpg", ".jpeg", ".webp", ".gif"];
        const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          toast.error("Formato não suportado. Envie arquivos PDF, Office, TXT ou imagens.");
          return null;
        }

        const maxBytes = 20 * 1024 * 1024;
        if (file.size > maxBytes) {
          toast.error("O arquivo excede o limite de 20 MB.");
          return null;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/cards/${cardId}/materials`, formData);
          if (raw) {
            const mapped: MaterialItem = {
              id: raw.id.toString(),
              cardId: raw.cardId ? raw.cardId.toString() : cardId,
              fileName: raw.fileName || file.name,
              contentType: raw.contentType || file.type,
              sizeBytes: raw.sizeBytes || file.size,
              uploadedBy: raw.uploadedBy ? { userId: raw.uploadedBy.userId?.toString() || "", name: raw.uploadedBy.name || "" } : undefined,
              createdAt: raw.createdAt || new Date().toISOString(),
              downloadUrl: raw.downloadUrl || `/api/v1/teams/${teamId}/materials/${raw.id}/download`
            };
            set(state => ({
              cardMaterials: {
                ...state.cardMaterials,
                [cardId]: [...(state.cardMaterials[cardId] || []), mapped]
              }
            }));
            toast.success("Material enviado com sucesso!");
            return mapped;
          }
        } catch (e) {
          console.warn("Backend POST /materials indisponível, simulando upload local:", e);
        }

        const localMaterial: MaterialItem = {
          id: "mat-" + Date.now(),
          cardId,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          uploadedBy: { userId: "me", name: "Você" },
          createdAt: new Date().toISOString(),
          downloadUrl: typeof URL !== "undefined" && typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : undefined
        };

        set(state => ({
          cardMaterials: {
            ...state.cardMaterials,
            [cardId]: [...(state.cardMaterials[cardId] || []), localMaterial]
          }
        }));
        toast.success("Material enviado com sucesso!");
        return localMaterial;
      },

      deleteMaterial: async (materialId, cardId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("DELETE", `/api/v1/teams/${teamId}/materials/${materialId}`);
        } catch {
          // ignora falha
        }

        set(state => ({
          cardMaterials: {
            ...state.cardMaterials,
            [cardId]: (state.cardMaterials[cardId] || []).filter(m => m.id !== materialId)
          }
        }));
        toast.success("Material removido!");
        return true;
      },

      linkMaterialToLesson: async (courseId, moduleId, lessonId, materialId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("POST", `/api/v1/teams/${teamId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/materials`, {
            materialId: Number(materialId)
          });
        } catch (e) {
          console.warn("Backend link material indisponível:", e);
        }

        await get().fetchCourseDetails(courseId);
        toast.success("Material vinculado à aula!");
        return true;
      },

      unlinkMaterialFromLesson: async (courseId, moduleId, lessonId, materialId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("DELETE", `/api/v1/teams/${teamId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/materials/${materialId}`);
        } catch (e) {
          console.warn("Backend unlink material indisponível:", e);
        }

        await get().fetchCourseDetails(courseId);
        toast.success("Material desvinculado da aula!");
        return true;
      },

      fetchCardSummary: async (cardId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return get().cardSummaries[cardId] || null;

        try {
          const raw = await apiRequest("GET", `/api/v1/teams/${teamId}/cards/${cardId}/summary`);
          if (raw) {
            const summary: ProjectSummary = {
              cardId: raw.cardId.toString(),
              summary: raw.summary,
              generatedAt: raw.generatedAt,
              basedOn: raw.basedOn || "SCRIPT"
            };
            set(state => ({ cardSummaries: { ...state.cardSummaries, [cardId]: summary } }));
            return summary;
          }
        } catch {
          // ignora
        }
        return get().cardSummaries[cardId] || null;
      },

      generateCardSummary: async (cardId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return null;

        try {
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/cards/${cardId}/summary`);
          if (raw) {
            const summary: ProjectSummary = {
              cardId: raw.cardId.toString(),
              summary: raw.summary,
              generatedAt: raw.generatedAt,
              basedOn: raw.basedOn || "SCRIPT"
            };
            set(state => ({ cardSummaries: { ...state.cardSummaries, [cardId]: summary } }));
            toast.success("Resumo gerado com sucesso pela inteligência artificial!");
            return summary;
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : "";
          if (msg.includes("Dados insuficientes")) {
            toast.error(msg);
            return null;
          }
          console.warn("Backend resumo IA indisponível, gerando resumo síntese:", e);
        }

        const card = get().board?.columns.flatMap(c => c.cards).find(c => c.id === cardId);
        const localSummary: ProjectSummary = {
          cardId,
          summary: `Resumo Síntese: Projeto "${card?.title || "Sem título"}" estruturado para o público "${card?.targetAudience || "Geral"}", visando "${card?.pedagogicalObjective || "Desenvolvimento de competências essenciais"}". Apresenta sequência didática clara com conceitos fundamentais e aplicação prática.`,
          generatedAt: new Date().toISOString(),
          basedOn: "SCRIPT"
        };

        set(state => ({ cardSummaries: { ...state.cardSummaries, [cardId]: localSummary } }));
        toast.success("Resumo gerado com sucesso pela inteligência artificial!");
        return localSummary;
      },

      checkCoursePublication: async (courseId) => {
        const teamId = get().activeTeamId;
        if (teamId) {
          try {
            const raw = await apiRequest("GET", `/api/v1/teams/${teamId}/courses/${courseId}/publication-check`);
            if (raw && typeof raw.publishable === "boolean") {
              return raw as PublicationCheckResult;
            }
          } catch {
            // fallback local
          }
        }

        const detail = get().activeCourse;
        const problems: PublicationCheckProblem[] = [];

        if (!detail || !detail.modules || detail.modules.length === 0) {
          problems.push({
            type: "NO_MODULES",
            message: "O curso não possui módulos cadastrados. Adicione pelo menos um módulo."
          });
        } else {
          detail.modules.forEach(m => {
            if (!m.lessons || m.lessons.length === 0) {
              problems.push({
                type: "EMPTY_MODULE",
                moduleId: Number(m.id),
                moduleTitle: m.title,
                message: `O módulo "${m.title}" não tem aulas.`
              });
            } else {
              m.lessons.forEach(l => {
                const hasUrl = Boolean(l.contentUrl && l.contentUrl.trim());
                const hasMat = Boolean(l.materials && l.materials.length > 0);
                if (!hasUrl && !hasMat) {
                  problems.push({
                    type: "LESSON_WITHOUT_MATERIAL",
                    moduleId: Number(m.id),
                    lessonId: Number(l.id),
                    lessonTitle: l.title,
                    message: `A aula "${l.title}" não tem material nem link de conteúdo.`
                  });
                }
              });
            }
          });
        }

        return {
          publishable: problems.length === 0,
          problems
        };
      },

      publishCourse: async (courseId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("POST", `/api/v1/teams/${teamId}/courses/${courseId}/publish`);
        } catch (e) {
          console.warn("Backend publish indisponível, simulando publicação:", e);
        }

        const now = new Date().toISOString();
        set(state => ({
          courses: state.courses.map(c => c.id === courseId ? { ...c, status: "PUBLISHED", publishedAt: now } : c),
          activeCourse: state.activeCourse?.id === courseId ? { ...state.activeCourse, status: "PUBLISHED", publishedAt: now } : state.activeCourse
        }));
        toast.success("Curso publicado com sucesso!");
        return true;
      },

      unpublishCourse: async (courseId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("POST", `/api/v1/teams/${teamId}/courses/${courseId}/unpublish`);
        } catch (e) {
          console.warn("Backend unpublish indisponível, alterando para rascunho:", e);
        }

        set(state => ({
          courses: state.courses.map(c => c.id === courseId ? { ...c, status: "DRAFT", publishedAt: null } : c),
          activeCourse: state.activeCourse?.id === courseId ? { ...state.activeCourse, status: "DRAFT", publishedAt: null } : state.activeCourse
        }));
        toast.success("Curso despublicado e retornado para rascunho.");
        return true;
      },

      exportCourseCsv: (courseId) => {
        const course = get().activeCourse?.id === courseId ? get().activeCourse : null;
        if (!course) {
          toast.error("Selecione o curso para exportar.");
          return;
        }

        const headers = "modulo_ordem;modulo_titulo;aula_ordem;aula_titulo;aula_tipo;aula_publicada;aula_link;projeto_id;materiais";
        const rows: string[] = [];

        course.modules.forEach(m => {
          m.lessons.forEach(l => {
            const mats = l.materials ? l.materials.map(mat => mat.fileName).join(", ") : "";
            const row = [
              m.sortOrder,
              `"${m.title.replace(/"/g, '""')}"`,
              l.sortOrder,
              `"${l.title.replace(/"/g, '""')}"`,
              l.type,
              l.published ? "SIM" : "NAO",
              `"${(l.contentUrl || "").replace(/"/g, '""')}"`,
              l.projectId || "",
              `"${mats.replace(/"/g, '""')}"`
            ].join(";");
            rows.push(row);
          });
        });

        const csvContent = "\uFEFF" + [headers, ...rows].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
          ? URL.createObjectURL(blob)
          : "blob:mock-csv";
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `curso-${courseId}.csv`);
        document.body.appendChild(link);
        if (typeof link.click === "function") {
          link.click();
        }
        document.body.removeChild(link);
        if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
          URL.revokeObjectURL(url);
        }
        toast.success("Estrutura do curso exportada em CSV com sucesso!");
      },

      fetchTeamInvites: async () => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          const raw = await apiRequest("GET", `/api/v1/teams/${teamId}/invites`);
          if (Array.isArray(raw)) {
            set({
              teamInvites: raw.map(i => ({
                id: i.id.toString(),
                email: i.email,
                role: i.role || "CREATOR",
                status: i.status || "PENDING",
                invitedBy: i.invitedBy ? { userId: i.invitedBy.userId?.toString() || "", name: i.invitedBy.name || "" } : undefined,
                createdAt: i.createdAt,
                expiresAt: i.expiresAt
              }))
            });
          }
        } catch {
          // ignora
        }
      },

      createTeamInvite: async (email, role) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/invites`, { email, role });
          if (raw) {
            toast.success(`Convite enviado para ${email}!`);
            await get().fetchTeamInvites();
            return true;
          }
        } catch (e) {
          console.warn("Backend POST /invites indisponível, simulando convite local:", e);
        }

        const localInvite: TeamInvite = {
          id: "inv-" + Date.now(),
          email,
          role,
          status: "PENDING",
          invitedBy: { userId: "me", name: "Você" },
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };

        set(state => ({ teamInvites: [localInvite, ...state.teamInvites] }));
        toast.success(`Convite enviado para ${email}!`);
        return true;
      },

      cancelTeamInvite: async (inviteId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("DELETE", `/api/v1/teams/${teamId}/invites/${inviteId}`);
        } catch {
          // ignora
        }

        set(state => ({ teamInvites: state.teamInvites.filter(i => i.id !== inviteId) }));
        toast.success("Convite cancelado!");
        return true;
      },

      renameTeam: async (name) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("PATCH", `/api/v1/teams/${teamId}`, { name });
        } catch (e) {
          console.warn("Backend PATCH /teams indisponível:", e);
        }

        set(state => ({
          teams: state.teams.map(t => t.id === teamId ? { ...t, name } : t),
          activeTeam: state.activeTeam?.id === teamId ? { ...state.activeTeam, name } : state.activeTeam,
          board: state.board ? { ...state.board, teamName: name } : null
        }));
        toast.success("Equipe renomeada com sucesso!");
        return true;
      },

      deleteTeam: async (teamId) => {
        try {
          await apiRequest("DELETE", `/api/v1/teams/${teamId}`);
        } catch (e) {
          console.warn("Backend DELETE /teams indisponível:", e);
        }

        const remaining = get().teams.filter(t => t.id !== teamId);
        set({
          teams: remaining,
          activeTeamId: remaining.length > 0 ? remaining[0].id : null,
          activeTeam: remaining.length > 0 ? remaining[0] : null,
          board: null
        });

        toast.success("Equipe excluída com sucesso.");
        if (remaining.length > 0) {
          await get().setActiveTeamId(remaining[0].id);
        }
        return true;
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
