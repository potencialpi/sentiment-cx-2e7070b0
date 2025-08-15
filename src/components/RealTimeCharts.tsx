import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { analyzeBatchSentiment } from '@/lib/sentimentAnalysis';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

interface SurveyData {
  id: string;
  title: string;
  totalResponses: number;
}

interface RealTimeChartsProps {
  className?: string;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const RealTimeCharts: React.FC<RealTimeChartsProps> = ({ className }) => {
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string>('');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [sentimentData, setSentimentData] = useState<ChartData[]>([]);
  const [responsesByDate, setResponsesByDate] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar');

  const fetchSurveys = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: surveysData, error } = await supabase
        .from('surveys')
        .select('id, title, current_responses')
        .eq('user_id', user.id)
        .gt('current_responses', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSurveys = surveysData.map(survey => ({
        id: survey.id,
        title: survey.title,
        totalResponses: survey.current_responses || 0
      }));

      setSurveys(formattedSurveys);
      
      // Selecionar automaticamente a primeira pesquisa se houver
      if (formattedSurveys.length > 0) {
        setSelectedSurvey(formattedSurveys[0].id);
      }
    } catch (error) {
      console.error('Erro ao buscar pesquisas:', error);
    }
  }, []);

  // Buscar pesquisas disponíveis
  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  const fetchSurveyData = useCallback(async (surveyId: string) => {
    setLoading(true);
    try {
      // Buscar questões da pesquisa
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('survey_id', surveyId);

      if (questionsError) throw questionsError;

      // Buscar respostas
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select('*')
        .eq('survey_id', surveyId);

      if (responsesError) throw responsesError;

      // Processar dados para gráficos
      processChartData(questions || [], responses || []);
      processSentimentData(responses || []);
      processResponsesByDate(responses || []);

    } catch (error) {
      console.error('Erro ao buscar dados da pesquisa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da pesquisa",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar dados da pesquisa selecionada
  useEffect(() => {
    if (selectedSurvey) {
      fetchSurveyData(selectedSurvey);
    }
  }, [selectedSurvey, fetchSurveyData]);

  const processChartData = (questions: any[], responses: any[]) => {
    // Agrupar respostas por tipo de questão
    const questionTypes = questions.reduce((acc, question) => {
      const questionResponses = responses.filter(r => {
        if (r.responses && typeof r.responses === 'object') {
          const responsesData = r.responses as Record<string, any>;
          return Object.keys(responsesData).includes(question.id);
        }
        return false;
      });
      
      if (question.question_type === 'single_choice' || question.question_type === 'multiple_choice') {
        // Contar escolhas
        const choiceCounts: { [key: string]: number } = {};
        questionResponses.forEach(response => {
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
        
        Object.entries(choiceCounts).forEach(([choice, count]) => {
          acc.push({ name: choice, value: count });
        });
      } else if (question.question_type === 'rating') {
        // Contar avaliações por estrelas
        const ratingCounts: { [key: string]: number } = {};
        questionResponses.forEach(response => {
          if (response.responses && typeof response.responses === 'object') {
            const responsesData = response.responses as Record<string, any>;
            const responseValue = responsesData[question.id];
            if (responseValue && typeof responseValue === 'number') {
              const rating = `${responseValue} estrela${responseValue > 1 ? 's' : ''}`;
              ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
            }
          }
        });
        
        Object.entries(ratingCounts).forEach(([rating, count]) => {
          acc.push({ name: rating, value: count });
        });
      }
      
      return acc;
    }, [] as ChartData[]);

    setChartData(questionTypes);
  };

  const processSentimentData = (responses: any[]) => {
    // Filtrar respostas de texto
    const textResponses: string[] = [];
    responses.forEach(r => {
      if (r.responses && typeof r.responses === 'object') {
        const responsesData = r.responses as Record<string, any>;
        Object.values(responsesData).forEach(value => {
          if (typeof value === 'string' && value.trim().length > 0) {
            textResponses.push(value);
          }
        });
      }
    });
    
    if (textResponses.length === 0) {
      setSentimentData([]);
      return;
    }

    // Analisar sentimento
    const analysis = analyzeBatchSentiment(textResponses);
    
    const sentimentChartData = [
      { name: 'Positivo', value: analysis.summary.positive, color: '#10B981' },
      { name: 'Neutro', value: analysis.summary.neutral, color: '#6B7280' },
      { name: 'Negativo', value: analysis.summary.negative, color: '#EF4444' }
    ];
    
    setSentimentData(sentimentChartData);
  };

  const processResponsesByDate = (responses: { created_at?: string }[]) => {
    // Agrupar respostas por data
    const responsesByDateMap: { [key: string]: number } = {};
    
    responses.forEach(response => {
      if (response.created_at) {
        const date = new Date(response.created_at).toLocaleDateString('pt-BR');
        responsesByDateMap[date] = (responsesByDateMap[date] || 0) + 1;
      }
    });
    
    const dateData = Object.entries(responsesByDateMap)
      .map(([date, count]) => ({ name: date, value: count }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    
    setResponsesByDate(dateData);
  };

  const refreshData = () => {
    if (selectedSurvey) {
      fetchSurveyData(selectedSurvey);
    }
  };

  const renderChart = (data: ChartData[], title: string) => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>Nenhum dado disponível</p>
          </div>
        </div>
      );
    }

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Gráficos em Tempo Real
            </span>
            <Button
              onClick={refreshData}
              disabled={loading || !selectedSurvey}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label htmlFor="survey-select" className="text-sm font-medium">Selecionar Pesquisa:</label>
              <Select value={selectedSurvey} onValueChange={setSelectedSurvey}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma pesquisa com respostas" />
                </SelectTrigger>
                <SelectContent>
                  {surveys.map(survey => (
                    <SelectItem key={survey.id} value={survey.id}>
                      {survey.title} ({survey.totalResponses} respostas)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="chart-type" className="text-sm font-medium">Tipo de Gráfico:</label>
              <Select value={chartType} onValueChange={(value: 'bar' | 'pie' | 'line') => setChartType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Barras
                    </div>
                  </SelectItem>
                  <SelectItem value="pie">
                    <div className="flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4" />
                      Pizza
                    </div>
                  </SelectItem>
                  <SelectItem value="line">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Linha
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {surveys.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Nenhuma pesquisa com respostas encontrada</p>
            <p className="text-sm text-gray-400 mt-2">
              Crie uma pesquisa e colete algumas respostas para ver os gráficos
            </p>
          </CardContent>
        </Card>
      )}

      {selectedSurvey && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Gráfico de Respostas Gerais */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Respostas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                renderChart(chartData, 'Respostas')
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Sentimento */}
          <Card>
            <CardHeader>
              <CardTitle>Análise de Sentimento</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                renderChart(sentimentData, 'Sentimento')
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Respostas por Data */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Respostas ao Longo do Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                renderChart(responsesByDate, 'Tempo')
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RealTimeCharts;