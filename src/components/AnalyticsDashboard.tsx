import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useSurveyAnalytics } from '@/hooks/useSurveyAnalytics';
import { BarChart3, TrendingUp, Download, Users, MessageSquare, Brain, TrendingDown } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  Treemap,
  Cell
} from 'recharts';

interface AnalyticsDashboardProps {
  surveyId: string;
}

// Modern vibrant color palette - highly saturated and impactful
const COLORS = [
  '#FF0080', '#00FFFF', '#FF4000', '#8000FF', '#00FF80',
  '#FFFF00', '#FF8000', '#0080FF', '#FF0040', '#40FF00'
];

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ surveyId }) => {
  const { analytics, loading, error, refreshAnalytics } = useSurveyAnalytics(surveyId);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');

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
  }, [analytics, surveyId]);

  // Precompute memoized data
  const selectedQuestionData = useMemo(() => {
    return analytics?.questions.find(q => q.id === selectedQuestion);
  }, [analytics?.questions, selectedQuestion]);

  const sentimentOverviewData = useMemo(() => {
    if (!analytics) return [] as Array<{ name: string; value: number; fill: string }>;
    return [
      { name: 'Positivo', value: analytics.sentimentOverview.positive, fill: '#00FF80' }, // Bright green neon
      { name: 'Neutro', value: analytics.sentimentOverview.neutral, fill: '#00FFFF' }, // Cyan electric
      { name: 'Negativo', value: analytics.sentimentOverview.negative, fill: '#FF0040' } // Red neon
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

  if (error) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-red-600" />
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={refreshAnalytics} variant="outline">
          Tentar Novamente
        </Button>
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

  return (
    <div className="space-y-6">
      {/* Header com estatísticas gerais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card Total de Respostas */}
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

        {/* Card Questões */}
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

        {/* Card Sentimento Positivo */}
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

        {/* Card Sentimento Negativo */}
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

        {/* Card Sentimento Neutro */}
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
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-400/50 dark:border-gray-700/50">
                  <h4 className="text-lg font-semibold text-foreground mb-4">Análise de Sentimento</h4>
                  {sentimentOverviewData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <Treemap
                          data={sentimentOverviewData}
                          dataKey="value"
                          aspectRatio={4/3}
                          stroke="#000"
                        >
                          {sentimentOverviewData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Treemap>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Nenhum dado de sentimento disponível</p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="trends" className="space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-400/50 dark:border-gray-700/50">
                  <h4 className="text-lg font-semibold text-foreground mb-4">Tendências de Respostas</h4>
                  {responsesByDateData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={responsesByDateData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--primary))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Nenhum dado de tendência disponível</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;