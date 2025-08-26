import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart3, PieChart, TrendingUp, Calculator, Target, Activity } from 'lucide-react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { useSurveyAnalytics } from '@/hooks/useSurveyAnalytics';
import { calculateMean, calculateMedian, calculateMode, calculateStandardDeviation, calculatePercentiles, StatisticalSummary } from '@/utils/statisticalAnalysis';

interface StartQuanticoAnalyticsProps {
  surveyId: string;
}

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
}

const StartQuanticoAnalytics: React.FC<StartQuanticoAnalyticsProps> = ({ surveyId }) => {
  const { analytics, loading, error } = useSurveyAnalytics(surveyId);

  // Análise estatística básica
  const statisticalAnalysis = useMemo(() => {
    if (!analytics?.questions || analytics.questions.length === 0) {
      return null;
    }

    // Extrair valores numéricos das respostas
    const numericValues: number[] = [];
    analytics.questions.forEach(question => {
      if (question.statistics?.averageRating && question.statistics.averageRating > 0) {
        numericValues.push(question.statistics.averageRating);
      }
    });

    if (numericValues.length === 0) {
      return null;
    }

    const mean = calculateMean(numericValues);
    const median = calculateMedian(numericValues);
    const mode = calculateMode(numericValues);
    const standardDeviation = calculateStandardDeviation(numericValues);
    const percentiles = calculatePercentiles(numericValues);

    return {
      mean,
      median,
      mode,
      standardDeviation,
      percentiles,
      sampleSize: numericValues.length
    };
  }, [analytics]);

  // Análise de sentimento simples
  const sentimentAnalysis = useMemo((): SentimentData => {
    if (!analytics?.sentimentOverview) {
      return { positive: 0, neutral: 0, negative: 0 };
    }

    return {
      positive: analytics.sentimentOverview.positive,
      neutral: analytics.sentimentOverview.neutral,
      negative: analytics.sentimentOverview.negative
    };
  }, [analytics]);

  // Análise de sentimento manual (fallback)
  const manualSentimentAnalysis = useMemo((): SentimentData => {
    if (!analytics?.questions || analytics.questions.length === 0) {
      return { positive: 0, neutral: 0, negative: 0 };
    }

    let positive = 0;
    let neutral = 0;
    let negative = 0;

    analytics.questions.forEach(question => {
      if (question.statistics?.averageRating) {
        const rating = question.statistics.averageRating;
        if (rating >= 4) {
          positive++;
        } else if (rating === 3) {
          neutral++;
        } else {
          negative++;
        }
      }
    });

    return { positive, neutral, negative };
  }, [analytics]);

  // Configuração do gráfico de barras
  const barChartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: {
        show: true
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: true
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: ['Positivo', 'Neutro', 'Negativo']
    },
    yaxis: {
      title: {
        text: 'Número de Respostas'
      }
    },
    fill: {
      opacity: 1
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val + ' respostas';
        }
      }
    },
    colors: ['#10B981', '#F59E0B', '#EF4444']
  };

  const finalSentiment = sentimentAnalysis.positive > 0 || sentimentAnalysis.neutral > 0 || sentimentAnalysis.negative > 0 
    ? sentimentAnalysis 
    : manualSentimentAnalysis;

  const barChartSeries = [{
    name: 'Sentimentos',
    data: [finalSentiment.positive, finalSentiment.neutral, finalSentiment.negative]
  }];

  // Configuração do gráfico polar
  const polarChartOptions: ApexOptions = {
    chart: {
      type: 'polarArea',
      height: 350
    },
    labels: ['Positivo', 'Neutro', 'Negativo'],
    fill: {
      opacity: 0.8
    },
    stroke: {
      width: 1,
      colors: undefined
    },
    yaxis: {
      show: false
    },
    legend: {
      position: 'bottom'
    },
    plotOptions: {
      polarArea: {
        rings: {
          strokeWidth: 0
        },
        spokes: {
          strokeWidth: 0
        }
      }
    },
    colors: ['#10B981', '#F59E0B', '#EF4444'],
    tooltip: {
      y: {
        formatter: function (val) {
          return val + ' respostas';
        }
      }
    }
  };

  const polarChartSeries = [finalSentiment.positive, finalSentiment.neutral, finalSentiment.negative];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando análises...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-2">Erro ao carregar dados</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    );
  }

  if (!analytics || analytics.totalResponses === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Nenhum dado disponível para análise</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Análises Start Quantico</h2>
          <p className="text-gray-600">Análise estatística básica e visualizações interativas</p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Target className="w-4 h-4 mr-1" />
          Start Quantico
        </Badge>
      </div>

      <Tabs defaultValue="statistics" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Estatísticas
          </TabsTrigger>
          <TabsTrigger value="sentiment" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Sentimentos
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Visualizações
          </TabsTrigger>
        </TabsList>

        {/* Aba de Estatísticas */}
        <TabsContent value="statistics" className="space-y-6">
          {statisticalAnalysis ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Média</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statisticalAnalysis.mean.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Valor médio das respostas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Mediana</CardTitle>
                  <Target className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statisticalAnalysis.median.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Valor central das respostas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Moda</CardTitle>
                  <Activity className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Array.isArray(statisticalAnalysis.mode) 
                      ? statisticalAnalysis.mode.join(', ') 
                      : statisticalAnalysis.mode}
                  </div>
                  <p className="text-xs text-muted-foreground">Valor(es) mais frequente(s)</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Desvio Padrão</CardTitle>
                  <BarChart3 className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statisticalAnalysis.standardDeviation.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Dispersão dos dados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Percentil 25</CardTitle>
                  <Calculator className="h-4 w-4 text-indigo-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statisticalAnalysis.percentiles.p25.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">25% dos dados abaixo</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Percentil 75</CardTitle>
                  <Calculator className="h-4 w-4 text-pink-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statisticalAnalysis.percentiles.p75.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">75% dos dados abaixo</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Calculator className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">Nenhum dado numérico disponível para análise estatística</p>
                  <p className="text-sm text-gray-400 mt-2">Certifique-se de que há perguntas do tipo rating ou scale</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Aba de Sentimentos */}
        <TabsContent value="sentiment" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Positivo</CardTitle>
                <div className="h-4 w-4 bg-green-500 rounded-full"></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{finalSentiment.positive}</div>
                <p className="text-xs text-muted-foreground">Respostas positivas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Neutro</CardTitle>
                <div className="h-4 w-4 bg-yellow-500 rounded-full"></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{finalSentiment.neutral}</div>
                <p className="text-xs text-muted-foreground">Respostas neutras</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Negativo</CardTitle>
                <div className="h-4 w-4 bg-red-500 rounded-full"></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{finalSentiment.negative}</div>
                <p className="text-xs text-muted-foreground">Respostas negativas</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba de Visualizações */}
        <TabsContent value="charts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Gráfico de Barras - Sentimentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Chart
                  options={barChartOptions}
                  series={barChartSeries}
                  type="bar"
                  height={350}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Gráfico Polar - Distribuição
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Chart
                  options={polarChartOptions}
                  series={polarChartSeries}
                  type="polarArea"
                  height={350}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StartQuanticoAnalytics;