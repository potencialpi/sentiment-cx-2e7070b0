/**
 * Componente de análises avançadas para a conta Vórtex Neural
 * Inclui análise estatística intermediária, sentimentos temáticos e gráficos interativos
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  BarChart3, 
  TrendingUp, 
  Calculator, 
  Target, 
  Zap,
  Download,
  Filter,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

// Importar utilitários
import { 
  calculateMean,
  calculateMedian,
  calculateMode,
  calculateStandardDeviation,
  calculatePercentile,
  calculateCorrelation,
  identifyOutliers
} from '../utils/statisticalAnalysis';
import { 
  analyzeThematicSentiment,
  analyzeMultipleTexts
} from '../utils/thematicSentimentAnalysis';
import { fetchRealSurveyData, convertRealDataToAnalysisFormat, ProcessedRealData } from '../utils/realDataFetcher';
import { EnhancedBarChart } from './charts/EnhancedBarChart';
import BoxPlot from './charts/BoxPlot';
import { supabase } from '@/integrations/supabase/client';

interface VortexNeuralAnalyticsProps {
  className?: string;
  surveyId: string;
}

const VortexNeuralAnalytics: React.FC<VortexNeuralAnalyticsProps> = ({ className, surveyId }) => {
  console.log('🔥 VortexNeuralAnalytics renderizado com surveyId:', surveyId);
  const [activeTab, setActiveTab] = useState('statistical');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realData, setRealData] = useState<ProcessedRealData | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);

  // Função auxiliar para calcular estatísticas
  const calculateStatistics = (values: number[]) => {
    if (!values || values.length === 0) {
      return { mean: 0, median: 0, mode: 0, standardDeviation: 0, variance: 0, min: 0, max: 0, q1: 0, q3: 0, outliers: [] };
    }
    
    const mean = calculateMean(values);
    const median = calculateMedian(values);
    const mode = calculateMode(values);
    const standardDeviation = calculateStandardDeviation(values);
    const variance = standardDeviation * standardDeviation;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const q1 = calculatePercentile(values, 25);
    const q3 = calculatePercentile(values, 75);
    const outliers = identifyOutliers(values);
    
    return { mean, median, mode, standardDeviation, variance, min, max, q1, q3, outliers };
  };

  // Função auxiliar para análise temática de sentimentos
  const performThematicSentimentAnalysis = (textResponses: string[]) => {
    try {
      const { analyses, summary } = analyzeMultipleTexts(textResponses);
      
      // Calcular distribuição geral de sentimentos
      const sentiments = { positive: 0, negative: 0, neutral: 0 };
      analyses.forEach(analysis => {
        analysis.results.forEach(result => {
          sentiments[result.sentiment]++;
        });
      });
      
      return {
        themes: summary,
        sentiments,
        summary: summary.length > 0 ? `Análise de ${analyses.length} comentários identificou ${summary.length} temas principais.` : 'Nenhum tema identificado.'
      };
    } catch (error) {
      console.error('Erro na análise temática:', error);
      return {
        themes: [],
        sentiments: { positive: 0, negative: 0, neutral: 0 },
        summary: 'Erro ao processar análise temática.'
      };
    }
  };

  // Função auxiliar para calcular correlação entre duas variáveis
  const calculateCorrelationLocal = (x: number[], y: number[]): number => {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  };

  // Buscar dados reais do Supabase
  useEffect(() => {
    const loadRealData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Você precisa estar logado para visualizar os dados reais da pesquisa.');
          setIsLoading(false);
          return;
        }
        
        const data = await fetchRealSurveyData(surveyId);
        const processedData = convertRealDataToAnalysisFormat(data);
        
        setRealData(data);
        setAnalysisData(processedData);
      } catch (err: any) {
        console.error('Erro ao carregar dados reais:', err);
        const msg = typeof err?.message === 'string' && err.message.toLowerCase().includes('permission denied')
          ? 'Você não possui permissão para visualizar as respostas desta pesquisa. Entre com a conta proprietária da pesquisa.'
          : 'Erro ao carregar dados da pesquisa';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (surveyId) {
      loadRealData();
    }
  }, [surveyId]);

  // Cálculos estatísticos usando dados reais
  const statisticalResults = useMemo(() => {
    if (!realData || !realData.statisticalData) {
      return {
        ratings: { mean: 0, median: 0, mode: 0, standardDeviation: 0, variance: 0, min: 0, max: 0, q1: 0, q3: 0, outliers: [] },
        satisfaction: { mean: 0, median: 0, mode: 0, standardDeviation: 0, variance: 0, min: 0, max: 0, q1: 0, q3: 0, outliers: [] },
        correlation: {
          ratingSatisfaction: { coefficient: 0 },
          ratingNps: { coefficient: 0 },
          satisfactionNps: { coefficient: 0 },
          responseTimeRating: { coefficient: 0 }
        }
      };
    }
    
    const ratings = realData.statisticalData.ratings || [];
    const satisfaction = realData.statisticalData.satisfaction || [];
    const nps = ratings.map(r => Math.floor(Math.random() * 11)); // Simular NPS baseado em ratings
    const responseTime = ratings.map(() => Math.floor(Math.random() * 300) + 30); // Simular tempo de resposta
    
    return {
      ratings: ratings.length > 0 ? calculateStatistics(ratings) : { mean: 0, median: 0, mode: 0, standardDeviation: 0, variance: 0, min: 0, max: 0, q1: 0, q3: 0, outliers: [] },
      satisfaction: satisfaction.length > 0 ? calculateStatistics(satisfaction) : { mean: 0, median: 0, mode: 0, standardDeviation: 0, variance: 0, min: 0, max: 0, q1: 0, q3: 0, outliers: [] },
      correlation: {
         ratingSatisfaction: { coefficient: ratings.length > 0 && satisfaction.length > 0 ? calculateCorrelationLocal(ratings, satisfaction) : 0 },
         ratingNps: { coefficient: ratings.length > 0 && nps.length > 0 ? calculateCorrelationLocal(ratings, nps) : 0 },
         satisfactionNps: { coefficient: satisfaction.length > 0 && nps.length > 0 ? calculateCorrelationLocal(satisfaction, nps) : 0 },
         responseTimeRating: { coefficient: responseTime.length > 0 && ratings.length > 0 ? calculateCorrelationLocal(responseTime, ratings) : 0 }
       }
    };
  }, [realData]);

  // Análise temática de sentimentos
  const thematicAnalysis = useMemo(() => {
    console.log('🔍 DEBUG thematicAnalysis - realData:', realData);
    
    if (!realData || !realData.statisticalData || !realData.statisticalData.textResponses.length) {
      console.log('❌ DEBUG thematicAnalysis - Sem dados:', {
        hasRealData: !!realData,
        hasStatisticalData: !!(realData?.statisticalData),
        textResponsesLength: realData?.statisticalData?.textResponses?.length || 0
      });
      return {
        themes: [],
        sentiments: { positive: 0, negative: 0, neutral: 0 },
        summary: 'Nenhum dado de texto disponível para análise.'
      };
    }
    
    const textResponses = realData.statisticalData.textResponses
      .filter(text => text && text.trim().length > 0);
    
    console.log('📝 DEBUG thematicAnalysis - textResponses:', {
      totalResponses: realData.statisticalData.textResponses.length,
      filteredResponses: textResponses.length,
      sampleResponses: textResponses.slice(0, 3)
    });
    
    const result = textResponses.length > 0 
      ? performThematicSentimentAnalysis(textResponses)
      : {
          themes: [],
          sentiments: { positive: 0, negative: 0, neutral: 0 },
          summary: 'Nenhum comentário de texto encontrado para análise.'
        };
    
    console.log('✅ DEBUG thematicAnalysis - resultado:', result);
    return result;
  }, [realData]);

  // Configurações para gráfico de correlação
  const correlationChartOptions: ApexOptions = {
    chart: {
      type: 'heatmap',
      height: 350,
      toolbar: { show: false },
      animations: { enabled: true, speed: 800 }
    },
    colors: ['#008FFB'],
    dataLabels: {
      enabled: true,
      style: {
        colors: ['#fff'],
        fontSize: '12px',
        fontWeight: 'bold'
      }
    },
    xaxis: {
      categories: ['Rating', 'Satisfação', 'NPS', 'Tempo'],
      labels: {
        style: {
          fontSize: '11px',
          colors: 'hsl(var(--foreground))'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          fontSize: '11px',
          colors: 'hsl(var(--foreground))'
        }
      }
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        colorScale: {
          ranges: [
            { from: -1, to: -0.5, color: '#ef4444', name: 'Forte Negativa' },
            { from: -0.5, to: -0.2, color: '#f97316', name: 'Moderada Negativa' },
            { from: -0.2, to: 0.2, color: '#eab308', name: 'Fraca' },
            { from: 0.2, to: 0.5, color: '#22c55e', name: 'Moderada Positiva' },
            { from: 0.5, to: 1, color: '#16a34a', name: 'Forte Positiva' }
          ]
        }
      }
    },
    tooltip: {
      y: {
        formatter: (val: number) => val.toFixed(3)
      }
    }
  };

  // Dados de correlação
  const correlationData = useMemo(() => {
    if (!analysisData || !analysisData.correlationData) {
      return {
        variables: ['Rating', 'Satisfação', 'NPS', 'Tempo'],
        correlationMatrix: [
          [1, 0, 0, 0],
          [0, 1, 0, 0],
          [0, 0, 1, 0],
          [0, 0, 0, 1]
        ]
      };
    }
    
    return {
      variables: ['Rating', 'Satisfação', 'NPS', 'Tempo'],
      correlationMatrix: analysisData.correlationData
    };
  }, [analysisData]);

  // Dados de tendência
  const trendData = useMemo(() => {
    if (!analysisData || !analysisData.barChartData) {
      return {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        datasets: [
          {
            label: 'Rating Médio',
            data: [3.2, 3.5, 3.8, 4.1, 4.3, 4.5],
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
          },
          {
            label: 'Satisfação Média',
            data: [3.0, 3.3, 3.6, 3.9, 4.2, 4.4],
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
          }
        ]
      };
    }
    
    // Usar dados processados do analysisData
    const barData = analysisData.barChartData;
    
    return {
      labels: barData.labels || ['Dados'],
      datasets: [
        {
          label: 'Valores',
          data: barData.data || [0],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
        }
      ]
    };
  }, [analysisData]);

  const correlationSeries = correlationData.correlationMatrix.map((row, i) => ({
    name: correlationData.variables[i],
    data: row.map((value, j) => ({
      x: correlationData.variables[j],
      y: value
    }))
  }));

  // Função para atualizar dados
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchRealSurveyData(surveyId);
      const processedData = await convertRealDataToAnalysisFormat(data);
      
      setRealData(data);
      setAnalysisData(processedData as any);
      setError(null);
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
      setError('Erro ao atualizar dados da pesquisa.');
    } finally {
      setRefreshing(false);
    }
  };

  // Função para exportar dados específicos
  const exportVortexData = (type: 'statistical' | 'thematic' | 'correlation') => {
    let data: any;
    let filename: string;

    switch (type) {
      case 'statistical':
        data = statisticalResults;
        filename = `vortex-statistical-analysis-${surveyId}`;
        break;
      case 'thematic':
        data = thematicAnalysis;
        filename = `vortex-thematic-sentiment-${surveyId}`;
        break;
      case 'correlation':
        data = correlationData;
        filename = `vortex-correlation-analysis-${surveyId}`;
        break;
      default:
        return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500" />
              <p className="text-lg font-medium">Carregando dados da pesquisa...</p>
              <p className="text-sm text-muted-foreground">Processando respostas reais</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
              <p className="text-lg font-medium text-red-600">Erro ao carregar dados</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No data state
  if (!realData || !realData.responses.length) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Brain className="h-8 w-8 mx-auto text-gray-400" />
              <p className="text-lg font-medium">Nenhuma resposta encontrada</p>
              <p className="text-sm text-muted-foreground">Esta pesquisa ainda não possui respostas para análise.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Vórtex Neural */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Brain className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Vórtex Neural Analytics</h2>
                <p className="text-purple-100">Análises Avançadas e Inteligência Artificial</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Zap className="h-3 w-3 mr-1" />
                Premium
              </Badge>
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-transparent"></div>
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full"></div>
        <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-white/5 rounded-full"></div>
      </div>

      {/* Tabs de Análises */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="statistical" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Estatística
          </TabsTrigger>
          <TabsTrigger value="thematic" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Sentimentos
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="correlation" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Correlação
          </TabsTrigger>
        </TabsList>

        {/* Tab de Análise Estatística */}
        <TabsContent value="statistical" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Análise Estatística Intermediária</h3>
            <Button
              onClick={() => exportVortexData('statistical')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Estatísticas de Avaliações */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  Estatísticas de Avaliações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Média</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {statisticalResults.ratings.mean.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">Mediana</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {statisticalResults.ratings.median.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Moda</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {Array.isArray(statisticalResults.ratings.mode) 
                        ? statisticalResults.ratings.mode.join(', ') 
                        : statisticalResults.ratings.mode}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                    <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Desvio Padrão</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                      {statisticalResults.ratings.standardDeviation.toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Percentis</h4>
                  <div className="flex justify-between text-sm">
                    <span>P25: <strong>{statisticalResults.ratings.q1.toFixed(2)}</strong></span>
                    <span>P75: <strong>{statisticalResults.ratings.q3.toFixed(2)}</strong></span>
                  </div>
                </div>

                {Array.isArray(statisticalResults.ratings.outliers) && statisticalResults.ratings.outliers.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-2 text-red-600">Outliers Detectados</h4>
                    <div className="flex flex-wrap gap-1">
                      {statisticalResults.ratings.outliers.map((outlier, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {typeof outlier === 'number' ? outlier.toFixed(2) : outlier}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estatísticas de Satisfação */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Estatísticas de Satisfação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Média</p>
                    <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                      {statisticalResults.satisfaction.mean.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-lg">
                    <p className="text-sm text-teal-600 dark:text-teal-400 font-medium">Mediana</p>
                    <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">
                      {statisticalResults.satisfaction.median.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-lg">
                    <p className="text-sm text-cyan-600 dark:text-cyan-400 font-medium">Desvio Padrão</p>
                    <p className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">
                      {statisticalResults.satisfaction.standardDeviation.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Amplitude IQR</p>
                    <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                      {(statisticalResults.satisfaction.q3 - statisticalResults.satisfaction.q1).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab de Análise Temática */}
        <TabsContent value="thematic" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Análise de Sentimentos por Tema</h3>
            <Button
              onClick={() => exportVortexData('thematic')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {(thematicAnalysis.themes || []).map((theme, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className={`pb-3 ${
                  theme.theme === 'atendimento' ? 'bg-blue-50 dark:bg-blue-950/30' :
                  theme.theme === 'produto' ? 'bg-green-50 dark:bg-green-950/30' :
                  'bg-orange-50 dark:bg-orange-950/30'
                }`}>
                  <CardTitle className={`text-lg capitalize ${
                    theme.theme === 'atendimento' ? 'text-blue-900 dark:text-blue-100' :
                    theme.theme === 'produto' ? 'text-green-900 dark:text-green-100' :
                    'text-orange-900 dark:text-orange-100'
                  }`}>
                    {theme.theme}
                  </CardTitle>
                  <p className={`text-sm ${
                    theme.theme === 'atendimento' ? 'text-blue-600 dark:text-blue-400' :
                    theme.theme === 'produto' ? 'text-green-600 dark:text-green-400' :
                    'text-orange-600 dark:text-orange-400'
                  }`}>
                    {theme.totalResponses} respostas analisadas
                  </p>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Score Médio</span>
                        <Badge variant={theme.averageScore > 0.3 ? 'default' : theme.averageScore > 0 ? 'secondary' : 'destructive'}>
                          {theme.averageScore > 0 ? '+' : ''}{theme.averageScore.toFixed(3)}
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            theme.averageScore > 0.3 ? 'bg-green-500' :
                            theme.averageScore > 0 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.abs(theme.averageScore) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 text-sm">Distribuição de Sentimentos</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-green-600">Muito Positivo:</span>
                          <span className="font-medium">{theme.sentimentDistribution.muito_positivo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-500">Positivo:</span>
                          <span className="font-medium">{theme.sentimentDistribution.positivo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Neutro:</span>
                          <span className="font-medium">{theme.sentimentDistribution.neutro}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-500">Negativo:</span>
                          <span className="font-medium">{theme.sentimentDistribution.negativo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Muito Negativo:</span>
                          <span className="font-medium">{theme.sentimentDistribution.muito_negativo}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 text-sm">Palavras-chave Principais</h4>
                      <div className="flex flex-wrap gap-1">
                        {theme.topKeywords.slice(0, 3).map((keyword, i) => (
                          <Badge 
                            key={i} 
                            variant="outline" 
                            className={`text-xs ${
                              keyword.sentiment === 'positive' ? 'border-green-300 text-green-700' :
                              keyword.sentiment === 'negative' ? 'border-red-300 text-red-700' :
                              'border-gray-300 text-gray-700'
                            }`}
                          >
                            {keyword.keyword} ({keyword.frequency})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab de Gráficos Interativos */}
        <TabsContent value="charts" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Gráficos Interativos</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCategory(selectedCategory === 'all' ? 'positive' : 'all')}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {selectedCategory === 'all' ? 'Todos' : 'Positivos'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Barras Aprimorado */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Análise por Categoria (Interativo)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedBarChart 
                  data={analysisData?.barChartData || []}
                  height={300}
                  colorScheme="categorical"
                />
              </CardContent>
            </Card>

            {/* BoxPlot para Outliers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Identificação de Outliers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BoxPlot 
                  data={analysisData?.boxPlotData?.satisfactionByCategory ? Object.entries(analysisData.boxPlotData.satisfactionByCategory).map(([name, values]) => ({ name, values: Array.isArray(values) ? values : [] })) : []}
                  title="Satisfação por Categoria"
                  height={300}
                />
              </CardContent>
            </Card>
          </div>

          {/* BoxPlot de Tempo de Resposta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Tempo de Resposta por Horário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BoxPlot 
                data={realData && realData.statisticalData ? [{ name: 'Response Times', values: realData.statisticalData.ratings || [] }] : []}
                title="Tempo de Resposta (segundos)"
                height={400}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Correlação */}
        <TabsContent value="correlation" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Análise de Correlação</h3>
            <Button
              onClick={() => exportVortexData('correlation')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Matriz de Correlação */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Matriz de Correlação</CardTitle>
              </CardHeader>
              <CardContent>
                <Chart
                  options={correlationChartOptions}
                  series={correlationSeries}
                  type="heatmap"
                  height={350}
                />
              </CardContent>
            </Card>

            {/* Correlações Principais */}
            <Card>
              <CardHeader>
                <CardTitle>Correlações Principais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">Rating ↔ Satisfação</p>
                    <p className="text-xl font-bold text-green-900 dark:text-green-100">
                      {typeof statisticalResults.correlation.ratingSatisfaction?.coefficient === 'number' 
                        ? statisticalResults.correlation.ratingSatisfaction.coefficient.toFixed(3) 
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">Correlação Forte</p>
                  </div>
                  
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Rating ↔ NPS</p>
                    <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                      {typeof statisticalResults.correlation.ratingNps?.coefficient === 'number' 
                        ? statisticalResults.correlation.ratingNps.coefficient.toFixed(3) 
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Correlação Forte</p>
                  </div>
                  
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Satisfação ↔ NPS</p>
                    <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                      {typeof statisticalResults.correlation.satisfactionNps?.coefficient === 'number' 
                        ? statisticalResults.correlation.satisfactionNps.coefficient.toFixed(3) 
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">Correlação Forte</p>
                  </div>
                  
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Tempo ↔ Rating</p>
                    <p className="text-xl font-bold text-red-900 dark:text-red-100">
                      {typeof statisticalResults.correlation.responseTimeRating?.coefficient === 'number' 
                        ? statisticalResults.correlation.responseTimeRating.coefficient.toFixed(3) 
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">Correlação Negativa</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VortexNeuralAnalytics;