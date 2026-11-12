import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";
import { Navbar } from "@/components/shared/Navbar";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { UserSettingsDialog } from "@/components/shared/UserSettingsDialog";
import { ConviteContent } from "@/app/convite/page";
import * as apiModule from "@/lib/api";

// Telas de marcos futuros ficam ligadas aqui para testar o comportamento delas
jest.mock('@/lib/features', () => ({
  FEATURES: {
    materials: true, summary: true, review: true, invites: true, coursePublish: true,
    courseCsv: true, teamManage: true, accountSecurity: true, alerts: true,
  },
}));

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  apiRequest: jest.fn(),
  apiDownload: jest.fn(),
  getCookie: jest.fn(),
  deleteCookie: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const api = apiModule.apiRequest as jest.Mock;
const download = apiModule.apiDownload as jest.Mock;
const T = "/api/v1/teams/team-1";

/** Responde por "MÉTODO caminho"; um Error vira uma requisição que falha com a mensagem do servidor. */
function mockRoutes(routes: Record<string, unknown>) {
  api.mockImplementation((method: string, path: string) => {
    const key = `${method} ${path}`;
    if (!(key in routes)) return Promise.reject(new Error(`Rota inesperada: ${key}`));
    const value = routes[key];
    return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
  });
}

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
    api.mockReset();
    useAppStore.getState().resetStore();
    (apiModule.getCookie as jest.Mock).mockReturnValue("123");
  });

  describe("FE-18 - Alertas de Prazos", () => {
    it("carrega os alertas de prazo da rota GET /alerts do servidor", async () => {
      useAppStore.setState({ activeTeamId: "team-1" });
      mockRoutes({
        [`GET ${T}/alerts`]: [
          { type: "CARD_OVERDUE", cardId: 1, cardTitle: "Videoaula Atrasada", taskId: null, taskTitle: null, dueDate: "2026-10-01", daysLeft: -5 },
          { type: "CARD_DUE_SOON", cardId: 2, cardTitle: "Webinar Próximo", taskId: null, taskTitle: null, dueDate: "2026-11-14", daysLeft: 2 },
        ],
      });

      await act(async () => {
        await useAppStore.getState().fetchAlerts();
      });

      const alerts = useAppStore.getState().alerts;
      expect(alerts).toHaveLength(2);
      expect(alerts[0]).toMatchObject({ type: "CARD_OVERDUE", cardId: "1", cardTitle: "Videoaula Atrasada" });
      expect(alerts[1]).toMatchObject({ type: "CARD_DUE_SOON", cardTitle: "Webinar Próximo" });
    });

    it("quando a rota de alertas falha, não avisa na tela e não calcula alertas no cliente", async () => {
      useAppStore.setState({
        activeTeamId: "team-1",
        board: {
          teamId: "team-1",
          teamName: "Estúdio",
          columns: [{ id: "c", name: "Roteiro", sortOrder: 0, cards: [{
            id: "1", title: "Atrasado", description: "", type: "PROJECT", sortOrder: 0, progress: 0,
            tasksTotal: 0, tasksDone: 0, dueDate: "2020-01-01", createdAt: "2020-01-01T00:00:00Z",
          }] }],
        },
      });
      mockRoutes({ [`GET ${T}/alerts`]: new Error("Rota não encontrada.") });

      await act(async () => {
        await useAppStore.getState().fetchAlerts();
      });

      expect(useAppStore.getState().alerts).toEqual([]);
      // Carga em segundo plano: sem aviso na tela
      expect(toast.error).not.toHaveBeenCalled();
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
    beforeEach(() => {
      useAppStore.setState({ activeTeamId: "team-1" });
    });

    it("usa o resultado do servidor na verificação de publicação ({type, ids, titles, message})", async () => {
      mockRoutes({
        [`GET ${T}/courses/course-1/publication-check`]: {
          publishable: false,
          problems: [
            { type: "EMPTY_MODULE", ids: [1], titles: ["Módulo Vazio"], message: "O módulo \"Módulo Vazio\" não tem aulas." },
            { type: "LESSON_WITHOUT_MATERIAL", ids: [2], titles: ["Aula Teórica"], message: "A aula \"Aula Teórica\" não tem material nem link." },
          ],
        },
      });

      const check = await useAppStore.getState().checkCoursePublication("course-1");

      expect(check?.publishable).toBe(false);
      expect(check?.problems).toHaveLength(2);
      expect(check?.problems.some((p) => p.type === "EMPTY_MODULE")).toBe(true);
      expect(check?.problems[1].titles).toEqual(["Aula Teórica"]);
    });

    it("se a verificação falhar não existe checagem local: devolve null e mostra a mensagem", async () => {
      mockRoutes({ [`GET ${T}/courses/course-1/publication-check`]: new Error("Curso não encontrado.") });

      const check = await useAppStore.getState().checkCoursePublication("course-1");

      expect(check).toBeNull();
      expect(toast.error).toHaveBeenCalledWith("Curso não encontrado.");
    });

    it("exporta o CSV pela rota GET .../export?format=csv (baixado com token)", async () => {
      download.mockResolvedValueOnce(undefined);

      const ok = await useAppStore.getState().exportCourseCsv("course-1");

      expect(ok).toBe(true);
      expect(download).toHaveBeenCalledWith(`${T}/courses/course-1/export?format=csv`, "curso-course-1.csv");
    });

    it("falha na exportação mostra a mensagem do servidor e não informa sucesso", async () => {
      download.mockRejectedValueOnce(new Error("Exportação indisponível."));

      const ok = await useAppStore.getState().exportCourseCsv("course-1");

      expect(ok).toBe(false);
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("Exportação indisponível.");
    });
  });

  describe("FE-10 & FE-11 - Materiais de Apoio e Validação de Upload", () => {
    beforeEach(() => {
      useAppStore.setState({ activeTeamId: "team-1" });
    });

    it("rejeita arquivo com tamanho superior a 20 MB", async () => {
      const bigFile = new File([new ArrayBuffer(21 * 1024 * 1024)], "video-pesado.mp4", { type: "video/mp4" });

      expect(await useAppStore.getState().uploadMaterial("card-1", bigFile)).toBeNull();
      expect(api).not.toHaveBeenCalled();
    });

    it("rejeita arquivo com extensão não permitida", async () => {
      const exeFile = new File(["malware"], "script.exe", { type: "application/x-msdownload" });

      expect(await useAppStore.getState().uploadMaterial("card-1", exeFile)).toBeNull();
      expect(api).not.toHaveBeenCalled();
    });

    it("envia o PDF ao servidor e guarda o material que ele devolveu", async () => {
      mockRoutes({
        [`POST ${T}/cards/card-1/materials`]: {
          id: 5, cardId: "card-1", fileName: "apostila.pdf", contentType: "application/pdf", sizeBytes: 11,
          uploadedBy: { userId: 1, name: "Ana" }, createdAt: "2026-11-12T10:00:00Z", downloadUrl: `${T}/materials/5/download`,
        },
      });
      const pdfFile = new File(["pdf content"], "apostila.pdf", { type: "application/pdf" });

      const result = await useAppStore.getState().uploadMaterial("card-1", pdfFile);

      expect(result?.id).toBe("5");
      expect(result?.fileName).toBe("apostila.pdf");
      expect(useAppStore.getState().cardMaterials["card-1"]).toHaveLength(1);
    });

    it("falha no upload não cria material local nem mensagem de sucesso", async () => {
      mockRoutes({ [`POST ${T}/cards/card-1/materials`]: new Error("Tipo de arquivo não permitido.") });
      const pdfFile = new File(["pdf content"], "apostila.pdf", { type: "application/pdf" });

      expect(await useAppStore.getState().uploadMaterial("card-1", pdfFile)).toBeNull();
      expect(useAppStore.getState().cardMaterials["card-1"]).toBeUndefined();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("Tipo de arquivo não permitido.");
    });
  });

  describe("FE-17 - Resumo Automático com IA", () => {
    beforeEach(() => {
      useAppStore.setState({ activeTeamId: "team-1" });
    });

    it("guarda o resumo gerado pelo servidor", async () => {
      mockRoutes({
        [`POST ${T}/cards/c-100/summary`]: { cardId: 100, summary: "Resumo gerado a partir do roteiro.", generatedAt: "2026-11-12T10:00:00Z", basedOn: "SCRIPT" },
      });

      const summary = await useAppStore.getState().generateCardSummary("c-100");

      expect(summary?.summary).toBe("Resumo gerado a partir do roteiro.");
      expect(summary?.basedOn).toBe("SCRIPT");
      expect(useAppStore.getState().cardSummaries["c-100"]).toBeDefined();
    });

    it("se o servidor recusar (ex.: menos de 100 palavras) não inventa resumo", async () => {
      mockRoutes({ [`POST ${T}/cards/c-100/summary`]: new Error("Dados insuficientes para gerar o resumo.") });

      expect(await useAppStore.getState().generateCardSummary("c-100")).toBeNull();
      expect(useAppStore.getState().cardSummaries["c-100"]).toBeUndefined();
      expect(toast.success).not.toHaveBeenCalled();
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

  describe("FE-04 & FE-52 - Reordenação de Colunas", () => {
    const board = (ids: string[]) => ({
      teamId: "team-1",
      teamName: "Estúdio",
      columns: ids.map((id, i) => ({ id, name: id === "1" ? "Ideação" : "Produção", sortOrder: i, cards: [] })),
    });

    beforeEach(() => {
      useAppStore.setState({ activeTeamId: "team-1" });
    });

    it("reordena pelo servidor: o quadro só muda com a resposta da API", async () => {
      mockRoutes({ [`GET ${T}/board`]: board(["1", "2"]) });
      await useAppStore.getState().fetchBoard();
      mockRoutes({
        [`PUT ${T}/columns/order`]: [],
        [`GET ${T}/board`]: board(["2", "1"]),
      });

      let ok = false;
      await act(async () => {
        ok = await useAppStore.getState().reorderColumns(["2", "1"]);
      });

      expect(ok).toBe(true);
      expect(api).toHaveBeenCalledWith("PUT", `${T}/columns/order`, { columnIds: [2, 1] });
      expect(useAppStore.getState().board?.columns.map((c) => c.id)).toEqual(["2", "1"]);
    });

    it("com erro (403) a ordem não muda e a mensagem é exibida", async () => {
      mockRoutes({ [`GET ${T}/board`]: board(["1", "2"]) });
      await useAppStore.getState().fetchBoard();

      mockRoutes({ [`PUT ${T}/columns/order`]: new Error("Apenas o Administrador pode reordenar colunas.") });
      let ok = true;
      await act(async () => {
        ok = await useAppStore.getState().reorderColumns(["2", "1"]);
      });

      expect(ok).toBe(false);
      expect(useAppStore.getState().board?.columns.map((c) => c.id)).toEqual(["1", "2"]);
      expect(toast.error).toHaveBeenCalledWith("Apenas o Administrador pode reordenar colunas.");
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
