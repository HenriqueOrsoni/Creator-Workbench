import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CoursesView } from '@/components/shared/CoursesView';
import { useAppStore, Course, CourseDetail } from '@/store/useAppStore';

jest.mock('@/lib/features', () => ({
  FEATURES: { coursePublish: true, courseCsv: true, courseEdit: true },
}));

describe('Fase 2 - CoursesView Component (Hierarquia Cursos -> Módulos -> Aulas)', () => {
  const mockFetchCourses = jest.fn();
  const mockFetchCourseDetails = jest.fn();
  const mockCreateCourse = jest.fn();
  const mockUpdateCourse = jest.fn().mockResolvedValue(true);
  const mockDeleteCourse = jest.fn().mockResolvedValue(true);
  const mockCreateCourseModule = jest.fn();
  const mockUpdateCourseModule = jest.fn().mockResolvedValue(true);
  const mockDeleteCourseModule = jest.fn().mockResolvedValue(true);
  const mockCreateCourseLesson = jest.fn();
  const mockUpdateCourseLesson = jest.fn().mockResolvedValue(true);
  const mockDeleteCourseLesson = jest.fn().mockResolvedValue(true);

  const mockCourse: Course = {
    id: '1',
    teamId: '10',
    title: 'Curso de Next.js & Spring Boot',
    description: 'Aprenda a construir aplicações fullstack',
    modulesCount: 1,
    createdAt: new Date().toISOString(),
  };

  const mockCourseDetail: CourseDetail = {
    ...mockCourse,
    modules: [
      {
        id: 'mod-1',
        courseId: '1',
        title: 'Módulo 1: Setup da Aplicação',
        sortOrder: 0,
        lessons: [
          {
            id: 'les-1',
            moduleId: 'mod-1',
            title: 'Aula 1: Introdução ao Tailwind',
            type: 'VIDEO',
            published: true,
            sortOrder: 0,
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState({
      activeTeam: { id: 't1', name: 'Equipe', role: 'ADMIN', membersCount: 1, createdAt: 'x' },
      courses: [mockCourse],
      activeCourse: mockCourseDetail,
      board: null,
      fetchCourses: mockFetchCourses,
      fetchCourseDetails: mockFetchCourseDetails,
      createCourse: mockCreateCourse,
      updateCourse: mockUpdateCourse,
      deleteCourse: mockDeleteCourse,
      createCourseModule: mockCreateCourseModule,
      updateCourseModule: mockUpdateCourseModule,
      deleteCourseModule: mockDeleteCourseModule,
      createCourseLesson: mockCreateCourseLesson,
      updateCourseLesson: mockUpdateCourseLesson,
      deleteCourseLesson: mockDeleteCourseLesson,
    });
  });

  it('renderiza curso ativo com seus módulos e aulas', () => {
    render(<CoursesView />);

    expect(screen.getAllByText('Curso de Next.js & Spring Boot')[0]).toBeInTheDocument();
    expect(screen.getByText('Módulo 1: Setup da Aplicação')).toBeInTheDocument();
    expect(screen.getByText('Aula 1: Introdução ao Tailwind')).toBeInTheDocument();
  });

  it('permite abrir modal para adicionar novo módulo', async () => {
    render(<CoursesView />);

    const addModuleButton = screen.getByRole('button', { name: /adicionar módulo/i });
    fireEvent.click(addModuleButton);

    expect(screen.getByLabelText(/nome do módulo \*/i)).toBeInTheDocument();
  });

  it('FE-55: permite editar título e descrição do curso', async () => {
    render(<CoursesView />);

    const editCourseBtn = screen.getByRole('button', { name: /editar curso/i });
    fireEvent.click(editCourseBtn);

    const titleInput = screen.getByLabelText(/título do curso/i);
    fireEvent.change(titleInput, { target: { value: 'Curso Avançado de Next.js' } });

    const submitBtn = screen.getByRole('button', { name: /^salvar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateCourse).toHaveBeenCalledWith(
        '1',
        'Curso Avançado de Next.js',
        'Aprenda a construir aplicações fullstack'
      );
    });
  });

  it('FE-55: permite renomear módulo temático', async () => {
    render(<CoursesView />);

    const editModuleBtn = screen.getByRole('button', { name: /renomear módulo/i });
    fireEvent.click(editModuleBtn);

    const moduleInput = screen.getByLabelText(/nome do módulo/i);
    fireEvent.change(moduleInput, { target: { value: 'Módulo 1: Novo Setup' } });

    const submitBtn = screen.getByRole('button', { name: /^salvar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateCourseModule).toHaveBeenCalledWith('1', 'mod-1', 'Módulo 1: Novo Setup');
    });
  });

  it('FE-55: permite editar aula e formato', async () => {
    render(<CoursesView />);

    const editLessonBtn = screen.getByRole('button', { name: /editar aula/i });
    fireEvent.click(editLessonBtn);

    const lessonInput = screen.getByLabelText(/título da aula \*/i);
    fireEvent.change(lessonInput, { target: { value: 'Aula 1: Setup Atualizado' } });

    const submitBtn = screen.getByRole('button', { name: /salvar alterações/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateCourseLesson).toHaveBeenCalledWith(
        '1',
        'mod-1',
        'les-1',
        expect.objectContaining({
          title: 'Aula 1: Setup Atualizado',
          type: 'VIDEO',
        })
      );
    });
  });

  it('BF-15: abre diálogo de confirmação antes de excluir curso', async () => {
    render(<CoursesView />);

    const deleteBtn = screen.getByRole('button', { name: /excluir curso/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByText(/tem certeza que deseja excluir o curso/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /confirmar exclusão/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteCourse).toHaveBeenCalledWith('1');
    });
  });

  it('edição do curso recusada pelo servidor mantém o diálogo aberto', async () => {
    mockUpdateCourse.mockResolvedValueOnce(false);
    render(<CoursesView />);

    fireEvent.click(screen.getByRole('button', { name: 'Editar curso' }));
    fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => expect(mockUpdateCourse).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeInTheDocument();
  });

  describe('M3 - publicação, exportação, ordem e papéis', () => {
    const twoModules: CourseDetail = {
      ...mockCourseDetail,
      modules: [
        {
          id: 'mod-1', courseId: '1', title: 'Módulo A', sortOrder: 0,
          lessons: [
            { id: 'les-1', moduleId: 'mod-1', title: 'Aula 1', type: 'VIDEO', published: true, sortOrder: 0 },
            { id: 'les-2', moduleId: 'mod-1', title: 'Aula 2', type: 'TEXT', published: true, sortOrder: 1 },
          ],
        },
        { id: 'mod-2', courseId: '1', title: 'Módulo B', sortOrder: 1, lessons: [] },
      ],
    };

    it('verificar publicação com problemas mostra cada mensagem do servidor, mesmo de tipo desconhecido, e não publica', async () => {
      const check = jest.fn().mockResolvedValue({
        publishable: false,
        problems: [
          { type: 'INVALID_LINK', ids: [9], titles: ['Aula 1'], message: 'A aula tem um link inválido.' },
          { type: 'TIPO_NOVO', ids: [], titles: [], message: 'Mensagem de um tipo que o front não conhece.' },
        ],
      });
      const publish = jest.fn();
      useAppStore.setState({ checkCoursePublication: check, publishCourse: publish });
      render(<CoursesView />);

      fireEvent.click(screen.getByRole('button', { name: /publicar curso/i }));

      expect(await screen.findByText('A aula tem um link inválido.')).toBeInTheDocument();
      expect(screen.getByText('Mensagem de um tipo que o front não conhece.')).toBeInTheDocument();
      expect(screen.getByText(/2 problemas/i)).toBeInTheDocument();
      expect(check).toHaveBeenCalledWith('1');
      expect(publish).not.toHaveBeenCalled();
    });

    it('curso pronto abre a confirmação e só publica depois de confirmar', async () => {
      const check = jest.fn().mockResolvedValue({ publishable: true, problems: [] });
      const publish = jest.fn().mockResolvedValue(true);
      useAppStore.setState({ checkCoursePublication: check, publishCourse: publish });
      render(<CoursesView />);

      fireEvent.click(screen.getByRole('button', { name: /publicar curso/i }));
      await screen.findByText(/deseja tornar o curso/i);
      expect(publish).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /confirmar publicação/i }));
      await waitFor(() => expect(publish).toHaveBeenCalledWith('1'));
    });

    it('falha na verificação (null) não abre diálogo nem publica', async () => {
      const check = jest.fn().mockResolvedValue(null);
      const publish = jest.fn();
      useAppStore.setState({ checkCoursePublication: check, publishCourse: publish });
      render(<CoursesView />);

      fireEvent.click(screen.getByRole('button', { name: /publicar curso/i }));
      await waitFor(() => expect(check).toHaveBeenCalled());

      expect(screen.queryByText(/deseja tornar o curso/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/não é possível publicar/i)).not.toBeInTheDocument();
      expect(publish).not.toHaveBeenCalled();
    });

    it('curso publicado mostra "Publicado em dd/mm/aaaa" e a ação Despublicar', async () => {
      const unpublish = jest.fn().mockResolvedValue(true);
      useAppStore.setState({
        activeCourse: { ...mockCourseDetail, status: 'PUBLISHED', publishedAt: '2026-11-10T15:00:00' },
        unpublishCourse: unpublish,
      });
      render(<CoursesView />);

      expect(screen.getByText(/publicado em 10\/11\/2026/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /publicar curso/i })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /despublicar/i }));
      await waitFor(() => expect(unpublish).toHaveBeenCalledWith('1'));
    });

    it('curso em rascunho mostra o selo Rascunho', () => {
      useAppStore.setState({ activeCourse: { ...mockCourseDetail, status: 'DRAFT', publishedAt: null } });
      render(<CoursesView />);
      expect(screen.getByText('Rascunho')).toBeInTheDocument();
    });

    it('exportar JSON e CSV chamam a rota do servidor (não há mais exportação local)', () => {
      const exportJson = jest.fn().mockResolvedValue(true);
      const exportCsv = jest.fn().mockResolvedValue(true);
      useAppStore.setState({ exportCourseJson: exportJson, exportCourseCsv: exportCsv });
      render(<CoursesView />);

      fireEvent.click(screen.getByRole('button', { name: /json/i }));
      fireEvent.click(screen.getByRole('button', { name: /csv/i }));

      expect(exportJson).toHaveBeenCalledWith('1');
      expect(exportCsv).toHaveBeenCalledWith('1');
    });

    it('mover módulo e aula manda a nova ordem de ids ao servidor', async () => {
      const reorderModules = jest.fn().mockResolvedValue(true);
      const reorderLessons = jest.fn().mockResolvedValue(true);
      useAppStore.setState({
        activeCourse: twoModules,
        reorderCourseModules: reorderModules,
        reorderCourseLessons: reorderLessons,
      });
      render(<CoursesView />);

      fireEvent.click(screen.getAllByLabelText('Mover módulo para baixo')[0]);
      await waitFor(() => expect(reorderModules).toHaveBeenCalledWith('1', ['mod-2', 'mod-1']));

      fireEvent.click(screen.getAllByLabelText('Mover aula para cima')[1]);
      await waitFor(() => expect(reorderLessons).toHaveBeenCalledWith('1', 'mod-1', ['les-2', 'les-1']));
    });

    it('revisor vê o curso sem editar, reordenar, publicar nem excluir, mas pode exportar', () => {
      useAppStore.setState({
        activeTeam: { id: 't1', name: 'Equipe', role: 'REVIEWER', membersCount: 1, createdAt: 'x' },
        activeCourse: twoModules,
      });
      render(<CoursesView />);

      expect(screen.queryByRole('button', { name: 'Editar curso' })).not.toBeInTheDocument();
      expect(screen.queryByTitle('Renomear módulo')).not.toBeInTheDocument();
      expect(screen.queryByTitle(/Mover módulo/)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/Mover aula/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /publicar curso/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /despublicar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /adicionar módulo/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /json/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument();
    });

    it('revisor não vê Despublicar em curso publicado', () => {
      useAppStore.setState({
        activeTeam: { id: 't1', name: 'Equipe', role: 'REVIEWER', membersCount: 1, createdAt: 'x' },
        activeCourse: { ...mockCourseDetail, status: 'PUBLISHED', publishedAt: '2026-11-10T15:00:00' },
      });
      render(<CoursesView />);
      expect(screen.queryByRole('button', { name: /despublicar/i })).not.toBeInTheDocument();
    });

    it('nova aula envia descrição e link do conteúdo', async () => {
      const create = jest.fn().mockResolvedValue(true);
      useAppStore.setState({ createCourseLesson: create });
      render(<CoursesView />);

      fireEvent.click(screen.getByRole('button', { name: /nova aula/i }));
      fireEvent.change(screen.getByLabelText(/título da aula \*/i), { target: { value: 'Aula nova' } });
      fireEvent.change(screen.getByLabelText(/link do conteúdo/i), { target: { value: 'https://exemplo.com/v' } });
      fireEvent.change(screen.getByLabelText(/descrição da aula/i), { target: { value: 'Resumo da aula' } });
      fireEvent.click(screen.getByRole('button', { name: /salvar aula/i }));

      await waitFor(() => expect(create).toHaveBeenCalledWith(
        '1', 'mod-1', 'Aula nova', 'VIDEO', undefined,
        { description: 'Resumo da aula', contentUrl: 'https://exemplo.com/v' }
      ));
    });

    it('nova aula recusada pelo servidor mantém o diálogo aberto com o que foi digitado', async () => {
      const create = jest.fn().mockResolvedValue(false);
      useAppStore.setState({ createCourseLesson: create });
      render(<CoursesView />);

      fireEvent.click(screen.getByRole('button', { name: /nova aula/i }));
      fireEvent.change(screen.getByLabelText(/título da aula \*/i), { target: { value: 'Aula nova' } });
      fireEvent.click(screen.getByRole('button', { name: /salvar aula/i }));

      await waitFor(() => expect(create).toHaveBeenCalled());
      expect(screen.getByLabelText(/título da aula \*/i)).toHaveValue('Aula nova');
    });

    it('editar aula mostra e envia descrição e link do conteúdo', async () => {
      render(<CoursesView />);
      fireEvent.click(screen.getByRole('button', { name: /editar aula/i }));
      fireEvent.change(screen.getByLabelText(/link do conteúdo/i), { target: { value: 'https://exemplo.com/novo' } });
      fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

      await waitFor(() => expect(mockUpdateCourseLesson).toHaveBeenCalledWith(
        '1', 'mod-1', 'les-1', expect.objectContaining({ contentUrl: 'https://exemplo.com/novo' })
      ));
    });

    it('renomear módulo recusado pelo servidor mantém o campo aberto', async () => {
      mockUpdateCourseModule.mockResolvedValueOnce(false);
      render(<CoursesView />);
      fireEvent.click(screen.getByRole('button', { name: /renomear módulo/i }));
      fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => expect(mockUpdateCourseModule).toHaveBeenCalled());
      expect(screen.getByLabelText(/nome do módulo/i)).toBeInTheDocument();
    });
  });
});
