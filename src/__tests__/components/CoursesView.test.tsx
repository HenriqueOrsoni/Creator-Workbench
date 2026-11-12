import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CoursesView } from '@/components/shared/CoursesView';
import { useAppStore, Course, CourseDetail } from '@/store/useAppStore';

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

    const titleInput = screen.getByLabelText(/título do curso \*/i);
    fireEvent.change(titleInput, { target: { value: 'Curso Avançado de Next.js' } });

    const submitBtn = screen.getByRole('button', { name: /salvar alterações/i });
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

    const moduleInput = screen.getByLabelText(/nome do módulo \*/i);
    fireEvent.change(moduleInput, { target: { value: 'Módulo 1: Novo Setup' } });

    const submitBtn = screen.getByRole('button', { name: /salvar alterações/i });
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
});
