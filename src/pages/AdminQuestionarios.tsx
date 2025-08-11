import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StarRating } from '@/components/ui/star-rating';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, BarChart3, Download, Eye, ExternalLink, Calendar, Users, LogOut } from 'lucide-react';
import RealTimeCharts from '@/components/RealTimeCharts';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'rating' | 'single_choice' | 'multiple_choice';
  options?: string[];
}

interface PreviewData {
  questionText: string;
  type: string;
  options?: string[];
  sampleData?: { label: string; value: number }[];
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  status: string;
  current_responses: number;
  max_responses: number;
  created_at: string;
  unique_link?: string;
}

const AdminQuestionarios = () => {
  const navigate = useNavigate();
  const [surveyTitle, setSurveyTitle] = useState('');
  const [surveyDescription, setSurveyDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', text: '', type: 'text' }
  ]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeSurveys, setActiveSurveys] = useState<Survey[]>([]);
  const [surveysLoading, setSurveysLoading] = useState(false);

  const fetchActiveSurveys = useCallback(async () => {
    setSurveysLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data: surveys, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setActiveSurveys(surveys || []);
    } catch (error) {
      console.error('Error fetching surveys:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar pesquisas ativas",
        variant: "destructive"
      });
    } finally {
      setSurveysLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchActiveSurveys();
  }, [fetchActiveSurveys]);

  const addQuestion = () => {
    if (questions.length >= 5) {
      toast({
        title: "Limite Atingido",
        description: "Máximo de 5 questões permitidas no plano Start Quântico",
        variant: "destructive"
      });
      return;
    }

    const newQuestion: Question = {
      id: Date.now().toString(),
      text: '',
      type: 'text'
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length <= 1) {
      toast({
        title: "Erro",
        description: "É necessário ter pelo menos uma questão",
        variant: "destructive"
      });
      return;
    }
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: string, value: string | string[]) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const addOption = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.options && question.options.length >= 5) {
      toast({
        title: "Limite Atingido",
        description: "Máximo de 5 opções permitidas",
        variant: "destructive"
      });
      return;
    }

    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { ...q, options: [...(q.options || []), ''] }
        : q
    ));
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options?.filter((_, index) => index !== optionIndex) }
        : q
    ));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            options: q.options?.map((option, index) => 
              index === optionIndex ? value : option
            )
          }
        : q
    ));
  };

  const generateSampleData = (question: Question) => {
    if (question.type === 'single_choice' || question.type === 'multiple_choice') {
      return question.options?.map(option => ({
        label: option,
        value: Math.floor(Math.random() * 50) + 1,
        percentage: (Math.random() * 100).toFixed(1)
      })) || [];
    }
    return [];
  };

  const exportData = async (format: 'csv' | 'json' | 'parquet') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive"
        });
        return;
      }

      // Buscar dados das pesquisas
      const { data: surveys, error: surveysError } = await supabase
        .from('surveys')
        .select('*')
        .eq('user_id', user.id);

      if (surveysError) throw surveysError;

      // Buscar questões
      const surveyIds = surveys.map(s => s.id);
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('survey_id', surveyIds);

      if (questionsError) throw questionsError;

      // Buscar respostas
      const questionIds = questions.map(q => q.id);
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select('*')
        .in('question_id', questionIds);

      if (responsesError) throw responsesError;

      const exportData = {
        timestamp: new Date().toISOString(),
        user_id: user.id,
        total_surveys: surveys.length,
        total_questions: questions.length,
        total_responses: responses.length,
        surveys: surveys.map(survey => {
          const surveyQuestions = questions.filter(q => q.survey_id === survey.id);
          const surveyResponses = responses.filter(r => 
            surveyQuestions.some(q => q.id === r.question_id)
          );
          
          return {
            id: survey.id,
            title: survey.title,
            description: survey.description,
            status: survey.status,
            created_at: survey.created_at,
            current_responses: survey.current_responses,
            max_responses: survey.max_responses,
            questions: surveyQuestions.map(question => {
              const questionResponses = responses.filter(r => r.question_id === question.id);
              return {
                ...question,
                responses: questionResponses,
                response_count: questionResponses.length
              };
            })
          };
        })
      };

      if (format === 'csv') {
        // Converter para CSV com dados mais detalhados
        const csvRows = [
          'Survey ID,Survey Title,Survey Description,Survey Status,Survey Created,Question ID,Question Text,Question Type,Response ID,Response Text,Response Rating,Response Choices,Response Created,Sentiment Score,Sentiment Label',
          ...exportData.surveys.flatMap(survey => 
            survey.questions.flatMap(question => 
              question.responses.length > 0 
                ? question.responses.map(response => 
                    `"${survey.id}","${survey.title}","${survey.description || ''}","${survey.status}","${survey.created_at}","${question.id}","${question.question_text}","${question.question_type}","${response.id}","${typeof response.response_value === 'string' ? response.response_value : JSON.stringify(response.response_value || '')}","","${Array.isArray(response.response_value) ? JSON.stringify(response.response_value) : ''}","${response.created_at}","",""`
                  )
                : [`"${survey.id}","${survey.title}","${survey.description || ''}","${survey.status}","${survey.created_at}","${question.id}","${question.question_text}","${question.question_type}","","","","","","",""`]
            )
          )
        ];
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `survey-data-complete-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      } else if (format === 'json') {
        // Exportar como JSON
        const jsonContent = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `survey-data-complete-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      } else if (format === 'parquet') {
        // Simular exportação Parquet (em produção seria usando uma biblioteca como parquetjs)
        const parquetData = {
          ...exportData,
          format: 'parquet',
          note: 'Formato Parquet simulado - em produção seria um arquivo binário otimizado'
        };
        const jsonContent = JSON.stringify(parquetData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `survey-data-parquet-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      }

      toast({
        title: "Exportação Concluída",
        description: `Dados exportados em formato ${format.toUpperCase()} com ${exportData.total_responses} respostas`
      });

    } catch (error) {
      console.error('Erro na exportação:', error);
      toast({
        title: "Erro na Exportação",
        description: "Não foi possível exportar os dados",
        variant: "destructive"
      });
    }
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

  const handleSave = async () => {
    if (!surveyTitle.trim()) {
      toast({
        title: "Erro",
        description: "Título da pesquisa é obrigatório",
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

    setLoading(true);
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
          max_responses: 100
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
        options: (q.type === 'single_choice' || q.type === 'multiple_choice') ? q.options : null
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast({
        title: "Sucesso!",
        description: "Pesquisa criada com sucesso",
      });

      navigate('/create-survey-start');
    } catch (error) {
      console.error('Error saving survey:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar pesquisa",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg-gray">
      {/* Header Section - Padrão do Design System */}
      <header className="bg-brand-dark-blue text-brand-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => navigate('/create-survey-start')}
              className="bg-brand-dark-blue text-brand-white border-brand-white/20 hover:bg-brand-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await supabase.auth.signOut({ scope: 'local' });
                  navigate('/');
                } catch (error) {
                  console.error('Logout error:', error);
                  navigate('/');
                }
              }}
              className="bg-brand-green text-brand-white hover:bg-brand-green/90 border-brand-green"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
          
          <div className="text-center">
            <h1 className="text-nav font-semibold mb-4">Sentiment CX</h1>
            <h2 className="text-hero font-bold mb-4">
              Criar e Gerenciar Pesquisas - Start Quântico
            </h2>
            <p className="text-subtitle text-brand-white/80 max-w-3xl mx-auto">
              Configure até 5 questões ou visualize pesquisas ativas
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Section - Padrão do Design System */}
      <main className="bg-brand-bg-gray py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="create" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-[800px]">
              <TabsTrigger value="create">Criar Pesquisa</TabsTrigger>
              <TabsTrigger value="active">Pesquisas Ativas</TabsTrigger>
              <TabsTrigger value="preview">Prévia</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              {/* Survey Information */}
              <Card className="bg-brand-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-brand-dark-gray text-lg font-semibold">
                    Informações da Pesquisa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Label htmlFor="title" className="text-sm font-medium text-brand-dark-gray">
                        Nome da Pesquisa *
                      </Label>
                      <Input
                        id="title"
                        value={surveyTitle}
                        onChange={(e) => setSurveyTitle(e.target.value)}
                        placeholder="Ex: Pesquisa de Satisfação do Cliente"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description" className="text-sm font-medium text-[#333333]">
                        Descrição (Opcional)
                      </Label>
                      <Textarea
                        id="description"
                        value={surveyDescription}
                        onChange={(e) => setSurveyDescription(e.target.value)}
                        placeholder="Descreva o objetivo da pesquisa..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Questions Section */}
              <Card className="bg-brand-white shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-brand-dark-gray text-lg font-semibold">
                      Questões ({questions.length}/5)
                    </CardTitle>
                    <Button
                      onClick={addQuestion}
                      disabled={questions.length >= 5}
                      className="bg-brand-green hover:bg-brand-green/90 text-brand-white font-semibold"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Questão
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {questions.map((question, index) => (
                    <div key={question.id} className="border border-border rounded-lg p-4 bg-brand-white">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-brand-dark-gray">
                          Questão {index + 1}
                        </h4>
                        {questions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuestion(question.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <Label htmlFor={`question-${question.id}`} className="text-sm font-medium text-brand-dark-gray">
                            Texto da Questão *
                          </Label>
                          <Input
                            id={`question-${question.id}`}
                            value={question.text}
                            onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                            placeholder="Digite sua questão aqui..."
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`type-${question.id}`} className="text-sm font-medium text-brand-dark-gray">
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
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto Aberto</SelectItem>
                              <SelectItem value="rating">Avaliação 1-5 Estrelas</SelectItem>
                              <SelectItem value="single_choice">Escolha Única</SelectItem>
                              <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Options for choice questions */}
                      {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-3">
                              <Label className="text-sm font-medium text-brand-dark-gray">
                                Opções de Resposta (min. 2, máx. 5)
                              </Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addOption(question.id)}
                                disabled={(question.options || []).length >= 5}
                                className="bg-brand-green text-brand-white hover:bg-brand-green/90 border-brand-green"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Adicionar Opção
                              </Button>
                            </div>
                          <div className="space-y-3">
                            {(question.options || []).map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-3">
                                {question.type === 'single_choice' ? (
                                  <RadioGroup disabled className="pointer-events-none">
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value={`option-${optionIndex}`} />
                                    </div>
                                  </RadioGroup>
                                ) : (
                                  <Checkbox disabled className="pointer-events-none" />
                                )}
                                <Input
                                  value={option}
                                  onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                                  placeholder={`Opção ${optionIndex + 1}`}
                                  className="flex-1"
                                />
                                {(question.options || []).length > 2 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeOption(question.id, optionIndex)}
                                    className="bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/create-survey-start')}
                  className="flex-1 border-gray-300 text-[#333333] hover:bg-gray-50"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white font-semibold shadow-lg hover:shadow-xl"
                >
                  {loading ? 'Salvando...' : 'Salvar Pesquisa'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {/* Real-time Analytics */}
              <Card className="bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-[#333333] text-lg font-semibold flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-[#00FF00]" />
                    Analytics em Tempo Real
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RealTimeCharts />
                </CardContent>
              </Card>

              {/* Analytics Features */}
              <Card className="bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-[#333333] text-lg font-semibold">
                    Recursos de Análise
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-[#333333] mb-3">Recursos Disponíveis:</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>✅ Análise estatística básica (média, mediana, moda)</li>
                        <li>✅ Cálculo de desvio padrão e percentis</li>
                        <li>✅ Análise de sentimento por IA</li>
                        <li>✅ Gráficos interativos (Chart.js)</li>
                        <li>✅ Exportação CSV, JSON, Parquet</li>
                        <li>✅ ID único anonimizado (LGPD)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#333333] mb-3">Limites do Plano Start:</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>📊 Até 5 questões por pesquisa</li>
                        <li>👥 Máximo 100 respostas</li>
                        <li>📅 2 pesquisas por mês</li>
                        <li>🔒 Compliance com LGPD</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="active" className="space-y-6">
              {/* Active Surveys Section */}
              <Card className="bg-white shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#333333] text-lg font-semibold flex items-center">
                      <Users className="h-5 w-5 mr-2 text-[#00FF00]" />
                      Pesquisas Ativas ({activeSurveys.length})
                    </CardTitle>
                    <Button
                      onClick={fetchActiveSurveys}
                      disabled={surveysLoading}
                      variant="outline"
                      className="border-[#00FF00] text-[#00FF00] hover:bg-[#00FF00] hover:text-[#0A192F]"
                    >
                      {surveysLoading ? 'Carregando...' : 'Atualizar'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {surveysLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Carregando pesquisas...</p>
                    </div>
                  ) : activeSurveys.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="mb-2">Nenhuma pesquisa criada ainda</p>
                      <p className="text-sm">Crie sua primeira pesquisa na aba "Criar Pesquisa"</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeSurveys.map((survey) => (
                        <div key={survey.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="md:col-span-2">
                              <h3 className="font-semibold text-[#333333] text-lg mb-2">{survey.title}</h3>
                              {survey.description && (
                                <p className="text-gray-600 text-sm mb-3">{survey.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>Criada em {new Date(survey.created_at).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  <span>{survey.current_responses}/{survey.max_responses} respostas</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  survey.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {survey.status === 'active' ? 'Ativa' : 'Inativa'}
                                </span>
                                <div className="text-sm text-gray-500">
                                  {((survey.current_responses / survey.max_responses) * 100).toFixed(1)}%
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-[#00FF00] h-2 rounded-full" 
                                  style={{ width: `${(survey.current_responses / survey.max_responses) * 100}%` }}
                                ></div>
                              </div>
                              {survey.unique_link && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/survey/${survey.unique_link}`, '_blank')}
                                  className="border-brand-green text-brand-green hover:bg-brand-green hover:text-brand-white"
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  Link da Pesquisa
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Survey Statistics */}
              {activeSurveys.length > 0 && (
                <Card className="bg-brand-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-brand-dark-gray text-lg font-semibold flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2 text-brand-green" />
                      Estatísticas Gerais
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-brand-dark-gray">{activeSurveys.length}</div>
                        <div className="text-sm text-muted-foreground">Total de Pesquisas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-brand-dark-gray">
                          {activeSurveys.reduce((acc, survey) => acc + survey.current_responses, 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total de Respostas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-brand-dark-gray">
                          {activeSurveys.filter(s => s.status === 'active').length}
                        </div>
                        <div className="text-sm text-muted-foreground">Pesquisas Ativas</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="preview" className="space-y-6">
              {/* Preview Section */}
              <Card className="bg-brand-white shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-brand-dark-gray text-lg font-semibold">
                      Prévia da Pesquisa
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportData('csv')}
                        className="border-brand-green text-brand-green hover:bg-brand-green hover:text-brand-white"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportData('json')}
                        className="border-[#00FF00] text-[#00FF00] hover:bg-[#00FF00] hover:text-[#0A192F]"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        JSON
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportData('parquet')}
                        className="border-brand-green text-brand-green hover:bg-brand-green hover:text-brand-white"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Parquet
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {surveyTitle && (
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-[#0A192F] mb-2">{surveyTitle}</h3>
                      {surveyDescription && (
                        <p className="text-[#333333]">{surveyDescription}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-6">
                    {questions.filter(q => q.text.trim()).map((question, index) => (
                      <div key={question.id} className="border-l-4 border-[#00FF00] pl-4">
                        <h4 className="font-semibold text-[#333333] mb-3">
                          {index + 1}. {question.text}
                        </h4>
                        
                        {question.type === 'text' && (
                          <div className="space-y-2">
                            <Textarea 
                              placeholder="Área para resposta em texto livre..."
                              className="bg-gray-50"
                              disabled
                              rows={3}
                            />
                            <div className="text-sm text-gray-600">
                              💡 Análise de sentimento por IA será aplicada: Positivo, Neutro, Negativo
                            </div>
                          </div>
                        )}
                        
                        {question.type === 'rating' && (
                          <div className="space-y-2">
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <StarRating value={3} disabled className="justify-start" />
                            </div>
                            <div className="text-sm text-gray-600">
                              📊 Estatísticas: Média, Mediana, Moda, Desvio Padrão
                            </div>
                          </div>
                        )}
                        
                        {question.type === 'single_choice' && question.options && (
                          <div className="space-y-2">
                            <RadioGroup disabled>
                              {question.options.map((option, optIndex) => (
                                <div key={optIndex} className="flex items-center space-x-2">
                                  <RadioGroupItem value={`option-${optIndex}`} />
                                  <Label>{option}</Label>
                                </div>
                              ))}
                            </RadioGroup>
                            <div className="text-sm text-gray-600">
                              📈 Gráficos: Barras (contagem), Pizza (percentuais)
                            </div>
                          </div>
                        )}
                        
                        {question.type === 'multiple_choice' && question.options && (
                          <div className="space-y-2">
                            {question.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center space-x-2">
                                <Checkbox disabled />
                                <Label>{option}</Label>
                              </div>
                            ))}
                            <div className="text-sm text-gray-600">
                              📊 Análise: Combinações de escolhas, Frequência de seleção
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {questions.filter(q => q.text.trim()).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Adicione questões para visualizar a prévia</p>
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

export default AdminQuestionarios;