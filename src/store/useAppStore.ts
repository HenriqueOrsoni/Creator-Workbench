import { create } from "zustand";
import { persist } from "zustand/middleware";
import { OklchColor } from "@/lib/color-utils";
import { apiRequest, apiDownload, apiOpenInline, registerApiHooks } from "@/lib/api";
import { FEATURES } from "@/lib/features";
import { toast } from "sonner";
import { toastApiError } from "@/lib/plan-nav";
import { mapTeamPlan, mapPlanInfo, type TeamPlan, type PlanInfo, type PlanName, type PlanSource, type TrialPlan } from "@/lib/plans";

/**
 * Creator Workbench - Global Store
 * Gerencia o estado de Ideação, Produção, Equipes e Cursos.
 *
 * Regra de ouro: nenhuma ação finge sucesso. Se a requisição falha, o estado não muda
 * e o usuário vê a mensagem {message} devolvida pelo servidor.
 */

export type TeamRoleName = "ADMIN" | "CREATOR" | "REVIEWER";

export interface Team {
  id: string;
  name: string;
  role: TeamRoleName;
  membersCount: number;
  createdAt: string;
  plan?: PlanName;
  planSource?: PlanSource;
  planExpiresAt?: string | null;
  /** Equipe pessoal (não pode ser excluída). Só vem quando o servidor informa. */
  personal?: boolean;
}

export interface TaskAssignee {
  memberId: string;
  userId: string;
  name: string;
}

export interface CardTask {
  id: string;
  cardId: string;
  title: string;
  completed: boolean;
  sortOrder: number;
  assignee?: TaskAssignee | null;
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
  uuid?: string;
  teamId?: string;
  title: string;
  description: string;
  type: "IDEA" | "PROJECT";
  columnId?: string;
  columnName?: string;
  sortOrder: number;
  /** Calculado pelo servidor a partir das tarefas. */
  progress: number;
  tasksTotal: number;
  tasksDone: number;
  targetAudience?: string;
  pedagogicalObjective?: string;
  tasks?: CardTask[];
  tag?: string;
  tagId?: string;
  tagColor?: string;
  dueDate?: string;
  votes?: number;
  votedByMe?: boolean;
  /** Momento em que o card entrou na coluna atual. */
  columnSince?: string;
  reviewStatus?: "NONE" | "APPROVED" | "CHANGES_REQUESTED";
  /** Quantidade de arquivos anexados ao card. */
  materialsCount?: number;
  /** Link do vídeo publicado no YouTube (somente projetos). */
  videoUrl?: string;
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

export interface VideoSnapshot {
  capturedAt: string;
  viewCount: number;
  likeCount: number | null;
  commentCount: number | null;
}

export interface VideoStats {
  cardId: string;
  videoId: string;
  videoUrl: string;
  title: string;
  publishedAt: string | null;
  latest: VideoSnapshot | null;
  /** Do mais antigo para o mais novo (até 60). */
  history: VideoSnapshot[];
}

export interface ProjectSummary {
  cardId: string;
  summary: string;
  generatedAt: string;
  basedOn: string;
}

export interface PublicationCheckProblem {
  type: string;
  ids: number[];
  titles: string[];
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
  reviewer?: { userId: string; name: string } | null;
  createdAt: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: TeamRoleName;
  status: "PENDING" | "ACCEPTED" | "CANCELLED";
  invitedBy?: { userId: string; name: string };
  createdAt: string;
  expiresAt: string;
}

/** Visão achatada de um card do quadro (usada pelo estúdio de roteiro e pelo formulário de edição). */
export interface KanbanItem {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  targetAudience?: string;
  pedagogicalObjective?: string;
  progress: number;
  tasksTotal?: number;
  tasksDone?: number;
  columnId?: string;
  dueDate?: string;
  tagId?: string;
}

export interface ApiTaskDto {
  id: string | number;
  cardId: string | number;
  title: string;
  completed?: boolean;
  sortOrder: number;
  createdAt?: string;
  assignee?: { memberId: string | number; userId: string | number; name: string } | null;
  dueDate?: string | null;
}

export interface ApiCardDto {
  id: string | number;
  uuid?: string;
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
  tagId?: string | number | null;
  tagColor?: string | null;
  dueDate?: string;
  votes?: number;
  votedByMe?: boolean;
  columnSince?: string | null;
  reviewStatus?: "NONE" | "APPROVED" | "CHANGES_REQUESTED";
  materialsCount?: number | null;
  videoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiColumnDto {
  id: string | number;
  name: string;
  sortOrder: number;
  cards?: ApiCardDto[];
}

export interface TeamTag {
  id: string;
  name: string;
  color: string;
}

export interface ApiMaterialDto {
  id: string | number;
  cardId?: string | number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy?: { userId: string | number; name: string } | null;
  createdAt: string;
  downloadUrl?: string;
}

export interface ApiCourseDto {
  id: string | number;
  teamId: string | number;
  title: string;
  description?: string;
  modulesCount?: number;
  status?: "DRAFT" | "PUBLISHED";
  publishedAt?: string | null;
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
  description?: string;
  contentUrl?: string;
  materials?: ApiMaterialDto[];
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
  role: TeamRoleName;
  joinedAt: string;
}

export interface ApiTeamMemberDto {
  id: string | number;
  userId: string | number;
  name: string;
  email: string;
  role: TeamRoleName;
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

export type IdeaSort = "recent" | "votes";

export interface IdeaFilters {
  q: string;
  /** Id da etiqueta ("" = todas). */
  tagId: string;
  sort: IdeaSort;
}

const DEFAULT_IDEA_FILTERS: IdeaFilters = { q: "", tagId: "", sort: "recent" };

// --- Auxiliares ---

function errMsg(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function statusOf(error: unknown): number | undefined {
  return (error as { status?: number } | null)?.status;
}

function notifyError(error: unknown, fallback: string) {
  toastApiError(error, fallback);
  // Limite do plano: o uso mudou ou está desatualizado. GET do plano nunca devolve 402, então não há laço.
  if (statusOf(error) === 402) void useAppStore.getState().fetchTeamPlan();
}

function mapTask(t: ApiTaskDto): CardTask {
  return {
    id: String(t.id),
    cardId: String(t.cardId),
    title: t.title,
    completed: Boolean(t.completed),
    sortOrder: t.sortOrder,
    assignee: t.assignee
      ? { memberId: String(t.assignee.memberId), userId: String(t.assignee.userId), name: t.assignee.name }
      : null,
    dueDate: t.dueDate || null,
    createdAt: t.createdAt || ""
  };
}

function mapCard(c: ApiCardDto, column?: { id: string; name: string }): ProjectCard {
  return {
    id: String(c.id),
    uuid: c.uuid,
    teamId: c.teamId !== undefined ? String(c.teamId) : undefined,
    title: c.title,
    description: c.description || "",
    type: column ? (c.type || "PROJECT") : "IDEA",
    columnId: c.columnId !== undefined && c.columnId !== null ? String(c.columnId) : column?.id,
    columnName: column?.name,
    sortOrder: c.sortOrder || 0,
    progress: c.progress || 0,
    tasksTotal: c.tasksTotal || 0,
    tasksDone: c.tasksDone || 0,
    targetAudience: c.targetAudience,
    pedagogicalObjective: c.pedagogicalObjective,
    tasks: Array.isArray(c.tasks) ? c.tasks.map(mapTask) : [],
    tag: c.tag || undefined,
    tagId: c.tagId !== undefined && c.tagId !== null ? String(c.tagId) : undefined,
    tagColor: c.tagColor || undefined,
    dueDate: c.dueDate || undefined,
    votes: c.votes,
    votedByMe: c.votedByMe,
    columnSince: c.columnSince || undefined,
    reviewStatus: c.reviewStatus,
    materialsCount: typeof c.materialsCount === "number" ? c.materialsCount : 0,
    videoUrl: c.videoUrl || undefined,
    createdAt: c.createdAt || "",
    updatedAt: c.updatedAt
  };
}

function mapReview(r: { id: string | number; cardId?: string | number; decision: CardReview["decision"]; comment?: string | null; reviewer?: { userId: string | number; name: string } | null; createdAt: string }, fallbackCardId: string): CardReview {
  return {
    id: String(r.id),
    cardId: r.cardId !== undefined ? String(r.cardId) : fallbackCardId,
    decision: r.decision,
    comment: r.comment || "",
    reviewer: r.reviewer ? { userId: String(r.reviewer.userId ?? ""), name: r.reviewer.name || "" } : null,
    createdAt: r.createdAt
  };
}

/** Ajusta a contagem de materiais do card no quadro (sem nova ida ao servidor). */
function withMaterialsCount(board: AppState["board"], cardId: string, count: number): AppState["board"] {
  if (!board) return board;
  return {
    ...board,
    columns: board.columns.map(col => ({
      ...col,
      cards: col.cards.map(c => (c.id === cardId ? { ...c, materialsCount: count } : c))
    }))
  };
}

function mapMaterial(m: ApiMaterialDto, fallbackCardId: string): MaterialItem {
  return {
    id: String(m.id),
    cardId: m.cardId !== undefined ? String(m.cardId) : fallbackCardId,
    fileName: m.fileName,
    contentType: m.contentType,
    sizeBytes: m.sizeBytes,
    uploadedBy: m.uploadedBy ? { userId: String(m.uploadedBy.userId ?? ""), name: m.uploadedBy.name || "" } : undefined,
    createdAt: m.createdAt,
    downloadUrl: m.downloadUrl
  };
}

function mapCourse(c: ApiCourseDto): Course {
  return {
    id: String(c.id),
    teamId: String(c.teamId),
    title: c.title,
    description: c.description,
    modulesCount: c.modulesCount || 0,
    status: c.status,
    publishedAt: c.publishedAt,
    createdAt: c.createdAt
  };
}

function mapSnapshot(r: { capturedAt: string; viewCount: number; likeCount?: number | null; commentCount?: number | null }): VideoSnapshot {
  return {
    capturedAt: r.capturedAt,
    viewCount: r.viewCount,
    likeCount: r.likeCount ?? null,
    commentCount: r.commentCount ?? null
  };
}

function mapVideoStats(raw: Record<string, unknown>, cardId: string): VideoStats {
  const r = raw as {
    videoId: string; videoUrl: string; title: string; publishedAt?: string | null;
    latest?: Parameters<typeof mapSnapshot>[0] | null; history?: Parameters<typeof mapSnapshot>[0][] | null;
  };
  return {
    cardId,
    videoId: r.videoId,
    videoUrl: r.videoUrl,
    title: r.title || "",
    publishedAt: r.publishedAt || null,
    latest: r.latest ? mapSnapshot(r.latest) : null,
    history: Array.isArray(r.history) ? r.history.map(mapSnapshot) : []
  };
}

/** Troca o videoUrl do card no quadro e nas ideias, sem nova ida ao servidor. */
function withVideoUrl<T extends { board: AppState["board"]; ideas: ProjectCard[] }>(state: T, cardId: string, videoUrl?: string) {
  const patch = (c: ProjectCard) => (c.id === cardId ? { ...c, videoUrl } : c);
  return {
    board: state.board ? { ...state.board, columns: state.board.columns.map(col => ({ ...col, cards: col.cards.map(patch) })) } : state.board,
    ideas: state.ideas.map(patch)
  };
}

function mapSummary(raw: { cardId: string | number; summary: string; generatedAt: string; basedOn?: string }): ProjectSummary {
  return {
    cardId: String(raw.cardId),
    summary: raw.summary,
    generatedAt: raw.generatedAt,
    basedOn: raw.basedOn || "SCRIPT"
  };
}

function flattenCards(columns: BoardColumn[]): KanbanItem[] {
  return columns.flatMap(col => col.cards.map(card => ({
    id: card.id,
    title: card.title,
    description: card.description,
    createdAt: card.createdAt ? new Date(card.createdAt).getTime() : 0,
    targetAudience: card.targetAudience,
    pedagogicalObjective: card.pedagogicalObjective,
    progress: card.progress,
    tasksTotal: card.tasksTotal,
    tasksDone: card.tasksDone,
    columnId: col.id,
    dueDate: card.dueDate,
    tagId: card.tagId
  })));
}

function buildIdeasQuery(filters: IdeaFilters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.tagId) params.set("tagId", filters.tagId);
  params.set("sort", filters.sort);
  return params.toString();
}

interface AppState {
  // Seleção do projeto e erro geral
  items: KanbanItem[];
  selectedProjectId: string | null;
  error: string | null;
  clearError: () => void;
  resetStore: () => void;
  setSelectedProjectId: (id: string | null) => void;
  /** Edita título, público, objetivo e prazo do card (PUT /kanban/{id}); "" no prazo limpa. */
  /** `tagId`: undefined mantém a etiqueta, "" remove, outro valor troca. */
  updateProject: (id: string, title: string, audience: string, objective: string, dueDate?: string, tagId?: string) => Promise<boolean>;
  /** Edita uma ideia da caixa de entrada (título, descrição e etiqueta). */
  updateIdea: (id: string, data: { title: string; description: string; tagId?: string }) => Promise<boolean>;

  // Equipes & Membros
  teams: Team[];
  activeTeamId: string | null;
  activeTeam: Team | null;
  teamMembers: TeamMember[];
  fetchTeams: () => Promise<void>;
  setActiveTeamId: (teamId: string) => Promise<void>;
  createTeam: (name: string) => Promise<Team | null>;
  fetchTeamMembers: (teamId?: string) => Promise<void>;
  updateTeamMemberRole: (memberId: string, role: TeamRoleName) => Promise<boolean>;
  removeTeamMember: (memberId: string) => Promise<boolean>;

  // Quadro dinâmico & Caixa de Entrada
  board: { teamId: string; teamName: string; columns: BoardColumn[] } | null;
  ideas: ProjectCard[];
  ideaFilters: IdeaFilters;
  fetchBoard: () => Promise<void>;
  fetchIdeas: () => Promise<void>;
  /** Atualiza os filtros da caixa de entrada e recarrega a lista no servidor (q, tagId, sort). */
  setIdeaFilters: (filters: Partial<IdeaFilters>) => Promise<void>;
  createBoardCard: (data: { title: string; description?: string; columnId?: string; targetAudience?: string; pedagogicalObjective?: string; tagId?: number }) => Promise<ProjectCard | null>;
  createInboxIdea: (data: { title: string; description?: string; targetAudience?: string; pedagogicalObjective?: string; tagId?: number }) => Promise<ProjectCard | null>;
  voteIdea: (cardId: string) => Promise<void>;
  convertInboxIdea: (cardId: string, columnId?: string, data?: { title?: string; targetAudience?: string; pedagogicalObjective?: string }) => Promise<boolean>;
  moveCard: (cardId: string, columnId: string, sortOrder?: number) => Promise<boolean>;
  deleteCard: (cardId: string) => Promise<void>;
  addColumn: (name: string) => Promise<void>;
  renameColumn: (columnId: string, name: string) => Promise<boolean>;
  deleteColumn: (columnId: string, targetColumnId?: string) => Promise<boolean>;
  reorderColumns: (columnIds: string[]) => Promise<boolean>;

  // Tarefas dos cards
  createTask: (cardId: string, title: string) => Promise<CardTask | null>;
  toggleTask: (cardId: string, taskId: string) => Promise<void>;
  deleteTask: (cardId: string, taskId: string) => Promise<void>;
  /** assigneeMemberId: 0 remove o responsável; dueDate: "" remove o prazo. */
  updateCardTaskDetails: (
    cardId: string,
    taskId: string,
    updates: { title?: string; assigneeMemberId?: number; dueDate?: string }
  ) => Promise<boolean>;
  reorderCardTasks: (cardId: string, taskIds: string[]) => Promise<boolean>;
  fetchCardHistory: (cardId: string) => Promise<CardMovementHistory[]>;

  // Etiquetas (gerenciadas somente pelo Administrador)
  teamTags: TeamTag[];
  fetchTeamTags: () => Promise<void>;
  createTeamTag: (name: string, color: string) => Promise<TeamTag | null>;
  updateTeamTag: (tagId: string, updates: { name?: string; color?: string }) => Promise<boolean>;
  deleteTeamTag: (tagId: string) => Promise<boolean>;

  // Cursos, Módulos e Lições
  courses: Course[];
  activeCourse: CourseDetail | null;
  fetchCourses: () => Promise<void>;
  fetchCourseDetails: (courseId: string) => Promise<void>;
  createCourse: (title: string, description?: string) => Promise<Course | null>;
  updateCourse: (courseId: string, title: string, description?: string) => Promise<boolean>;
  deleteCourse: (courseId: string) => Promise<void>;
  createCourseModule: (courseId: string, title: string) => Promise<boolean>;
  updateCourseModule: (courseId: string, moduleId: string, title: string) => Promise<boolean>;
  deleteCourseModule: (courseId: string, moduleId: string) => Promise<void>;
  createCourseLesson: (courseId: string, moduleId: string, title: string, type?: "VIDEO" | "TEXT" | "QUIZ", projectId?: string, extra?: { description?: string; contentUrl?: string }) => Promise<boolean>;
  updateCourseLesson: (courseId: string, moduleId: string, lessonId: string, data: { title?: string; type?: "VIDEO" | "TEXT" | "QUIZ"; published?: boolean; projectId?: number; description?: string; contentUrl?: string }) => Promise<boolean>;
  deleteCourseLesson: (courseId: string, moduleId: string, lessonId: string) => Promise<void>;
  reorderCourseModules: (courseId: string, moduleIds: string[]) => Promise<boolean>;
  reorderCourseLessons: (courseId: string, moduleId: string, lessonIds: string[]) => Promise<boolean>;
  /** silent: falha sem toast (verificação automática do aviso de curso publicado). */
  checkCoursePublication: (courseId: string, options?: { silent?: boolean }) => Promise<PublicationCheckResult | null>;
  /** true = publicado; "invalid" = o servidor recusou com 400 (há problemas a mostrar); false = outro erro. */
  publishCourse: (courseId: string) => Promise<boolean | "invalid">;
  unpublishCourse: (courseId: string) => Promise<boolean>;
  exportCourseCsv: (courseId: string) => Promise<boolean>;
  exportCourseJson: (courseId: string) => Promise<boolean>;

  // Estúdio de roteiro (exportação e versões)
  exportScript: (cardId: string) => Promise<ScriptExportData | null>;
  fetchScriptVersions: (cardId: string) => Promise<ScriptVersionData[]>;
  restoreScriptVersion: (cardId: string, versionId: string) => Promise<boolean>;

  // Alertas, revisão, materiais e resumo (rotas do contrato final)
  alerts: AlertItem[];
  /** A última busca de alertas falhou (o painel não deve dizer que não há prazos). */
  alertsError: boolean;
  fetchAlerts: () => Promise<void>;
  /** Card pedido pelo painel de alertas; o quadro abre o diálogo dele e limpa o valor. */
  cardToOpenId: string | null;
  setCardToOpenId: (cardId: string | null) => void;
  cardReviews: Record<string, CardReview[]>;
  fetchCardReviews: (cardId: string) => Promise<CardReview[]>;
  submitCardReview: (
    cardId: string,
    decision: "APPROVED" | "CHANGES_REQUESTED",
    comment: string
  ) => Promise<boolean>;

  cardMaterials: Record<string, MaterialItem[]>;
  /** ignoreNotFound: projeto excluído devolve lista vazia, sem aviso. */
  fetchCardMaterials: (cardId: string, opts?: { ignoreNotFound?: boolean }) => Promise<MaterialItem[]>;
  uploadMaterial: (cardId: string, file: File, onProgress?: (percent: number) => void) => Promise<MaterialItem | null>;
  deleteMaterial: (materialId: string, cardId: string) => Promise<boolean>;
  downloadMaterial: (material: MaterialItem) => Promise<boolean>;
  previewMaterial: (material: MaterialItem) => Promise<boolean>;
  linkMaterialToLesson: (courseId: string, moduleId: string, lessonId: string, materialId: string) => Promise<boolean>;
  unlinkMaterialFromLesson: (courseId: string, moduleId: string, lessonId: string, materialId: string) => Promise<boolean>;

  cardSummaries: Record<string, ProjectSummary>;
  /** url vazia remove o vínculo. Só altera o estado quando o servidor aceita. */
  setCardVideo: (cardId: string, url: string) => Promise<boolean>;
  /** 404 (sem vídeo vinculado) não é erro: devolve null sem aviso. */
  fetchVideoStats: (cardId: string) => Promise<VideoStats | null>;
  refreshVideoStats: (cardId: string) => Promise<VideoStats | null>;
  videoStats: Record<string, VideoStats>;
  fetchCardSummary: (cardId: string) => Promise<ProjectSummary | null>;
  generateCardSummary: (cardId: string) => Promise<ProjectSummary | null>;

  // Planos
  plans: PlanInfo[];
  teamPlan: TeamPlan | null;
  fetchPlans: () => Promise<void>;
  fetchTeamPlan: () => Promise<TeamPlan | null>;
  startTrial: (plan: TrialPlan) => Promise<boolean>;

  // Convites e administração da equipe
  teamInvites: TeamInvite[];
  fetchTeamInvites: () => Promise<void>;
  createTeamInvite: (email: string, role: TeamRoleName) => Promise<boolean>;
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

const EMPTY_SESSION_STATE = {
  items: [] as KanbanItem[],
  selectedProjectId: null as string | null,
  error: null as string | null,
  teams: [] as Team[],
  activeTeamId: null as string | null,
  activeTeam: null as Team | null,
  teamMembers: [] as TeamMember[],
  board: null as AppState["board"],
  ideas: [] as ProjectCard[],
  ideaFilters: DEFAULT_IDEA_FILTERS,
  courses: [] as Course[],
  activeCourse: null as CourseDetail | null,
  alerts: [] as AlertItem[],
  alertsError: false,
  cardToOpenId: null as string | null,
  cardMaterials: {} as Record<string, MaterialItem[]>,
  cardReviews: {} as Record<string, CardReview[]>,
  cardSummaries: {} as Record<string, ProjectSummary>,
  videoStats: {} as Record<string, VideoStats>,
  teamInvites: [] as TeamInvite[],
  teamTags: [] as TeamTag[],
  plans: [] as PlanInfo[],
  teamPlan: null as TeamPlan | null,
};

// Pedido de equipes em andamento (evita buscas repetidas na carga da página)
let teamsInFlight: Promise<void> | null = null;
let alertsInFlight = false;
let alertsRerun = false;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...EMPTY_SESSION_STATE,

      clearError: () => set({ error: null }),
      resetStore: () => {
        teamsInFlight = null;
        set({ ...EMPTY_SESSION_STATE });
      },

      setSelectedProjectId: (id) => set({ selectedProjectId: id }),

      updateProject: async (id, title, audience, objective, dueDate, tagId) => {
        try {
          set({ error: null });
          await apiRequest("PUT", `/api/v1/kanban/${id}`, {
            title,
            targetAudience: audience,
            pedagogicalObjective: objective,
            // Prazo: "" limpa, undefined mantém o valor salvo
            ...(dueDate !== undefined ? { dueDate } : {}),
            // Etiqueta: undefined mantém, "" remove (0), outro valor troca
            ...(tagId !== undefined ? { tagId: tagId === "" ? 0 : Number(tagId) } : {})
          });
          toast.success("Projeto atualizado!");
          await get().fetchBoard();
          return true;
        } catch (error) {
          const message = errMsg(error, "Erro ao atualizar projeto");
          set({ error: message });
          toastApiError(error, message);
          return false;
        }
      },

      updateIdea: async (id, data) => {
        try {
          set({ error: null });
          await apiRequest("PUT", `/api/v1/kanban/${id}`, {
            title: data.title,
            description: data.description,
            ...(data.tagId !== undefined ? { tagId: data.tagId === "" ? 0 : Number(data.tagId) } : {})
          });
          toast.success("Ideia atualizada!");
          // A resposta traz só o tagId (sem nome/cor da etiqueta): recarrega a lista
          await get().fetchIdeas();
          return true;
        } catch (error) {
          const message = errMsg(error, "Erro ao atualizar ideia");
          set({ error: message });
          toastApiError(error, message);
          return false;
        }
      },

      // --- Equipes ---
      fetchTeams: async () => {
        // Várias telas pedem as equipes ao carregar: junta os pedidos em andamento em um só
        if (teamsInFlight) return teamsInFlight;
        const current: Promise<void> = (async () => {
          try {
            set({ error: null });
            const rawTeams = await apiRequest("GET", "/api/v1/teams");
            if (Array.isArray(rawTeams) && rawTeams.length > 0) {
              const mappedTeams: Team[] = rawTeams.map(t => ({
                id: String(t.id),
                name: t.name,
                role: t.role,
                membersCount: t.membersCount,
                createdAt: t.createdAt,
                plan: t.plan,
                planSource: t.planSource,
                planExpiresAt: t.planExpiresAt ?? null,
                ...(typeof t.personal === "boolean" ? { personal: t.personal } : {})
              }));

              let activeId = get().activeTeamId;
              if (!activeId || !mappedTeams.some(t => t.id === activeId)) {
                activeId = mappedTeams[0].id;
              }

              const active = mappedTeams.find(t => t.id === activeId) || null;
              set({ teams: mappedTeams, activeTeamId: activeId, activeTeam: active });

              await Promise.all([get().fetchBoard(), get().fetchIdeas(), get().fetchCourses(), get().fetchTeamTags(), get().fetchTeamMembers()]);
              return;
            }
            set({ teams: [], activeTeamId: null, activeTeam: null });
          } catch (err: unknown) {
            const message = errMsg(err, "Não foi possível carregar as equipes.");
            set({ error: message });
            toastApiError(err, message);
          }
        })().finally(() => {
          if (teamsInFlight === current) teamsInFlight = null;
        });
        teamsInFlight = current;
        return current;
      },

      setActiveTeamId: async (teamId) => {
        const found = get().teams.find(t => t.id === teamId) || null;
        set({
          activeTeamId: teamId,
          activeTeam: found,
          board: null,
          ideas: [],
          courses: [],
          activeCourse: null,
          teamTags: [],
          teamMembers: [],
          teamPlan: null,
          alerts: [],
          alertsError: false,
          teamInvites: [],
          selectedProjectId: null,
          ideaFilters: DEFAULT_IDEA_FILTERS
        });
        await Promise.all([get().fetchBoard(), get().fetchIdeas(), get().fetchCourses(), get().fetchTeamTags(), get().fetchTeamMembers()]);
      },

      createTeam: async (name) => {
        try {
          const raw = await apiRequest("POST", "/api/v1/teams", { name });
          if (!raw) return null;
          const newTeam: Team = {
            id: String(raw.id),
            name: raw.name,
            role: raw.role,
            membersCount: raw.membersCount,
            createdAt: raw.createdAt,
            plan: raw.plan,
            planSource: raw.planSource,
            planExpiresAt: raw.planExpiresAt ?? null
          };
          toast.success("Equipe criada com sucesso!");
          set(state => ({ teams: [...state.teams, newTeam] }));
          await get().setActiveTeamId(newTeam.id);
          return newTeam;
        } catch (error) {
          notifyError(error, "Erro ao criar equipe");
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
              id: String(m.id),
              userId: String(m.userId),
              name: m.name,
              email: m.email,
              role: m.role,
              joinedAt: m.joinedAt
            }));
            set({ teamMembers: mappedMembers });
          }
        } catch (error) {
          // Carga em segundo plano: sem aviso na tela, a lista fica vazia
          console.error("Erro ao carregar membros da equipe:", error);
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
          notifyError(error, "Erro ao atualizar papel");
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
          notifyError(error, "Erro ao remover membro");
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
              id: String(col.id),
              name: col.name,
              sortOrder: col.sortOrder,
              cards: Array.isArray(col.cards)
                ? col.cards.map((c: ApiCardDto) => mapCard(c, { id: String(col.id), name: col.name }))
                : []
            }));

            const items = flattenCards(mappedColumns);
            const selected = get().selectedProjectId;
            const selectedStillExists = selected !== null && items.some(i => i.id === selected);

            set({
              board: {
                teamId: String(rawBoard.teamId),
                teamName: rawBoard.teamName,
                columns: mappedColumns
              },
              items,
              selectedProjectId: selectedStillExists ? selected : (items[0]?.id ?? null)
            });
            // Prazos de cards e tarefas mudam com as edições do quadro: atualiza os alertas junto
            void get().fetchAlerts();
          }
        } catch (error) {
          notifyError(error, "Erro ao carregar o quadro");
        }
      },

      fetchIdeas: async () => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          const rawIdeas = await apiRequest("GET", `/api/v1/teams/${teamId}/ideas?${buildIdeasQuery(get().ideaFilters)}`);
          if (Array.isArray(rawIdeas)) {
            set({ ideas: rawIdeas.map((c: ApiCardDto) => mapCard(c)) });
          }
        } catch (error) {
          notifyError(error, "Erro ao carregar ideias");
        }
      },

      setIdeaFilters: async (filters) => {
        set(state => ({ ideaFilters: { ...state.ideaFilters, ...filters } }));
        await get().fetchIdeas();
      },

      createBoardCard: async (data) => {
        const teamId = get().activeTeamId;
        if (!teamId) return null;

        try {
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/cards`, data);
          if (!raw) return null;
          toast.success("Card de projeto criado!");
          await get().fetchBoard();
          return mapCard(raw, { id: String(raw.columnId ?? ""), name: "" });
        } catch (error) {
          notifyError(error, "Erro ao criar card");
          return null;
        }
      },

      createInboxIdea: async (data) => {
        const teamId = get().activeTeamId;
        if (!teamId) return null;

        try {
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/ideas`, data);
          if (!raw) return null;
          toast.success("Ideia guardada na Caixa de Entrada!");
          await get().fetchIdeas();
          return mapCard(raw);
        } catch (error) {
          notifyError(error, "Erro ao criar ideia");
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
                ? { ...idea, votes: raw.votes, votedByMe: Boolean(raw.votedByMe) }
                : idea)
            }));
          }
        } catch (error) {
          notifyError(error, "Erro ao registrar voto");
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
          notifyError(error, "Erro ao converter ideia");
          return false;
        }
      },

      moveCard: async (cardId, columnId, sortOrder = 0) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("PATCH", `/api/v1/teams/${teamId}/cards/${cardId}/move`, {
            columnId: Number(columnId),
            sortOrder
          });
          await get().fetchBoard();
          return true;
        } catch (error) {
          notifyError(error, "Erro ao mover card");
          return false;
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
          notifyError(error, "Erro ao excluir card");
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
          notifyError(error, "Erro ao criar coluna");
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
          notifyError(error, "Erro ao renomear coluna");
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
          notifyError(error, "Erro ao remover coluna");
          return false;
        }
      },

      reorderColumns: async (columnIds) => {
        const teamId = get().activeTeamId;
        if (!teamId || !get().board) return false;

        try {
          await apiRequest("PUT", `/api/v1/teams/${teamId}/columns/order`, {
            columnIds: columnIds.map(Number)
          });
          await get().fetchBoard();
          return true;
        } catch (error) {
          notifyError(error, "Erro ao reordenar colunas");
          return false;
        }
      },

      // --- Checklist & Tarefas ---
      createTask: async (cardId, title) => {
        const teamId = get().activeTeamId;
        if (!teamId) return null;

        try {
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/cards/${cardId}/tasks`, { title });
          if (!raw) return null;
          toast.success("Tarefa adicionada!");
          await get().fetchBoard();
          return mapTask(raw);
        } catch (error) {
          notifyError(error, "Erro ao adicionar tarefa");
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
          notifyError(error, "Erro ao alternar tarefa");
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
          notifyError(error, "Erro ao remover tarefa");
        }
      },

      updateCardTaskDetails: async (cardId, taskId, updates) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("PATCH", `/api/v1/teams/${teamId}/cards/${cardId}/tasks/${taskId}`, updates);
          toast.success("Tarefa atualizada com sucesso!");
          await get().fetchBoard();
          return true;
        } catch (error) {
          notifyError(error, "Erro ao atualizar tarefa");
          return false;
        }
      },

      reorderCardTasks: async (cardId, taskIds) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("PUT", `/api/v1/teams/${teamId}/cards/${cardId}/tasks/order`, {
            taskIds: taskIds.map(Number)
          });
          await get().fetchBoard();
          return true;
        } catch (error) {
          notifyError(error, "Erro ao reordenar tarefas");
          return false;
        }
      },

      fetchCardHistory: async (cardId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return [];

        try {
          const raw = await apiRequest("GET", `/api/v1/teams/${teamId}/cards/${cardId}/history`);
          if (!Array.isArray(raw)) return [];
          return raw.map((h: { columnId: string | number; columnName: string; enteredAt: string; movedBy?: { userId: string | number; name: string } | null }) => ({
            columnId: String(h.columnId),
            columnName: h.columnName,
            enteredAt: h.enteredAt,
            movedBy: h.movedBy ? { userId: String(h.movedBy.userId), name: h.movedBy.name } : null
          }));
        } catch (error) {
          notifyError(error, "Erro ao carregar o histórico");
          return [];
        }
      },

      // --- Etiquetas ---
      fetchTeamTags: async () => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          const data = await apiRequest("GET", `/api/v1/teams/${teamId}/tags`);
          if (Array.isArray(data)) {
            set({
              teamTags: data.map((t: { id: string | number; name: string; color: string }) => ({
                id: String(t.id),
                name: t.name,
                color: t.color
              }))
            });
          }
        } catch (error) {
          // Carga em segundo plano: sem aviso na tela
          console.error("Erro ao carregar etiquetas:", error);
        }
      },

      createTeamTag: async (name, color) => {
        const teamId = get().activeTeamId;
        if (!teamId) return null;

        try {
          const data = await apiRequest("POST", `/api/v1/teams/${teamId}/tags`, { name: name.trim(), color });
          if (!data) return null;
          const newTag: TeamTag = { id: String(data.id), name: data.name, color: data.color };
          set(state => ({ teamTags: [...state.teamTags, newTag] }));
          toast.success("Etiqueta criada com sucesso!");
          return newTag;
        } catch (error) {
          notifyError(error, "Erro ao criar etiqueta");
          return null;
        }
      },

      updateTeamTag: async (tagId, updates) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          const data = await apiRequest("PATCH", `/api/v1/teams/${teamId}/tags/${tagId}`, updates);
          if (data) {
            set(state => ({
              teamTags: state.teamTags.map(t => t.id === tagId ? { id: String(data.id), name: data.name, color: data.color } : t)
            }));
          }
          toast.success("Etiqueta atualizada!");
          // Cards e ideias mostram o nome e a cor da etiqueta
          await Promise.all([get().fetchBoard(), get().fetchIdeas()]);
          return true;
        } catch (error) {
          notifyError(error, "Erro ao atualizar etiqueta");
          return false;
        }
      },

      deleteTeamTag: async (tagId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("DELETE", `/api/v1/teams/${teamId}/tags/${tagId}`);
          set(state => ({
            teamTags: state.teamTags.filter(t => t.id !== tagId),
            ideaFilters: state.ideaFilters.tagId === tagId ? { ...state.ideaFilters, tagId: "" } : state.ideaFilters
          }));
          toast.success("Etiqueta removida.");
          await Promise.all([get().fetchBoard(), get().fetchIdeas()]);
          return true;
        } catch (error) {
          notifyError(error, "Erro ao remover etiqueta");
          return false;
        }
      },

      // --- Cursos, Módulos e Lições ---
      fetchCourses: async () => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          const rawCourses = await apiRequest("GET", `/api/v1/teams/${teamId}/courses`);
          if (Array.isArray(rawCourses)) {
            set({ courses: rawCourses.map(mapCourse) });
          }
        } catch (error) {
          // Carga em segundo plano: sem aviso na tela
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
              ...mapCourse(raw),
              modulesCount: Array.isArray(raw.modules) ? raw.modules.length : raw.modulesCount,
              modules: Array.isArray(raw.modules) ? raw.modules.map((m: ApiModuleDto) => ({
                id: String(m.id),
                courseId: m.courseId !== undefined ? String(m.courseId) : String(raw.id),
                title: m.title,
                sortOrder: m.sortOrder,
                createdAt: m.createdAt,
                lessons: Array.isArray(m.lessons) ? m.lessons.map((l: ApiLessonDto) => ({
                  id: String(l.id),
                  moduleId: l.moduleId !== undefined ? String(l.moduleId) : String(m.id),
                  title: l.title,
                  type: (l.type || "VIDEO") as CourseLesson["type"],
                  published: Boolean(l.published),
                  sortOrder: l.sortOrder,
                  projectId: l.projectId ? String(l.projectId) : undefined,
                  description: l.description,
                  contentUrl: l.contentUrl,
                  materials: Array.isArray(l.materials) ? l.materials.map(mat => mapMaterial(mat, "")) : undefined,
                  createdAt: l.createdAt
                })) : []
              })) : []
            };
            set({ activeCourse: detail });
          }
        } catch (error) {
          notifyError(error, "Erro ao carregar o curso");
        }
      },

      createCourse: async (title, description) => {
        const teamId = get().activeTeamId;
        if (!teamId) return null;

        try {
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/courses`, { title, description });
          if (!raw) return null;
          toast.success("Curso pedagógico criado!");
          await get().fetchCourses();
          return mapCourse(raw);
        } catch (error) {
          notifyError(error, "Erro ao criar curso");
          return null;
        }
      },

      updateCourse: async (courseId, title, description) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("PATCH", `/api/v1/teams/${teamId}/courses/${courseId}`, { title, description });
          toast.success("Curso atualizado com sucesso!");
          await get().fetchCourses();
          if (get().activeCourse?.id === courseId) {
            await get().fetchCourseDetails(courseId);
          }
          return true;
        } catch (error) {
          notifyError(error, "Erro ao atualizar curso");
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
          notifyError(error, "Erro ao excluir curso");
        }
      },

      createCourseModule: async (courseId, title) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("POST", `/api/v1/teams/${teamId}/courses/${courseId}/modules`, { title });
          toast.success("Módulo adicionado!");
          await get().fetchCourseDetails(courseId);
          await get().fetchCourses();
          return true;
        } catch (error) {
          notifyError(error, "Erro ao adicionar módulo");
          return false;
        }
      },

      updateCourseModule: async (courseId, moduleId, title) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("PATCH", `/api/v1/teams/${teamId}/courses/${courseId}/modules/${moduleId}`, { title });
          toast.success("Módulo atualizado com sucesso!");
          await get().fetchCourseDetails(courseId);
          return true;
        } catch (error) {
          notifyError(error, "Erro ao atualizar módulo");
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
          notifyError(error, "Erro ao excluir módulo");
        }
      },

      createCourseLesson: async (courseId, moduleId, title, type = "VIDEO", projectId, extra) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          const body: Record<string, unknown> = {
            title,
            type,
            projectId: projectId ? Number(projectId) : undefined
          };
          if (extra?.description?.trim()) body.description = extra.description.trim();
          if (extra?.contentUrl?.trim()) body.contentUrl = extra.contentUrl.trim();
          await apiRequest("POST", `/api/v1/teams/${teamId}/courses/${courseId}/modules/${moduleId}/lessons`, body);
          toast.success("Aula adicionada!");
          await get().fetchCourseDetails(courseId);
          return true;
        } catch (error) {
          notifyError(error, "Erro ao adicionar aula");
          return false;
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
        } catch (error) {
          notifyError(error, "Erro ao atualizar aula");
          return false;
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
          notifyError(error, "Erro ao excluir aula");
        }
      },

      reorderCourseModules: async (courseId, moduleIds) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("PUT", `/api/v1/teams/${teamId}/courses/${courseId}/modules/order`, {
            moduleIds: moduleIds.map(Number)
          });
          await get().fetchCourseDetails(courseId);
          return true;
        } catch (error) {
          notifyError(error, "Erro ao reordenar módulos");
          return false;
        }
      },

      reorderCourseLessons: async (courseId, moduleId, lessonIds) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("PUT", `/api/v1/teams/${teamId}/courses/${courseId}/modules/${moduleId}/lessons/order`, {
            lessonIds: lessonIds.map(Number)
          });
          await get().fetchCourseDetails(courseId);
          return true;
        } catch (error) {
          notifyError(error, "Erro ao reordenar aulas");
          return false;
        }
      },

      checkCoursePublication: async (courseId, options) => {
        const teamId = get().activeTeamId;
        if (!teamId) return null;

        try {
          const raw = await apiRequest("GET", `/api/v1/teams/${teamId}/courses/${courseId}/publication-check`);
          if (!raw || typeof raw.publishable !== "boolean") return null;
          return {
            publishable: raw.publishable,
            problems: Array.isArray(raw.problems) ? raw.problems.map((p: { type: string; ids?: Array<string | number>; titles?: string[]; message: string }) => ({
              type: p.type,
              ids: (p.ids || []).map(Number),
              titles: p.titles || [],
              message: p.message
            })) : []
          };
        } catch (error) {
          if (!options?.silent) notifyError(error, "Erro ao verificar a publicação do curso");
          return null;
        }
      },

      publishCourse: async (courseId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("POST", `/api/v1/teams/${teamId}/courses/${courseId}/publish`);
          toast.success("Curso publicado com sucesso!");
          await get().fetchCourses();
          await get().fetchCourseDetails(courseId);
          return true;
        } catch (error) {
          notifyError(error, "Erro ao publicar o curso");
          return (error as { status?: number })?.status === 400 ? "invalid" : false;
        }
      },

      unpublishCourse: async (courseId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("POST", `/api/v1/teams/${teamId}/courses/${courseId}/unpublish`);
          toast.success("Curso despublicado e retornado para rascunho.");
          await get().fetchCourses();
          await get().fetchCourseDetails(courseId);
          return true;
        } catch (error) {
          notifyError(error, "Erro ao despublicar o curso");
          return false;
        }
      },

      exportCourseCsv: async (courseId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiDownload(`/api/v1/teams/${teamId}/courses/${courseId}/export?format=csv`, `curso-${courseId}.csv`);
          toast.success("Estrutura do curso exportada em CSV com sucesso!");
          return true;
        } catch (error) {
          notifyError(error, "Erro ao exportar o curso");
          return false;
        }
      },

      exportCourseJson: async (courseId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiDownload(`/api/v1/teams/${teamId}/courses/${courseId}/export?format=json`, `curso-${courseId}.json`);
          toast.success("Estrutura do curso exportada em JSON com sucesso!");
          return true;
        } catch (error) {
          notifyError(error, "Erro ao exportar o curso");
          return false;
        }
      },

      // --- Estúdio de Roteiro Avançado (Exportação e Versões) ---
      exportScript: async (cardId) => {
        try {
          const raw = await apiRequest("GET", `/api/v1/kanban/${cardId}/script/export`);
          if (!raw) return null;
          return {
            cardId: String(raw.cardId),
            cardTitle: raw.cardTitle,
            targetAudience: raw.targetAudience,
            pedagogicalObjective: raw.pedagogicalObjective,
            rawContent: raw.rawContent || "",
            markdownFormatted: raw.markdownFormatted || "",
            wordCount: raw.wordCount,
            estimatedMinutes: raw.estimatedMinutes
          };
        } catch (error) {
          notifyError(error, "Erro ao exportar o roteiro");
          return null;
        }
      },

      fetchScriptVersions: async (cardId) => {
        try {
          const rawVersions = await apiRequest("GET", `/api/v1/kanban/${cardId}/script/versions`);
          if (!Array.isArray(rawVersions)) return [];
          return rawVersions.map((v: ApiScriptVersionDto, idx: number) => ({
            id: String(v.id),
            versionNumber: v.versionNumber || (rawVersions.length - idx),
            content: v.content || "",
            createdAt: v.createdAt
          }));
        } catch (error) {
          notifyError(error, "Erro ao buscar as versões do roteiro");
          return [];
        }
      },

      restoreScriptVersion: async (cardId, versionId) => {
        try {
          await apiRequest("POST", `/api/v1/kanban/${cardId}/script/versions/${versionId}/restore`);
          toast.success("Versão restaurada com sucesso!");
          return true;
        } catch (error) {
          notifyError(error, "Erro ao restaurar versão");
          return false;
        }
      },

      // --- Alertas ---
      fetchAlerts: async () => {
        // Sem backend de alertas ainda: não chama a rota enquanto a flag estiver desligada
        if (!FEATURES.alerts) return;
        const teamId = get().activeTeamId;
        if (!teamId) return;
        if (alertsInFlight) {
          // Já há uma busca em andamento: repete uma vez ao terminar para não perder a edição mais recente
          alertsRerun = true;
          return;
        }
        alertsInFlight = true;

        try {
          const raw = await apiRequest("GET", `/api/v1/teams/${teamId}/alerts`);
          if (Array.isArray(raw) && get().activeTeamId === teamId) {
            set({
              alertsError: false,
              alerts: raw.map(a => ({
                type: a.type,
                cardId: String(a.cardId),
                cardTitle: a.cardTitle,
                taskId: a.taskId !== undefined && a.taskId !== null ? String(a.taskId) : null,
                taskTitle: a.taskTitle ?? null,
                dueDate: a.dueDate,
                daysLeft: a.daysLeft
              }))
            });
          }
        } catch (error) {
          // Carga em segundo plano: sem toast; o painel do sino mostra o erro e o botão de tentar de novo
          console.error("Erro ao carregar os alertas:", error);
          if (get().activeTeamId === teamId) set({ alertsError: true });
        } finally {
          alertsInFlight = false;
          if (alertsRerun) {
            alertsRerun = false;
            void get().fetchAlerts();
          }
        }
      },
      setCardToOpenId: (cardId) => set({ cardToOpenId: cardId }),

      // --- Revisão ---
      fetchCardReviews: async (cardId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return get().cardReviews[cardId] || [];

        try {
          const raw = await apiRequest("GET", `/api/v1/teams/${teamId}/cards/${cardId}/reviews`);
          if (Array.isArray(raw)) {
            const mapped = raw.map(r => mapReview(r, cardId));
            set(state => ({ cardReviews: { ...state.cardReviews, [cardId]: mapped } }));
            return mapped;
          }
        } catch (error) {
          notifyError(error, "Erro ao carregar as revisões");
        }
        return get().cardReviews[cardId] || [];
      },

      submitCardReview: async (cardId, decision, comment) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("POST", `/api/v1/teams/${teamId}/cards/${cardId}/reviews`, { decision, comment });
          toast.success(decision === "APPROVED" ? "Projeto aprovado!" : "Revisão enviada com observações!");
          await Promise.all([get().fetchBoard(), get().fetchCardReviews(cardId)]);
          return true;
        } catch (error) {
          notifyError(error, "Erro ao registrar a revisão");
          return false;
        }
      },

      // --- Materiais ---
      fetchCardMaterials: async (cardId, opts) => {
        const teamId = get().activeTeamId;
        if (!teamId) return get().cardMaterials[cardId] || [];

        try {
          const raw = await apiRequest("GET", `/api/v1/teams/${teamId}/cards/${cardId}/materials`);
          if (Array.isArray(raw)) {
            const mapped = raw.map((m: ApiMaterialDto) => mapMaterial(m, cardId));
            set(state => ({
              cardMaterials: { ...state.cardMaterials, [cardId]: mapped },
              board: withMaterialsCount(state.board, cardId, mapped.length)
            }));
            return mapped;
          }
        } catch (error) {
          if (!(opts?.ignoreNotFound && statusOf(error) === 404)) {
            notifyError(error, "Erro ao carregar os materiais");
          }
        }
        return get().cardMaterials[cardId] || [];
      },

      uploadMaterial: async (cardId, file, onProgress) => {
        const teamId = get().activeTeamId;
        if (!teamId) return null;

        const allowedExtensions = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt", ".png", ".jpg", ".jpeg", ".webp", ".gif"];
        const dot = file.name.lastIndexOf(".");
        const ext = dot >= 0 ? file.name.substring(dot).toLowerCase() : "";
        if (!allowedExtensions.includes(ext)) {
          toast.error("Formato não suportado. Envie arquivos PDF, Office, TXT ou imagens.");
          return null;
        }

        if (file.size === 0) {
          toast.error("O arquivo está vazio.");
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
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/cards/${cardId}/materials`, formData, onProgress ? { onUploadProgress: onProgress } : undefined);
          if (!raw) return null;
          const mapped = mapMaterial(raw, cardId);
          // A lista do servidor vem do mais novo para o mais antigo
          set(state => {
            const next = [mapped, ...(state.cardMaterials[cardId] || [])];
            return {
              cardMaterials: { ...state.cardMaterials, [cardId]: next },
              board: withMaterialsCount(state.board, cardId, next.length)
            };
          });
          toast.success("Material enviado com sucesso!");
          return mapped;
        } catch (error) {
          notifyError(error, "Erro ao enviar o material");
          return null;
        }
      },

      deleteMaterial: async (materialId, cardId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("DELETE", `/api/v1/teams/${teamId}/materials/${materialId}`);
          set(state => {
            const next = (state.cardMaterials[cardId] || []).filter(m => m.id !== materialId);
            return {
              cardMaterials: { ...state.cardMaterials, [cardId]: next },
              board: withMaterialsCount(state.board, cardId, next.length)
            };
          });
          toast.success("Material removido!");
          return true;
        } catch (error) {
          notifyError(error, "Erro ao remover o material");
          return false;
        }
      },

      downloadMaterial: async (material) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          // O token vai no cabeçalho (fetch + blob); um link direto não enviaria o token
          await apiDownload(`/api/v1/teams/${teamId}/materials/${material.id}/download`, material.fileName);
          return true;
        } catch (error) {
          notifyError(error, "Erro ao baixar o material");
          return false;
        }
      },

      previewMaterial: async (material) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          // GET ...?inline=true com o token no cabeçalho; se o navegador bloquear a aba, cai no download
          await apiOpenInline(`/api/v1/teams/${teamId}/materials/${material.id}/download`, material.fileName);
          return true;
        } catch (error) {
          notifyError(error, "Erro ao abrir o material");
          return false;
        }
      },

      linkMaterialToLesson: async (courseId, moduleId, lessonId, materialId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("POST", `/api/v1/teams/${teamId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/materials`, {
            materialId: Number(materialId)
          });
          toast.success("Material vinculado à aula!");
          await get().fetchCourseDetails(courseId);
          return true;
        } catch (error) {
          notifyError(error, "Erro ao vincular o material");
          return false;
        }
      },

      unlinkMaterialFromLesson: async (courseId, moduleId, lessonId, materialId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("DELETE", `/api/v1/teams/${teamId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/materials/${materialId}`);
          toast.success("Material desvinculado da aula!");
          await get().fetchCourseDetails(courseId);
          return true;
        } catch (error) {
          notifyError(error, "Erro ao desvincular o material");
          return false;
        }
      },

      // --- Desempenho no YouTube ---
      setCardVideo: async (cardId, url) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;
        try {
          const raw = await apiRequest("PUT", `/api/v1/teams/${teamId}/cards/${cardId}/video`, { url: url.trim() });
          const videoUrl = (raw && typeof raw === "object" && raw.videoUrl) || undefined;
          set(state => {
            const next = { ...state.videoStats };
            if (videoUrl !== state.videoStats[cardId]?.videoUrl) delete next[cardId];
            return { ...withVideoUrl(state, cardId, videoUrl), videoStats: next };
          });
          toast.success(videoUrl ? "Link do vídeo salvo!" : "Link do vídeo removido.");
          return true;
        } catch (error) {
          notifyError(error, "Erro ao salvar o link do vídeo");
          return false;
        }
      },

      fetchVideoStats: async (cardId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return null;
        try {
          const raw = await apiRequest("GET", `/api/v1/teams/${teamId}/cards/${cardId}/video-stats`);
          if (!raw) return null;
          const stats = mapVideoStats(raw, cardId);
          set(state => ({ videoStats: { ...state.videoStats, [cardId]: stats } }));
          return stats;
        } catch (error) {
          // 404: o projeto ainda não tem vídeo vinculado (estado vazio, não erro)
          if (statusOf(error) === 404) {
            // O vínculo foi removido por outra pessoa: some com os números antigos
            set(state => {
              const next = { ...state.videoStats };
              delete next[cardId];
              return { videoStats: next };
            });
          } else {
            notifyError(error, "Erro ao carregar o desempenho do vídeo");
          }
          return null;
        }
      },

      refreshVideoStats: async (cardId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return null;
        try {
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/cards/${cardId}/video-stats/refresh`);
          if (!raw) return null;
          const stats = mapVideoStats(raw, cardId);
          set(state => ({ videoStats: { ...state.videoStats, [cardId]: stats } }));
          return stats;
        } catch (error) {
          notifyError(error, "Erro ao atualizar os números do vídeo");
          return null;
        }
      },

      // --- Resumo ---
      fetchCardSummary: async (cardId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return get().cardSummaries[cardId] || null;

        try {
          const raw = await apiRequest("GET", `/api/v1/teams/${teamId}/cards/${cardId}/summary`);
          if (raw) {
            const summary = mapSummary(raw);
            set(state => ({ cardSummaries: { ...state.cardSummaries, [cardId]: summary } }));
            return summary;
          }
        } catch (error) {
          // 404 significa apenas que ainda não existe resumo gerado
          if (statusOf(error) !== 404) {
            notifyError(error, "Erro ao carregar o resumo");
          }
        }
        return get().cardSummaries[cardId] || null;
      },

      generateCardSummary: async (cardId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return null;

        try {
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/cards/${cardId}/summary`);
          if (!raw) return null;
          const summary = mapSummary(raw);
          set(state => ({ cardSummaries: { ...state.cardSummaries, [cardId]: summary } }));
          toast.success("Resumo gerado com sucesso!");
          return summary;
        } catch (error) {
          notifyError(error, "Erro ao gerar o resumo");
          return null;
        }
      },

      // --- Planos ---
      fetchPlans: async () => {
        try {
          const raw = await apiRequest("GET", "/api/v1/plans");
          if (Array.isArray(raw)) set({ plans: raw.map(mapPlanInfo) });
        } catch (error) {
          notifyError(error, "Erro ao carregar os planos");
        }
      },

      fetchTeamPlan: async () => {
        const teamId = get().activeTeamId;
        if (!teamId) return null;
        try {
          const raw = await apiRequest("GET", `/api/v1/teams/${teamId}/plan`);
          if (!raw) return null;
          const plan = mapTeamPlan(raw);
          if (get().activeTeamId === teamId) set({ teamPlan: plan });
          return plan;
        } catch (error) {
          toastApiError(error, "Erro ao carregar o plano da equipe"); // sem refetch: evita laço em 402
          return null;
        }
      },

      startTrial: async (plan) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;
        try {
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/plan/trial`, { plan });
          if (!raw) return false;
          const updated = mapTeamPlan(raw);
          set(state => {
            const patch = (t: Team): Team =>
              t.id === teamId ? { ...t, plan: updated.plan, planSource: updated.source, planExpiresAt: updated.expiresAt } : t;
            return {
              teamPlan: updated,
              teams: state.teams.map(patch),
              activeTeam: state.activeTeam ? patch(state.activeTeam) : state.activeTeam
            };
          });
          toast.success("Teste de 14 dias iniciado!");
          return true;
        } catch (error) {
          notifyError(error, "Erro ao iniciar o teste");
          return false;
        }
      },

      // --- Convites e administração da equipe ---
      fetchTeamInvites: async () => {
        const teamId = get().activeTeamId;
        if (!teamId) return;

        try {
          const raw = await apiRequest("GET", `/api/v1/teams/${teamId}/invites`);
          // Resposta tardia de uma equipe que não é mais a ativa: descarta
          if (Array.isArray(raw) && get().activeTeamId === teamId) {
            set({
              teamInvites: raw.map(i => ({
                id: String(i.id),
                email: i.email,
                role: i.role,
                status: i.status,
                invitedBy: i.invitedBy ? { userId: String(i.invitedBy.userId ?? ""), name: i.invitedBy.name || "" } : undefined,
                createdAt: i.createdAt,
                expiresAt: i.expiresAt
              }))
            });
          }
        } catch (error) {
          // Carga ao abrir o diálogo: sem aviso na tela, a lista fica vazia
          console.error("Erro ao carregar os convites:", error);
        }
      },

      createTeamInvite: async (email, role) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          const raw = await apiRequest("POST", `/api/v1/teams/${teamId}/invites`, { email, role });
          if (!raw) return false;
          toast.success(`Convite enviado para ${email}.`);
          await get().fetchTeamInvites();
          return true;
        } catch (error) {
          notifyError(error, "Erro ao enviar o convite");
          return false;
        }
      },

      cancelTeamInvite: async (inviteId) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          await apiRequest("DELETE", `/api/v1/teams/${teamId}/invites/${inviteId}`);
          set(state => ({ teamInvites: state.teamInvites.filter(i => i.id !== inviteId) }));
          toast.success("Convite cancelado!");
          return true;
        } catch (error) {
          notifyError(error, "Erro ao cancelar o convite");
          return false;
        }
      },

      renameTeam: async (name) => {
        const teamId = get().activeTeamId;
        if (!teamId) return false;

        try {
          const raw = await apiRequest("PATCH", `/api/v1/teams/${teamId}`, { name });
          const newName: string = raw?.name || name;
          set(state => ({
            teams: state.teams.map(t => t.id === teamId ? { ...t, name: newName } : t),
            activeTeam: state.activeTeam?.id === teamId ? { ...state.activeTeam, name: newName } : state.activeTeam,
            board: state.board ? { ...state.board, teamName: newName } : null
          }));
          toast.success("Equipe renomeada com sucesso!");
          return true;
        } catch (error) {
          notifyError(error, "Erro ao renomear a equipe");
          return false;
        }
      },

      deleteTeam: async (teamId) => {
        try {
          await apiRequest("DELETE", `/api/v1/teams/${teamId}`);
        } catch (error) {
          notifyError(error, "Erro ao excluir a equipe");
          return false;
        }

        const remaining = get().teams.filter(t => t.id !== teamId);
        set({ teams: remaining });
        toast.success("Equipe excluída com sucesso.");
        if (get().activeTeamId === teamId) {
          if (remaining.length > 0) {
            await get().setActiveTeamId(remaining[0].id);
          } else {
            set({ ...EMPTY_SESSION_STATE });
          }
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

// 401 limpa a equipe ativa também na memória; escrita invalida a busca de equipes em andamento
if (typeof registerApiHooks === "function") {
  registerApiHooks({
    onUnauthorized: () => useAppStore.getState().resetStore(),
    onWrite: () => {
      teamsInFlight = null;
    },
  });
}
