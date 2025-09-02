import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import UnifiedPlanInterface from '../components/UnifiedPlanInterface';
import { vortexNeuralConfig } from '../config/planConfigs';

// Mock do Supabase
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [
            {
              id: 'test-survey-id',
              title: 'Pesquisa de Teste',
              current_responses: 10
            }
          ],
          error: null
        }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } },
        error: null
      }))
    }
  }
}));

// Mock do hook useSurveyManager
vi.mock('../hooks/useSurveyManager', () => ({
  useSurveyManager: () => ({
    surveyTitle: '',
    surveyDescription: '',
    questions: [],
    activeSurveys: [
      {
        id: 'test-survey-id',
        title: 'Pesquisa de Teste',
        current_responses: 10
      }
    ],
    isLoading: false,
    setSurveyTitle: vi.fn(),
    setSurveyDescription: vi.fn(),
    addQuestion: vi.fn(),
    removeQuestion: vi.fn(),
    updateQuestion: vi.fn(),
    addOption: vi.fn(),
    removeOption: vi.fn(),
    updateOption: vi.fn(),
    saveSurvey: vi.fn(),
    fetchActiveSurveys: vi.fn(),
    resetForm: vi.fn()
  })
}));

// Mock do VortexNeuralAnalytics
vi.mock('../components/VortexNeuralAnalytics', () => ({
  default: ({ surveyId }: { surveyId: string }) => {
    console.log('🧪 VortexNeuralAnalytics renderizado no teste com surveyId:', surveyId);
    return (
      <div data-testid="vortex-neural-analytics">
        <div data-testid="sentiment-tab">Análise de Sentimento</div>
        <div data-testid="thematic-tab">Análise Temática</div>
        VortexNeuralAnalytics - Survey ID: {surveyId}
      </div>
    );
  }
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('VortexNeuralAnalytics Integration Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('deve renderizar VortexNeuralAnalytics quando pesquisa é selecionada na aba Analytics', async () => {
    console.log('🧪 Iniciando teste de integração do VortexNeuralAnalytics');
    
    renderWithRouter(
      <UnifiedPlanInterface config={vortexNeuralConfig} />
    );

    // Verificar se a interface foi renderizada
    expect(screen.getByText('Vortex Neural')).toBeInTheDocument();
    console.log('✅ Interface UnifiedPlanInterface renderizada');

    // Clicar na aba Analytics
    const analyticsTab = screen.getByRole('tab', { name: /analytics/i });
    fireEvent.click(analyticsTab);
    console.log('✅ Clicou na aba Analytics');

    // Aguardar o carregamento dos dados
    await waitFor(() => {
      expect(screen.getByText(/Selecione uma pesquisa para análise/i)).toBeInTheDocument();
    });
    console.log('✅ Seletor de pesquisa apareceu');

    // Selecionar a pesquisa de teste
    const surveySelect = screen.getByRole('combobox');
    fireEvent.change(surveySelect, { target: { value: 'test-survey-id' } });
    console.log('✅ Pesquisa selecionada');

    // Verificar se o VortexNeuralAnalytics foi renderizado
    await waitFor(() => {
      expect(screen.getByTestId('vortex-neural-analytics')).toBeInTheDocument();
    });
    console.log('✅ VortexNeuralAnalytics renderizado');

    // Verificar se as abas de sentimento e temática estão presentes
    expect(screen.getByTestId('sentiment-tab')).toBeInTheDocument();
    expect(screen.getByTestId('thematic-tab')).toBeInTheDocument();
    console.log('✅ Abas de sentimento e temática encontradas');

    // Verificar se o surveyId foi passado corretamente
    expect(screen.getByText(/Survey ID: test-survey-id/)).toBeInTheDocument();
    console.log('✅ Survey ID passado corretamente');
  });

  test('deve mostrar mensagem quando não há pesquisas com respostas', async () => {
    console.log('🧪 Testando cenário sem pesquisas com respostas');
    
    // Mock para retornar pesquisas sem respostas
    vi.doMock('../hooks/useSurveyManager', () => ({
      useSurveyManager: () => ({
        surveyTitle: '',
        surveyDescription: '',
        questions: [],
        activeSurveys: [
          {
            id: 'empty-survey-id',
            title: 'Pesquisa Vazia',
            current_responses: 0
          }
        ],
        isLoading: false,
        setSurveyTitle: vi.fn(),
        setSurveyDescription: vi.fn(),
        addQuestion: vi.fn(),
        removeQuestion: vi.fn(),
        updateQuestion: vi.fn(),
        addOption: vi.fn(),
        removeOption: vi.fn(),
        updateOption: vi.fn(),
        saveSurvey: vi.fn(),
        fetchActiveSurveys: vi.fn(),
        resetForm: vi.fn()
      })
    }));

    renderWithRouter(
      <UnifiedPlanInterface config={vortexNeuralConfig} />
    );

    // Clicar na aba Analytics
    const analyticsTab = screen.getByRole('tab', { name: /analytics/i });
    fireEvent.click(analyticsTab);

    // Verificar se a mensagem de "nenhuma pesquisa com respostas" aparece
    await waitFor(() => {
      expect(screen.getByText(/Nenhuma pesquisa com respostas/i)).toBeInTheDocument();
    });
    console.log('✅ Mensagem de pesquisas vazias exibida corretamente');
  });
});