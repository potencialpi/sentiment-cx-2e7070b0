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
      if (!user) {
        toast({
          title: "Erro de autenticação",
          description: "Usuário não encontrado. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveSurveys(data || []);
    } catch (error) {
      console.error('Erro ao buscar pesquisas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as pesquisas ativas.",
        variant: "destructive",
      });
    }
  };

  const addQuestion = () => {
    if (questions.length >= 10) {
      toast({
        title: "Limite alcançado",
        description: "O plano Vortex Neural permite até 10 questões por pesquisa.",
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
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const addOption = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.options.length >= 5) {
      toast({
        title: "Limite de opções",
        description: "Máximo de 5 opções por questão.",
        variant: "destructive",
      });
      return;
    }

    updateQuestion(questionId, 'options', [...(question?.options || []), '']);
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      const newOptions = [...question.options];
      newOptions[optionIndex] = value;
      updateQuestion(questionId, 'options', newOptions);
    }
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      const newOptions = question.options.filter((_, index) => index !== optionIndex);
      updateQuestion(questionId, 'options', newOptions);
    }
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

    // Validar questões
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
      if (!user) throw new Error('Usuário não autenticado');

      // Verificar limite de pesquisas por mês (Vortex Neural: 4 pesquisas/mês)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const { data: monthlySurveys, error: countError } = await supabase
        .from('surveys')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', new Date(currentYear, currentMonth, 1).toISOString())
        .lt('created_at', new Date(currentYear, currentMonth + 1, 1).toISOString());

      if (countError) throw countError;

      if (monthlySurveys && monthlySurveys.length >= 4) {
        toast({
          title: "Limite mensal atingido",
          description: "O plano Vortex Neural permite até 4 pesquisas por mês.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const uniqueLink = generateUniqueLink();

      // Criar a pesquisa
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .insert({
          title: surveyTitle,
          description: surveyDescription,
          user_id: user.id,
          unique_link: uniqueLink,
          max_responses: 250, // Limite Vortex Neural
          status: 'active'
        })
        .select()
        .single();

      if (surveyError) throw surveyError;

      // Criar as questões
      const questionsData = questions.map((question, index) => ({
        survey_id: surveyData.id,
        question_text: question.text,
        question_type: question.type === 'star_rating' ? 'rating' : question.type,
        question_order: index + 1,
        options: question.options.length > 0 ? question.options : null
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsData);

      if (questionsError) throw questionsError;

      toast({
        title: "Sucesso!",
        description: "Pesquisa criada com sucesso.",
      });

      // Limpar formulário
      setSurveyTitle('');
      setSurveyDescription('');
      setQuestions([]);
      
      // Atualizar lista de pesquisas ativas
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
    <div className="min-h-screen bg-gray-50">
      {/* Header Section - Dark Blue Background */}
      <section className="bg-[#0A192F] text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/vortex')}
              className="bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90 border-[#1E3A8A]"
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
              className="bg-[#10B981] text-white hover:bg-[#10B981]/90 border-[#10B981]"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
          <div className="text-center">
            <h1 className="text-sm md:text-base font-medium mb-4">Sentiment CX</h1>
            <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold mb-4">
              Criar e Gerenciar Pesquisas - Vortex Neural
            </h2>
            <p className="text-base md:text-lg lg:text-xl opacity-90 max-w-3xl mx-auto">
              Configure até 10 questões ou visualize pesquisas ativas
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Section - Light Gray Background */}
      <section className="bg-[#D1D5DB] py-8">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="create">Criar Pesquisa</TabsTrigger>
              <TabsTrigger value="active">Pesquisas Ativas</TabsTrigger>
              <TabsTrigger value="analytics">Análises Avançadas</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#333333]">Nova Pesquisa - Vortex Neural</CardTitle>
                  <CardDescription className="text-[#333333]">
                    Crie pesquisas com até 10 questões e 250 respostas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Survey Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="survey-title" className="text-sm font-medium text-[#333333]">
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
                      <Label htmlFor="survey-description" className="text-sm font-medium text-[#333333]">
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

                  {/* Questions Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[#333333]">
                        Questões ({questions.length}/10)
                      </h3>
                      <Button
                        onClick={addQuestion}
                        className="bg-[#10B981] hover:bg-[#059669] text-white font-medium"
                        disabled={questions.length >= 10}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Questão
                      </Button>
                    </div>

                    {questions.map((question, index) => (
                      <Card key={question.id} className="border-l-4 border-l-[#00FF00]">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            {/* Question Header */}
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-[#333333]">Questão {index + 1}</h4>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeQuestion(question.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Question Text */}
                              <div className="space-y-2">
                                <Label htmlFor={`question-${question.id}`} className="text-sm font-medium text-[#333333]">
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

                              {/* Question Type */}
                              <div className="space-y-2">
                                <Label htmlFor={`type-${question.id}`} className="text-sm font-medium text-[#333333]">
                                  Tipo de Resposta
                                </Label>
                                <Select
                                  value={question.type}
                                  onValueChange={(value) => {
                                    updateQuestion(question.id, 'type', value);
                                    if (value === 'single_choice' || value === 'multiple_choice') {
                                      updateQuestion(question.id, 'options', ['Opção 1', 'Opção 2']);
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

                            {/* Options for Multiple Choice Questions */}
                            {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium text-[#333333]">
                                    Opções de Resposta ({question.options.length}/5)
                                  </Label>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addOption(question.id)}
                                    disabled={question.options.length >= 5}
                                    className="bg-[#10B981] text-white hover:bg-[#059669] border-[#10B981]"
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

                              {/* Star Rating Preview */}
                              {question.type === 'star_rating' && (
                                <div className="mt-4">
                                  <Label className="text-sm font-medium text-[#333333] mb-3 block">
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

                  {/* Save Button */}
                  <div className="flex justify-center pt-6">
                    <Button
                      onClick={saveSurvey}
                      disabled={isLoading}
                      className="bg-[#10B981] hover:bg-[#059669] hover:shadow-lg text-white font-medium px-8 py-3 text-lg transition-all duration-300"
                    >
                      {isLoading ? 'Salvando...' : 'Salvar Pesquisa'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="active" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#333333]">Pesquisas Ativas</CardTitle>
                  <CardDescription className="text-[#333333]">
                    Gerencie suas pesquisas em andamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeSurveys.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-[#333333] mb-4">Nenhuma pesquisa ativa encontrada.</p>
                      <Button
                        onClick={() => setActiveTab('create')}
                        className="bg-[#00FF00] hover:bg-[#00FF00]/90 text-[#333333]"
                      >
                        Criar Primeira Pesquisa
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeSurveys.map((survey) => (
                        <Card key={survey.id} className="border-l-4 border-l-[#00FF00]">
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              <h3 className="font-semibold text-[#333333] truncate">{survey.title}</h3>
                              <div className="text-sm text-[#333333] space-y-1">
                                <p><strong>Criada em:</strong> {formatDate(survey.created_at)}</p>
                                <p><strong>Status:</strong> {survey.status}</p>
                                <p><strong>Respostas:</strong> {survey.current_responses}/{survey.max_responses}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyLinkToClipboard(survey.unique_link)}
                                  className="flex-1"
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#333333] flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Análises Avançadas - Vortex Neural
                  </CardTitle>
                  <CardDescription className="text-[#333333]">
                    Análises estatísticas intermediárias e sentimento segmentado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Análise Estatística */}
                    <Card className="bg-[#0A192F] text-white">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-[#00FF00]" />
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

                    {/* Análise de Sentimento */}
                    <Card className="bg-[#0A192F] text-white">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Activity className="w-8 h-8 mx-auto mb-2 text-[#00FF00]" />
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

                    {/* Gráficos Interativos */}
                    <Card className="bg-[#0A192F] text-white">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <PieChart className="w-8 h-8 mx-auto mb-2 text-[#00FF00]" />
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
                    <p className="text-[#333333] mb-4">
                      As análises avançadas ficam disponíveis após coletar respostas nas suas pesquisas.
                    </p>
                    <Button
                      onClick={() => setActiveTab('create')}
                      className="bg-[#00FF00] hover:bg-[#00FF00]/90 text-[#333333]"
                    >
                      Criar Nova Pesquisa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
};

export default AdminVortex;