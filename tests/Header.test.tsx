import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from '../src/components/Header';

// Mock do useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Wrapper para prover o contexto do Router
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the header with correct structure', () => {
      render(
        <RouterWrapper>
          <Header />
        </RouterWrapper>
      );

      // Verifica se o header está presente
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('bg-hero', 'relative', 'overflow-hidden');
    });

    it('should render the logo and brand name', () => {
      render(
        <RouterWrapper>
          <Header />
        </RouterWrapper>
      );

      // Verifica o logo "S"
      const logo = screen.getByText('S');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveClass('text-white', 'font-bold', 'text-lg');

      // Verifica o título "Sentiment CX"
      const sentimentText = screen.getByText('Sentiment');
      const cxText = screen.getByText('CX');
      
      expect(sentimentText).toBeInTheDocument();
      expect(cxText).toBeInTheDocument();
      expect(cxText).toHaveClass('text-brand-green');
    });

    it('should render navigation buttons', () => {
      render(
        <RouterWrapper>
          <Header />
        </RouterWrapper>
      );

      // Verifica se os botões estão presentes
      const loginButton = screen.getByRole('button', { name: /login/i });
      const supportButton = screen.getByRole('button', { name: /suporte/i });

      expect(loginButton).toBeInTheDocument();
      expect(supportButton).toBeInTheDocument();

      // Verifica as classes dos botões
      expect(loginButton).toHaveClass('btn-gradient', 'glow-effect');
      expect(supportButton).toHaveClass('btn-gradient', 'glow-effect');
    });

    it('should have correct layout structure', () => {
      render(
        <RouterWrapper>
          <Header />
        </RouterWrapper>
      );

      // Verifica a estrutura de layout
      const gradientOverlay = screen.getByRole('banner').querySelector('.absolute.inset-0');
      expect(gradientOverlay).toBeInTheDocument();
      expect(gradientOverlay).toHaveClass(
        'bg-gradient-to-r',
        'from-transparent',
        'via-white/5',
        'to-transparent'
      );

      // Verifica o container principal
      const mainContainer = screen.getByRole('banner').querySelector('.max-w-7xl');
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass('mx-auto', 'flex', 'justify-between', 'items-center');
    });
  });

  describe('Navigation', () => {
    it('should navigate to login when login button is clicked', () => {
      render(
        <RouterWrapper>
          <Header />
        </RouterWrapper>
      );

      const loginButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(loginButton);

      expect(mockNavigate).toHaveBeenCalledWith('/login');
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('should navigate to support when support button is clicked', () => {
      render(
        <RouterWrapper>
          <Header />
        </RouterWrapper>
      );

      const supportButton = screen.getByRole('button', { name: /suporte/i });
      fireEvent.click(supportButton);

      expect(mockNavigate).toHaveBeenCalledWith('/support');
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple button clicks correctly', () => {
      render(
        <RouterWrapper>
          <Header />
        </RouterWrapper>
      );

      const loginButton = screen.getByRole('button', { name: /login/i });
      const supportButton = screen.getByRole('button', { name: /suporte/i });

      // Clica no botão de login
      fireEvent.click(loginButton);
      expect(mockNavigate).toHaveBeenCalledWith('/login');

      // Clica no botão de suporte
      fireEvent.click(supportButton);
      expect(mockNavigate).toHaveBeenCalledWith('/support');

      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(
        <RouterWrapper>
          <Header />
        </RouterWrapper>
      );

      // Verifica se usa a tag header semântica
      const header = screen.getByRole('banner');
      expect(header.tagName).toBe('HEADER');

      // Verifica se os botões são acessíveis
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      
      buttons.forEach(button => {
        expect(button).toBeVisible();
        expect(button).not.toHaveAttribute('disabled');
      });
    });

    it('should have proper heading structure', () => {
      render(
        <RouterWrapper>
          <Header />
        </RouterWrapper>
      );

      // Verifica se o título principal está presente
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Sentiment CX');
    });

    it('should be keyboard accessible', () => {
      render(
        <RouterWrapper>
          <Header />
        </RouterWrapper>
      );

      const loginButton = screen.getByRole('button', { name: /login/i });
      const supportButton = screen.getByRole('button', { name: /suporte/i });

      // Verifica se os botões podem receber foco
      loginButton.focus();
      expect(loginButton).toHaveFocus();

      supportButton.focus();
      expect(supportButton).toHaveFocus();
    });
  });

  describe('Styling', () => {
    it('should apply correct CSS classes to main elements', () => {
      render(
        <RouterWrapper>
          <Header />
        </RouterWrapper>
      );

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('bg-hero', 'relative', 'overflow-hidden');

      // Verifica o container do logo
      const logoContainer = screen.getByText('S').parentElement;
      expect(logoContainer).toHaveClass(
        'w-10',
        'h-10',
        'bg-gradient-accent',
        'rounded-xl',
        'flex',
        'items-center',
        'justify-center'
      );

      // Verifica o título
      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveClass('text-3xl', 'font-bold', 'text-white', 'tracking-tight');
    });

    it('should have proper button styling', () => {
      render(
        <RouterWrapper>
          <Header />
        </RouterWrapper>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('btn-gradient', 'glow-effect');
      });
    });
  });

  describe('Component Integration', () => {
    it('should render correctly with router context', () => {
      // Este teste verifica se o componente renderiza corretamente com router context
      render(
        <RouterWrapper>
          <Header />
        </RouterWrapper>
      );
      
      expect(screen.getByText('Sentiment')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /suporte/i })).toBeInTheDocument();
    });

    it('should maintain state across re-renders', () => {
      const { rerender } = render(
        <RouterWrapper>
          <Header />
        </RouterWrapper>
      );

      // Verifica se os elementos permanecem após re-render
      expect(screen.getByText('Sentiment')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();

      rerender(
        <RouterWrapper>
          <Header />
        </RouterWrapper>
      );

      // Elementos ainda devem estar presentes
      expect(screen.getByText('Sentiment')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid button clicks', () => {
      render(
        <RouterWrapper>
          <Header />
        </RouterWrapper>
      );

      const loginButton = screen.getByRole('button', { name: /login/i });
      
      // Simula cliques rápidos
      fireEvent.click(loginButton);
      fireEvent.click(loginButton);
      fireEvent.click(loginButton);

      expect(mockNavigate).toHaveBeenCalledTimes(3);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should maintain functionality after navigation calls', () => {
      render(
        <RouterWrapper>
          <Header />
        </RouterWrapper>
      );

      const loginButton = screen.getByRole('button', { name: /login/i });
      const supportButton = screen.getByRole('button', { name: /suporte/i });

      // Primeira navegação
      fireEvent.click(loginButton);
      expect(mockNavigate).toHaveBeenCalledWith('/login');

      // Segunda navegação deve ainda funcionar
      fireEvent.click(supportButton);
      expect(mockNavigate).toHaveBeenCalledWith('/support');

      // Terceira navegação
      fireEvent.click(loginButton);
      expect(mockNavigate).toHaveBeenCalledWith('/login');

      expect(mockNavigate).toHaveBeenCalledTimes(3);
    });
  });
});