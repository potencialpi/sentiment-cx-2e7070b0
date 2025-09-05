import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Question, 
  Survey, 
  questionUtils, 
  validationUtils, 
  surveyDataUtils, 
  handlePlanLimitError 
} from '@/utils/surveyUtils';
import { getUserPlan } from '@/lib/planUtils';
import { validateUserPlanAccess, getPlanLimits, handlePlanError } from '@/lib/planValidation';

interface UseSurveyManagerReturn {
  // Estado
  surveyTitle: string;
  surveyDescription: string;
  questions: Question[];
  activeSurveys: Survey[];
  isLoading: boolean;
  
  // Setters básicos
  setSurveyTitle: (title: string) => void;
  setSurveyDescription: (description: string) => void;
  
  // Funções de manipulação de questões
  addQuestion: () => void;
  removeQuestion: (id: string) => void;
  updateQuestion: (id: string, field: keyof Question, value: string | string[]) => void;
  addOption: (questionId: string) => void;
  removeOption: (questionId: string, optionIndex: number) => void;
  updateOption: (questionId: string, optionIndex: number, value: string) => void;
  
  // Funções de pesquisa
  saveSurvey: () => Promise<void>;
  fetchActiveSurveys: () => Promise<void>;
  
  // Funções utilitárias
  resetForm: () => void;
}

export const useSurveyManager = (): UseSurveyManagerReturn => {
  // Estados
  const [surveyTitle, setSurveyTitle] = useState("");
  const [surveyDescription, setSurveyDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([questionUtils.createNewQuestion()]);
  const [activeSurveys, setActiveSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Funções de manipulação de questões
  const addQuestion = useCallback(() => {
    setQuestions(prev => [...prev, questionUtils.createNewQuestion()]);
  }, []);

  const removeQuestion = useCallback((id: string) => {
    setQuestions(prev => questionUtils.removeQuestion(prev, id));
  }, []);

  const updateQuestion = useCallback((id: string, field: keyof Question, value: string | string[]) => {
    setQuestions(prev => questionUtils.updateQuestion(prev, id, field, value));
  }, []);

  const addOption = useCallback((questionId: string) => {
    setQuestions(prev => questionUtils.addOption(prev, questionId));
  }, []);

  const removeOption = useCallback((questionId: string, optionIndex: number) => {
    setQuestions(prev => questionUtils.removeOption(prev, questionId, optionIndex));
  }, []);

  const updateOption = useCallback((questionId: string, optionIndex: number, value: string) => {
    setQuestions(prev => questionUtils.updateOption(prev, questionId, optionIndex, value));
  }, []);

  // Função para buscar pesquisas ativas
  const fetchActiveSurveys = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive"
        });
        return;
      }

      const { data: surveys, error } = await supabase
        .from('surveys')
        .select(`
          id,
          title,
          description,
          status,
          created_at,
          current_responses,
          max_responses,
          unique_link
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar pesquisas:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar pesquisas ativas",
          variant: "destructive"
        });
        return;
      }

      setActiveSurveys(surveys || []);
    } catch (error) {
      console.error('Erro ao buscar pesquisas:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar pesquisas ativas",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Função para salvar pesquisa
  const saveSurvey = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Validação
      const validationError = validationUtils.validateSurveyData(surveyTitle, questions);
      if (validationError) {
        toast({
          title: "Erro de validação",
          description: validationError,
          variant: "destructive"
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive"
        });
        return;
      }

      // Validação robusta do plano sem exceções
      const planValidation = await validateUserPlanAccess(user.id);
      const limits = getPlanLimits(planValidation.planCode);
      
      // Verificar limite de questões com aviso, mas permitir continuar
      if (questions.length > limits.maxQuestions) {
        toast({
          title: "Limite de questões excedido",
          description: `Seu plano ${limits.planDisplayName} permite apenas ${limits.maxQuestions} questões por pesquisa.`,
          variant: "destructive"
        });
        // Continuar mesmo assim - não bloquear
      }

      // Inserir pesquisa
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .insert({
          title: surveyTitle,
          description: surveyDescription || null,
          user_id: user.id,
          status: 'active',
          max_responses: 1000,
          unique_link: crypto.randomUUID()
        })
        .select()
        .single();

      if (surveyError) {
        const config = { 
          planName: limits.planDisplayName, 
          maxQuestions: limits.maxQuestions, 
          maxSurveysPerMonth: limits.maxSurveysPerMonth 
        };
        handlePlanLimitError(surveyError, config, toast);
        return;
      }

      // Inserir questões
      const questionsToInsert = surveyDataUtils.prepareQuestionsForInsert(questions, surveyData.id);
      
      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) {
        console.error('Erro ao inserir questões:', questionsError);
        toast({
          title: "Erro",
          description: "Falha ao criar questões da pesquisa",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso!",
        description: "Pesquisa criada com sucesso!",
      });

      // Reset do formulário e atualização da lista
      resetForm();
      await fetchActiveSurveys();
      
    } catch (error: any) {
      // Tratamento robusto de erro sem exceções críticas
      const currentUser = (await supabase.auth.getUser()).data.user;
      handlePlanError(error, 'saveSurvey', currentUser?.id);
      
      // Obter limites de forma segura
      const planValidation = await validateUserPlanAccess(currentUser?.id);
      const limits = getPlanLimits(planValidation.planCode);
      
      const config = { 
        planName: limits.planDisplayName, 
        maxQuestions: limits.maxQuestions, 
        maxSurveysPerMonth: limits.maxSurveysPerMonth 
      };
      
      handlePlanLimitError(error, config, toast);
    } finally {
      setIsLoading(false);
    }
  }, [surveyTitle, surveyDescription, questions, fetchActiveSurveys]);

  // Função para resetar o formulário
  const resetForm = useCallback(() => {
    setSurveyTitle("");
    setSurveyDescription("");
    setQuestions([questionUtils.createNewQuestion()]);
  }, []);

  // Carregar pesquisas ativas ao montar o componente
  useEffect(() => {
    fetchActiveSurveys();
  }, [fetchActiveSurveys]);

  return {
    // Estado
    surveyTitle,
    surveyDescription,
    questions,
    activeSurveys,
    isLoading,
    
    // Setters
    setSurveyTitle,
    setSurveyDescription,
    
    // Funções de questões
    addQuestion,
    removeQuestion,
    updateQuestion,
    addOption,
    removeOption,
    updateOption,
    
    // Funções de pesquisa
    saveSurvey,
    fetchActiveSurveys,
    
    // Utilitários
    resetForm
  };
};