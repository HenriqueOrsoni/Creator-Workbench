import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CoursesView } from '@/components/shared/CoursesView';
import { useAppStore, Course, CourseDetail } from '@/store/useAppStore';

describe('Fase 2 - CoursesView Component (Hierarquia Cursos -> Módulos -> Aulas)', () => {
  const mockFetchCourses = jest.fn();
  const mockFetchCourseDetails = jest.fn();
  const mockCreateCourse = jest.fn();
  const mockDeleteCourse = jest.fn();
  const mockCreateCourseModule = jest.fn();
  const mockDeleteCourseModule = jest.fn();
  const mockCreateCourseLesson = jest.fn();
  const mockDeleteCourseLesson = jest.fn();

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
      courses: [mockCourse],
      activeCourse: mockCourseDetail,
      board: null,
      fetchCourses: mockFetchCourses,
      fetchCourseDetails: mockFetchCourseDetails,
      createCourse: mockCreateCourse,
      deleteCourse: mockDeleteCourse,
      createCourseModule: mockCreateCourseModule,
      deleteCourseModule: mockDeleteCourseModule,
      createCourseLesson: mockCreateCourseLesson,
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
});
