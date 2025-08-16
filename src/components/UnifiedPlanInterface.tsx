import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Plus, 
  Trash2, 
  Copy, 
  ExternalLink, 
  Download, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  Calendar, 
  Activity, 
  ArrowLeft, 
  LogOut 
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import AnalyticsDashboard from './AnalyticsDashboard';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'single_choice' | 'multiple_choice' | 'rating';
  options: string[];
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  current_responses: number;
  max_responses: number;
  unique_link: string;
}

interface PlanConfig {
  planName: string;
  planTitle: string;
  planDescription: string;
  maxQuestions: number;
  maxResponses: number;
  maxSurveysPerMonth: number;
  backRoute: string;
  features: {
    analytics: {
      basic: string[];
      advanced: string[];
      charts: string[];
      export: string[];
    };
    sentiment: {
      levels: string[];
      segmentation: string[];
    };
    statistics: {
      basic: string[];
      advanced: string[];
    };
  };
}

interface UnifiedPlanInterfaceProps {
  config: PlanConfig;
}

const UnifiedPlanInterface: React.FC<UnifiedPlanInterfaceProps> = ({ config }) => {
  const navigate = useNavigate();
  const [surveyTitle, setSurveyTitle] = useState("");
  const [surveyDescription, setSurveyDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeSurveys, setActiveSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [surveysLoading, setSurveysLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("create");
  const [selectedSurveyForAnalysis, setSelectedSurveyForAnalysis] = useState('');

  const fetchActiveSurveys = useCallback(async () => {
    setSurveysLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveSurveys(data || []);
    } catch (error) {
      console.error('Error fetching surveys:', error);
      toast({
        title: "Erro ao carregar pesquisas",
        description: "Não foi possível carregar as pesquisas ativas.",
        variant: "destructive",
      });
    } finally {
      setSurveysLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveSurveys();
  }, [fetchActiveSurveys]);

  const addQuestion = () => {
    if (questions.length >= config.maxQuestions) {
      toast({
        title: "Limite atingido",
        description: `Você pode criar no máximo ${config.maxQuestions} questões neste plano.`,
        variant: "destructive",
      });
      return;
    }

    const newQuestion: Question = {
      id: Date.now().toString(),
      text: "",
      type: 'text', // Valor inicial válido para o Select funcionar
      options: []
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof Question, value: string | string[]) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId && q.options.length < 5 
        ? { ...q, options: [...q.options, ""] }
        : q
    ));
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options.filter((_, index) => index !== optionIndex) }
        : q
    ));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options.map((opt, index) => index === optionIndex ? value : opt) }
        : q
    ));
  };

  const validateQuestions = () => {
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
  };

  const saveSurvey = async () => {
    if (!surveyTitle.trim()) {
      toast({
        title: "Erro",
        description: "Título da pesquisa é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos uma questão",
        variant: "destructive"
      });
      return;
    }

    const validationError = validateQuestions();
    if (validationError) {
      toast({
        title: "Erro",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      // Insert survey
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .insert({
          user_id: user.id,
          title: surveyTitle,
          description: surveyDescription,
          max_responses: config.maxResponses,
          unique_link: crypto.randomUUID()
        })
        .select()
        .single();

      if (surveyError) throw surveyError;

      // Insert questions
      const questionsToInsert = questions.map((q, index) => ({
        survey_id: survey.id,
        question_text: q.text,
        question_type: q.type === 'rating' ? 'rating' : q.type,
        question_order: index + 1,
        options: (q.type === 'single_choice' || q.type === 'multiple_choice') ? q.options.filter(opt => opt.trim()) : null
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast({
        title: "Sucesso!",
        description: "Pesquisa criada com sucesso",
      });

      // Reset form
      setSurveyTitle('');
      setSurveyDescription('');
      setQuestions([]);
      fetchActiveSurveys();
      setActiveTab('active');

    } catch (error) {
      console.error('Error saving survey:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar pesquisa",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyLinkToClipboard = (link: string) => {
    const fullLink = `${window.location.origin}/survey/${link}`;
    navigator.clipboard.writeText(fullLink);
    toast({
      title: "Link copiado!",
      description: "Link da pesquisa copiado para a área de transferência.",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const exportData = (format: 'csv' | 'json' | 'parquet') => {
    toast({
      title: `Exportando ${format.toUpperCase()}`,
      description: "A exportação será iniciada em breve.",
    });
  };

  return (
    <div className="min-h-screen bg-brand-bg-gray">
      {/* Header Section - Padrão do Design System */}
      <header className="bg-brand-dark-blue text-brand-white py-6 sm:py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => navigate(config.backRoute)}
                className="bg-brand-dark-blue text-brand-white border-brand-white/20 hover:bg-brand-white/10 text-xs sm:text-sm px-3 py-2 sm:px-4"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Voltar</span>
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={async () => {
                  const { robustLogout } = await import('@/lib/authUtils');
                  await robustLogout(navigate);
                }}
                className="bg-brand-green text-brand-white hover:bg-brand-green/90 border-brand-green text-xs sm:text-sm px-3 py-2 sm:px-4"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Sair</span>
              </Button>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-nav font-semibold mb-2 sm:mb-4">Sentiment CX</h1>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-hero font-bold mb-3 sm:mb-4 flex flex-col sm:flex-row items-center justify-center gap-2">
              <Activity className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
              <span className="text-center">{config.planTitle}</span>
            </h2>
            <p className="text-sm sm:text-base md:text-subtitle text-brand-white/80 max-w-xs sm:max-w-2xl md:max-w-3xl mx-auto px-2 sm:px-0">
              {config.planDescription}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Section - Padrão do Design System */}
      <main className="bg-brand-bg-gray py-4 sm:py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-0 mb-4 sm:mb-6 md:mb-8 h-auto sm:h-10 p-1">
              <TabsTrigger value="create" className="text-xs sm:text-sm py-2 sm:py-1.5 px-2 sm:px-3 h-auto sm:h-8">
                <span className="hidden sm:inline">Criar Pesquisa</span>
                <span className="sm:hidden">Criar</span>
              </TabsTrigger>
              <TabsTrigger value="active" className="text-xs sm:text-sm py-2 sm:py-1.5 px-2 sm:px-3 h-auto sm:h-8">
                <span className="hidden sm:inline">Pesquisas Ativas</span>
                <span className="sm:hidden">Ativas</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2 sm:py-1.5 px-2 sm:px-3 h-auto sm:h-8">
                <span className="hidden sm:inline">Análises Avançadas</span>
                <span className="sm:hidden">Análises</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              <Card className="bg-brand-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-brand-dark-gray">
                    <BarChart3 className="h-5 w-5" />
                    Criar Nova Pesquisa
                  </CardTitle>
                  <CardDescription className="text-brand-dark-gray/70">
                    Crie pesquisas com até {config.maxQuestions} questões e {config.maxResponses === 999999 ? 'respostas ilimitadas' : `${config.maxResponses} respostas`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="survey-title" className="text-xs sm:text-sm font-medium text-brand-dark-gray">
                        Nome da Pesquisa
                      </Label>
                      <Input
                        id="survey-title"
                        placeholder="Ex: Pesquisa de Satisfação Q1 2024"
                        value={surveyTitle}
                        onChange={(e) => setSurveyTitle(e.target.value)}
                        className="bg-white text-sm sm:text-base min-h-[44px] touch-manipulation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="survey-description" className="text-xs sm:text-sm font-medium text-brand-dark-gray">
                        Descrição (Opcional)
                      </Label>
                      <Input
                        id="survey-description"
                        placeholder="Breve descrição da pesquisa"
                        value={surveyDescription}
                        onChange={(e) => setSurveyDescription(e.target.value)}
                        className="bg-white text-sm sm:text-base min-h-[44px] touch-manipulation"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                      <h3 className="text-base sm:text-lg font-semibold text-brand-dark-gray">
                        Questões ({questions.length}/{config.maxQuestions === 999999 ? 'Ilimitadas' : config.maxQuestions})
                      </h3>
                      <Button
                        onClick={addQuestion}
                        className="bg-brand-green hover:bg-brand-green/90 text-brand-white font-medium text-xs sm:text-sm px-3 sm:px-4 py-2 min-h-[44px] touch-manipulation w-full sm:w-auto"
                        disabled={config.maxQuestions !== 999999 && questions.length >= config.maxQuestions}
                      >
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">Adicionar Questão</span>
                        <span className="xs:hidden">Adicionar</span>
                      </Button>
                    </div>

                    {questions.map((question, index) => (
                      <Card key={question.id} className="border-l-4 border-l-brand-green bg-brand-white shadow-sm">
                        <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                          <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-brand-dark-gray text-sm sm:text-base">Questão {index + 1}</h4>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeQuestion(question.id)}
                                className="min-h-[44px] touch-manipulation px-3 py-2"
                              >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`question-${question.id}`} className="text-xs sm:text-sm font-medium text-brand-dark-gray">
                                  Texto da Questão
                                </Label>
                                <Textarea
                                  id={`question-${question.id}`}
                                  placeholder="Digite sua questão aqui..."
                                  value={question.text}
                                  onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                                  className="bg-white min-h-[80px] sm:min-h-[80px] text-sm sm:text-base touch-manipulation resize-none"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`type-${question.id}`} className="text-xs sm:text-sm font-medium text-brand-dark-gray">
                                  Tipo de Resposta
                                </Label>
                                <Select
                                  value={question.type}
                                  onValueChange={(value) => {
                                    updateQuestion(question.id, 'type', value);
                                    if (value === 'single_choice' || value === 'multiple_choice') {
                                      updateQuestion(question.id, 'options', ['Opção 1', 'Opção 2']);
                                    } else {
                                      updateQuestion(question.id, 'options', []);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="mt-1 min-h-[44px] touch-manipulation text-sm sm:text-base">
                                    <SelectValue placeholder="Escolha o tipo de resposta" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover border shadow-md">
                                    <SelectItem value="text">Texto Aberto</SelectItem>
                                    <SelectItem value="rating">Avaliação 1-5 Estrelas</SelectItem>
                                    <SelectItem value="single_choice">Escolha Única</SelectItem>
                                    <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium text-brand-dark-gray">
                                    Opções de Resposta ({question.options.length}/5)
                                  </Label>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addOption(question.id)}
                                    disabled={question.options.length >= 5}
                                    className="bg-brand-green text-brand-white hover:bg-brand-green/90 border-brand-green"
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Adicionar Opção
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  {question.options.map((option, optionIndex) => (
                                    <div key={optionIndex} className="flex items-center space-x-2">
                                      {question.type === 'single_choice' ? (
                                        <RadioGroup value="" className="flex items-center">
                                          <RadioGroupItem value={`option-${optionIndex}`} disabled />
                                        </RadioGroup>
                                      ) : question.type === 'multiple_choice' ? (
                                        <Checkbox disabled />
                                      ) : null}
                                      <Input
                                        placeholder={`Opção ${optionIndex + 1}`}
                                        value={option}
                                        onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                                        className="flex-1 bg-white"
                                      />
                                      {question.options.length > 2 && (
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => removeOption(question.id, optionIndex)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {question.type === 'rating' && (
                              <div className="mt-4">
                                <Label className="text-sm font-medium text-brand-dark-gray mb-3 block">
                                  Prévia da Avaliação por Estrelas:
                                </Label>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                  <p className="text-sm mb-3 text-gray-600">{question.text || "Sua questão aparecerá aqui"}</p>
                                  <StarRating value={0} disabled className="justify-start" />
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-center pt-4 sm:pt-6">
                    <Button
                      onClick={saveSurvey}
                      disabled={isLoading}
                      className="bg-brand-green hover:bg-brand-green/90 hover:shadow-lg text-brand-white font-medium px-6 sm:px-8 py-3 text-base sm:text-lg transition-all duration-300 min-h-[48px] touch-manipulation w-full sm:w-auto max-w-xs sm:max-w-none"
                    >
                      {isLoading ? 'Salvando...' : 'Salvar Pesquisa'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="active" className="space-y-6">
              <Card className="bg-brand-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Pesquisas Ativas
                  </CardTitle>
                  <CardDescription className="text-brand-dark-gray/70">
                    Gerencie suas pesquisas em andamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {surveysLoading ? (
                    <div className="text-center py-8">
                      <p className="text-brand-dark-gray">Carregando pesquisas...</p>
                    </div>
                  ) : activeSurveys.length === 0 ? (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-brand-dark-gray mb-4">Nenhuma pesquisa ativa encontrada.</p>
                      <Button
                        onClick={() => setActiveTab('create')}
                        className="bg-brand-green hover:bg-brand-green/90 text-brand-white"
                      >
                        Criar Primeira Pesquisa
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {activeSurveys.map((survey) => (
                        <Card key={survey.id} className="border-l-4 border-l-brand-green bg-brand-white shadow-sm">
                          <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                            <div className="space-y-3">
                              <h3 className="font-semibold text-brand-dark-gray text-sm sm:text-base line-clamp-2">{survey.title}</h3>
                              <div className="text-xs sm:text-sm text-brand-dark-gray space-y-1">
                                <p><strong>Criada em:</strong> {formatDate(survey.created_at)}</p>
                                <p><strong>Status:</strong> {survey.status}</p>
                                <p><strong>Respostas:</strong> {survey.current_responses}/{survey.max_responses === 999999 ? 'Ilimitado' : survey.max_responses}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyLinkToClipboard(survey.unique_link)}
                                  className="flex-1 border-brand-dark-gray text-brand-dark-gray hover:bg-brand-dark-gray hover:text-brand-white text-xs sm:text-sm py-2 px-3 min-h-[44px] touch-manipulation"
                                >
                                  <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                  <span className="hidden xs:inline">Copiar Link</span>
                                  <span className="xs:hidden">Copiar</span>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card className="bg-brand-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Análises Avançadas
                  </CardTitle>
                  <CardDescription className="text-brand-dark-gray/70">
                    Análises detalhadas das suas pesquisas ativas com respostas
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  {/* Seletor de pesquisa para análise */}
                  {activeSurveys.filter(survey => survey.current_responses > 0).length > 0 ? (
                    <div className="space-y-6">
                      <div className="flex flex-col space-y-4">
                        <label className="text-sm font-medium text-brand-dark-gray">
                          Selecione uma pesquisa para análise:
                        </label>
                        <select
                          value={selectedSurveyForAnalysis}
                          onChange={(e) => setSelectedSurveyForAnalysis(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
                        >
                          <option value="">Escolha uma pesquisa...</option>
                          {activeSurveys
                            .filter(survey => survey.current_responses > 0)
                            .map((survey) => (
                              <option key={survey.id} value={survey.id}>
                                {survey.title} ({survey.current_responses} respostas)
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Dashboard de análise */}
                      {selectedSurveyForAnalysis && (
                        <div className="mt-6">
                          <AnalyticsDashboard surveyId={selectedSurveyForAnalysis} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">
                        Nenhuma pesquisa com respostas
                      </h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Para ver análises avançadas, você precisa ter pelo menos uma pesquisa ativa que tenha recebido respostas.
                      </p>
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h4 className="font-semibold mb-4">Recursos disponíveis no {config.planName}:</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="text-center">
                            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-brand-green" />
                            <h5 className="font-medium text-sm mb-1">Estatísticas</h5>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {config.features.statistics.basic.slice(0, 3).map((stat, index) => (
                                <li key={index}>• {stat}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="text-center">
                            <Activity className="w-8 h-8 mx-auto mb-2 text-brand-green" />
                            <h5 className="font-medium text-sm mb-1">Sentimentos</h5>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {config.features.sentiment.levels.slice(0, 3).map((level, index) => (
                                <li key={index}>• {level}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="text-center">
                            <PieChart className="w-8 h-8 mx-auto mb-2 text-brand-green" />
                            <h5 className="font-medium text-sm mb-1">Gráficos</h5>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {config.features.analytics.charts.slice(0, 3).map((chart, index) => (
                                <li key={index}>• {chart}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default UnifiedPlanInterface;