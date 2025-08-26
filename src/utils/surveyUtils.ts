import { toast } from '@/hooks/use-toast';

export interface Question {
  id: string;
  text: string;
  type: 'text' | 'single_choice' | 'multiple_choice' | 'rating';
  options: string[];
}

export interface Survey {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  current_responses: number;
  max_responses: number;
  unique_link: string;
}

// Funções utilitárias para manipulação de questões
export const questionUtils = {
  /**
   * Cria uma nova questão com valores padrão
   */
  createNewQuestion: (): Question => ({
    id: Date.now().toString(),
    text: "",
    type: 'text',
    options: []
  }),

  /**
   * Atualiza uma questão específica em uma lista
   */
  updateQuestion: (questions: Question[], id: string, field: keyof Question, value: string | string[]): Question[] => {
    return questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    );
  },

  /**
   * Remove uma questão da lista
   */
  removeQuestion: (questions: Question[], id: string): Question[] => {
    return questions.filter(q => q.id !== id);
  },

  /**
   * Adiciona uma opção a uma questão de múltipla escolha
   */
  addOption: (questions: Question[], questionId: string): Question[] => {
    return questions.map(q => 
      q.id === questionId && q.options.length < 5 
        ? { ...q, options: [...q.options, ""] }
        : q
    );
  },

  /**
   * Remove uma opção de uma questão de múltipla escolha
   */
  removeOption: (questions: Question[], questionId: string, optionIndex: number): Question[] => {
    return questions.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options.filter((_, index) => index !== optionIndex) }
        : q
    );
  },

  /**
   * Atualiza uma opção específica de uma questão
   */
  updateOption: (questions: Question[], questionId: string, optionIndex: number, value: string): Question[] => {
    return questions.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options.map((opt, index) => index === optionIndex ? value : opt) }
        : q
    );
  }
};

// Funções de validação
export const validationUtils = {
  /**
   * Valida se todas as questões estão preenchidas corretamente
   */
  validateQuestions: (questions: Question[]): string | null => {
    const emptyQuestions = questions.filter(q => !q.text.trim());
    if (emptyQuestions.length > 0) {
      return "Todas as questões devem ter texto";
    }

    const invalidChoiceQuestions = questions.filter(q => 
      (q.type === 'single_choice' || q.type === 'multiple_choice') && 
      (!q.options || q.options.length < 2 || q.options.some(opt => !opt.trim()))
    );
    
    if (invalidChoiceQuestions.length > 0) {
      return "Questões de escolha devem ter pelo menos 2 opções válidas";
    }

    return null;
  },

  /**
   * Valida os dados básicos da pesquisa
   */
  validateSurveyData: (title: string, questions: Question[]): string | null => {
    if (!title.trim()) {
      return "Título da pesquisa é obrigatório";
    }

    if (questions.length === 0) {
      return "Adicione pelo menos uma questão";
    }

    return validationUtils.validateQuestions(questions);
  }
};

// Funções utilitárias para formatação e UI
export const uiUtils = {
  /**
   * Formata uma data para o padrão brasileiro
   */
  formatDate: (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  },

  /**
   * Copia um link para a área de transferência
   */
  copyLinkToClipboard: (link: string, toastFn: typeof toast): void => {
    const fullLink = `${window.location.origin}/survey/${link}`;
    navigator.clipboard.writeText(fullLink);
    toastFn({
      title: "Link copiado!",
      description: "Link da pesquisa copiado para a área de transferência.",
    });
  },

  /**
   * Exibe notificação de exportação
   */
  showExportNotification: (format: 'csv' | 'json' | 'parquet'): void => {
    toast({
      title: `Exportando ${format.toUpperCase()}`,
      description: "A exportação será iniciada em breve.",
    });
  }
};

// Funções para processamento de dados da pesquisa
export const surveyDataUtils = {
  /**
   * Prepara as questões para inserção no banco de dados
   */
  prepareQuestionsForInsert: (questions: Question[], surveyId: string) => {
    return questions.map((q, index) => ({
      survey_id: surveyId,
      question_text: q.text,
      question_type: q.type === 'rating' ? 'rating' : q.type,
      question_order: index + 1,
      options: (q.type === 'single_choice' || q.type === 'multiple_choice') 
        ? q.options.filter(opt => opt.trim()) 
        : null
    }));
  },

  /**
   * Filtra pesquisas que têm respostas
   */
  filterSurveysWithResponses: (surveys: Survey[]): Survey[] => {
    return surveys.filter(survey => survey.current_responses > 0);
  }
};

// Tratamento de erros específicos
export const handlePlanLimitError = (error: any, config: any, toast: any) => {
  if (error.message?.includes("Limite de questões por pesquisa excedido")) {
    toast({
      title: "Limite de questões excedido",
      description: `Seu plano ${config.planName} permite apenas ${config.maxQuestions} questões por pesquisa.`,
      variant: "destructive"
    });
  } else if (error.message?.includes("Limite de pesquisas por mês excedido")) {
    toast({
      title: "Limite de pesquisas excedido",
      description: `Seu plano ${config.planName} permite apenas ${config.maxSurveysPerMonth} pesquisas por mês.`,
      variant: "destructive"
    });
  } else {
    toast({
      title: "Erro",
      description: error.message || "Falha ao criar pesquisa",
      variant: "destructive"
    });
  }
};

// Análise de IA simulada
export const executeAIAnalysis = async (
  analysisKey: string,
  analysisName: string,
  setAnalysisLoading: (key: string | null) => void,
  setAnalysisResults: (updater: (prev: any) => any) => void,
  toast: any
) => {
  setAnalysisLoading(analysisKey);
  try {
    // Simular processamento de IA
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Resultado simulado
    const mockResult = {
      status: 'completed',
      insights: `Análise de ${analysisName} concluída com sucesso`,
      data: {
        confidence: Math.random() * 100,
        recommendations: [`Recomendação baseada em ${analysisName}`]
      }
    };
    
    setAnalysisResults((prev: any) => ({
      ...prev,
      [analysisKey]: mockResult
    }));
    
    toast({
      title: "Análise Concluída",
      description: `${analysisName} foi processada com sucesso.`,
    });
  } catch (error) {
    toast({
      title: "Erro na Análise",
      description: "Não foi possível completar a análise.",
      variant: "destructive",
    });
  } finally {
    setAnalysisLoading(null);
  }
};