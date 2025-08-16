import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/star-rating';
import { Plus, Minus, ArrowLeft, LogOut, Eye, BarChart3, PieChart, Users, Zap, Copy, Activity, TrendingUp } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'single_choice' | 'multiple_choice' | 'rating';
  options: string[];
}

interface Respondent {
  id: string;
  name: string;
  email: string;
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

const PLAN_CONFIG = {
  name: 'Start Quântico',
  maxQuestions: 3,
  maxResponses: 50,
  maxSurveysPerMonth: 3,
  features: {
    analysis: ['Média', 'Mediana', 'Moda'],
    sentiment: ['Positivo', 'Neutro', 'Negativo'],
    charts: ['Gráfico de Barras', 'Gráfico de Pizza']
  }
};

const CreateSurveyStart = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<'text' | 'single_choice' | 'multiple_choice' | 'rating'>('text');
  const [newOptions, setNewOptions] = useState<string[]>(['']);
  const [newRespondentName, setNewRespondentName] = useState('');
  const [newRespondentEmail, setNewRespondentEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [currentSurveyCount, setCurrentSurveyCount] = useState(0);
  const [activeSurveys, setActiveSurveys] = useState<Survey[]>([]);
  const [isLoadingSurveys, setIsLoadingSurveys] = useState(false);

  const initializePage = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);

      // Verificar quantidade de pesquisas do mês atual
      const { data: surveys, error } = await supabase
        .from('surveys')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      if (!error && surveys) {
        setCurrentSurveyCount(surveys.length);
      }

      // Carregar pesquisas ativas
      await loadActiveSurveys(user.id);
    } catch (error) {
      console.error('Error initializing page:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar página",
        variant: "destructive"
      });
    }
  }, [navigate]);

  const loadActiveSurveys = async (userId: string) => {
    setIsLoadingSurveys(true);
    try {
      const { data: surveys, error } = await supabase
        .from('surveys')
        .select(`
          id,
          title,
          description,
          status,
          created_at,
          unique_link,
          responses(count)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading surveys:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar pesquisas ativas",
          variant: "destructive"
        });
        return;
      }

      const surveysWithCounts = surveys?.map(survey => ({
        ...survey,
        current_responses: survey.responses?.[0]?.count || 0,
        max_responses: PLAN_CONFIG.maxResponses
      })) || [];

      setActiveSurveys(surveysWithCounts);
    } catch (error) {
      console.error('Error loading active surveys:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar pesquisas ativas",
        variant: "destructive"
      });
    } finally {
      setIsLoadingSurveys(false);
    }
  };

  const copyToClipboard = (link: string) => {
    const fullLink = `${window.location.origin}/survey/${link}`;
    navigator.clipboard.writeText(fullLink).then(() => {
      toast({
        title: "Link copiado!",
        description: "O link da pesquisa foi copiado para a área de transferência."
      });
    }).catch(() => {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link.",
        variant: "destructive"
      });
    });
  };

  useEffect(() => {
    initializePage();
  }, [initializePage]);

  const addQuestion = () => {
    if (!newQuestionText.trim()) {
      toast({
        title: "Erro",
        description: "Digite o texto da questão",
        variant: "destructive"
      });
      return;
    }

    if (questions.length >= PLAN_CONFIG.maxQuestions) {
      toast({
        title: "Limite atingido",
        description: `O plano ${PLAN_CONFIG.name} permite até ${PLAN_CONFIG.maxQuestions} questões`,
        variant: "destructive"
      });
      return;
    }

    const newQuestion: Question = {
      id: Date.now().toString(),
      text: newQuestionText,
      type: newQuestionType,
      options: ['single_choice', 'multiple_choice'].includes(newQuestionType) ? newOptions.filter(opt => opt.trim()) : []
    };

    setQuestions([...questions, newQuestion]);
    setNewQuestionText('');
    setNewQuestionType('text');
    setNewOptions(['']);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const addOption = () => {
    setNewOptions([...newOptions, '']);
  };

  const removeOption = (index: number) => {
    if (newOptions.length > 1) {
      setNewOptions(newOptions.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const updatedOptions = [...newOptions];
    updatedOptions[index] = value;
    setNewOptions(updatedOptions);
  };

  const addRespondent = () => {
    if (!newRespondentName.trim() || !newRespondentEmail.trim()) {
      toast({
        title: "Erro",
        description: "Nome e email são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const newRespondent: Respondent = {
      id: Date.now().toString(),
      name: newRespondentName,
      email: newRespondentEmail
    };

    setRespondents([...respondents, newRespondent]);
    setNewRespondentName('');
    setNewRespondentEmail('');
  };

  const removeRespondent = (id: string) => {
    setRespondents(respondents.filter(r => r.id !== id));
  };

  const createSurvey = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Erro",
        description: "Título é obrigatório",
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

    if (currentSurveyCount >= PLAN_CONFIG.maxSurveysPerMonth) {
      toast({
        title: "Limite atingido",
        description: `O plano ${PLAN_CONFIG.name} permite até ${PLAN_CONFIG.maxSurveysPerMonth} pesquisas por mês`,
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      // Criar pesquisa
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .insert({
          title,
          description: description || null,
          user_id: user.id,
          max_responses: PLAN_CONFIG.maxResponses,
          status: 'active'
        })
        .select()
        .single();

      if (surveyError) {
        throw surveyError;
      }

      // Criar questões
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const { error: questionError } = await supabase
          .from('questions')
          .insert({
            survey_id: survey.id,
            question_text: question.text,
            question_type: question.type,
            question_order: i + 1,
            options: question.options.length > 0 ? question.options : null
          });

        if (questionError) {
          throw questionError;
        }
      }

      // Criar respondentes - Funcionalidade em desenvolvimento
      // A tabela 'respondents' não está disponível no esquema atual
      if (respondents.length > 0) {
        console.log('Respondentes que seriam criados:', respondents);
        console.log('Funcionalidade de respondentes em desenvolvimento - tabela não disponível');
      }

      toast({
        title: "Sucesso",
        description: "Pesquisa criada com sucesso!",
      });

      // Recarregar pesquisas ativas
      if (user) {
        await loadActiveSurveys(user.id);
      }

      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating survey:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar pesquisa",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    const { robustLogout } = await import('@/lib/authUtils');
    await robustLogout(navigate);
  };

  return (
    <div className="min-h-screen bg-brand-bg-gray">
      <header className="bg-brand-dark-blue text-brand-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="bg-brand-dark-blue text-brand-white border-brand-white/20 hover:bg-brand-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="bg-brand-green text-brand-white hover:bg-brand-green/90 border-brand-green"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
          <div className="text-center">
            <h1 className="text-nav font-semibold mb-4 flex items-center justify-center gap-2">
              <Activity className="h-6 w-6" />
              Sentiment CX
            </h1>
            <h2 className="text-hero font-bold mb-4 flex items-center justify-center gap-2">
              <Zap className="h-8 w-8" />
              Criar e Gerenciar Pesquisas - Start Quântico
            </h2>
            <p className="text-subtitle text-brand-white/80 max-w-3xl mx-auto">
              Até {PLAN_CONFIG.maxQuestions} questões, {PLAN_CONFIG.maxResponses} respostas, {PLAN_CONFIG.maxSurveysPerMonth} pesquisas/mês - Perfeito para começar
            </p>
          </div>
        </div>
      </header>

      <main className="bg-brand-bg-gray py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="info">Criar Pesquisa</TabsTrigger>
              <TabsTrigger value="active">Pesquisas Ativas</TabsTrigger>
              <TabsTrigger value="analytics">Análises Avançadas</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6">
              <Card className="bg-brand-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-brand-dark-gray flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Criar Nova Pesquisa
                  </CardTitle>
                  <CardDescription className="text-brand-dark-gray/70">
                    Crie pesquisas eficientes com até {PLAN_CONFIG.maxQuestions} questões e {PLAN_CONFIG.maxResponses} respostas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Nome da Pesquisa</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Digite o nome da pesquisa"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição (Opcional)</Label>
                      <Input
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Breve descrição da pesquisa"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Questões ({questions.length}/{PLAN_CONFIG.maxQuestions})
                      </h3>
                      <Button 
                        onClick={addQuestion} 
                        disabled={questions.length >= PLAN_CONFIG.maxQuestions}
                        className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar Questão
                      </Button>
                    </div>

                    {questions.map((question, index) => (
                      <Card key={question.id} className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label>Questão {index + 1}</Label>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeQuestion(question.id)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">{question.text}</p>
                            <Badge variant="secondary">
                              {question.type === 'text' ? 'Texto Livre' :
                               question.type === 'single_choice' ? 'Escolha Única' :
                               question.type === 'multiple_choice' ? 'Múltipla Escolha' :
                               'Avaliação por Estrelas'}
                            </Badge>
                            {question.options.length > 0 && (
                              <div className="mt-2">
                                <span className="text-sm font-medium">Opções:</span>
                                <ul className="list-disc list-inside mt-1 text-sm text-muted-foreground">
                                  {question.options.map((option, idx) => (
                                    <li key={idx}>{option}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}

                    {/* Formulário para nova questão */}
                    <div className="border-2 border-dashed border-border rounded-lg p-4">
                      <h4 className="font-medium text-brand-dark-gray mb-4">Adicionar Nova Questão</h4>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-brand-dark-gray font-medium">Texto da Questão</Label>
                          <Input
                            value={newQuestionText}
                            onChange={(e) => setNewQuestionText(e.target.value)}
                            placeholder="Digite a questão"
                            className="mt-1 font-roboto text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-brand-dark-gray font-medium">Tipo de Questão</Label>
                          <RadioGroup
                            value={newQuestionType}
                            onValueChange={(value: 'text' | 'single_choice' | 'multiple_choice' | 'rating') => setNewQuestionType(value)}
                            className="mt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="text" id="text" />
                              <Label htmlFor="text">Texto Livre</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="single_choice" id="single" />
                              <Label htmlFor="single">Escolha Única</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="multiple_choice" id="multiple" />
                              <Label htmlFor="multiple">Múltipla Escolha</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="rating" id="star" />
                              <Label htmlFor="star">Avaliação 1-5 Estrelas</Label>
                            </div>
                          </RadioGroup>
                        </div>
                        
                        {(['single_choice', 'multiple_choice'].includes(newQuestionType)) && (
                          <div>
                            <Label className="text-brand-dark-gray font-medium">Opções</Label>
                            {newOptions.map((option, index) => (
                              <div key={index} className="flex gap-2 mt-2">
                                <Input
                                  value={option}
                                  onChange={(e) => updateOption(index, e.target.value)}
                                  placeholder={`Opção ${index + 1}`}
                                  className="font-roboto text-sm"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeOption(index)}
                                  disabled={newOptions.length <= 1}
                                  className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={addOption}
                              className="mt-2 border-brand-green text-brand-green hover:bg-brand-green/10 hover:border-brand-green"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar Opção
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-6">
                    <Button
                      onClick={createSurvey}
                      disabled={isCreating || !title.trim() || questions.length === 0}
                      className="bg-brand-green text-brand-white hover:bg-brand-green/90"
                    >
                      {isCreating ? 'Criando...' : 'Criar Pesquisa'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="respondents" className="space-y-6">
              <Card className="bg-brand-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-brand-dark-gray">
                    <Users className="h-5 w-5" />
                    <Zap className="h-4 w-4" />
                    Gerenciar Respondentes - Start Quântico ({respondents.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="respondent-name">Nome do Respondente</Label>
                      <Input
                        id="respondent-name"
                        value={newRespondentName}
                        onChange={(e) => setNewRespondentName(e.target.value)}
                        placeholder="Digite o nome"
                      />
                    </div>
                    <div>
                      <Label htmlFor="respondent-email">Email do Respondente</Label>
                      <Input
                        id="respondent-email"
                        type="email"
                        value={newRespondentEmail}
                        onChange={(e) => setNewRespondentEmail(e.target.value)}
                        placeholder="Digite o email"
                      />
                    </div>
                  </div>
                  <Button onClick={addRespondent} className="bg-brand-green text-brand-white hover:bg-brand-green/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Respondente
                  </Button>

                  {respondents.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Respondentes Adicionados:</h4>
                      {respondents.map((respondent) => (
                        <div key={respondent.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{respondent.name}</p>
                            <p className="text-sm text-muted-foreground">{respondent.email}</p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeRespondent(respondent.id)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-6">
              <Card className="bg-brand-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-brand-dark-gray">
                    <Eye className="h-5 w-5" />
                    Prévia da Pesquisa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {title && (
                    <div>
                      <h3 className="text-xl font-semibold text-brand-dark-gray">{title}</h3>
                      {description && (
                        <p className="text-muted-foreground mt-2">{description}</p>
                      )}
                    </div>
                  )}

                  {questions.map((question, index) => (
                    <div key={question.id} className="border border-border rounded-lg p-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-brand-dark-gray">
                            {index + 1}.
                          </span>
                          <p className="font-medium text-brand-dark-gray">{question.text}</p>
                        </div>
                        
                        {question.type === 'text' && (
                          <Textarea
                            placeholder="Resposta em texto livre..."
                            disabled
                            className="bg-muted"
                          />
                        )}
                        
                        {question.type === 'single_choice' && (
                          <RadioGroup disabled className="space-y-2">
                            {question.options.map((option, optIdx) => (
                              <div key={optIdx} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`${question.id}-${optIdx}`} />
                                <Label htmlFor={`${question.id}-${optIdx}`}>{option}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}
                        
                        {question.type === 'multiple_choice' && (
                          <div className="space-y-2">
                            {question.options.map((option, optIdx) => (
                              <div key={optIdx} className="flex items-center space-x-2">
                                <input type="checkbox" disabled className="rounded" />
                                <Label>{option}</Label>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {question.type === 'rating' && (
                          <div className="bg-muted p-4 rounded-lg">
                            <StarRating value={3} disabled className="justify-start" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}


                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card className="bg-brand-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-brand-dark-gray">
                    <TrendingUp className="h-5 w-5" />
                    Análises Avançadas
                  </CardTitle>
                  <CardDescription className="text-brand-dark-gray/70">
                    Recursos avançados de análise disponíveis no plano Start Quântico
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-brand-bg-gray p-6 rounded-lg">
                    <h4 className="font-semibold text-brand-dark-gray mb-4 flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Recursos do Plano Start Quântico
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h5 className="font-medium text-brand-dark-gray mb-2">📊 Análise Estatística</h5>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {PLAN_CONFIG.features.analysis.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-brand-dark-gray mb-2">💭 Análise de Sentimento</h5>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {PLAN_CONFIG.features.sentiment.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-brand-dark-gray mb-2 flex items-center gap-1">
                          <PieChart className="h-4 w-4" />
                          Visualizações
                        </h5>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {PLAN_CONFIG.features.charts.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="active" className="space-y-6">
              <Card className="bg-brand-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-brand-dark-gray">
                    <Activity className="h-5 w-5" />
                    Pesquisas Ativas ({activeSurveys.length})
                  </CardTitle>
                  <CardDescription className="text-brand-dark-gray/70">
                    Gerencie suas pesquisas ativas e acompanhe o desempenho
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingSurveys ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Carregando pesquisas...</p>
                    </div>
                  ) : activeSurveys.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-2">Nenhuma pesquisa ativa encontrada</p>
                      <p className="text-sm text-muted-foreground">Crie sua primeira pesquisa na aba "Criar Pesquisa"</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {activeSurveys.map((survey) => (
                        <div key={survey.id} className="bg-brand-white p-4 rounded-lg border border-brand-light-gray hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-brand-dark-gray">{survey.title}</h3>
                                <Badge variant="secondary" className="bg-brand-green/10 text-brand-green">
                                  {survey.status === 'active' ? 'Ativa' : survey.status}
                                </Badge>
                              </div>
                              {survey.description && (
                                <p className="text-sm text-brand-dark-gray/70 mb-3">{survey.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-brand-dark-gray/60">
                                <span>📅 {new Date(survey.created_at).toLocaleDateString('pt-BR')}</span>
                                <span>📊 {survey.current_responses || 0}/{survey.max_responses} respostas</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(survey.unique_link)}
                              className="ml-4"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar Link
                            </Button>
                          </div>
                        </div>
                      ))}
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

export default CreateSurveyStart;