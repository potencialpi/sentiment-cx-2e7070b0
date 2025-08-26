import React, { useState, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useSurveyAnalytics } from '@/hooks/useSurveyAnalytics';
import { analyzeBatchSentiment, getSentimentInsights } from '@/lib/sentimentAnalysis';
import { BarChart3, TreePine, TrendingUp, Download, Users, MessageSquare, Star, Brain, TrendingDown, PieChart } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Treemap,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell
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
  responses: any[];
  statistics: {
    totalResponses: number;
    averageRating?: number;
    mostCommonAnswer?: string;
    sentimentBreakdown?: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };
}

interface AnalyticsDashboardProps {
  surveyId: string;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ surveyId }) => {
  const { analytics, loading, error, refreshAnalytics } = useSurveyAnalytics(surveyId);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [chartType, setChartType] = useState<'bar' | 'treemap' | 'line' | 'area' | 'histogram'>('treemap');

  // Dados processados usando useMemo para otimização

  const exportData = useCallback((format: 'csv' | 'json') => {
    if (!analytics) return;

    const data = {
      survey: {
        totalResponses: analytics.totalResponses,
        averageRating: analytics.averageRating,
        completionRate: analytics.completionRate
      },
      questions: analytics.questions.map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
        responses: q.responses,
        statistics: q.statistics
      })),
      sentimentOverview: analytics.sentimentOverview,
      responsesByDate: analytics.responsesByDate
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = `analytics-survey-${surveyId}-${new Date().toISOString().split('T')[0]}.json`;
      downloadLink.click();
      URL.revokeObjectURL(downloadUrl);
    } else if (format === 'csv') {
      const csvData = analytics.questions.map(q => ({
        'ID da Questão': q.id,
        'Texto da Questão': q.text,
        'Tipo': q.type,
        'Total de Respostas': q.statistics.totalResponses,
        'Sentimento Positivo': q.statistics.sentimentBreakdown?.positive || 0,
        'Sentimento Neutro': q.statistics.sentimentBreakdown?.neutral || 0,
        'Sentimento Negativo': q.statistics.sentimentBreakdown?.negative || 0,
        'Média de Rating': q.statistics.averageRating || 0,
        'Resposta Mais Comum': q.statistics.mostCommonAnswer || 'N/A'
      }));

      const csvContent = [
        Object.keys(csvData[0] || {}).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = `analytics-survey-${surveyId}-${new Date().toISOString().split('T')[0]}.csv`;
      downloadLink.click();
      URL.revokeObjectURL(downloadUrl);
    }

    toast({
      title: "Sucesso",
      description: `Dados exportados em formato ${format.toUpperCase()}`
    });
  }, [analytics, surveyId, toast]);

  // Precompute memoized data before any early returns to maintain consistent hook order
  const selectedQuestionData = useMemo(() => {
    return analytics?.questions.find(q => q.id === selectedQuestion);
  }, [analytics?.questions, selectedQuestion]);

  const sentimentOverviewData = useMemo(() => {
    if (!analytics) return [] as Array<{ name: string; value: number; color: string }>;
    return [
      { name: 'Positivo', value: analytics.sentimentOverview.positive, color: '#10B981' },
      { name: 'Neutro', value: analytics.sentimentOverview.neutral, color: '#6B7280' },
      { name: 'Negativo', value: analytics.sentimentOverview.negative, color: '#EF4444' }
    ].filter(item => item.value > 0);
  }, [analytics?.sentimentOverview]);

  const responsesByDateData = useMemo(() => {
    if (!analytics) return [] as Array<{ name: string; value: number }>;
    return analytics.responsesByDate.map(item => ({
      name: item.date,
      value: item.count
    }));
  }, [analytics?.responsesByDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-600 animate-pulse" />
          <p className="text-gray-500">Carregando análises...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-500">Nenhum dado de análise disponível</p>
      </div>
    );
  }

  // moved above early returns to keep hook order consistent

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
                  <div className="relative p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/30 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl border border-blue-500/30 dark:border-blue-800/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Total de Questões</p>
                        <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{analytics.questions.length}</p>
                      </div>
                      <div className="p-3 bg-blue-500/10 rounded-lg">
                        <MessageSquare className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative p-6 bg-gradient-to-br from-purple-500/20 to-purple-600/30 dark:from-purple-950/30 dark:to-purple-900/20 rounded-xl border border-purple-500/30 dark:border-purple-800/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">Tipos de Questão</p>
                        <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                          {new Set(analytics.questions.map(q => q.type)).size}
                        </p>
                      </div>
                      <div className="p-3 bg-purple-500/10 rounded-lg">
                        <Brain className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative p-6 bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-xl border border-emerald-500/30 dark:border-emerald-800/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-1">Taxa de Resposta</p>
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
                
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-400/50 dark:border-gray-700/50">
                  <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Respostas por Questão
                  </h4>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={analytics.questions.map(q => ({
                          name: q.text.substring(0, 20) + '...',
                          respostas: q.statistics.totalResponses
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
                    .filter(q => q.statistics.sentimentBreakdown)
                    .map(q => q.statistics.sentimentBreakdown!)
                    .filter(Boolean);
                  
                  const sentimentCounts = {
                    positive: allSentiments.reduce((sum, s) => sum + s.positive, 0),
                    neutral: allSentiments.reduce((sum, s) => sum + s.neutral, 0),
                    negative: allSentiments.reduce((sum, s) => sum + s.negative, 0)
                  };
                  
                  const avgRating = analytics.questions
                    .filter(q => q.statistics.averageRating !== undefined)
                    .reduce((sum, q, _, arr) => sum + (q.statistics.averageRating! / arr.length), 0);
                  
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
                            {avgRating.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      
                      {Object.values(sentimentCounts).some(v => v > 0) && (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <Treemap
                              data={[
                                { name: 'Positivo', size: sentimentCounts.positive, fill: '#FF6B6B' },
                                { name: 'Neutro', size: sentimentCounts.neutral, fill: '#FFEAA7' },
                                { name: 'Negativo', size: sentimentCounts.negative, fill: '#4ECDC4' }
                              ].filter(item => item.size > 0)}
                              dataKey="size"
                              ratio={4/3}
                              stroke="#fff"
                              strokeWidth={2}
                              content={({ root, depth, x, y, width, height, index, payload, colors, rank, name }) => {
                                return (
                                  <g>
                                    <rect
                                      x={x}
                                      y={y}
                                      width={width}
                                      height={height}
                                      style={{
                                        fill: payload.fill,
                                        stroke: '#fff',
                                        strokeWidth: 2,
                                        strokeOpacity: 1,
                                      }}
                                    />
                                    {width > 60 && height > 30 && (
                                      <text
                                        x={x + width / 2}
                                        y={y + height / 2}
                                        textAnchor="middle"
                                        fill="#fff"
                                        fontSize={12}
                                        fontWeight="bold"
                                      >
                                        {`${payload.name}: ${payload.size}`}
                                      </text>
                                    )}
                                  </g>
                                );
                              }}
                            />
                            <Tooltip />
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
                            q.statistics.totalResponses > max.statistics.totalResponses ? q : max
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
              className="w-full p-2 border border-gray-500 rounded-md"
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
                    onChange={(e) => setChartType(e.target.value as 'bar' | 'treemap' | 'line' | 'area' | 'histogram')}
                    className="p-2 border border-gray-500 rounded-md"
                  >
                    <option value="bar">Gráfico de Barras</option>
                    <option value="treemap">Treemap</option>
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
                        {chartType === 'treemap' && 'Mapa Hierárquico de Respostas'}
                        {chartType === 'line' && 'Tendência de Respostas'}
                        {chartType === 'area' && 'Área de Respostas'}
                        {chartType === 'histogram' && 'Histograma de Distribuição'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        {chartType === 'bar' ? (
                          <BarChart data={selectedQuestionData.responses.reduce((acc: any[], response: any) => {
                            const answer = response.answer_text || response.answer_rating?.toString() || 'Sem resposta';
                            const existing = acc.find(item => item.label === answer);
                            if (existing) {
                              existing.value += 1;
                            } else {
                              acc.push({ label: answer, value: 1 });
                            }
                            return acc;
                          }, [])}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#3B82F6" />
                          </BarChart>
                        ) : chartType === 'treemap' ? (
                          <Treemap
                            data={selectedQuestionData.responses.reduce((acc: any[], response: any) => {
                              const answer = response.answer_text || response.answer_rating?.toString() || 'Sem resposta';
                              const existing = acc.find(item => item.name === answer);
                              if (existing) {
                                existing.size += 1;
                              } else {
                                acc.push({ name: answer, size: 1, fill: COLORS[acc.length % COLORS.length] });
                              }
                              return acc;
                            }, [])}
                            dataKey="size"
                            ratio={4/3}
                            stroke="#fff"
                            strokeWidth={2}
                            content={({ root, depth, x, y, width, height, index, payload, colors, rank, name }) => {
                              if (!payload || !payload.name || !payload.size || width < 20 || height < 20) return null;
                              const fillColor = payload.fill || COLORS[0];
                              return (
                                <g>
                                  <rect
                                    x={x}
                                    y={y}
                                    width={width}
                                    height={height}
                                    style={{
                                      fill: fillColor,
                                      stroke: '#fff',
                                      strokeWidth: 2,
                                      strokeOpacity: 1,
                                      cursor: 'pointer'
                                    }}
                                  />
                                  {width > 50 && height > 25 && (
                                    <text
                                      x={x + width / 2}
                                      y={y + height / 2 - 5}
                                      textAnchor="middle"
                                      fill="#fff"
                                      fontSize={Math.min(width / 8, height / 4, 14)}
                                      fontWeight="bold"
                                    >
                                      {payload.name && payload.name.length > 10 ? payload.name.substring(0, 10) + '...' : payload.name || ''}
                                    </text>
                                  )}
                                  {width > 50 && height > 40 && (
                                    <text
                                      x={x + width / 2}
                                      y={y + height / 2 + 10}
                                      textAnchor="middle"
                                      fill="#fff"
                                      fontSize={Math.min(width / 10, height / 6, 12)}
                                      fontWeight="normal"
                                    >
                                      {payload.size || 0}
                                    </text>
                                  )}
                                </g>
                              );
                            }}
                          >
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload[0]) {
                                  return (
                                    <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                                      <p className="font-semibold text-gray-800">{payload[0].payload.name}</p>
                                      <p className="text-gray-600">Respostas: {payload[0].payload.size}</p>
                                      <p className="text-gray-600">Percentual: {((payload[0].payload.size / selectedQuestionData.statistics.totalResponses) * 100).toFixed(1)}%</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </Treemap>
                        ) : chartType === 'line' ? (
                          <LineChart data={selectedQuestionData.responses.reduce((acc: any[], response: any) => {
                            const answer = response.answer_text || response.answer_rating?.toString() || 'Sem resposta';
                            const existing = acc.find(item => item.label === answer);
                            if (existing) {
                              existing.value += 1;
                            } else {
                              acc.push({ label: answer, value: 1 });
                            }
                            return acc;
                          }, [])}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
                          </LineChart>
                        ) : chartType === 'area' ? (
                          <AreaChart data={selectedQuestionData.responses.reduce((acc: any[], response: any) => {
                            const answer = response.answer_text || response.answer_rating?.toString() || 'Sem resposta';
                            const existing = acc.find(item => item.label === answer);
                            if (existing) {
                              existing.value += 1;
                            } else {
                              acc.push({ label: answer, value: 1 });
                            }
                            return acc;
                          }, [])}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                          </AreaChart>
                        ) : (
                          <BarChart data={selectedQuestionData.responses.reduce((acc: any[], response: any) => {
                            const answer = response.answer_text || response.answer_rating?.toString() || 'Sem resposta';
                            const existing = acc.find(item => item.label === answer);
                            if (existing) {
                              existing.value += 1;
                            } else {
                              acc.push({ label: answer, value: 1 });
                            }
                            return acc;
                          }, [])}>
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

                  {/* Gráfico Secundário - Treemap para comparação */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2" />
                        Proporção Geral
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <Treemap
                          data={selectedQuestionData.responses.reduce((acc: any[], response: any) => {
                            const answer = response.answer_text || response.answer_rating?.toString() || 'Sem resposta';
                            const existing = acc.find(item => item.name === answer);
                            if (existing) {
                              existing.size += 1;
                            } else {
                              acc.push({ name: answer, size: 1, fill: COLORS[acc.length % COLORS.length] });
                            }
                            return acc;
                          }, [])}
                          dataKey="size"
                          aspectRatio={4/3}
                          stroke="#fff"
                          fill="#8884d8"
                          content={(props) => {
                            const { payload, x, y, width, height } = props;
                            if (!payload || !payload.name || !payload.size || width < 20 || height < 20) return null;
                            const fillColor = payload.fill || COLORS[0];
                            return (
                              <g>
                                <rect
                                  x={x}
                                  y={y}
                                  width={width}
                                  height={height}
                                  fill={fillColor}
                                  stroke="#fff"
                                  strokeWidth={2}
                                />
                                {width > 60 && height > 30 && (
                                  <text
                                    x={x + width / 2}
                                    y={y + height / 2 - 5}
                                    textAnchor="middle"
                                    fill="#fff"
                                    fontSize={Math.min(width / 8, height / 4, 14)}
                                    fontWeight="bold"
                                  >
                                    {payload.name && payload.name.length > 10 ? payload.name.substring(0, 10) + '...' : payload.name || ''}
                                  </text>
                                )}
                                {width > 50 && height > 40 && (
                                  <text
                                    x={x + width / 2}
                                    y={y + height / 2 + 10}
                                    textAnchor="middle"
                                    fill="#fff"
                                    fontSize={Math.min(width / 10, height / 6, 12)}
                                    fontWeight="normal"
                                  >
                                    {payload.size || 0}
                                  </text>
                                )}
                              </g>
                            );
                          }}
                        >
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload[0]) {
                                return (
                                  <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                                    <p className="font-semibold text-gray-800">{payload[0].payload.name}</p>
                                    <p className="text-gray-600">Valor: {payload[0].payload.size}</p>
                                    <p className="text-gray-600">Percentual: {((payload[0].payload.size / selectedQuestionData.statistics.totalResponses) * 100).toFixed(1)}%</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </Treemap>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="stats" className="space-y-4">
                {selectedQuestionData.statistics.averageRating ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Star className="h-5 w-5 mr-2" />
                        Estatísticas da Questão
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-500/20 rounded-lg">
                          <p className="text-sm text-gray-600">Total de Respostas</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {selectedQuestionData.statistics.totalResponses}
                          </p>
                        </div>
                        {selectedQuestionData.statistics.averageRating && (
                          <div className="text-center p-4 bg-green-500/20 rounded-lg">
                            <p className="text-sm text-gray-600">Rating Médio</p>
                            <p className="text-2xl font-bold text-green-600">
                              {selectedQuestionData.statistics.averageRating.toFixed(2)}
                            </p>
                          </div>
                        )}
                        {selectedQuestionData.statistics.mostCommonAnswer && (
                          <div className="text-center p-4 bg-purple-500/20 rounded-lg">
                            <p className="text-sm text-gray-600">Resposta Mais Comum</p>
                            <p className="text-lg font-bold text-purple-600">
                              {selectedQuestionData.statistics.mostCommonAnswer.substring(0, 30)}
                              {selectedQuestionData.statistics.mostCommonAnswer.length > 30 ? '...' : ''}
                            </p>
                          </div>
                        )}
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
                {selectedQuestionData.statistics.sentimentBreakdown ? (
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
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                          <div className="text-center p-4 bg-green-500/20 rounded-lg">
                            <p className="text-sm text-gray-600">Positivo</p>
                            <p className="text-2xl font-bold text-green-600">
                              {selectedQuestionData.statistics.sentimentBreakdown.positive}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-gray-500/20 rounded-lg">
                            <p className="text-sm text-gray-600">Neutro</p>
                            <p className="text-2xl font-bold text-gray-600">
                              {selectedQuestionData.statistics.sentimentBreakdown.neutral}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-red-500/20 rounded-lg">
                            <p className="text-sm text-gray-600">Negativo</p>
                            <p className="text-2xl font-bold text-red-600">
                              {selectedQuestionData.statistics.sentimentBreakdown.negative}
                            </p>
                          </div>
                        </div>

                        {/* Treemap para Sentimento */}
                        <ResponsiveContainer width="100%" height="100%">
                          <Treemap
                            data={[
                              { 
                                name: 'Positivo', 
                                size: selectedQuestionData.statistics.sentimentBreakdown.positive, 
                                fill: '#10B981' 
                              },
                              { 
                                name: 'Neutro', 
                                size: selectedQuestionData.statistics.sentimentBreakdown.neutral, 
                                fill: '#6B7280' 
                              },
                              { 
                                name: 'Negativo', 
                                size: selectedQuestionData.statistics.sentimentBreakdown.negative, 
                                fill: '#EF4444' 
                              }
                            ].filter(item => item.size > 0)}
                            dataKey="size"
                            aspectRatio={4/3}
                            stroke="#fff"
                            fill="#8884d8"
                            content={(props) => {
                              const { payload, x, y, width, height } = props;
                              if (!payload || !payload.name || !payload.size || width < 20 || height < 20) return null;
                              const fillColor = payload.fill || COLORS[0];
                              return (
                                <g>
                                  <rect
                                    x={x}
                                    y={y}
                                    width={width}
                                    height={height}
                                    fill={fillColor}
                                    stroke="#fff"
                                    strokeWidth={2}
                                  />
                                  {width > 60 && height > 30 && (
                                    <text
                                      x={x + width / 2}
                                      y={y + height / 2}
                                      textAnchor="middle"
                                      fill="#fff"
                                      fontSize={12}
                                      fontWeight="bold"
                                    >
                                      {payload.name}
                                    </text>
                                  )}
                                  {width > 50 && height > 40 && (
                                    <text
                                      x={x + width / 2}
                                      y={y + height / 2 + 10}
                                      textAnchor="middle"
                                      fill="#fff"
                                      fontSize={Math.min(width / 10, height / 6, 12)}
                                      fontWeight="normal"
                                    >
                                      {payload.size || 0}
                                    </text>
                                  )}
                                </g>
                              );
                            }}
                          >
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload[0]) {
                                  const totalSentiment = selectedQuestionData.statistics.sentimentBreakdown!.positive + 
                                                       selectedQuestionData.statistics.sentimentBreakdown!.neutral + 
                                                       selectedQuestionData.statistics.sentimentBreakdown!.negative;
                                  return (
                                    <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                                      <p className="font-semibold text-gray-800">{payload[0].payload.name}</p>
                                      <p className="text-gray-600">Valor: {payload[0].payload.size}</p>
                                      <p className="text-gray-600">Percentual: {((payload[0].payload.size / totalSentiment) * 100).toFixed(1)}%</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </Treemap>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
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

export default memo(AnalyticsDashboard);
