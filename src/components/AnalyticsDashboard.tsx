import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { analyzeBatchSentiment, getSentimentInsights } from '@/lib/sentimentAnalysis';
import { BarChart3, PieChart, TrendingUp, Download, Users, MessageSquare, Star, Brain, TrendingDown } from 'lucide-react';
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
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
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
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line' | 'area' | 'histogram'>('bar');

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
            const textResponses = qResponses.filter(r => r.responses && typeof r.responses === 'object');
            
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
      {/* Header com estatísticas gerais - Design Moderno */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card Total de Respostas - Gradient Purple */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white/20 rounded-lg p-2 mb-2">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-purple-100 text-xs font-medium mb-1">Total de Respostas</p>
            <p className="text-2xl font-bold">{analytics.totalResponses}</p>
          </div>
          <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-white/10 rounded-full"></div>
        </div>

        {/* Card Questões - Gradient Blue */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white/20 rounded-lg p-2 mb-2">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="text-blue-100 text-xs font-medium mb-1">Questões</p>
            <p className="text-2xl font-bold">{analytics.questions.length}</p>
          </div>
          <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-white/10 rounded-full"></div>
        </div>

        {/* Card Sentimento Positivo - Gradient Green */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white/20 rounded-lg p-2 mb-2">
              <TrendingUp className="h-5 w-5" />
            </div>
            <p className="text-emerald-100 text-xs font-medium mb-1">Sentimento Positivo</p>
            <p className="text-2xl font-bold">{analytics.sentimentOverview.positive}</p>
          </div>
          <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-white/10 rounded-full"></div>
        </div>

        {/* Card Sentimento Negativo - Gradient Red */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-red-500 to-red-700 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white/20 rounded-lg p-2 mb-2">
              <TrendingDown className="h-5 w-5" />
            </div>
            <p className="text-red-100 text-xs font-medium mb-1">Sentimento Negativo</p>
            <p className="text-2xl font-bold">{analytics.sentimentOverview.negative}</p>
          </div>
          <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-white/10 rounded-full"></div>
        </div>

        {/* Card Sentimento Neutro - Gradient Yellow */}
        {analytics.sentimentOverview.neutral > 0 && (
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-700 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="bg-white/20 rounded-lg p-2 mb-2">
                <Brain className="h-5 w-5" />
              </div>
              <p className="text-yellow-100 text-xs font-medium mb-1">Sentimento Neutro</p>
              <p className="text-2xl font-bold">{analytics.sentimentOverview.neutral}</p>
            </div>
            <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>
        )}

        {/* Card de Exportar */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white/20 rounded-lg p-2 mb-2">
              <Download className="h-5 w-5" />
            </div>
            <p className="text-orange-100 text-xs font-medium mb-1">Exportar</p>
            <div className="flex flex-col space-y-1">
              <Button 
                onClick={() => exportData('csv')} 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-white/20 border-white/30 border h-6 px-2 text-xs"
              >
                CSV
              </Button>
              <Button 
                onClick={() => exportData('json')} 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-white/20 border-white/30 border h-6 px-2 text-xs"
              >
                JSON
              </Button>
            </div>
          </div>
          <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-white/10 rounded-full"></div>
        </div>
      </div>

      {/* Análises Avançadas */}
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
          <h3 className="text-2xl font-bold text-foreground">Análises Avançadas</h3>
        </div>
        
        {/* Dashboard de Análise Geral */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              Dashboard de Análise Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="sentiment">Sentimentos</TabsTrigger>
                <TabsTrigger value="trends">Tendências</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="relative p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Total de Questões</p>
                        <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{analytics.questions.length}</p>
                      </div>
                      <div className="p-3 bg-blue-500/10 rounded-lg">
                        <MessageSquare className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 rounded-xl border border-purple-200/50 dark:border-purple-800/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Tipos de Questão</p>
                        <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                          {new Set(analytics.questions.map(q => q.type)).size}
                        </p>
                      </div>
                      <div className="p-3 bg-purple-500/10 rounded-lg">
                        <Brain className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-xl border border-emerald-200/50 dark:border-emerald-800/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">Taxa de Resposta</p>
                        <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                          {analytics.totalResponses > 0 ? '100%' : '0%'}
                        </p>
                      </div>
                      <div className="p-3 bg-emerald-500/10 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
                  <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Respostas por Questão
                  </h4>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={analytics.questions.map(q => ({
                          name: q.text.substring(0, 20) + '...',
                          respostas: q.totalResponses
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={{ stroke: 'hsl(var(--muted-foreground) / 0.3)' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={{ stroke: 'hsl(var(--muted-foreground) / 0.3)' }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                        />
                        <Bar 
                          dataKey="respostas" 
                          fill="url(#barGradient)"
                          radius={[4, 4, 0, 0]}
                        />
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" />
                            <stop offset="100%" stopColor="hsl(var(--primary) / 0.6)" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="sentiment" className="space-y-4">
                {(() => {
                  const allSentiments = analytics.questions
                    .filter(q => q.sentimentData)
                    .flatMap(q => q.sentimentData ? [q.sentimentData] : []);
                  
                  const sentimentCounts = {
                    positive: allSentiments.reduce((sum, s) => sum + s.positive, 0),
                    neutral: allSentiments.reduce((sum, s) => sum + s.neutral, 0),
                    negative: allSentiments.reduce((sum, s) => sum + s.negative, 0)
                  };
                  
                  const avgScore = allSentiments.length > 0 
                    ? allSentiments.reduce((sum, s) => sum + s.avgScore, 0) / allSentiments.length 
                    : 0;
                    
                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-secondary rounded-lg">
                          <p className="text-sm text-muted-foreground">Positivos</p>
                          <p className="text-2xl font-bold text-green-600">
                            {sentimentCounts.positive}
                          </p>
                        </div>
                        <div className="p-4 bg-secondary rounded-lg">
                          <p className="text-sm text-muted-foreground">Neutros</p>
                          <p className="text-2xl font-bold text-yellow-600">
                            {sentimentCounts.neutral}
                          </p>
                        </div>
                        <div className="p-4 bg-secondary rounded-lg">
                          <p className="text-sm text-muted-foreground">Negativos</p>
                          <p className="text-2xl font-bold text-red-600">
                            {sentimentCounts.negative}
                          </p>
                        </div>
                        <div className="p-4 bg-secondary rounded-lg">
                          <p className="text-sm text-muted-foreground">Score Médio</p>
                          <p className="text-2xl font-bold">
                            {avgScore.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      
                      {Object.values(sentimentCounts).some(v => v > 0) && (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={[
                                  { name: 'Positivo', value: sentimentCounts.positive, fill: '#22c55e' },
                                  { name: 'Neutro', value: sentimentCounts.neutral, fill: '#eab308' },
                                  { name: 'Negativo', value: sentimentCounts.negative, fill: '#ef4444' }
                                ].filter(item => item.value > 0)}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                dataKey="value"
                                label
                              />
                              <Tooltip />
                              <Legend />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </>
                  );
                })()}
              </TabsContent>
              
              <TabsContent value="trends" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground">Questão Mais Respondida</p>
                    <p className="font-semibold">
                      {analytics.questions.length > 0 
                        ? analytics.questions.reduce((max, q) => 
                            q.totalResponses > max.totalResponses ? q : max
                          ).text.substring(0, 50) + '...'
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div className="p-4 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground">Tipo Mais Comum</p>
                    <p className="font-semibold">
                      {analytics.questions.length > 0 
                        ? Object.entries(
                            analytics.questions.reduce((acc, q) => {
                              acc[q.type] = (acc[q.type] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          ).reduce((max, [type, count]) => 
                            count > max.count ? { type, count } : max, 
                            { type: 'N/A', count: 0 }
                          ).type
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Distribuição por Tipo de Questão</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={
                        Object.entries(
                          analytics.questions.reduce((acc, q) => {
                            acc[q.type] = (acc[q.type] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([type, count]) => ({ type, count }))
                      }>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Análise por Questão */}
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
                {/* Seletor de tipo de gráfico */}
                <div className="mb-4">
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value as 'bar' | 'pie' | 'line' | 'area' | 'histogram')}
                    className="p-2 border border-gray-300 rounded-md"
                  >
                    <option value="bar">Gráfico de Barras</option>
                    <option value="pie">Gráfico de Pizza</option>
                    <option value="line">Gráfico de Linha</option>
                    <option value="area">Gráfico de Área</option>
                    <option value="histogram">Histograma</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico Principal */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2" />
                        {chartType === 'bar' && 'Distribuição de Respostas'}
                        {chartType === 'pie' && 'Proporção de Respostas'}
                        {chartType === 'line' && 'Tendência de Respostas'}
                        {chartType === 'area' && 'Área de Respostas'}
                        {chartType === 'histogram' && 'Histograma de Distribuição'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        {chartType === 'bar' ? (
                          <BarChart data={selectedQuestionData.data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#3B82F6" />
                          </BarChart>
                        ) : chartType === 'pie' ? (
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
                        ) : chartType === 'line' ? (
                          <LineChart data={selectedQuestionData.data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
                          </LineChart>
                        ) : chartType === 'area' ? (
                          <AreaChart data={selectedQuestionData.data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                          </AreaChart>
                        ) : (
                          <BarChart data={selectedQuestionData.data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#10B981" />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Gráfico Secundário - Sempre pizza para comparação */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <PieChart className="h-5 w-5 mr-2" />
                        Proporção Geral
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
    </div>
  );
};

export default AnalyticsDashboard;
