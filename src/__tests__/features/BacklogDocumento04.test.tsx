import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useAppStore, ProjectCard, BoardColumn } from "@/store/useAppStore";
import { Navbar } from "@/components/shared/Navbar";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { UserSettingsDialog } from "@/components/shared/UserSettingsDialog";
import { ConviteContent } from "@/app/convite/page";
import * as apiModule from "@/lib/api";

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  apiRequest: jest.fn(),
  getCookie: jest.fn(),
  deleteCookie: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === "token" ? "token-convite-123" : null),
  }),
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe("Etapa 5 - Backlog Documento 04 & Esteira Avançada", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiModule.getCookie as jest.Mock).mockReturnValue("123");
  });

  describe("FE-18 - Alertas de Prazos", () => {
    it("calcula prazos vencidos e próximos a partir das colunas do quadro", async () => {
      const pastDate = "2026-10-01";
      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const mockCard1: ProjectCard = {
        id: "c1",
        title: "Videoaula Atrasada",
        description: "Desc",
        type: "PROJECT",
        sortOrder: 0,
        progress: 0,
        tasksTotal: 0,
        tasksDone: 0,
        dueDate: pastDate,
        createdAt: new Date().toISOString(),
      };

      const mockCard2: ProjectCard = {
        id: "c2",
        title: "Webinar Próximo",
        description: "Desc",
        type: "PROJECT",
        sortOrder: 1,
        progress: 0,
        tasksTotal: 0,
        tasksDone: 0,
        dueDate: futureDate,
        createdAt: new Date().toISOString(),
      };

      useAppStore.setState({
        activeTeamId: "team-1",
        board: {
          teamId: "team-1",
          teamName: "Estúdio de Produção",
          columns: [
            { id: "col-1", name: "Roteiro", sortOrder: 0, cards: [mockCard1, mockCard2] },
          ],
        },
      });

      await act(async () => {
        await useAppStore.getState().fetchAlerts();
      });

      const alerts = useAppStore.getState().alerts;
      expect(alerts.length).toBe(2);
      expect(alerts[0].type).toBe("CARD_OVERDUE");
      expect(alerts[0].cardTitle).toBe("Videoaula Atrasada");
      expect(alerts[1].type).toBe("CARD_DUE_SOON");
      expect(alerts[1].cardTitle).toBe("Webinar Próximo");
    });

    it("renderiza o sino de notificações e exibe badge no Navbar", () => {
      useAppStore.setState({
        alerts: [
          {
            type: "CARD_OVERDUE",
            cardId: "c1",
            cardTitle: "Videoaula Atrasada",
            dueDate: "2026-10-01",
            daysLeft: -5,
          },
        ],
      });

      render(
        <ThemeProvider>
          <Navbar activeTab="kanban" />
        </ThemeProvider>
      );

      const bellBtn = screen.getByLabelText(/alertas de prazos/i);
      expect(bellBtn).toBeInTheDocument();
      expect(screen.getByTestId("alerts-badge")).toBeInTheDocument();
    });
  });

  describe("FE-22 & FE-23 - Validação e Exportação de Cursos", () => {
    it("detecta módulos vazios e aulas sem materiais na verificação de publicação", async () => {
      useAppStore.setState({
        activeCourse: {
          id: "course-1",
          teamId: "team-1",
          title: "Curso Excel Avançado",
          createdAt: new Date().toISOString(),
          modules: [
            {
              id: "m1",
              courseId: "course-1",
              title: "Módulo Vazio",
              sortOrder: 0,
              lessons: [],
            },
            {
              id: "m2",
              courseId: "course-1",
              title: "Módulo com Aula sem Conteúdo",
              sortOrder: 1,
              lessons: [
                {
                  id: "l1",
                  moduleId: "m2",
                  title: "Aula Teórica",
                  type: "VIDEO",
                  published: false,
                  sortOrder: 0,
                  contentUrl: "",
                  materials: [],
                },
              ],
            },
          ],
        },
      });

      const check = await useAppStore.getState().checkCoursePublication("course-1");
      expect(check.publishable).toBe(false);
      expect(check.problems.length).toBe(2);
      expect(check.problems.some((p) => p.type === "EMPTY_MODULE")).toBe(true);
      expect(check.problems.some((p) => p.type === "LESSON_WITHOUT_MATERIAL")).toBe(true);
    });

    it("exporta estrutura de curso para CSV com delimitador ponto e vírgula", () => {
      const createElementSpy = jest.spyOn(document, "createElement");
      const appendChildSpy = jest.spyOn(document.body, "appendChild").mockImplementation(() => document.createElement("div"));
      const removeChildSpy = jest.spyOn(document.body, "removeChild").mockImplementation(() => document.createElement("div"));

      useAppStore.setState({
        activeCourse: {
          id: "course-1",
          teamId: "team-1",
          title: "Curso Power BI",
          createdAt: new Date().toISOString(),
          modules: [
            {
              id: "m1",
              courseId: "course-1",
              title: "Introdução",
              sortOrder: 0,
              lessons: [
                {
                  id: "l1",
                  moduleId: "m1",
                  title: "DAX Básico",
                  type: "VIDEO",
                  published: true,
                  sortOrder: 0,
                  contentUrl: "https://youtu.be/test",
                },
              ],
            },
          ],
        },
      });

      useAppStore.getState().exportCourseCsv("course-1");
      expect(createElementSpy).toHaveBeenCalledWith("a");

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe("FE-10 & FE-11 - Materiais de Apoio e Validação de Upload", () => {
    it("rejeita arquivo com tamanho superior a 20 MB", async () => {
      useAppStore.setState({ activeTeamId: "team-1" });
      const bigFile = new File([new ArrayBuffer(21 * 1024 * 1024)], "video-pesado.mp4", {
        type: "video/mp4",
      });

      const result = await useAppStore.getState().uploadMaterial("card-1", bigFile);
      expect(result).toBeNull();
    });

    it("rejeita arquivo com extensão não permitida", async () => {
      useAppStore.setState({ activeTeamId: "team-1" });
      const exeFile = new File(["malware"], "script.exe", { type: "application/x-msdownload" });

      const result = await useAppStore.getState().uploadMaterial("card-1", exeFile);
      expect(result).toBeNull();
    });

    it("aceita e processa material válido em formato PDF", async () => {
      useAppStore.setState({ activeTeamId: "team-1" });
      const pdfFile = new File(["pdf content"], "apostila.pdf", { type: "application/pdf" });

      const result = await useAppStore.getState().uploadMaterial("card-1", pdfFile);
      expect(result).not.toBeNull();
      expect(result?.fileName).toBe("apostila.pdf");
      expect(useAppStore.getState().cardMaterials["card-1"].length).toBeGreaterThan(0);
    });
  });

  describe("FE-17 - Resumo Automático com IA", () => {
    it("gera resumo sintético estruturado para o projeto", async () => {
      useAppStore.setState({
        activeTeamId: "team-1",
        board: {
          teamId: "team-1",
          teamName: "Estúdio",
          columns: [
            {
              id: "col-1",
              name: "Produção",
              sortOrder: 0,
              cards: [
                {
                  id: "c-100",
                  title: "Videoaula PROCV",
                  description: "Aula sobre funções",
                  targetAudience: "Iniciantes em Excel",
                  pedagogicalObjective: "Dominar PROCV",
                  type: "PROJECT",
                  sortOrder: 0,
                  progress: 20,
                  tasksTotal: 1,
                  tasksDone: 0,
                  createdAt: new Date().toISOString(),
                },
              ],
            },
          ],
        },
      });

      const summary = await useAppStore.getState().generateCardSummary("c-100");
      expect(summary).not.toBeNull();
      expect(summary?.cardId).toBe("c-100");
      expect(summary?.summary).toContain("Videoaula PROCV");
      expect(summary?.basedOn).toBe("SCRIPT");
    });
  });

  describe("FE-33 & FE-34 - Troca de Senha e E-mail", () => {
    it("permite alterar senha enviando a senha atual e a nova senha", async () => {
      (apiModule.apiRequest as jest.Mock).mockResolvedValue({
        id: 123,
        name: "Henrique Orsoni",
        email: "henrique@example.com",
      });

      render(<UserSettingsDialog open={true} onOpenChange={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Henrique Orsoni")).toBeInTheDocument();
      });

      // Navega para aba de segurança
      const segurancaTab = screen.getByText("Segurança");
      fireEvent.click(segurancaTab);

      const currentPassInput = screen.getByPlaceholderText(/digite sua senha atual/i);
      const newPassInput = screen.getByPlaceholderText(/digite a nova senha/i);
      const submitBtn = screen.getByRole("button", { name: /alterar senha/i });

      fireEvent.change(currentPassInput, { target: { value: "senhaAtual123" } });
      fireEvent.change(newPassInput, { target: { value: "novaSenhaSegura456" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(apiModule.apiRequest).toHaveBeenCalledWith("PUT", "/api/v1/users/123/password", {
          currentPassword: "senhaAtual123",
          newPassword: "novaSenhaSegura456",
        });
      });
    });

    it("permite solicitar troca de e-mail e confirmar com código de 6 dígitos", async () => {
      (apiModule.apiRequest as jest.Mock).mockResolvedValue({
        id: 123,
        name: "Henrique Orsoni",
        email: "henrique@example.com",
      });

      render(<UserSettingsDialog open={true} onOpenChange={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Henrique Orsoni")).toBeInTheDocument();
      });

      const emailTab = screen.getByText("E-mail");
      fireEvent.click(emailTab);

      const newEmailInput = screen.getByPlaceholderText(/novo@exemplo.com/i);
      const requestBtn = screen.getByRole("button", { name: /enviar código de verificação/i });

      fireEvent.change(newEmailInput, { target: { value: "novoemail@example.com" } });
      fireEvent.click(requestBtn);

      await waitFor(() => {
        expect(apiModule.apiRequest).toHaveBeenCalledWith("POST", "/api/v1/users/123/email-change", {
          newEmail: "novoemail@example.com",
        });
      });

      // Passo 2: Digitar token
      await waitFor(() => {
        expect(screen.getByPlaceholderText("123456")).toBeInTheDocument();
      });

      const tokenInput = screen.getByPlaceholderText("123456");
      fireEvent.change(tokenInput, { target: { value: "654321" } });

      const confirmBtn = screen.getByRole("button", { name: /confirmar troca/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(apiModule.apiRequest).toHaveBeenCalledWith("POST", "/api/v1/users/123/email-change/confirm", {
          token: "654321",
        });
      });
    });
  });

  describe("FE-04 & FE-52 - Reordenação de Colunas e Tarefas", () => {
    it("permite reordenar colunas do quadro", async () => {
      const col1: BoardColumn = { id: "col-1", name: "Ideação", sortOrder: 0, cards: [] };
      const col2: BoardColumn = { id: "col-2", name: "Produção", sortOrder: 1, cards: [] };

      useAppStore.setState({
        activeTeamId: "team-1",
        board: {
          teamId: "team-1",
          teamName: "Estúdio",
          columns: [col1, col2],
        },
      });

      await act(async () => {
        await useAppStore.getState().reorderColumns(["col-2", "col-1"]);
      });

      const cols = useAppStore.getState().board?.columns;
      expect(cols?.[0].id).toBe("col-2");
      expect(cols?.[1].id).toBe("col-1");
    });
  });

  describe("FE-26 - Página de Convite de Equipe (/convite)", () => {
    it("carrega dados públicos do convite e permite aceitar quando autenticado", async () => {
      (apiModule.apiRequest as jest.Mock).mockImplementation((method, path) => {
        if (method === "GET" && path.includes("/api/auth/invites/")) {
          return Promise.resolve({
            teamName: "Equipe Alpha",
            role: "CREATOR",
            email: "convidado@example.com",
            invitedByName: "Ana Admin",
            expiresAt: "2026-11-10T00:00:00Z",
          });
        }
        if (method === "POST" && path.includes("/api/v1/invites/")) {
          return Promise.resolve({
            id: 99,
            name: "Equipe Alpha",
            role: "CREATOR",
            membersCount: 3,
            createdAt: "2026-11-03T00:00:00Z",
          });
        }
        return Promise.resolve([]);
      });

      render(<ConviteContent />);

      await waitFor(() => {
        expect(screen.getByText("Equipe Alpha")).toBeInTheDocument();
        expect(screen.getByText("convidado@example.com")).toBeInTheDocument();
      });

      const acceptBtn = screen.getByRole("button", { name: /aceitar convite e acessar/i });
      fireEvent.click(acceptBtn);

      await waitFor(() => {
        expect(apiModule.apiRequest).toHaveBeenCalledWith("POST", "/api/v1/invites/token-convite-123/accept");
      });
    });
  });
});
