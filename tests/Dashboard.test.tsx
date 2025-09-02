import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../src/pages/Dashboard';

// Mock do useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock do Supabase
const mockSupabase = {
  auth: {
    getSession: vi.fn()
  }
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// Mock das funções de plano
const mockGetUserPlan = vi.fn();
const mockGetPlanAdminRoute = vi.fn();

vi.mock('@/lib/planUtils', () => ({
  getUserPlan: mockGetUserPlan,
  getPlanAdminRoute: mockGetPlanAdminRoute
}));

// Wrapper para prover o contexto do Router
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// Mock do console para capturar logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
let consoleLogs: string[] = [];
let consoleErrors: string[] = [];

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogs = [];
    consoleErrors = [];
    
    // Mock console methods
    console.log = vi.fn((...args) => {
      consoleLogs.push(args.join(' '));
    });
    console.error = vi.fn((...args) => {
      consoleErrors.push(args.join(' '));
    });
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('Authentication Flow', () => {
    it('should redirect to login when no session exists', async () => {
      // Mock: sem sessão
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      // Verifica se mostra o loading inicialmente
      expect(screen.getByText('Redirecionando...')).toBeInTheDocument();

      // Aguarda o redirecionamento
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });

      expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1);
      expect(mockGetUserPlan).not.toHaveBeenCalled();
    });

    it('should redirect to correct admin page when session exists', async () => {
      const mockSession = {
        user: { id: 'user-123' },
        access_token: 'token-123'
      };

      // Mock: sessão válida
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Mock: plano do usuário
      mockGetUserPlan.mockResolvedValue('start-quantico');
      mockGetPlanAdminRoute.mockReturnValue('/admin/start-quantico');

      render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      // Verifica se mostra o loading inicialmente
      expect(screen.getByText('Redirecionando...')).toBeInTheDocument();

      // Aguarda o processamento
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin/start-quantico');
      });

      expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1);
      expect(mockGetUserPlan).toHaveBeenCalledWith(mockSupabase, 'user-123');
      expect(mockGetPlanAdminRoute).toHaveBeenCalledWith('start-quantico');
    });

    it('should handle different plan types correctly', async () => {
      const mockSession = {
        user: { id: 'user-456' },
        access_token: 'token-456'
      };

      const testCases = [
        { plan: 'vortex-neural', route: '/admin/vortex-neural' },
        { plan: 'nexus-infinito', route: '/admin/nexus-infinito' },
        { plan: 'start-quantico', route: '/admin/start-quantico' }
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        
        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: mockSession }
        });
        mockGetUserPlan.mockResolvedValue(testCase.plan);
        mockGetPlanAdminRoute.mockReturnValue(testCase.route);

        const { unmount } = render(
          <RouterWrapper>
            <Dashboard />
          </RouterWrapper>
        );

        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith(testCase.route);
        });

        expect(mockGetUserPlan).toHaveBeenCalledWith(mockSupabase, 'user-456');
        expect(mockGetPlanAdminRoute).toHaveBeenCalledWith(testCase.plan);
        
        unmount();
      }
    });
  });

  describe('Error Handling', () => {
    it('should redirect to login on session error', async () => {
      // Mock: erro ao obter sessão
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Session error'));

      render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });

      expect(consoleErrors).toContain('Erro ao redirecionar para dashboard: Error: Session error');
    });

    it('should redirect to login on getUserPlan error', async () => {
      const mockSession = {
        user: { id: 'user-789' },
        access_token: 'token-789'
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });
      mockGetUserPlan.mockRejectedValue(new Error('Plan fetch error'));

      render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });

      expect(consoleErrors).toContain('Erro ao redirecionar para dashboard: Error: Plan fetch error');
    });

    it('should handle navigation error gracefully', async () => {
      const mockSession = {
        user: { id: 'user-error' },
        access_token: 'token-error'
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });
      mockGetUserPlan.mockResolvedValue('start-quantico');
      mockGetPlanAdminRoute.mockReturnValue('/admin/start-quantico');
      
      // Mock navigate para lançar erro
      mockNavigate.mockImplementationOnce(() => {
        throw new Error('Navigation error');
      });

      render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(mockGetUserPlan).toHaveBeenCalled();
      });

      // Verifica se o erro foi capturado
      expect(consoleErrors.some(error => error.includes('Navigation error'))).toBe(true);
    });
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      mockSupabase.auth.getSession.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      // Verifica se o loading está sendo exibido
      const loadingElement = screen.getByText('Redirecionando...');
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement.parentElement).toHaveClass(
        'bg-gradient-to-br',
        'from-slate-100',
        'via-blue-100',
        'to-indigo-100',
        'min-h-screen',
        'flex',
        'items-center',
        'justify-center'
      );
    });

    it('should hide loading after redirect', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      const { container } = render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      // Inicialmente deve mostrar loading
      expect(screen.getByText('Redirecionando...')).toBeInTheDocument();

      // Após o redirecionamento, o componente deve retornar null
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });

      // O container deve estar vazio após o loading
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('Console Logging', () => {
    it('should log plan information correctly', async () => {
      const mockSession = {
        user: { id: 'user-log-test' },
        access_token: 'token-log-test'
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });
      mockGetUserPlan.mockResolvedValue('vortex-neural');
      mockGetPlanAdminRoute.mockReturnValue('/admin/vortex-neural');

      render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin/vortex-neural');
      });

      // Verifica se os logs foram gerados corretamente
      expect(consoleLogs).toContain('Dashboard - Plano encontrado: vortex-neural');
      expect(consoleLogs).toContain('Dashboard - Redirecionando para: /admin/vortex-neural');
    });
  });

  describe('Component Lifecycle', () => {
    it('should call redirectToCorrectAdminPage on mount', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      // Verifica se a função foi chamada
      await waitFor(() => {
        expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle multiple rapid mounts correctly', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      const { unmount: unmount1 } = render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      const { unmount: unmount2 } = render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(2);
      });

      unmount1();
      unmount2();

      // Verifica se não há vazamentos de memória ou chamadas extras
      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null user in session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { 
          session: {
            user: null,
            access_token: 'token-null-user'
          }
        }
      });

      render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('should handle empty plan code', async () => {
      const mockSession = {
        user: { id: 'user-empty-plan' },
        access_token: 'token-empty-plan'
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });
      mockGetUserPlan.mockResolvedValue('');
      mockGetPlanAdminRoute.mockReturnValue('/admin/default');

      render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin/default');
      });

      expect(mockGetPlanAdminRoute).toHaveBeenCalledWith('');
    });

    it('should handle undefined plan code', async () => {
      const mockSession = {
        user: { id: 'user-undefined-plan' },
        access_token: 'token-undefined-plan'
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });
      mockGetUserPlan.mockResolvedValue(undefined);
      mockGetPlanAdminRoute.mockReturnValue('/admin/default');

      render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin/default');
      });

      expect(mockGetPlanAdminRoute).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Performance', () => {
    it('should not cause memory leaks on unmount', async () => {
      mockSupabase.auth.getSession.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ data: { session: null } }), 50)
        )
      );

      const { unmount } = render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      // Desmonta antes da resolução da promise
      unmount();

      // Aguarda um pouco para ver se há chamadas após o unmount
      await new Promise(resolve => setTimeout(resolve, 100));

      // Não deve haver navegação após unmount
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should handle concurrent session checks', async () => {
      let resolveCount = 0;
      mockSupabase.auth.getSession.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolveCount++;
            resolve({ data: { session: null } });
          }, 10);
        })
      );

      // Renderiza múltiplas instâncias
      const { unmount: unmount1 } = render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      const { unmount: unmount2 } = render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(resolveCount).toBe(2);
      });

      unmount1();
      unmount2();
    });
  });
});