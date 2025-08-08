import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/star-rating';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, LogOut, Plus, Trash2, Link, Users, Eye, BarChart3 } from 'lucide-react';
import { getPlanDisplayName, getPlanAdminRoute } from '@/lib/planUtils';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'single_choice' | 'multiple_choice' | 'star_rating';
  options: string[];
}

interface Respondent {
  id: string;
  name: string;
  email: string;
}

const PLAN_CONFIGS = {
  'start-quantico': {
    maxQuestions: 5,
    maxResponses: 100,
    maxSurveysPerMonth: 2,
    displayName: 'Start Quântico',
    analysisLevel: 'basic',
    features: ['Média', 'Mediana', 'Moda', 'Desvio Padrão', 'Percentis'],
    sentiment: ['Positivo', 'Neutro', 'Negativo'],
    charts: ['Gráfico de Barras', 'Gráfico de Pizza']
  },
  'vortex-neural': {
    maxQuestions: 10,
    maxResponses: 250,
    maxSurveysPerMonth: 4,
    displayName: 'Vortex Neural',
    analysisLevel: 'intermediate',
    features: ['Análise Básica + Correlação', 'Comparação de Grupos'],
    sentiment: ['Por Atendimento', 'Por Produto', 'Por Preço'],
    charts: ['Gráfico de Barras', 'Gráfico de Pizza', 'Boxplot']
  },
  'nexus-infinito': {
    maxQuestions: null, // sem limite
    maxResponses: null, // sem limite
    maxSurveysPerMonth: 15,
    displayName: 'Nexus Infinito',
    analysisLevel: 'advanced',
    features: ['Testes de Hipóteses', 'ANOVA', 'Conjoint Analysis', 'Clustering', 'Previsão de Tendências'],
    sentiment: ['Multicanal', 'Por Tópico', 'Temporal'],
    charts: ['Gráficos Avançados', 'Mapas de Calor', 'Análise Temporal']
  }
};

const CreateSurveyForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('start-quantico');
  const [surveyCount, setSurveyCount] = useState(0);
  const [activeTab, setActiveTab] = useState('info');
  
  // Survey form data
  const [surveyTitle, setSurveyTitle] = useState('');
  const [surveyDescription, setSurveyDescription] = useState('');
  const [maxResponses, setMaxResponses] = useState(100);
  
  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: '',
    text: '',
    type: 'text',
    options: []
  });
  
  // Respondents
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Get user plan
      const { data: company } = await supabase
        .from('companies')
        .select('plan_name')
        .eq('user_id', user.id)
        .single();

      if (company) {
        setUserPlan(company.plan_name);
        await checkSurveyLimit(company.plan_name, user.id);
      }
    } catch (error) {
      console.error('Error initializing page:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar página",
        variant: "destructive"
      });
    }
  };

  const checkSurveyLimit = async (planName: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        .lt('created_at', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString());

      if (error) throw error;
      setSurveyCount(data?.length || 0);
    } catch (error) {
      console.error('Error checking survey limit:', error);
    }
  };

  const addQuestion = () => {
    const planConfig = PLAN_CONFIGS[userPlan as keyof typeof PLAN_CONFIGS];
    
    // Verificar limite de questões por plano
    if (planConfig?.maxQuestions && questions.length >= planConfig.maxQuestions) {
      toast({
        title: "Limite Excedido",
        description: `Limite de ${planConfig.maxQuestions} questões atingido para ${planConfig.displayName}`,
        variant: "destructive"
      });
      return;
    }

    if (!currentQuestion.text.trim()) {
      toast({
        title: "Erro",
        description: "Digite o texto da pergunta",
        variant: "destructive"
      });
      return;
    }

    if ((currentQuestion.type === 'single_choice' || currentQuestion.type === 'multiple_choice') && currentQuestion.options.length < 2) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos 2 opções para perguntas de escolha",
        variant: "destructive"
      });
      return;
    }

    const newQuestion = {
      ...currentQuestion,
      id: Date.now().toString()
    };

    setQuestions([...questions, newQuestion]);
    setCurrentQuestion({
      id: '',
      text: '',
      type: 'text',
      options: []
    });

    toast({
      title: "Sucesso",
      description: "Pergunta adicionada com sucesso"
    });
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const addOption = () => {
    if (currentQuestion.options.length >= 5) {
      toast({
        title: "Erro",
        description: "Máximo de 5 opções permitidas",
        variant: "destructive"
      });
      return;
    }
    setCurrentQuestion({
      ...currentQuestion,
      options: [...currentQuestion.options, '']
    });
  };

  const removeOption = (index: number) => {
    const newOptions = currentQuestion.options.filter((_, i) => i !== index);
    setCurrentQuestion({
      ...currentQuestion,
      options: newOptions
    });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion({
      ...currentQuestion,
      options: newOptions
    });
  };

  const addRespondent = () => {
    if (!respondentName.trim() || !respondentEmail.trim()) {
      toast({
        title: "Erro",
        description: "Preencha nome e e-mail do respondente",
        variant: "destructive"
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(respondentEmail)) {
      toast({
        title: "Erro",
        description: "E-mail inválido",
        variant: "destructive"
      });
      return;
    }

    const newRespondent = {
      id: Date.now().toString(),
      name: respondentName,
      email: respondentEmail
    };

    setRespondents([...respondents, newRespondent]);
    setRespondentName('');
    setRespondentEmail('');

    toast({
      title: "Sucesso",
      description: "Respondente adicionado com sucesso"
    });
  };

  const removeRespondent = (respondentId: string) => {
    setRespondents(respondents.filter(r => r.id !== respondentId));
  };

  const createSurvey = async () => {
    const planConfig = PLAN_CONFIGS[userPlan as keyof typeof PLAN_CONFIGS];
    
    if (surveyCount >= planConfig.maxSurveysPerMonth) {
      toast({
        title: "Limite Excedido",
        description: `Você atingiu o limite de ${planConfig.maxSurveysPerMonth} pesquisas por mês para o plano ${planConfig.displayName}`,
        variant: "destructive"
      });
      return;
    }

    // Validar limite de respostas por plano
    if (planConfig?.maxResponses && maxResponses > planConfig.maxResponses) {
      toast({
        title: "Limite Excedido",
        description: `Limite de ${planConfig.maxResponses} respostas por pesquisa para ${planConfig.displayName}. Valor atual: ${maxResponses}`,
        variant: "destructive"
      });
      return;
    }

    if (!surveyTitle.trim()) {
      toast({
        title: "Erro",
        description: "Digite o título da pesquisa",
        variant: "destructive"
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos uma pergunta",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Create survey
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .insert({
          title: surveyTitle,
          description: surveyDescription,
          max_responses: maxResponses,
          user_id: user.id,
          status: 'active'
        })
        .select()
        .single();

      if (surveyError) throw surveyError;

      // Create questions
      const questionsData = questions.map((q, index) => ({
        survey_id: survey.id,
        question_text: q.text,
        question_type: q.type,
        question_order: index + 1,
        options: q.options.length > 0 ? q.options : null
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsData);

      if (questionsError) throw questionsError;

      // Save respondents if any
      if (respondents.length > 0) {
        const respondentsData = respondents.map(r => ({
          name: r.name,
          email: r.email,
          user_id: user.id
        }));

        const { error: respondentsError } = await supabase
          .from('respondents')
          .insert(respondentsData);

        if (respondentsError) throw respondentsError;
      }

      toast({
        title: "Sucesso",
        description: "Pesquisa criada com sucesso!"
      });

      // Reset form
      setSurveyTitle('');
      setSurveyDescription('');
      setQuestions([]);
      setRespondents([]);
      setCurrentQuestion({
        id: '',
        text: '',
        type: 'text',
        options: []
      });

      // Redirecionar para a página de gerenciamento de pesquisas
      navigate('/manage-surveys');

    } catch (error) {
      console.error('Error creating survey:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar pesquisa",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAnonymousLink = async () => {
    if (!surveyTitle.trim() || questions.length === 0) {
      toast({
        title: "Erro",
        description: "Primeiro crie a pesquisa antes de gerar o link",
        variant: "destructive"
      });
      return;
    }

    // First create the survey, then generate link
    await createSurvey();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const planConfig = PLAN_CONFIGS[userPlan as keyof typeof PLAN_CONFIGS];
  const canCreateSurvey = surveyCount < planConfig.maxSurveysPerMonth;
  const questionsUsed = questions.length;
  const maxQuestions = planConfig?.maxQuestions;

  return (
    <div className="min-h-screen bg-brand-bg-gray">
      {/* Header */}
      <div className="bg-brand-white shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  const adminRoute = getPlanAdminRoute(userPlan);
                  navigate(adminRoute);
                }}
                className="flex items-center gap-2 text-brand-dark-blue hover:text-brand-dark-blue/80 border-border"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <h1 className="text-xl font-semibold text-brand-dark-gray">Nova Pesquisa</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-brand-dark-gray/70">
                Pesquisas este mês: {surveyCount}/{planConfig.maxSurveysPerMonth} | Plano: {planConfig.displayName}
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center gap-2 text-brand-green hover:text-brand-green/80 border-border"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {!canCreateSurvey && (
          <div className="bg-[#EF4444] text-white p-4 rounded-lg">
            Você atingiu o limite de {planConfig.maxSurveysPerMonth} pesquisas por mês para o plano {planConfig.displayName}.
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
           <TabsList className="grid w-full grid-cols-3 bg-brand-white">
             <TabsTrigger value="info" className="flex items-center gap-2">
               <Users className="h-4 w-4" />
               Informações & Questões
             </TabsTrigger>
             <TabsTrigger value="respondents" className="flex items-center gap-2">
               <Users className="h-4 w-4" />
               Respondentes
             </TabsTrigger>
             <TabsTrigger value="preview" className="flex items-center gap-2">
               <Eye className="h-4 w-4" />
               Prévia & Análise
             </TabsTrigger>
           </TabsList>

          <TabsContent value="info" className="space-y-6">
            {/* Survey Info */}
             <Card className="bg-brand-white shadow-sm">
               <CardHeader>
                 <CardTitle className="text-brand-dark-gray">Informações da Pesquisa</CardTitle>
               </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Título*</Label>
                  <Input
                    id="title"
                    value={surveyTitle}
                    onChange={(e) => setSurveyTitle(e.target.value)}
                    placeholder="Digite o título da pesquisa"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={surveyDescription}
                    onChange={(e) => setSurveyDescription(e.target.value)}
                    placeholder="Digite uma descrição opcional"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="maxResponses">
                    Máximo de Respostas
                    {planConfig?.maxResponses && (
                      <span className="text-sm text-gray-500 ml-2">
                        (Limite do plano: {planConfig.maxResponses})
                      </span>
                    )}
                  </Label>
                  <Input
                    id="maxResponses"
                    type="number"
                    value={maxResponses}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (planConfig?.maxResponses && value > planConfig.maxResponses) {
                        toast({
                          title: "Limite Excedido",
                          description: `Limite de ${planConfig.maxResponses} respostas para ${planConfig.displayName}`,
                          variant: "destructive"
                        });
                        return;
                      }
                      setMaxResponses(value);
                    }}
                    min="1"
                    max={planConfig?.maxResponses || undefined}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Add Question */}
             <Card className="bg-brand-white shadow-sm">
               <CardHeader>
                 <div className="flex items-center justify-between">
                   <CardTitle className="text-brand-dark-gray">Adicionar Pergunta</CardTitle>
                  {maxQuestions && (
                    <div className={`text-sm px-3 py-1 rounded-full ${
                      questionsUsed >= maxQuestions 
                        ? 'bg-[#EF4444] text-white' 
                        : questionsUsed >= maxQuestions * 0.8 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                    }`}>
                      {questionsUsed}/{maxQuestions} questões
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
            <div>
              <Label>Texto da Pergunta*</Label>
              <Textarea
                value={currentQuestion.text}
                onChange={(e) => setCurrentQuestion({...currentQuestion, text: e.target.value})}
                placeholder="Digite sua pergunta"
                rows={2}
              />
            </div>
            
            <div>
              <Label>Tipo de Pergunta</Label>
              <Select 
                value={currentQuestion.type} 
                onValueChange={(value: any) => setCurrentQuestion({
                  ...currentQuestion, 
                  type: value,
                  options: value === 'single_choice' || value === 'multiple_choice' ? ['', ''] : []
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto Aberto</SelectItem>
                  <SelectItem value="single_choice">Escolha Única</SelectItem>
                  <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                  <SelectItem value="star_rating">Avaliação por Estrelas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options for choice questions */}
            {(currentQuestion.type === 'single_choice' || currentQuestion.type === 'multiple_choice') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Opções (mín. 2, máx. 5)</Label>
                  <Button
                    size="sm"
                    onClick={addOption}
                    disabled={currentQuestion.options.length >= 5}
                    className="bg-[#10B981] text-white hover:bg-[#059669]"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Opção
                  </Button>
                </div>
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Opção ${index + 1}`}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeOption(index)}
                      disabled={currentQuestion.options.length <= 2}
                      className="bg-[#1E3A8A] text-white hover:bg-[#1E40AF]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Star rating preview */}
            {currentQuestion.type === 'star_rating' && (
              <div>
                <Label>Preview da Avaliação</Label>
                <StarRating value={0} disabled />
              </div>
            )}

                <Button 
                  onClick={addQuestion} 
                  disabled={maxQuestions && questionsUsed >= maxQuestions}
                  className="w-full bg-[#10B981] text-white hover:bg-[#059669] disabled:bg-gray-400"
                >
                  {maxQuestions && questionsUsed >= maxQuestions 
                    ? `Limite de ${maxQuestions} questões atingido` 
                    : 'Adicionar Pergunta'
                  }
                </Button>
              </CardContent>
            </Card>

            {/* Questions List */}
             {questions.length > 0 && (
               <Card className="bg-brand-white shadow-sm">
                 <CardHeader>
                   <CardTitle className="text-brand-dark-gray">Perguntas Adicionadas ({questions.length})</CardTitle>
                 </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {questions.map((question, index) => (
                      <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{index + 1}</Badge>
                              <Badge variant="secondary">
                                {question.type === 'text' ? 'Texto Aberto' :
                                 question.type === 'single_choice' ? 'Escolha Única' :
                                 question.type === 'multiple_choice' ? 'Múltipla Escolha' :
                                 'Avaliação por Estrelas'}
                              </Badge>
                            </div>
                            <p className="font-medium mb-2">{question.text}</p>
                            {question.options.length > 0 && (
                              <div className="text-sm text-gray-600">
                                <strong>Opções:</strong> {question.options.join(', ')}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeQuestion(question.id)}
                            className="bg-[#1E3A8A] text-white hover:bg-[#1E40AF]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
             <Card className="bg-brand-white shadow-sm">
               <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={createSurvey}
                    disabled={!canCreateSurvey || loading}
                    className="flex-1 bg-[#10B981] text-white hover:bg-[#059669]"
                  >
                    Criar Pesquisa
                  </Button>
                  <Button
                    onClick={generateAnonymousLink}
                    disabled={!canCreateSurvey || loading}
                    className="flex-1 bg-[#10B981] text-white hover:bg-[#059669]"
                  >
                    <Link className="h-4 w-4 mr-2" />
                    Gerar Link Anônimo
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
                   Cadastrar Respondentes
                 </CardTitle>
               </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label style={{ fontFamily: 'Roboto', fontSize: '14px' }}>Nome</Label>
                    <Input
                      value={respondentName}
                      onChange={(e) => setRespondentName(e.target.value)}
                      placeholder="Nome do respondente"
                      style={{ fontFamily: 'Roboto', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <Label style={{ fontFamily: 'Roboto', fontSize: '14px' }}>E-mail</Label>
                    <Input
                      type="email"
                      value={respondentEmail}
                      onChange={(e) => setRespondentEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      style={{ fontFamily: 'Roboto', fontSize: '14px' }}
                    />
                  </div>
                </div>
                <Button 
                  onClick={addRespondent}
                  className="bg-[#10B981] text-white hover:bg-[#059669]"
                >
                  Adicionar Respondente
                </Button>

                {respondents.length > 0 && (
                  <div className="mt-4">
                    <Label>Respondentes Cadastrados ({respondents.length})</Label>
                    <div className="space-y-2 mt-2">
                      {respondents.map((respondent) => (
                        <div key={respondent.id} className="flex justify-between items-center p-2 border border-gray-200 rounded">
                          <div>
                            <span className="font-medium">{respondent.name}</span> - {respondent.email}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeRespondent(respondent.id)}
                            className="bg-[#1E3A8A] text-white hover:bg-[#1E40AF]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
             {/* Survey Preview */}
             <Card className="bg-brand-white shadow-sm">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2 text-brand-dark-gray">
                   <Eye className="h-5 w-5" />
                   Prévia da Pesquisa
                 </CardTitle>
               </CardHeader>
              <CardContent>
                {surveyTitle ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{surveyTitle}</h3>
                    {surveyDescription && (
                      <p className="text-gray-600">{surveyDescription}</p>
                    )}
                    <div className="space-y-6">
                      {questions.map((question, index) => (
                        <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium mb-3">{index + 1}. {question.text}</h4>
                          
                          {question.type === 'text' && (
                            <Textarea placeholder="Resposta em texto livre..." disabled />
                          )}
                          
                          {question.type === 'single_choice' && (
                            <div className="space-y-2">
                              {question.options.map((option, optIndex) => (
                                <div key={optIndex} className="flex items-center space-x-2">
                                  <input type="radio" disabled />
                                  <label className="text-sm">{option}</label>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {question.type === 'multiple_choice' && (
                            <div className="space-y-2">
                              {question.options.map((option, optIndex) => (
                                <div key={optIndex} className="flex items-center space-x-2">
                                  <input type="checkbox" disabled />
                                  <label className="text-sm">{option}</label>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {question.type === 'star_rating' && (
                            <StarRating value={0} disabled />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Configure o título da pesquisa para ver a prévia</p>
                )}
              </CardContent>
            </Card>

            {/* Analysis Features by Plan */}
             <Card className="bg-brand-white shadow-sm">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2 text-brand-dark-gray">
                   <BarChart3 className="h-5 w-5" />
                   Funcionalidades de Análise - {planConfig.displayName}
                 </CardTitle>
               </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Análise Estatística:</h4>
                    <ul className="space-y-1 text-sm">
                      {planConfig.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Análise de Sentimento:</h4>
                    <ul className="space-y-1 text-sm">
                      {planConfig.sentiment.map((sentiment, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          {sentiment}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Tipos de Gráficos:</h4>
                    <ul className="space-y-1 text-sm">
                      {planConfig.charts.map((chart, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          {chart}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Limites do Plano:</h4>
                    <ul className="space-y-1 text-sm">
                      <li>Questões por pesquisa: {planConfig.maxQuestions || 'Ilimitado'}</li>
                      <li>Respostas por pesquisa: {planConfig.maxResponses || 'Ilimitado'}</li>
                      <li>Pesquisas por mês: {planConfig.maxSurveysPerMonth}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CreateSurveyForm;