import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/star-rating';
import { Plus, Minus, ArrowLeft, LogOut, Eye, BarChart3, PieChart, TrendingUp } from 'lucide-react';

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

const PLAN_CONFIG = {
  name: 'Vortex Neural',
  maxQuestions: 10,
  maxResponses: 250,
  maxSurveysPerMonth: 4,
  features: {
    analysis: ['Média', 'Mediana', 'Moda', 'Desvio Padrão', 'Percentis', 'Análise de Correlação'],
    sentiment: ['Análise por Atendimento', 'Análise por Produto', 'Análise por Preço'],
    charts: ['Gráfico de Barras', 'Gráfico de Pizza', 'Boxplot']
  }
};

const CreateSurveyVortex = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<'text' | 'single_choice' | 'multiple_choice' | 'star_rating'>('text');
  const [newOptions, setNewOptions] = useState<string[]>(['']);
  const [newRespondentName, setNewRespondentName] = useState('');
  const [newRespondentEmail, setNewRespondentEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentSurveyCount, setCurrentSurveyCount] = useState(0);

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
    } catch (error) {
      console.error('Error initializing page:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar página",
        variant: "destructive"
      });
    }
  };

  const addQuestion = () => {
    if (questions.length >= PLAN_CONFIG.maxQuestions) {
      toast({
        title: "Limite atingido",
        description: `O plano ${PLAN_CONFIG.name} permite no máximo ${PLAN_CONFIG.maxQuestions} questões por pesquisa.`,
        variant: "destructive"
      });
      return;
    }

    if (!newQuestionText.trim()) {
      toast({
        title: "Erro",
        description: "Digite o texto da questão",
        variant: "destructive"
      });
      return;
    }

    const newQuestion: Question = {
      id: crypto.randomUUID(),
      text: newQuestionText,
      type: newQuestionType,
      options: ['single_choice', 'multiple_choice'].includes(newQuestionType) 
        ? newOptions.filter(opt => opt.trim() !== '') 
        : []
    };

    if (['single_choice', 'multiple_choice'].includes(newQuestionType) && newQuestion.options.length < 2) {
      toast({
        title: "Erro",
        description: "Questões de múltipla escolha precisam de pelo menos 2 opções",
        variant: "destructive"
      });
      return;
    }

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
    const updated = [...newOptions];
    updated[index] = value;
    setNewOptions(updated);
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newRespondentEmail)) {
      toast({
        title: "Erro",
        description: "Email inválido",
        variant: "destructive"
      });
      return;
    }

    const newRespondent: Respondent = {
      id: crypto.randomUUID(),
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
    if (currentSurveyCount >= PLAN_CONFIG.maxSurveysPerMonth) {
      toast({
        title: "Limite atingido",
        description: `O plano ${PLAN_CONFIG.name} permite no máximo ${PLAN_CONFIG.maxSurveysPerMonth} pesquisas por mês.`,
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

      // Criar respondentes
      for (const respondent of respondents) {
        const { error: respondentError } = await supabase
          .from('respondents')
          .insert({
            user_id: user.id,
            name: respondent.name,
            email: respondent.email
          });

        if (respondentError) {
          console.error('Error creating respondent:', respondentError);
        }
      }

      toast({
        title: "Sucesso",
        description: "Pesquisa criada com sucesso!",
      });

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
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-brand-bg-gray">
      {/* Header */}
      <div className="bg-brand-white shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-brand-dark-gray hover:text-brand-dark-blue"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <h1 className="text-xl font-semibold text-brand-dark-gray">
                Criar Pesquisa - {PLAN_CONFIG.name}
              </h1>
              <Badge className="bg-blue-500 text-white">
                {currentSurveyCount}/{PLAN_CONFIG.maxSurveysPerMonth} pesquisas este mês
              </Badge>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="flex items-center gap-2 text-brand-dark-gray hover:text-brand-dark-blue"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações da Pesquisa</TabsTrigger>
            <TabsTrigger value="respondents">Respondentes</TabsTrigger>
            <TabsTrigger value="preview">Prévia & Análise</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6">
            <Card className="bg-brand-white">
              <CardHeader>
                <CardTitle className="text-brand-dark-gray">Detalhes da Pesquisa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-brand-dark-gray font-medium">
                    Título da Pesquisa *
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Digite o título da pesquisa"
                    className="mt-1 font-roboto text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-brand-dark-gray font-medium">
                    Descrição (opcional)
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o objetivo da pesquisa"
                    className="mt-1 font-roboto text-sm"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-brand-white">
              <CardHeader>
                <CardTitle className="text-brand-dark-gray flex justify-between items-center">
                  Questões ({questions.length}/{PLAN_CONFIG.maxQuestions})
                  {questions.length >= PLAN_CONFIG.maxQuestions && (
                    <Badge variant="destructive">Limite atingido</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Lista de questões existentes */}
                {questions.map((question, index) => (
                  <div key={question.id} className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-brand-dark-gray">
                        Questão {index + 1}
                      </span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeQuestion(question.id)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-brand-dark-gray mb-2">{question.text}</p>
                    <Badge variant="secondary" className="mb-2">
                      {question.type === 'text' ? 'Texto Livre' :
                       question.type === 'single_choice' ? 'Escolha Única' :
                       question.type === 'multiple_choice' ? 'Múltipla Escolha' :
                       'Avaliação por Estrelas'}
                    </Badge>
                    {question.options.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm font-medium text-brand-dark-gray">Opções:</span>
                        <ul className="list-disc list-inside mt-1 text-sm text-muted-foreground">
                          {question.options.map((option, idx) => (
                            <li key={idx}>{option}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
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
                        onValueChange={(value: any) => setNewQuestionType(value)}
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
                          <RadioGroupItem value="star_rating" id="star" />
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
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={addOption}
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Opção
                        </Button>
                      </div>
                    )}
                    
                    <Button
                      onClick={addQuestion}
                      disabled={questions.length >= PLAN_CONFIG.maxQuestions}
                      className="bg-brand-green text-brand-white hover:bg-brand-green/90"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Questão
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="respondents" className="space-y-6">
            <Card className="bg-brand-white">
              <CardHeader>
                <CardTitle className="text-brand-dark-gray">
                  Respondentes ({respondents.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Lista de respondentes */}
                {respondents.map((respondent) => (
                  <div key={respondent.id} className="flex justify-between items-center p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-brand-dark-gray">{respondent.name}</p>
                      <p className="text-sm text-muted-foreground">{respondent.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeRespondent(respondent.id)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {/* Formulário para novo respondente */}
                <div className="border-2 border-dashed border-border rounded-lg p-4">
                  <h4 className="font-medium text-brand-dark-gray mb-4">Adicionar Respondente</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-brand-dark-gray font-medium">Nome</Label>
                      <Input
                        value={newRespondentName}
                        onChange={(e) => setNewRespondentName(e.target.value)}
                        placeholder="Nome do respondente"
                        className="mt-1 font-roboto text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-brand-dark-gray font-medium">Email</Label>
                      <Input
                        type="email"
                        value={newRespondentEmail}
                        onChange={(e) => setNewRespondentEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="mt-1 font-roboto text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={addRespondent}
                    className="mt-4 bg-brand-green text-brand-white hover:bg-brand-green/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Respondente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <Card className="bg-brand-white">
              <CardHeader>
                <CardTitle className="text-brand-dark-gray flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Prévia da Pesquisa - {PLAN_CONFIG.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-secondary p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-brand-dark-gray mb-2">
                    {title || 'Título da Pesquisa'}
                  </h3>
                  {description && (
                    <p className="text-muted-foreground mb-4">{description}</p>
                  )}
                  <Badge className="bg-blue-500 text-white">
                    Máx. {PLAN_CONFIG.maxResponses} respostas
                  </Badge>
                </div>

                {questions.map((question, index) => (
                  <div key={question.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="bg-blue-500 text-white text-sm px-2 py-1 rounded font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-brand-dark-gray mb-2">{question.text}</p>
                        
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
                        
                        {question.type === 'star_rating' && (
                          <div className="bg-muted p-4 rounded-lg">
                            <StarRating value={3} disabled className="justify-start" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Recursos de Análise do Plano Vortex */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-brand-dark-gray mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Recursos de Análise - {PLAN_CONFIG.name}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h5 className="font-medium text-brand-dark-gray mb-2">📊 Análise Estatística Avançada</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {PLAN_CONFIG.features.analysis.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-brand-dark-gray mb-2">💭 Análise de Sentimento Segmentada</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {PLAN_CONFIG.features.sentiment.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-brand-dark-gray mb-2 flex items-center gap-1">
                        <PieChart className="h-4 w-4" />
                        Gráficos Intermediários
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
        </Tabs>

        {/* Botões de ação */}
        <div className="flex justify-between items-center pt-6">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="border-brand-dark-blue text-brand-dark-blue hover:bg-brand-dark-blue hover:text-brand-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={createSurvey}
            disabled={isCreating || !title.trim() || questions.length === 0 || currentSurveyCount >= PLAN_CONFIG.maxSurveysPerMonth}
            className="bg-brand-green text-brand-white hover:bg-brand-green/90"
          >
            {isCreating ? 'Criando...' : 'Criar Pesquisa'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateSurveyVortex;