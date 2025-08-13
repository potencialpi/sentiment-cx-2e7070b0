import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { analyzeBatchSentiment, getSentimentInsights } from '@/lib/sentimentAnalysis';
import { BarChart3, PieChart, TrendingUp, Download, Users, MessageSquare, Star, Brain } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';

interface SurveyAnalytics {
  surveyId: string;
  surveyTitle: string;
  totalResponses: number;
  questions: QuestionAnalytics[];
  sentimentOverview: {
    positive: number;
    neutral: number;
    negative: number;
  };
  responsesByDate: { date: string; count: number }[];
}

interface QuestionAnalytics {
  id: string;
  text: string;
  type: string;
  totalResponses: number;
  data: { label: string; value: number; count?: number; color?: string }[];
  sentimentData?: {
    positive: number;
    neutral: number;
    negative: number;
    avgScore: number;
    insights?: string[];
  };
  statisticalData?: {
    mean: number;
    median: number;
    mode: number;
    stdDev: number;
  };
}

interface AnalyticsDashboardProps {
  surveyId: string;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ surveyId }) => {
  const [analytics, setAnalytics] = useState<SurveyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // Buscar dados da pesquisa
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .select('id, title, current_responses')
        .eq('id', surveyId)
        .single();

      if (surveyError) throw surveyError;

      // Buscar questões
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('question_order');

      if (questionsError) throw questionsError;

      // Buscar respostas usando a estrutura correta
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select('*')
        .eq('survey_id', surveyId);

      if (responsesError) throw responsesError;

      // Processar dados para analytics
      const processedQuestions = await Promise.all(
        (questions || []).map(async (question) => {
          // Map responses based on actual schema structure
          const qResponses = responses?.filter(r => {
            if (r.responses && typeof r.responses === 'object') {
              const responsesData = r.responses as Record<string, any>;
              return Object.keys(responsesData).includes(question.id);
            }
            return false;
          }) || [];
          
          let processedData: { label: string; value: number; count?: number }[] = [];
          let sentimentData = undefined;
          let statisticalData = undefined;

          if (question.question_type === 'single_choice' || question.question_type === 'multiple_choice') {
            // Processar dados de escolha
            const choiceCounts: { [key: string]: number } = {};
            qResponses.forEach(response => {
              if (response.responses && typeof response.responses === 'object') {
                const responsesData = response.responses as Record<string, any>;
                const responseValue = responsesData[question.id];
                if (responseValue) {
                  const choices = Array.isArray(responseValue) ? responseValue : [responseValue];
                  choices.forEach(choice => {
                    if (typeof choice === 'string') {
                      choiceCounts[choice] = (choiceCounts[choice] || 0) + 1;
                    }
                  });
                }
              }
            });
            
            processedData = Object.entries(choiceCounts).map(([choice, count]) => ({
              label: choice,
              value: count,
              count: count
            }));
          } else if (question.question_type === 'rating') {
            // Processar dados de rating
            const ratings = qResponses
              .filter(r => {
                if (r.responses && typeof r.responses === 'object') {
                  const responsesData = r.responses as Record<string, any>;
                  const responseValue = responsesData[question.id];
                  return responseValue !== null && typeof responseValue === 'number';
                }
                return false;
              })
              .map(r => {
                const responsesData = r.responses as Record<string, any>;
                return responsesData[question.id] as number;
              });
            
            if (ratings.length > 0) {
              const ratingCounts: { [key: number]: number } = {};
              ratings.forEach(rating => {
                ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
              });
              
              processedData = Object.entries(ratingCounts).map(([rating, count]) => ({
                label: `${rating} estrelas`,
                value: count,
                count: count
              }));
              
              // Calcular estatísticas
              const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
              const sortedRatings = [...ratings].sort((a, b) => a - b);
              const median = sortedRatings[Math.floor(sortedRatings.length / 2)];
              const mode = ratings.reduce((a, b, i, arr) => 
                arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
              );
              const variance = ratings.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / ratings.length;
              const stdDev = Math.sqrt(variance);
              
              statisticalData = { mean, median, mode, stdDev };
            }
          } else if (question.question_type === 'text') {
            // Processar análise de sentimento real
            const textResponses = qResponses.filter(r => r.response_value && typeof r.response_value === 'string' && r.response_value.trim().length > 0);
            
            if (textResponses.length > 0) {
              const texts = textResponses.map(r => {
                const responsesData = r.responses as Record<string, any>;
                return responsesData[question.id] as string;
              });
              const analysis = analyzeBatchSentiment(texts);
              const insights = getSentimentInsights(analysis.summary);
              
              const sentimentCounts = {
                positive: analysis.summary.positive,
                neutral: analysis.summary.neutral,
                negative: analysis.summary.negative
              };
              
              sentimentData = { 
                ...sentimentCounts, 
                avgScore: analysis.summary.averageScore,
                insights
              };
              
              processedData = [
                { label: 'Positivo', value: sentimentCounts.positive },
                { label: 'Neutro', value: sentimentCounts.neutral },
                { label: 'Negativo', value: sentimentCounts.negative }
              ];
            }
          }

          return {
            id: question.id,
            text: question.question_text,
            type: question.question_type,
            totalResponses: qResponses.length,
            data: processedData,
            sentimentData,
            statisticalData
          };
        })
      );

      // Calcular overview de sentimento
      const allSentimentData = processedQuestions
        .filter(q => q.sentimentData)
        .map(q => q.sentimentData!);
      
      const sentimentOverview = {
        positive: allSentimentData.reduce((sum, s) => sum + s.positive, 0),
        neutral: allSentimentData.reduce((sum, s) => sum + s.neutral, 0),
        negative: allSentimentData.reduce((sum, s) => sum + s.negative, 0)
      };

      // Processar respostas por data
      const responsesByDate = responses?.reduce((acc: { [key: string]: number }, response) => {
        const date = new Date(response.created_at).toLocaleDateString('pt-BR');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {}) || {};

      const responsesByDateArray = Object.entries(responsesByDate).map(([date, count]) => ({
        date,
        count
      }));

      setAnalytics({
        surveyId: survey.id,
        surveyTitle: survey.title,
        totalResponses: survey.current_responses,
        questions: processedQuestions,
        sentimentOverview,
        responsesByDate: responsesByDateArray
      });
    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de analytics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    if (surveyId) {
      fetchAnalytics();
    }
  }, [surveyId, fetchAnalytics]);

  const exportData = (format: 'csv' | 'json') => {
    if (!analytics) return;

    const data = {
      survey: {
        id: analytics.surveyId,
        title: analytics.surveyTitle,
        totalResponses: analytics.totalResponses
      },
      questions: analytics.questions.map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
        totalResponses: q.totalResponses,
        data: q.data,
        sentimentData: q.sentimentData,
        statisticalData: q.statisticalData
      })),
      sentimentOverview: analytics.sentimentOverview,
      responsesByDate: analytics.responsesByDate
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${analytics.surveyTitle}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const csvData = analytics.questions.map(q => ({
        'ID da Questão': q.id,
        'Texto da Questão': q.text,
        'Tipo': q.type,
        'Total de Respostas': q.totalResponses,
        'Sentimento Positivo': q.sentimentData?.positive || 0,
        'Sentimento Neutro': q.sentimentData?.neutral || 0,
        'Sentimento Negativo': q.sentimentData?.negative || 0,
        'Score Médio': q.sentimentData?.avgScore || 0,
        'Média Estatística': q.statisticalData?.mean || 0,
        'Mediana': q.statisticalData?.median || 0,
        'Moda': q.statisticalData?.mode || 0,
        'Desvio Padrão': q.statisticalData?.stdDev || 0
      }));

      const csvContent = [
        Object.keys(csvData[0] || {}).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${analytics.surveyTitle}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    toast({
      title: "Sucesso",
      description: `Dados exportados em formato ${format.toUpperCase()}`
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300 animate-pulse" />
          <p className="text-gray-500">Carregando análises...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">Nenhum dado de análise disponível</p>
      </div>
    );
  }

  const selectedQuestionData = analytics.questions.find(q => q.id === selectedQuestion);

  return (
    <div className="space-y-6">
      {/* Header com estatísticas gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Respostas</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalResponses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Questões</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.questions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sentimento Positivo</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.sentimentOverview.positive}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Button onClick={() => exportData('csv')} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button onClick={() => exportData('json')} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                JSON
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seleção de questão */}
      <Card>
        <CardHeader>
          <CardTitle>Análise por Questão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <select
              value={selectedQuestion}
              onChange={(e) => setSelectedQuestion(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              {analytics.questions.map((question) => (
                <option key={question.id} value={question.id}>
                  {question.text.substring(0, 100)}...
                </option>
              ))}
            </select>
          </div>

          {selectedQuestionData && (
            <Tabs defaultValue="chart" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="chart">Gráfico</TabsTrigger>
                <TabsTrigger value="stats">Estatísticas</TabsTrigger>
                <TabsTrigger value="sentiment">Sentimento</TabsTrigger>
              </TabsList>

              <TabsContent value="chart" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico de Barras */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2" />
                        Distribuição de Respostas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={selectedQuestionData.data}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" fill="#3B82F6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Gráfico de Pizza */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <PieChart className="h-5 w-5 mr-2" />
                        Proporção de Respostas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Tooltip />
                          <Legend />
                          <Pie
                            data={selectedQuestionData.data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ label, value }) => `${label}: ${value}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {selectedQuestionData.data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="stats" className="space-y-4">
                {selectedQuestionData.statisticalData ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Star className="h-5 w-5 mr-2" />
                        Estatísticas Descritivas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-600">Média</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {selectedQuestionData.statisticalData.mean.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-sm text-gray-600">Mediana</p>
                          <p className="text-2xl font-bold text-green-600">
                            {selectedQuestionData.statisticalData.median}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-gray-600">Moda</p>
                          <p className="text-2xl font-bold text-yellow-600">
                            {selectedQuestionData.statisticalData.mode}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <p className="text-sm text-gray-600">Desvio Padrão</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {selectedQuestionData.statisticalData.stdDev.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-gray-500">Estatísticas não disponíveis para este tipo de questão</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="sentiment" className="space-y-4">
                {selectedQuestionData.sentimentData ? (
                  <div className="space-y-6">
                    {/* Distribuição de Sentimento */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Brain className="h-5 w-5 mr-2" />
                          Análise de Sentimento
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-sm text-gray-600">Positivo</p>
                            <p className="text-2xl font-bold text-green-600">
                              {selectedQuestionData.sentimentData.positive}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Neutro</p>
                            <p className="text-2xl font-bold text-gray-600">
                              {selectedQuestionData.sentimentData.neutral}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-red-50 rounded-lg">
                            <p className="text-sm text-gray-600">Negativo</p>
                            <p className="text-2xl font-bold text-red-600">
                              {selectedQuestionData.sentimentData.negative}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-gray-600">Score Médio</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {selectedQuestionData.sentimentData.avgScore.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Gráfico de Pizza para Sentimento */}
                        <ResponsiveContainer width="100%" height={300}>
                          <RechartsPieChart>
                            <Tooltip />
                            <Legend />
                            <Pie
                              data={selectedQuestionData.data}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ label, value }) => `${label}: ${value}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {selectedQuestionData.data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Insights de IA */}
                    {selectedQuestionData.sentimentData.insights && selectedQuestionData.sentimentData.insights.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Brain className="h-5 w-5 mr-2" />
                            Insights de IA
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {selectedQuestionData.sentimentData.insights.map((insight, idx) => (
                              <div key={idx} className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                                <p className="text-sm text-gray-700">{insight}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-gray-500">Análise de sentimento não disponível para este tipo de questão</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;