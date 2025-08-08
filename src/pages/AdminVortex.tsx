import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StarRating } from '@/components/ui/star-rating';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Trash2, Plus, Copy, BarChart3, PieChart, Activity, ArrowLeft, LogOut } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'rating' | 'single_choice' | 'multiple_choice' | 'star_rating';
  options: string[];
}

interface Survey {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  current_responses: number;
  max_responses: number;
  unique_link: string;
  user_id: string;
}

const AdminVortex = () => {
  const navigate = useNavigate();
  const [surveyTitle, setSurveyTitle] = useState('');
  const [surveyDescription, setSurveyDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeSurveys, setActiveSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('create');

  useEffect(() => {
    fetchActiveSurveys();
  }, []);

  const fetchActiveSurveys = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar pesquisas:', error);
        return;
      }

      setActiveSurveys(data || []);
    } catch (error) {
      console.error('Erro ao buscar pesquisas:', error);
    }
  };

  const addQuestion = () => {
    if (questions.length >= 10) {
      toast({
        title: "Limite atingido",
        description: "Você pode adicionar no máximo 10 questões.",
        variant: "destructive",
      });
      return;
    }

    const newQuestion: Question = {
      id: Date.now().toString(),
      text: '',
      type: 'text',
      options: []
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, field: keyof Question, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options.length < 5) {
        return { ...q, options: [...q.options, ''] };
      }
      return q;
    }));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return { ...q, options: q.options.filter((_, index) => index !== optionIndex) };
      }
      return q;
    }));
  };

  const generateUniqueLink = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const saveSurvey = async () => {
    if (!surveyTitle.trim()) {
      toast({
        title: "Erro",
        description: "O título da pesquisa é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos uma questão à pesquisa.",
        variant: "destructive",
      });
      return;
    }

    for (const question of questions) {
      if (!question.text.trim()) {
        toast({
          title: "Erro",
          description: "Todas as questões devem ter um texto.",
          variant: "destructive",
        });
        return;
      }

      if ((question.type === 'single_choice' || question.type === 'multiple_choice') && question.options.length < 2) {
        toast({
          title: "Erro",
          description: "Questões de múltipla escolha precisam de pelo menos 2 opções.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado.",
          variant: "destructive",
        });
        return;
      }

      const uniqueLink = generateUniqueLink();

      const { data, error } = await supabase
        .from('surveys')
        .insert({
          title: surveyTitle,
          description: surveyDescription,
          questions: questions,
          status: 'active',
          unique_link: uniqueLink,
          user_id: user.id,
          max_responses: 250,
          current_responses: 0
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso!",
        description: "Pesquisa criada com sucesso.",
      });

      setSurveyTitle('');
      setSurveyDescription('');
      setQuestions([]);
      
      fetchActiveSurveys();
      setActiveTab('active');

    } catch (error: any) {
      console.error('Erro ao salvar pesquisa:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro interno do servidor.",
        variant: "destructive",
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

  return (
    <div className="min-h-screen bg-brand-bg-gray">
      <header className="bg-brand-dark-blue text-brand-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/vortex')}
              className="bg-brand-dark-blue text-brand-white border-brand-white/20 hover:bg-brand-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                supabase.auth.signOut();
                navigate('/');
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
              Criar e Gerenciar Pesquisas - Vortex Neural
            </h2>
            <p className="text-subtitle text-brand-white/80 max-w-3xl mx-auto">
              Configure até 10 questões ou visualize pesquisas ativas
            </p>
          </div>
        </div>
      </header>

      <main className="bg-brand-bg-gray py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="create">Criar Pesquisa</TabsTrigger>
              <TabsTrigger value="active">Pesquisas Ativas</TabsTrigger>
              <TabsTrigger value="analytics">Análises Avançadas</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              <Card className="bg-brand-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-brand-dark-gray">Nova Pesquisa - Vortex Neural</CardTitle>
                  <CardDescription className="text-brand-dark-gray/70">
                    Crie pesquisas com até 10 questões e 250 respostas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="survey-title" className="text-sm font-medium text-brand-dark-gray">
                        Nome da Pesquisa
                      </Label>
                      <Input
                        id="survey-title"
                        placeholder="Ex: Pesquisa de Satisfação Q1 2024"
                        value={surveyTitle}
                        onChange={(e) => setSurveyTitle(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="survey-description" className="text-sm font-medium text-brand-dark-gray">
                        Descrição (Opcional)
                      </Label>
                      <Input
                        id="survey-description"
                        placeholder="Breve descrição da pesquisa"
                        value={surveyDescription}
                        onChange={(e) => setSurveyDescription(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-brand-dark-gray">
                        Questões ({questions.length}/10)
                      </h3>
                      <Button
                        onClick={addQuestion}
                        className="bg-brand-green hover:bg-brand-green/90 text-brand-white font-medium"
                        disabled={questions.length >= 10}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Questão
                      </Button>
                    </div>

                    {questions.map((question, index) => (
                      <Card key={question.id} className="border-l-4 border-l-brand-green bg-brand-white shadow-sm">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-brand-dark-gray">Questão {index + 1}</h4>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeQuestion(question.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`question-${question.id}`} className="text-sm font-medium text-brand-dark-gray">
                                  Texto da Questão
                                </Label>
                                <Textarea
                                  id={`question-${question.id}`}
                                  placeholder="Digite sua questão aqui..."
                                  value={question.text}
                                  onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                                  className="bg-white min-h-[80px]"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`type-${question.id}`} className="text-sm font-medium text-brand-dark-gray">
                                  Tipo de Resposta
                                </Label>
                                <Select
                                  value={question.type}
                                  onValueChange={(value) => {
                                    updateQuestion(question.id, 'type', value);
                                    if (value !== 'single_choice' && value !== 'multiple_choice') {
                                      updateQuestion(question.id, 'options', []);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Selecione o tipo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">Texto Aberto</SelectItem>
                                    <SelectItem value="star_rating">Avaliação 1-5 Estrelas</SelectItem>
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
                                      ) : (
                                        <Checkbox disabled />
                                      )}
                                      <Input
                                        placeholder={`Opção ${optionIndex + 1}`}
                                        value={option}
                                        onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                                        className="flex-1 bg-white"
                                      />
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => removeOption(question.id, optionIndex)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {question.type === 'star_rating' && (
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

                  <div className="flex justify-center pt-6">
                    <Button
                      onClick={saveSurvey}
                      disabled={isLoading}
                      className="bg-brand-green hover:bg-brand-green/90 hover:shadow-lg text-brand-white font-medium px-8 py-3 text-lg transition-all duration-300"
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
                  <CardTitle className="text-brand-dark-gray">Pesquisas Ativas</CardTitle>
                  <CardDescription className="text-brand-dark-gray/70">
                    Gerencie suas pesquisas em andamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeSurveys.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-brand-dark-gray mb-4">Nenhuma pesquisa ativa encontrada.</p>
                      <Button
                        onClick={() => setActiveTab('create')}
                        className="bg-brand-green hover:bg-brand-green/90 text-brand-white"
                      >
                        Criar Primeira Pesquisa
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeSurveys.map((survey) => (
                        <Card key={survey.id} className="border-l-4 border-l-brand-green bg-brand-white shadow-sm">
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              <h3 className="font-semibold text-brand-dark-gray truncate">{survey.title}</h3>
                              <div className="text-sm text-brand-dark-gray space-y-1">
                                <p><strong>Criada em:</strong> {formatDate(survey.created_at)}</p>
                                <p><strong>Status:</strong> {survey.status}</p>
                                <p><strong>Respostas:</strong> {survey.current_responses}/{survey.max_responses}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyLinkToClipboard(survey.unique_link)}
                                  className="flex-1 border-brand-dark-gray text-brand-dark-gray hover:bg-brand-dark-gray hover:text-brand-white"
                                >
                                  <Copy className="w-4 h-4 mr-1" />
                                  Copiar Link
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
                  <CardTitle className="text-brand-dark-gray flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Análises Avançadas - Vortex Neural
                  </CardTitle>
                  <CardDescription className="text-brand-dark-gray/70">
                    Análises estatísticas intermediárias e sentimento segmentado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-brand-dark-blue text-brand-white shadow-sm">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-brand-green" />
                          <h3 className="font-semibold mb-2">Análise Estatística</h3>
                          <ul className="text-sm space-y-1">
                            <li>• Média, Mediana, Moda</li>
                            <li>• Desvio Padrão</li>
                            <li>• Percentis (25, 50, 75)</li>
                            <li>• Correlação entre questões</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-brand-dark-blue text-brand-white shadow-sm">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Activity className="w-8 h-8 mx-auto mb-2 text-brand-green" />
                          <h3 className="font-semibold mb-2">Sentimento Segmentado</h3>
                          <ul className="text-sm space-y-1">
                            <li>• Por tema (atendimento, produto, preço)</li>
                            <li>• 5 níveis de intensidade</li>
                            <li>• Análise via IA</li>
                            <li>• Tendências temporais</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-brand-dark-blue text-brand-white shadow-sm">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <PieChart className="w-8 h-8 mx-auto mb-2 text-brand-green" />
                          <h3 className="font-semibold mb-2">Gráficos Avançados</h3>
                          <ul className="text-sm space-y-1">
                            <li>• Gráfico de Barras</li>
                            <li>• Gráfico de Pizza</li>
                            <li>• Boxplot para outliers</li>
                            <li>• Exportação CSV/JSON/Parquet</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-6 text-center">
                    <p className="text-brand-dark-gray mb-4">
                      As análises avançadas ficam disponíveis após coletar respostas nas suas pesquisas.
                    </p>
                    <Button
                      onClick={() => setActiveTab('create')}
                      className="bg-brand-green hover:bg-brand-green/90 text-brand-white"
                    >
                      Criar Nova Pesquisa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminVortex;