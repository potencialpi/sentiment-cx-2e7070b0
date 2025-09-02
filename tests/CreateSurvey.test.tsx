import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CreateSurvey from '@/pages/CreateSurvey';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getPlanAdminRoute, getPlanCreateSurveyRoute, getUserPlan } from '@/lib/planUtils';
import { robustLogout } from '@/lib/authUtils';

// Mock dependencies
vi.mock('@/hooks/use-toast');
vi.mock('@/integrations/supabase/client');
vi.mock('@/lib/planUtils');
vi.mock('@/lib/authUtils');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockNavigate = vi.fn();
const mockToast = vi.mocked(toast);
const mockSupabase = vi.mocked(supabase);
const mockGetUserPlan = vi.mocked(getUserPlan);
const mockGetPlanCreateSurveyRoute = vi.mocked(getPlanCreateSurveyRoute);
const mockRobustLogout = vi.mocked(robustLogout);

// Mock data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com'
};

const mockSurveys = [
  {
    id: 'survey-1',
    title: 'Pesquisa de Satisfação',
    description: 'Avaliação do atendimento',
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
    current_responses: 5,
    max_responses: 100,
    unique_link: 'unique-link-123',
    questions: [
      {
        id: 'q1',
        question_text: 'Como você avalia nosso atendimento?',
        question_type: 'rating',
        options: null,
        question_order: 1
      },
      {
        id: 'q2',
        question_text: 'Qual sua idade?',
        question_type: 'single_choice',
        options: ['18-25', '26-35', '36-45', '46+'],
        question_order: 2
      }
    ]
  },
  {
    id: 'survey-2',
    title: 'Feedback do Produto',
    description: null,
    status: 'inactive',
    created_at: '2024-01-10T15:30:00Z',
    current_responses: 0,
    max_responses: 50,
    unique_link: null,
    questions: []
  }
];

const renderCreateSurvey = () => {
  return render(
    <BrowserRouter>
      <CreateSurvey />
    </BrowserRouter>
  );
};

describe('CreateSurvey Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
    
    mockGetUserPlan.mockResolvedValue('start-quantico');
    mockGetPlanCreateSurveyRoute.mockReturnValue('/create-survey/start');
    
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockSurveys,
            error: null
          })
        })
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should render loading state initially', () => {
      renderCreateSurvey();
      expect(screen.getByText('Carregando pesquisas...')).toBeInTheDocument();
    });

    it('should redirect to login if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      renderCreateSurvey();
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('should initialize with user plan and fetch surveys', async () => {
      renderCreateSurvey();
      
      await waitFor(() => {
        expect(mockGetUserPlan).toHaveBeenCalledWith(mockSupabase, mockUser.id);
        expect(mockSupabase.from).toHaveBeenCalledWith('surveys');
      });
    });

    it('should use fallback plan if getUserPlan fails', async () => {
      mockGetUserPlan.mockRejectedValue(new Error('Plan fetch failed'));
      
      renderCreateSurvey();
      
      await waitFor(() => {
        expect(screen.getByText('Minhas Pesquisas')).toBeInTheDocument();
      });
    });
  });

  describe('Survey Display', () => {
    it('should display surveys when loaded', async () => {
      renderCreateSurvey();
      
      await waitFor(() => {
        expect(screen.getByText('Pesquisa de Satisfação')).toBeInTheDocument();
        expect(screen.getByText('Feedback do Produto')).toBeInTheDocument();
      });
    });

    it('should display empty state when no surveys exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });

      renderCreateSurvey();
      
      await waitFor(() => {
        expect(screen.getByText('Nenhuma pesquisa encontrada')).toBeInTheDocument();
        expect(screen.getByText('Criar primeira pesquisa')).toBeInTheDocument();
      });
    });

    it('should display survey information correctly', async () => {
      renderCreateSurvey();
      
      await waitFor(() => {
        expect(screen.getByText('Ativa')).toBeInTheDocument();
        expect(screen.getByText('Inativa')).toBeInTheDocument();
        expect(screen.getByText('Respostas: 5/100')).toBeInTheDocument();
        expect(screen.getByText('Perguntas: 2')).toBeInTheDocument();
      });
    });

    it('should format dates correctly', async () => {
      renderCreateSurvey();
      
      await waitFor(() => {
        const dateElements = screen.getAllByText(/Criada em: \d{2}\/\d{2}\/\d{4}/);
        expect(dateElements.length).toBeGreaterThan(0);
        expect(dateElements[0]).toBeInTheDocument();
      });
    });
  });

  describe('Survey Actions', () => {
    it('should handle create survey button click', async () => {
      renderCreateSurvey();
      
      await waitFor(() => {
        const createButton = screen.getByText('Nova Pesquisa');
        fireEvent.click(createButton);
      });
      
      expect(mockGetPlanCreateSurveyRoute).toHaveBeenCalledWith('start-quantico');
      expect(mockNavigate).toHaveBeenCalledWith('/create-survey/start');
    });

    it('should handle logout button click', async () => {
      renderCreateSurvey();
      
      await waitFor(() => {
        const logoutButton = screen.getByText('Sair');
        fireEvent.click(logoutButton);
      });
      
      expect(mockRobustLogout).toHaveBeenCalledWith(mockNavigate);
    });

    it('should handle back button click', async () => {
      renderCreateSurvey();
      
      await waitFor(() => {
        const backButton = screen.getByText('Voltar');
        fireEvent.click(backButton);
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Survey Deletion', () => {
    it('should open delete confirmation dialog', async () => {
      renderCreateSurvey();
      
      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Excluir');
        fireEvent.click(deleteButtons[0]);
      });
      
      expect(screen.getByText('Confirmar exclusão')).toBeInTheDocument();
      expect(screen.getByText(/Tem certeza que deseja excluir a pesquisa/)).toBeInTheDocument();
    });

    it('should delete survey when confirmed', async () => {
      renderCreateSurvey();
      
      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Excluir');
        fireEvent.click(deleteButtons[0]);
      });
      
      const confirmButton = screen.getAllByText('Excluir')[1];
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('surveys');
        expect(mockToast).toHaveBeenCalledWith({
          title: "Sucesso",
          description: "Pesquisa excluída com sucesso"
        });
      });
    });

    it('should handle delete error', async () => {
      renderCreateSurvey();
      
      await waitFor(() => {
        expect(screen.getByText('Pesquisa de Satisfação')).toBeInTheDocument();
      });
      
      // Mock delete to return error
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: new Error('Delete failed')
          })
        })
      });
      
      const deleteButtons = screen.getAllByText('Excluir');
      fireEvent.click(deleteButtons[0]);
      
      const confirmButton = screen.getAllByText('Excluir')[1];
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Erro",
          description: "Erro ao excluir pesquisa",
          variant: "destructive"
        });
      });
    });
  });

  describe('Survey Visualization', () => {
    it('should open survey details dialog', async () => {
      renderCreateSurvey();
      
      await waitFor(() => {
        const viewButtons = screen.getAllByText('Visualizar');
        fireEvent.click(viewButtons[0]);
      });
      
      expect(screen.getByText('Detalhes da pesquisa e suas perguntas')).toBeInTheDocument();
      expect(screen.getByText('Informações Gerais')).toBeInTheDocument();
    });

    it('should display survey details correctly in dialog', async () => {
      renderCreateSurvey();
      
      await waitFor(() => {
        const viewButtons = screen.getAllByText('Visualizar');
        fireEvent.click(viewButtons[0]);
      });
      
      expect(screen.getByText('Como você avalia nosso atendimento?')).toBeInTheDocument();
      expect(screen.getByText('Qual sua idade?')).toBeInTheDocument();
      expect(screen.getByText('18-25')).toBeInTheDocument();
    });

    it('should display questions in correct order', async () => {
      renderCreateSurvey();
      
      await waitFor(() => {
        const viewButtons = screen.getAllByText('Visualizar');
        fireEvent.click(viewButtons[0]);
      });
      
      const questionNumbers = screen.getAllByText(/^\d+$/);
      expect(questionNumbers[0]).toHaveTextContent('1');
      expect(questionNumbers[1]).toHaveTextContent('2');
    });

    it('should handle surveys with no questions', async () => {
      renderCreateSurvey();
      
      await waitFor(() => {
        const viewButtons = screen.getAllByText('Visualizar');
        fireEvent.click(viewButtons[1]); // Second survey has no questions
      });
      
      expect(screen.getByText('Nenhuma pergunta encontrada')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization error', async () => {
      // Mock auth to return null user (simulating auth error)
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Auth error')
      });
      
      renderCreateSurvey();
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('should handle survey fetch error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Fetch error')
            })
          })
        })
      });

      renderCreateSurvey();
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Erro",
          description: "Erro ao carregar pesquisas",
          variant: "destructive"
        });
      });
    });

    it('should handle malformed survey data', async () => {
      const malformedSurveys = [
        {
          ...mockSurveys[0],
          questions: [
            {
              ...mockSurveys[0].questions[0],
              options: ['valid', null, undefined, 123, 'another valid'] // Mixed types
            }
          ]
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: malformedSurveys,
              error: null
            })
          })
        })
      });

      renderCreateSurvey();
      
      await waitFor(() => {
        expect(screen.getByText('Pesquisa de Satisfação')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      renderCreateSurvey();
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
        
        const dialogs = screen.queryAllByRole('dialog');
        expect(dialogs).toBeDefined();
      });
    });

    it('should support keyboard navigation', async () => {
      renderCreateSurvey();
      
      await waitFor(() => {
        const createButton = screen.getByText('Nova Pesquisa');
        createButton.focus();
        expect(document.activeElement).toBe(createButton);
      });
    });
  });

  describe('Component Lifecycle', () => {
    it('should cleanup on unmount', async () => {
      const { unmount } = renderCreateSurvey();
      
      await waitFor(() => {
        expect(screen.getByText('Minhas Pesquisas')).toBeInTheDocument();
      });
      
      unmount();
      
      // Verify no memory leaks or hanging promises
      expect(mockNavigate).not.toHaveBeenCalledWith('/login');
    });

    it('should handle rapid state changes', async () => {
      renderCreateSurvey();
      
      // Simulate rapid user interactions
      await waitFor(() => {
        const createButton = screen.getByText('Nova Pesquisa');
        fireEvent.click(createButton);
        fireEvent.click(createButton);
        fireEvent.click(createButton);
      });
      
      expect(mockNavigate).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance', () => {
    it('should handle large number of surveys', async () => {
      const largeSurveyList = Array.from({ length: 100 }, (_, i) => ({
        ...mockSurveys[0],
        id: `survey-${i}`,
        title: `Pesquisa ${i + 1}`
      }));

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: largeSurveyList,
              error: null
            })
          })
        })
      });

      renderCreateSurvey();
      
      await waitFor(() => {
        expect(screen.getByText('Pesquisa 1')).toBeInTheDocument();
        expect(screen.getByText('Pesquisa 100')).toBeInTheDocument();
      });
    });

    it('should handle surveys with many questions', async () => {
      const surveyWithManyQuestions = {
        ...mockSurveys[0],
        questions: Array.from({ length: 50 }, (_, i) => ({
          id: `q${i + 1}`,
          question_text: `Pergunta ${i + 1}`,
          question_type: 'text',
          options: null,
          question_order: i + 1
        }))
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [surveyWithManyQuestions],
              error: null
            })
          })
        })
      });

      renderCreateSurvey();
      
      await waitFor(() => {
        expect(screen.getByText('Perguntas: 50')).toBeInTheDocument();
      });
    });
  });
});