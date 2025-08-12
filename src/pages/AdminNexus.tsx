import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Trash2, Copy, ExternalLink, Download, BarChart3, PieChart, TrendingUp, Users, Calendar, Activity, ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from 'react-router-dom';

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

const AdminNexus = () => {
  const navigate = useNavigate();
  const [surveyTitle, setSurveyTitle] = useState("");
  const [surveyDescription, setSurveyDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeSurveys, setActiveSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("create");


  const fetchActiveSurveys = useCallback(async () => {
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
    }
  }, [toast]);

  useEffect(() => {
    fetchActiveSurveys();
  }, [fetchActiveSurveys]);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: "",
      type: 'single_choice',
      options: ["", ""]
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

  const saveSurvey = async () => {
    if (!surveyTitle.trim()) {
      toast({
        title: "Erro de validação",
        description: "Por favor, insira um título para a pesquisa.",
        variant: "destructive",
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: "Erro de validação",
        description: "Por favor, adicione pelo menos uma questão.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Create survey
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .insert({
          title: surveyTitle,
          description: surveyDescription,
          user_id: user.id,
          unique_link: `${crypto.randomUUID()}`,
          max_responses: 999999, // Unlimited for Nexus
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
        options: (q.type === 'single_choice' || q.type === 'multiple_choice') ? q.options.filter(opt => opt.trim()) : null,
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsData);

      if (questionsError) throw questionsError;

      toast({
        title: "Pesquisa salva com sucesso!",
        description: "Sua pesquisa foi criada e está pronta para receber respostas.",
      });

      // Reset form
      setSurveyTitle("");
      setSurveyDescription("");
      setQuestions([]);
      fetchActiveSurveys();
      setActiveTab("surveys");

    } catch (error) {
      console.error('Error saving survey:', error);
      toast({
        title: "Erro ao salvar pesquisa",
        description: "Ocorreu um erro ao salvar a pesquisa. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/survey/${link}`);
    toast({
      title: "Link copiado!",
      description: "O link da pesquisa foi copiado para a área de transferência.",
    });
  };

  const exportData = (format: 'csv' | 'json' | 'parquet') => {
    toast({
      title: `Exportando ${format.toUpperCase()}`,
      description: "A exportação será iniciada em breve.",
    });
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
              onClick={async () => {
                const { robustLogout } = await import('@/lib/authUtils');
                await robustLogout(navigate);
              }}
              className="bg-brand-green text-brand-white hover:bg-brand-green/90 border-brand-green"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
          <div className="text-center">
            <h1 className="text-nav font-semibold mb-4">Sentiment CX</h1>
            <h2 className="text-hero font-bold mb-4 flex items-center justify-center gap-2">
              <Activity className="h-8 w-8" />
              Criar e Gerenciar Pesquisas - Nexus Infinito
            </h2>
            <p className="text-subtitle text-brand-white/80 max-w-3xl mx-auto">
              Configure pesquisas ilimitadas ou visualize pesquisas ativas
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Section - Padrão do Design System */}
      <main className="bg-brand-bg-gray py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="create">Criar Pesquisa</TabsTrigger>
              <TabsTrigger value="active">Pesquisas Ativas</TabsTrigger>
              <TabsTrigger value="analytics">Análises Avançadas</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              <Card className="bg-brand-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-brand-dark-gray">
                    <BarChart3 className="h-5 w-5" />
                    Criar Nova Pesquisa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Survey Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Nome da Pesquisa</Label>
                      <Input
                        id="title"
                        value={surveyTitle}
                        onChange={(e) => setSurveyTitle(e.target.value)}
                        placeholder="Digite o nome da pesquisa"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição (Opcional)</Label>
                      <Input
                        id="description"
                        value={surveyDescription}
                        onChange={(e) => setSurveyDescription(e.target.value)}
                        placeholder="Breve descrição da pesquisa"
                      />
                    </div>
                  </div>

                  {/* Questions Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Questões (Ilimitadas)</h3>
                      <Button onClick={addQuestion} className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white">
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
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <Input
                            value={question.text}
                            onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                            placeholder="Digite sua questão aqui"
                          />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Tipo de Resposta</Label>
                              <Select
                                value={question.type}
                                onValueChange={(value) => updateQuestion(question.id, 'type', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="single_choice">Escolha Única</SelectItem>
                                  <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                                  <SelectItem value="text">Texto Aberto</SelectItem>
                                  <SelectItem value="rating">Avaliação 1-5 Estrelas</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label>Opções de Resposta (min. 2, máx. 5)</Label>
                                  {question.options.length < 5 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addOption(question.id)}
                                      className="bg-[#10B981] text-white hover:bg-[#059669] border-[#10B981]"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                {question.options.map((option, optIndex) => (
                                  <div key={optIndex} className="flex items-center gap-2">
                                    <Input
                                      value={option}
                                      onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                                      placeholder={`Opção ${optIndex + 1}`}
                                    />
                                    {question.options.length > 2 && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removeOption(question.id, optIndex)}
                                        className="bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Preview Section */}
                          {question.text && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                              <Label className="font-medium">Prévia:</Label>
                              <p className="mt-2 text-sm">{question.text}</p>
                              
                              {question.type === 'single_choice' && (
                                <RadioGroup className="mt-2">
                                  {question.options.filter(opt => opt.trim()).map((option, idx) => (
                                    <div key={idx} className="flex items-center space-x-2">
                                      <RadioGroupItem value={option} id={`preview-${question.id}-${idx}`} />
                                      <Label htmlFor={`preview-${question.id}-${idx}`}>{option}</Label>
                                    </div>
                                  ))}
                                </RadioGroup>
                              )}

                              {question.type === 'multiple_choice' && (
                                <div className="mt-2 space-y-2">
                                  {question.options.filter(opt => opt.trim()).map((option, idx) => (
                                    <div key={idx} className="flex items-center space-x-2">
                                      <Checkbox id={`preview-multi-${question.id}-${idx}`} />
                                      <Label htmlFor={`preview-multi-${question.id}-${idx}`}>{option}</Label>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {question.type === 'text' && (
                                <Textarea 
                                  placeholder="Campo de texto aberto para resposta"
                                  disabled
                                  className="mt-2"
                                />
                              )}

                              {question.type === 'rating' && (
                                <div className="mt-2">
                                  <p className="text-sm mb-2">Avaliação por estrelas:</p>
                                  <StarRating value={0} disabled className="justify-start" />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Star Rating Preview for standalone */}
                          {question.type === 'rating' && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                              <Label className="font-medium">Prévia da Avaliação por Estrelas:</Label>
                              <p className="mt-2 text-sm text-gray-600">{question.text || "Sua questão aparecerá aqui"}</p>
                              <StarRating value={0} disabled className="justify-start mt-2" />
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-center pt-6">
                    <Button 
                      onClick={saveSurvey} 
                      disabled={isLoading}
                      className="bg-[#10B981] hover:bg-[#059669] text-white px-8 py-3"
                    >
                      {isLoading ? "Salvando..." : "Salvar Pesquisa"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="active" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Pesquisas Ativas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeSurveys.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma pesquisa ativa encontrada.</p>
                      <p className="text-sm">Crie sua primeira pesquisa na aba "Criar Pesquisa".</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {activeSurveys.map((survey) => (
                        <Card key={survey.id} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold text-lg">{survey.title}</h3>
                              <Badge variant="secondary">{survey.status}</Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>Criada em: {new Date(survey.created_at).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>Respondentes: {survey.current_responses} / Ilimitado</span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyLink(survey.unique_link)}
                                className="w-full"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar Link
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`/survey/${survey.unique_link}`, '_blank')}
                                className="w-full"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Abrir Pesquisa
                              </Button>
                            </div>
                          </div>
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
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Analytics Avançado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center p-6 bg-blue-50 rounded-lg">
                      <PieChart className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <h3 className="font-semibold">Análise Estatística Avançada</h3>
                      <p className="text-sm text-gray-600 mt-2">
                        ANOVA, Clustering K-Means, Séries Temporais, Testes de Hipóteses
                      </p>
                    </div>
                    <div className="text-center p-6 bg-green-50 rounded-lg">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <h3 className="font-semibold">Sentimento Multicanal</h3>
                      <p className="text-sm text-gray-600 mt-2">
                        Análise personalizada por temas customizados
                      </p>
                    </div>
                    <div className="text-center p-6 bg-purple-50 rounded-lg">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <h3 className="font-semibold">Modelos Preditivos</h3>
                      <p className="text-sm text-gray-600 mt-2">
                        Probabilidade de recomendação e percepção de marca
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => exportData('csv')}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => exportData('json')}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar JSON
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => exportData('parquet')}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar Parquet
                    </Button>
                  </div>

                  <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-4">Recursos Exclusivos do Nexus Infinito:</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• Questões ilimitadas por pesquisa</li>
                      <li>• Respostas ilimitadas por pesquisa</li>
                      <li>• Até 15 pesquisas por mês</li>
                      <li>• Análise conjoint para trade-offs</li>
                      <li>• Clustering K-Means para segmentação</li>
                      <li>• Séries temporais para previsão de tendências</li>
                      <li>• Testes não paramétricos e análise de confiabilidade</li>
                      <li>• Modelos preditivos personalizados</li>
                      <li>• Índice de percepção de marca</li>
                      <li>• Análise de sentimento multicanal customizada</li>
                    </ul>
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

export default AdminNexus;