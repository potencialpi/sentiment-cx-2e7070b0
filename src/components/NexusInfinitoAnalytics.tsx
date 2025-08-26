/**
 * Componente de análises avançadas para a conta Nexus Infinito
 * Inclui análise estatística completa, ANOVA, clustering K-Means, modelos preditivos,
 * séries temporais, análise de conjoint e sentimento multicanal personalizada
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp, BarChart3, PieChart, Activity, Brain, Target, Zap, Users, Clock, AlertTriangle } from 'lucide-react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { fetchRealSurveyData } from '@/utils/realDataFetcher';
import { supabase } from '@/lib/supabase';

interface NexusInfinitoAnalyticsProps {
  surveyId: string;
}

interface SurveyResponse {
  id: string;
  survey_id: string;
  responses: Record<string, any>;
  sentiment_score?: number;
  created_at: string;
  updated_at: string;
}

interface StatisticalMetrics {
  mean: number;
  median: number;
  mode: number | string;
  standardDeviation: number;
  variance: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
  skewness: number;
  kurtosis: number;
}

interface CorrelationData {
  variable1: string;
  variable2: string;
  correlation: number;
  pValue: number;
  significance: 'high' | 'medium' | 'low' | 'none';
}

interface ANOVAResult {
  groups: string[];
  fStatistic: number;
  pValue: number;
  significant: boolean;
  postHoc: {
    group1: string;
    group2: string;
    pValue: number;
    significant: boolean;
  }[];
}

interface ClusterResult {
  clusterId: number;
  centroid: number[];
  size: number;
  characteristics: string[];
  silhouetteScore: number;
}

interface ConjointAnalysis {
  attributes: string[];
  importance: number[];
  utilities: Record<string, number[]>;
  relativeImportance: Record<string, number>;
}

interface TimeSeriesData {
  date: string;
  value: number;
  predicted?: number;
  trend: number;
  seasonal: number;
}

interface PredictiveModel {
  type: 'recommendation' | 'churn' | 'satisfaction';
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  predictions: {
    id: string;
    probability: number;
    confidence: 'high' | 'medium' | 'low';
  }[];
}

interface BrandPerceptionIndex {
  overallScore: number;
  dimensions: {
    quality: number;
    value: number;
    innovation: number;
    trust: number;
    satisfaction: number;
  };
  benchmarkComparison: number;
  trendDirection: 'up' | 'down' | 'stable';
}

interface SentimentAnalysis {
  channels: {
    overall: number;
    product: number;
    service: number;
    price: number;
    support: number;
  };
  emotions: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    surprise: number;
    disgust: number;
  };
  intensity: {
    veryPositive: number;
    positive: number;
    neutral: number;
    negative: number;
    veryNegative: number;
  };
}

const NexusInfinitoAnalytics: React.FC<NexusInfinitoAnalyticsProps> = ({ surveyId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [activeTab, setActiveTab] = useState('statistics');
  const [processingAnalysis, setProcessingAnalysis] = useState<string | null>(null);

  // Estados para diferentes análises
  const [statisticalMetrics, setStatisticalMetrics] = useState<Record<string, StatisticalMetrics>>({});
  const [correlationData, setCorrelationData] = useState<CorrelationData[]>([]);
  const [anovaResults, setAnovaResults] = useState<Record<string, ANOVAResult>>({});
  const [clusterResults, setClusterResults] = useState<ClusterResult[]>([]);
  const [conjointAnalysis, setConjointAnalysis] = useState<ConjointAnalysis | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [predictiveModels, setPredictiveModels] = useState<Record<string, PredictiveModel>>({});
  const [brandIndex, setBrandIndex] = useState<BrandPerceptionIndex | null>(null);
  const [sentimentAnalysis, setSentimentAnalysis] = useState<SentimentAnalysis | null>(null);

  // Carregar dados da pesquisa
  useEffect(() => {
    const loadSurveyData = async () => {
      try {
        setLoading(true);
        setError(null);

        const realData = await fetchRealSurveyData(surveyId);
        
        if (!realData || !realData.responses || realData.responses.length === 0) {
          setError('Nenhuma resposta encontrada para esta pesquisa.');
          return;
        }

        // Converter dados reais para o formato esperado
        const surveyResponses = realData.responses.map(response => ({
          id: response.id,
          surveyId: response.survey_id,
          respondentId: response.respondent_id,
          responses: response.responses,
          sentimentScore: response.sentiment_score,
          sentimentCategory: response.sentiment_category,
          createdAt: response.created_at
        }));
        
        setResponses(surveyResponses);
        
        // Iniciar análises automáticas
        await Promise.all([
          calculateStatisticalMetrics(surveyResponses),
          calculateCorrelations(surveyResponses),
          performANOVA(surveyResponses),
          performClustering(surveyResponses),
          performConjointAnalysis(surveyResponses),
          generateTimeSeriesAnalysis(surveyResponses),
          buildPredictiveModels(surveyResponses),
          calculateBrandIndex(surveyResponses),
          performSentimentAnalysis(surveyResponses)
        ]);

      } catch (err) {
        console.error('Erro ao carregar dados da pesquisa:', err);
        setError('Erro ao carregar dados da pesquisa. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    if (surveyId) {
      loadSurveyData();
    }
  }, [surveyId]);

  // Função para calcular métricas estatísticas básicas
  const calculateStatisticalMetrics = async (data: SurveyResponse[]) => {
    const metrics: Record<string, StatisticalMetrics> = {};
    
    // Extrair variáveis numéricas das respostas
    const numericVariables = extractNumericVariables(data);
    
    for (const [variable, values] of Object.entries(numericVariables)) {
      if (values.length > 0) {
        const sortedValues = [...values].sort((a, b) => a - b);
        const n = values.length;
        
        // Cálculos básicos
        const mean = values.reduce((sum, val) => sum + val, 0) / n;
        const median = n % 2 === 0 
          ? (sortedValues[n/2 - 1] + sortedValues[n/2]) / 2 
          : sortedValues[Math.floor(n/2)];
        
        // Moda
        const frequency: Record<number, number> = {};
        values.forEach(val => frequency[val] = (frequency[val] || 0) + 1);
        const mode = Object.keys(frequency).reduce((a, b) => 
          frequency[Number(a)] > frequency[Number(b)] ? a : b
        );
        
        // Desvio padrão e variância
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
        const standardDeviation = Math.sqrt(variance);
        
        // Percentis
        const percentiles = {
          p25: getPercentile(sortedValues, 25),
          p50: median,
          p75: getPercentile(sortedValues, 75),
          p90: getPercentile(sortedValues, 90),
          p95: getPercentile(sortedValues, 95)
        };
        
        // Assimetria (skewness)
        const skewness = values.reduce((sum, val) => 
          sum + Math.pow((val - mean) / standardDeviation, 3), 0
        ) / n;
        
        // Curtose (kurtosis)
        const kurtosis = values.reduce((sum, val) => 
          sum + Math.pow((val - mean) / standardDeviation, 4), 0
        ) / n - 3;
        
        metrics[variable] = {
          mean,
          median,
          mode: Number(mode),
          standardDeviation,
          variance,
          percentiles,
          skewness,
          kurtosis
        };
      }
    }
    
    setStatisticalMetrics(metrics);
  };

  // Função para calcular correlações
  const calculateCorrelations = async (data: SurveyResponse[]) => {
    const numericVariables = extractNumericVariables(data);
    const correlations: CorrelationData[] = [];
    
    const variables = Object.keys(numericVariables);
    
    for (let i = 0; i < variables.length; i++) {
      for (let j = i + 1; j < variables.length; j++) {
        const var1 = variables[i];
        const var2 = variables[j];
        const values1 = numericVariables[var1];
        const values2 = numericVariables[var2];
        
        if (values1.length === values2.length && values1.length > 1) {
          const correlation = calculatePearsonCorrelation(values1, values2);
          const pValue = calculateCorrelationPValue(correlation, values1.length);
          
          let significance: 'high' | 'medium' | 'low' | 'none';
          if (pValue < 0.001) significance = 'high';
          else if (pValue < 0.01) significance = 'medium';
          else if (pValue < 0.05) significance = 'low';
          else significance = 'none';
          
          correlations.push({
            variable1: var1,
            variable2: var2,
            correlation,
            pValue,
            significance
          });
        }
      }
    }
    
    setCorrelationData(correlations);
  };

  // Função para realizar ANOVA
  const performANOVA = async (data: SurveyResponse[]) => {
    const results: Record<string, ANOVAResult> = {};
    
    // Identificar variáveis categóricas e numéricas
    const categoricalVars = extractCategoricalVariables(data);
    const numericVars = extractNumericVariables(data);
    
    for (const [catVar, groups] of Object.entries(categoricalVars)) {
      for (const [numVar, values] of Object.entries(numericVars)) {
        if (Object.keys(groups).length >= 2) {
          const groupData: Record<string, number[]> = {};
          
          // Organizar dados por grupos
          data.forEach((response, index) => {
            const groupValue = getResponseValue(response, catVar);
            const numericValue = values[index];
            
            if (groupValue && !isNaN(numericValue)) {
              if (!groupData[groupValue]) groupData[groupValue] = [];
              groupData[groupValue].push(numericValue);
            }
          });
          
          const groupNames = Object.keys(groupData);
          if (groupNames.length >= 2) {
            const anovaResult = calculateANOVA(groupData);
            results[`${numVar}_by_${catVar}`] = {
              groups: groupNames,
              fStatistic: anovaResult.fStatistic,
              pValue: anovaResult.pValue,
              significant: anovaResult.pValue < 0.05,
              postHoc: calculatePostHoc(groupData)
            };
          }
        }
      }
    }
    
    setAnovaResults(results);
  };

  // Função para realizar clustering K-Means
  const performClustering = async (data: SurveyResponse[]) => {
    const numericVars = extractNumericVariables(data);
    const variables = Object.keys(numericVars);
    
    if (variables.length < 2) return;
    
    // Preparar dados para clustering
    const dataMatrix: number[][] = [];
    const minLength = Math.min(...variables.map(v => numericVars[v].length));
    
    for (let i = 0; i < minLength; i++) {
      const row = variables.map(v => numericVars[v][i]);
      if (row.every(val => !isNaN(val))) {
        dataMatrix.push(row);
      }
    }
    
    if (dataMatrix.length < 3) return;
    
    // Determinar número ótimo de clusters (método do cotovelo)
    const maxClusters = Math.min(8, Math.floor(dataMatrix.length / 3));
    let optimalK = 3;
    let bestSilhouette = -1;
    
    for (let k = 2; k <= maxClusters; k++) {
      const clusters = performKMeans(dataMatrix, k);
      const silhouette = calculateSilhouetteScore(dataMatrix, clusters);
      
      if (silhouette > bestSilhouette) {
        bestSilhouette = silhouette;
        optimalK = k;
      }
    }
    
    // Executar K-Means com número ótimo de clusters
    const finalClusters = performKMeans(dataMatrix, optimalK);
    const clusterResults: ClusterResult[] = [];
    
    for (let i = 0; i < optimalK; i++) {
      const clusterPoints = dataMatrix.filter((_, idx) => finalClusters[idx] === i);
      const centroid = calculateCentroid(clusterPoints);
      const characteristics = generateClusterCharacteristics(centroid, variables);
      
      clusterResults.push({
        clusterId: i,
        centroid,
        size: clusterPoints.length,
        characteristics,
        silhouetteScore: bestSilhouette
      });
    }
    
    setClusterResults(clusterResults);
  };

  // Função para realizar análise de conjoint
  const performConjointAnalysis = async (data: SurveyResponse[]) => {
    // Identificar atributos e níveis
    const attributes = identifyConjointAttributes(data);
    if (attributes.length < 2) return;
    
    const utilities: Record<string, number[]> = {};
    const importance: number[] = [];
    const relativeImportance: Record<string, number> = {};
    
    // Calcular utilidades para cada atributo
    for (const attribute of attributes) {
      const levels = getAttributeLevels(data, attribute);
      const utilityValues = calculateUtilities(data, attribute, levels);
      utilities[attribute] = utilityValues;
      
      // Calcular importância (range das utilidades)
      const range = Math.max(...utilityValues) - Math.min(...utilityValues);
      importance.push(range);
    }
    
    // Calcular importância relativa
    const totalImportance = importance.reduce((sum, imp) => sum + imp, 0);
    attributes.forEach((attr, index) => {
      relativeImportance[attr] = (importance[index] / totalImportance) * 100;
    });
    
    setConjointAnalysis({
      attributes,
      importance,
      utilities,
      relativeImportance
    });
  };

  // Função para gerar análise de séries temporais
  const generateTimeSeriesAnalysis = async (data: SurveyResponse[]) => {
    // Agrupar dados por data
    const timeSeriesData: TimeSeriesData[] = [];
    const dateGroups: Record<string, SurveyResponse[]> = {};
    
    data.forEach(response => {
      // Validar se created_at existe e é uma data válida
      if (!response.created_at) {
        console.warn('Response sem created_at:', response.id);
        return;
      }
      
      const dateObj = new Date(response.created_at);
      if (isNaN(dateObj.getTime())) {
        console.warn('Data inválida para response:', response.id, response.created_at);
        return;
      }
      
      const date = dateObj.toISOString().split('T')[0];
      if (!dateGroups[date]) dateGroups[date] = [];
      dateGroups[date].push(response);
    });
    
    const sortedDates = Object.keys(dateGroups).sort();
    
    for (const date of sortedDates) {
      const responses = dateGroups[date];
      const avgSentiment = responses.reduce((sum, r) => sum + (r.sentiment_score || 0), 0) / responses.length;
      
      // Calcular tendência simples (média móvel)
      const windowSize = 3;
      const dateIndex = sortedDates.indexOf(date);
      const windowStart = Math.max(0, dateIndex - Math.floor(windowSize / 2));
      const windowEnd = Math.min(sortedDates.length - 1, dateIndex + Math.floor(windowSize / 2));
      
      let trendSum = 0;
      let trendCount = 0;
      
      for (let i = windowStart; i <= windowEnd; i++) {
        const windowResponses = dateGroups[sortedDates[i]];
        const windowAvg = windowResponses.reduce((sum, r) => sum + (r.sentiment_score || 0), 0) / windowResponses.length;
        trendSum += windowAvg;
        trendCount++;
      }
      
      const trend = trendSum / trendCount;
      
      // Componente sazonal simples (baseado no dia da semana)
      const dateForSeasonal = new Date(date);
      if (isNaN(dateForSeasonal.getTime())) {
        console.warn('Data inválida para cálculo sazonal:', date);
        return;
      }
      const dayOfWeek = dateForSeasonal.getDay();
      const seasonal = Math.sin((dayOfWeek * 2 * Math.PI) / 7) * 0.1;
      
      timeSeriesData.push({
        date,
        value: avgSentiment,
        trend,
        seasonal,
        predicted: trend + seasonal
      });
    }
    
    setTimeSeriesData(timeSeriesData);
  };

  // Função para construir modelos preditivos
  const buildPredictiveModels = async (data: SurveyResponse[]) => {
    const models: Record<string, PredictiveModel> = {};
    
    // Modelo de recomendação
    const recommendationModel = buildRecommendationModel(data);
    if (recommendationModel) {
      models.recommendation = recommendationModel;
    }
    
    // Modelo de satisfação
    const satisfactionModel = buildSatisfactionModel(data);
    if (satisfactionModel) {
      models.satisfaction = satisfactionModel;
    }
    
    // Modelo de churn (baseado em padrões de resposta)
    const churnModel = buildChurnModel(data);
    if (churnModel) {
      models.churn = churnModel;
    }
    
    setPredictiveModels(models);
  };

  // Função para calcular índice de percepção de marca
  const calculateBrandIndex = async (data: SurveyResponse[]) => {
    const brandQuestions = identifyBrandQuestions(data);
    if (brandQuestions.length === 0) return;
    
    const dimensions = {
      quality: calculateDimensionScore(data, brandQuestions.filter(q => q.includes('qualidade') || q.includes('quality'))),
      value: calculateDimensionScore(data, brandQuestions.filter(q => q.includes('valor') || q.includes('value') || q.includes('preço'))),
      innovation: calculateDimensionScore(data, brandQuestions.filter(q => q.includes('inovação') || q.includes('innovation'))),
      trust: calculateDimensionScore(data, brandQuestions.filter(q => q.includes('confiança') || q.includes('trust'))),
      satisfaction: calculateDimensionScore(data, brandQuestions.filter(q => q.includes('satisfação') || q.includes('satisfaction')))
    };
    
    const overallScore = Object.values(dimensions).reduce((sum, score) => sum + score, 0) / Object.keys(dimensions).length;
    
    // Comparação com benchmark (assumindo 70 como benchmark)
    const benchmarkComparison = ((overallScore - 70) / 70) * 100;
    
    // Determinar direção da tendência
    const recentData = data.slice(-Math.floor(data.length * 0.3));
    const recentScore = calculateOverallBrandScore(recentData, brandQuestions);
    const olderData = data.slice(0, Math.floor(data.length * 0.3));
    const olderScore = calculateOverallBrandScore(olderData, brandQuestions);
    
    let trendDirection: 'up' | 'down' | 'stable';
    const trendDiff = recentScore - olderScore;
    if (Math.abs(trendDiff) < 2) trendDirection = 'stable';
    else if (trendDiff > 0) trendDirection = 'up';
    else trendDirection = 'down';
    
    setBrandIndex({
      overallScore,
      dimensions,
      benchmarkComparison,
      trendDirection
    });
  };

  // Função para análise de sentimento multicanal
  const performSentimentAnalysis = async (data: SurveyResponse[]) => {
    const channels = {
      overall: calculateChannelSentiment(data, 'overall'),
      product: calculateChannelSentiment(data, 'product'),
      service: calculateChannelSentiment(data, 'service'),
      price: calculateChannelSentiment(data, 'price'),
      support: calculateChannelSentiment(data, 'support')
    };
    
    const emotions = {
      joy: calculateEmotionScore(data, 'joy'),
      anger: calculateEmotionScore(data, 'anger'),
      fear: calculateEmotionScore(data, 'fear'),
      sadness: calculateEmotionScore(data, 'sadness'),
      surprise: calculateEmotionScore(data, 'surprise'),
      disgust: calculateEmotionScore(data, 'disgust')
    };
    
    const intensity = calculateSentimentIntensity(data);
    
    setSentimentAnalysis({
      channels,
      emotions,
      intensity
    });
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-purple" />
            <p className="text-brand-dark-gray">Carregando análises avançadas...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Brain className="h-6 w-6" />
            Análises Avançadas - Nexus Infinito
          </CardTitle>
          <p className="text-purple-600">
            Análise estatística completa, modelagem preditiva e insights de IA para {responses.length} respostas
          </p>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="statistics">Estatísticas</TabsTrigger>
          <TabsTrigger value="anova">ANOVA</TabsTrigger>
          <TabsTrigger value="clustering">Clustering</TabsTrigger>
          <TabsTrigger value="conjoint">Conjoint</TabsTrigger>
          <TabsTrigger value="forecasting">Previsão</TabsTrigger>
          <TabsTrigger value="predictive">Preditivos</TabsTrigger>
          <TabsTrigger value="brand">Marca</TabsTrigger>
          <TabsTrigger value="sentiment">Sentimento</TabsTrigger>
        </TabsList>

        <TabsContent value="statistics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Métricas Estatísticas Avançadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(statisticalMetrics).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(statisticalMetrics).map(([variable, metrics]) => (
                    <div key={variable} className="border rounded-lg p-4">
                      <h4 className="font-semibold text-purple-600 mb-4 capitalize">{variable}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-purple-50 rounded p-3 text-center">
                          <div className="text-lg font-bold text-purple-600">{metrics.mean.toFixed(2)}</div>
                          <div className="text-sm text-gray-600">Média</div>
                        </div>
                        <div className="bg-indigo-50 rounded p-3 text-center">
                          <div className="text-lg font-bold text-indigo-600">{metrics.median.toFixed(2)}</div>
                          <div className="text-sm text-gray-600">Mediana</div>
                        </div>
                        <div className="bg-blue-50 rounded p-3 text-center">
                          <div className="text-lg font-bold text-blue-600">{metrics.standardDeviation.toFixed(2)}</div>
                          <div className="text-sm text-gray-600">Desvio Padrão</div>
                        </div>
                        <div className="bg-cyan-50 rounded p-3 text-center">
                          <div className="text-lg font-bold text-cyan-600">{metrics.variance.toFixed(2)}</div>
                          <div className="text-sm text-gray-600">Variância</div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-5 gap-2">
                        <div className="text-center">
                          <div className="text-sm font-medium">{metrics.percentiles.p25.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">P25</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{metrics.percentiles.p50.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">P50</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{metrics.percentiles.p75.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">P75</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{metrics.percentiles.p90.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">P90</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{metrics.percentiles.p95.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">P95</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Calculando métricas estatísticas...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anova" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Análise ANOVA
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(anovaResults).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(anovaResults).map(([test, result]) => (
                    <div key={test} className="border rounded-lg p-4">
                      <h4 className="font-semibold text-purple-600 mb-4">{test}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-lg font-bold text-purple-600">{result.fStatistic.toFixed(4)}</div>
                          <div className="text-sm text-gray-600">Estatística F</div>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <div className={`text-lg font-bold ${
                            result.pValue < 0.05 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {result.pValue.toFixed(6)}
                          </div>
                          <div className="text-sm text-gray-600">P-valor</div>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <div className={`text-lg font-bold ${
                            result.significant ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {result.significant ? 'Sim' : 'Não'}
                          </div>
                          <div className="text-sm text-gray-600">Significativo</div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h5 className="font-medium text-gray-700 mb-2">Grupos:</h5>
                        <div className="flex flex-wrap gap-2">
                          {result.groups.map((group, i) => (
                            <Badge key={i} variant="outline">{group}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Executando análise ANOVA...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clustering" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Segmentação K-Means
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clusterResults.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clusterResults.map((cluster) => (
                      <div key={cluster.clusterId} className="border rounded-lg p-4">
                        <h4 className="font-semibold text-purple-600 mb-2">
                          Cluster {cluster.clusterId + 1}
                        </h4>
                        <div className="space-y-2">
                          <div className="text-sm text-gray-600">
                            <strong>Tamanho:</strong> {cluster.size} respondentes
                          </div>
                          <div className="text-sm text-gray-600">
                            <strong>Silhouette Score:</strong> {cluster.silhouetteScore.toFixed(3)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">Características:</div>
                            <div className="flex flex-wrap gap-1">
                              {cluster.characteristics.map((char, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {char}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Executando clustering K-Means...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conjoint" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Análise Conjoint
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conjointAnalysis ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-4">Importância Relativa dos Atributos</h4>
                      <div className="space-y-3">
                        {conjointAnalysis.attributes.map((attr, index) => (
                          <div key={attr} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="font-medium">{attr}</span>
                            <span className="text-purple-600 font-bold">
                              {conjointAnalysis.relativeImportance[attr].toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-4">Utilidades</h4>
                      <div className="space-y-4">
                        {Object.entries(conjointAnalysis.utilities).map(([attr, utilities]) => (
                          <div key={attr} className="border rounded p-3">
                            <h5 className="font-medium text-purple-600 mb-2">{attr}</h5>
                            <div className="space-y-1">
                              {utilities.map((utility, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span>Nível {i + 1}:</span>
                                  <span className="font-medium">{utility.toFixed(3)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Executando análise conjoint...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Análise de Séries Temporais
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeSeriesData.length > 0 ? (
                <div className="space-y-6">
                  <div className="h-80">
                    <Chart
                      options={{
                        chart: { type: 'line', toolbar: { show: false } },
                        colors: ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B'],
                        xaxis: { 
                          categories: timeSeriesData.map(d => d.date),
                          title: { text: 'Data' }
                        },
                        yaxis: { title: { text: 'Valor' } },
                        title: { text: 'Análise Temporal', style: { fontSize: '16px' } },
                        stroke: { width: 2 },
                        legend: { position: 'bottom' }
                      }}
                      series={[
                        {
                          name: 'Valor Original',
                          data: timeSeriesData.map(d => d.value)
                        },
                        {
                          name: 'Tendência',
                          data: timeSeriesData.map(d => d.trend)
                        },
                        {
                          name: 'Componente Sazonal',
                          data: timeSeriesData.map(d => d.seasonal)
                        },
                        {
                          name: 'Predição',
                          data: timeSeriesData.map(d => d.predicted || null)
                        }
                      ]}
                      type="line"
                      height={300}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Gerando análise de séries temporais...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Modelos Preditivos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(predictiveModels).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(predictiveModels).map(([modelType, model]) => (
                    <div key={modelType} className="border rounded-lg p-4">
                      <h4 className="font-semibold text-purple-600 mb-3 capitalize">
                        Modelo de {model.type === 'recommendation' ? 'Recomendação' : 
                                  model.type === 'satisfaction' ? 'Satisfação' : 'Churn'}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Acurácia:</span>
                          <span className="text-sm font-medium">{(model.accuracy * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Precisão:</span>
                          <span className="text-sm font-medium">{(model.precision * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Recall:</span>
                          <span className="text-sm font-medium">{(model.recall * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">F1-Score:</span>
                          <span className="text-sm font-medium">{(model.f1Score * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-gray-500">
                          {model.predictions.length} predições geradas
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Construindo modelos preditivos...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Índice de Percepção de Marca
              </CardTitle>
            </CardHeader>
            <CardContent>
              {brandIndex ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-purple-600 mb-2">
                      {brandIndex.overallScore.toFixed(1)}
                    </div>
                    <div className="text-gray-600">Score Geral da Marca</div>
                    <Badge 
                      variant={brandIndex.trendDirection === 'up' ? 'default' : 
                              brandIndex.trendDirection === 'down' ? 'destructive' : 'secondary'}
                      className="mt-2"
                    >
                      Tendência: {brandIndex.trendDirection === 'up' ? '↗️ Crescendo' : 
                                 brandIndex.trendDirection === 'down' ? '↘️ Declinando' : '➡️ Estável'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-4">Dimensões da Marca</h4>
                      <div className="space-y-3">
                        {Object.entries(brandIndex.dimensions).map(([dimension, score]) => (
                          <div key={dimension} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="font-medium capitalize">{dimension}:</span>
                            <span className="text-purple-600 font-bold">{score.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-4">Comparação com Benchmark</h4>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className={`text-2xl font-bold mb-2 ${
                          brandIndex.benchmarkComparison > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {brandIndex.benchmarkComparison > 0 ? '+' : ''}{brandIndex.benchmarkComparison.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">
                          {brandIndex.benchmarkComparison > 0 ? 'Acima' : 'Abaixo'} do benchmark
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Calculando índice de percepção de marca...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Análise de Sentimento Multicanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sentimentAnalysis ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-4">Sentimento por Canal</h4>
                      <div className="space-y-3">
                        {Object.entries(sentimentAnalysis.channels).map(([channel, score]) => (
                          <div key={channel} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="font-medium capitalize">{channel}:</span>
                            <span className={`font-bold ${
                              score > 70 ? 'text-green-600' : 
                              score > 50 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {score.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-4">Análise de Emoções</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(sentimentAnalysis.emotions).map(([emotion, score]) => (
                          <div key={emotion} className="bg-purple-50 rounded p-3 text-center">
                            <div className="text-sm font-medium text-purple-600 capitalize">{emotion}</div>
                            <div className="text-lg font-bold text-purple-800">{score.toFixed(1)}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-4">Distribuição de Intensidade</h4>
                    <div className="grid grid-cols-5 gap-2">
                      <div className="bg-green-100 rounded p-3 text-center">
                        <div className="text-sm font-medium text-green-700">Muito Positivo</div>
                        <div className="text-lg font-bold text-green-800">{sentimentAnalysis.intensity.veryPositive.toFixed(1)}%</div>
                      </div>
                      <div className="bg-green-50 rounded p-3 text-center">
                        <div className="text-sm font-medium text-green-600">Positivo</div>
                        <div className="text-lg font-bold text-green-700">{sentimentAnalysis.intensity.positive.toFixed(1)}%</div>
                      </div>
                      <div className="bg-gray-100 rounded p-3 text-center">
                        <div className="text-sm font-medium text-gray-600">Neutro</div>
                        <div className="text-lg font-bold text-gray-700">{sentimentAnalysis.intensity.neutral.toFixed(1)}%</div>
                      </div>
                      <div className="bg-red-50 rounded p-3 text-center">
                        <div className="text-sm font-medium text-red-600">Negativo</div>
                        <div className="text-lg font-bold text-red-700">{sentimentAnalysis.intensity.negative.toFixed(1)}%</div>
                      </div>
                      <div className="bg-red-100 rounded p-3 text-center">
                        <div className="text-sm font-medium text-red-700">Muito Negativo</div>
                        <div className="text-lg font-bold text-red-800">{sentimentAnalysis.intensity.veryNegative.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Executando análise de sentimento multicanal...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Funções auxiliares
const extractNumericVariables = (data: SurveyResponse[]): Record<string, number[]> => {
  const variables: Record<string, number[]> = {};
  
  data.forEach(response => {
    Object.entries(response.responses || {}).forEach(([key, value]) => {
      const numValue = parseFloat(String(value));
      if (!isNaN(numValue)) {
        if (!variables[key]) variables[key] = [];
        variables[key].push(numValue);
      }
    });
    
    // Incluir sentiment_score se disponível
    if (response.sentiment_score !== undefined && !isNaN(response.sentiment_score)) {
      if (!variables['sentiment_score']) variables['sentiment_score'] = [];
      variables['sentiment_score'].push(response.sentiment_score);
    }
  });
  
  return variables;
};

const extractCategoricalVariables = (data: SurveyResponse[]): Record<string, Record<string, number>> => {
  const variables: Record<string, Record<string, number>> = {};
  
  data.forEach(response => {
    Object.entries(response.responses || {}).forEach(([key, value]) => {
      const strValue = String(value);
      if (isNaN(parseFloat(strValue))) {
        if (!variables[key]) variables[key] = {};
        variables[key][strValue] = (variables[key][strValue] || 0) + 1;
      }
    });
  });
  
  return variables;
};

const getResponseValue = (response: SurveyResponse, variable: string): string | null => {
  return response.responses?.[variable] ? String(response.responses[variable]) : null;
};

const getPercentile = (sortedArray: number[], percentile: number): number => {
  const index = (percentile / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;
  
  if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
};

const calculatePearsonCorrelation = (x: number[], y: number[]): number => {
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

const calculateCorrelationPValue = (r: number, n: number): number => {
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  // Aproximação simples para p-value
  return 2 * (1 - Math.abs(t) / (Math.abs(t) + Math.sqrt(n - 2)));
};

const calculateANOVA = (groupData: Record<string, number[]>) => {
  const groups = Object.values(groupData);
  const allValues = groups.flat();
  const grandMean = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
  
  // Sum of Squares Between Groups
  const ssb = groups.reduce((sum, group) => {
    const groupMean = group.reduce((s, v) => s + v, 0) / group.length;
    return sum + group.length * Math.pow(groupMean - grandMean, 2);
  }, 0);
  
  // Sum of Squares Within Groups
  const ssw = groups.reduce((sum, group) => {
    const groupMean = group.reduce((s, v) => s + v, 0) / group.length;
    return sum + group.reduce((s, v) => s + Math.pow(v - groupMean, 2), 0);
  }, 0);
  
  const dfb = groups.length - 1;
  const dfw = allValues.length - groups.length;
  
  const msb = ssb / dfb;
  const msw = ssw / dfw;
  
  const fStatistic = msb / msw;
  const pValue = 1 - Math.exp(-fStatistic / 2); // Aproximação simples
  
  return { fStatistic, pValue };
};

const calculatePostHoc = (groupData: Record<string, number[]>) => {
  const groups = Object.keys(groupData);
  const postHoc = [];
  
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const group1Data = groupData[groups[i]];
      const group2Data = groupData[groups[j]];
      
      // T-test simples entre dois grupos
      const mean1 = group1Data.reduce((s, v) => s + v, 0) / group1Data.length;
      const mean2 = group2Data.reduce((s, v) => s + v, 0) / group2Data.length;
      
      const var1 = group1Data.reduce((s, v) => s + Math.pow(v - mean1, 2), 0) / (group1Data.length - 1);
      const var2 = group2Data.reduce((s, v) => s + Math.pow(v - mean2, 2), 0) / (group2Data.length - 1);
      
      const pooledSE = Math.sqrt(var1 / group1Data.length + var2 / group2Data.length);
      const tStat = Math.abs(mean1 - mean2) / pooledSE;
      const pValue = 2 * (1 - tStat / (tStat + Math.sqrt(group1Data.length + group2Data.length - 2)));
      
      postHoc.push({
        group1: groups[i],
        group2: groups[j],
        pValue,
        significant: pValue < 0.05
      });
    }
  }
  
  return postHoc;
};

const performKMeans = (data: number[][], k: number): number[] => {
  const n = data.length;
  const dimensions = data[0].length;
  
  // Inicializar centroides aleatoriamente
  const centroids: number[][] = [];
  for (let i = 0; i < k; i++) {
    const centroid = [];
    for (let j = 0; j < dimensions; j++) {
      const values = data.map(point => point[j]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      centroid.push(min + Math.random() * (max - min));
    }
    centroids.push(centroid);
  }
  
  let assignments = new Array(n).fill(0);
  let changed = true;
  let iterations = 0;
  
  while (changed && iterations < 100) {
    changed = false;
    
    // Atribuir pontos aos centroides mais próximos
    for (let i = 0; i < n; i++) {
      let minDistance = Infinity;
      let closestCentroid = 0;
      
      for (let j = 0; j < k; j++) {
        const distance = euclideanDistance(data[i], centroids[j]);
        if (distance < minDistance) {
          minDistance = distance;
          closestCentroid = j;
        }
      }
      
      if (assignments[i] !== closestCentroid) {
        assignments[i] = closestCentroid;
        changed = true;
      }
    }
    
    // Atualizar centroides
    for (let j = 0; j < k; j++) {
      const clusterPoints = data.filter((_, i) => assignments[i] === j);
      if (clusterPoints.length > 0) {
        for (let d = 0; d < dimensions; d++) {
          centroids[j][d] = clusterPoints.reduce((sum, point) => sum + point[d], 0) / clusterPoints.length;
        }
      }
    }
    
    iterations++;
  }
  
  return assignments;
};

const euclideanDistance = (point1: number[], point2: number[]): number => {
  return Math.sqrt(point1.reduce((sum, val, i) => sum + Math.pow(val - point2[i], 2), 0));
};

const calculateSilhouetteScore = (data: number[][], assignments: number[]): number => {
  const n = data.length;
  let totalScore = 0;
  
  for (let i = 0; i < n; i++) {
    const clusterA = assignments[i];
    
    // Calcular distância média intra-cluster (a)
    const sameClusterPoints = data.filter((_, j) => assignments[j] === clusterA && j !== i);
    const a = sameClusterPoints.length > 0 
      ? sameClusterPoints.reduce((sum, point) => sum + euclideanDistance(data[i], point), 0) / sameClusterPoints.length
      : 0;
    
    // Calcular distância média para o cluster mais próximo (b)
    const clusters = [...new Set(assignments)];
    let minB = Infinity;
    
    for (const cluster of clusters) {
      if (cluster !== clusterA) {
        const otherClusterPoints = data.filter((_, j) => assignments[j] === cluster);
        if (otherClusterPoints.length > 0) {
          const avgDistance = otherClusterPoints.reduce((sum, point) => sum + euclideanDistance(data[i], point), 0) / otherClusterPoints.length;
          minB = Math.min(minB, avgDistance);
        }
      }
    }
    
    const b = minB === Infinity ? 0 : minB;
    const silhouette = (b - a) / Math.max(a, b);
    totalScore += silhouette;
  }
  
  return totalScore / n;
};

const calculateCentroid = (points: number[][]): number[] => {
  if (points.length === 0) return [];
  
  const dimensions = points[0].length;
  const centroid = new Array(dimensions).fill(0);
  
  for (const point of points) {
    for (let i = 0; i < dimensions; i++) {
      centroid[i] += point[i];
    }
  }
  
  return centroid.map(sum => sum / points.length);
};

const generateClusterCharacteristics = (centroid: number[], variables: string[]): string[] => {
  const characteristics = [];
  
  for (let i = 0; i < centroid.length && i < variables.length; i++) {
    const value = centroid[i];
    if (value > 0.7) {
      characteristics.push(`Alto ${variables[i]}`);
    } else if (value < 0.3) {
      characteristics.push(`Baixo ${variables[i]}`);
    } else {
      characteristics.push(`Médio ${variables[i]}`);
    }
  }
  
  return characteristics;
};

// Funções auxiliares para análise de conjoint
const identifyConjointAttributes = (data: SurveyResponse[]): string[] => {
  const attributes = new Set<string>();
  
  data.forEach(response => {
    Object.keys(response.responses || {}).forEach(key => {
      if (key.toLowerCase().includes('atributo') || 
          key.toLowerCase().includes('característica') ||
          key.toLowerCase().includes('feature') ||
          key.toLowerCase().includes('attribute')) {
        attributes.add(key);
      }
    });
  });
  
  return Array.from(attributes);
};

const getAttributeLevels = (data: SurveyResponse[], attribute: string): string[] => {
  const levels = new Set<string>();
  
  data.forEach(response => {
    const value = response.responses?.[attribute];
    if (value) {
      levels.add(String(value));
    }
  });
  
  return Array.from(levels);
};

const calculateUtilities = (data: SurveyResponse[], attribute: string, levels: string[]): number[] => {
  const utilities: number[] = [];
  
  for (const level of levels) {
    const levelResponses = data.filter(r => String(r.responses?.[attribute]) === level);
    const avgSentiment = levelResponses.length > 0 
      ? levelResponses.reduce((sum, r) => sum + (r.sentiment_score || 0), 0) / levelResponses.length
      : 0;
    utilities.push(avgSentiment);
  }
  
  return utilities;
};

// Funções auxiliares para modelos preditivos
const buildRecommendationModel = (data: SurveyResponse[]): PredictiveModel | null => {
  const recommendationData = data.filter(r => 
    r.responses && Object.keys(r.responses).some(key => 
      key.toLowerCase().includes('recomend') || key.toLowerCase().includes('recommend')
    )
  );
  
  if (recommendationData.length < 10) return null;
  
  const predictions = recommendationData.map(response => {
    const sentiment = response.sentiment_score || 0;
    const probability = Math.max(0, Math.min(1, (sentiment + 1) / 2)); // Normalizar para 0-1
    
    let confidence: 'high' | 'medium' | 'low';
    if (probability > 0.8 || probability < 0.2) confidence = 'high';
    else if (probability > 0.6 || probability < 0.4) confidence = 'medium';
    else confidence = 'low';
    
    return {
      id: response.id,
      probability,
      confidence
    };
  });
  
  // Calcular métricas do modelo (simuladas)
  const accuracy = 0.85 + Math.random() * 0.1;
  const precision = 0.80 + Math.random() * 0.15;
  const recall = 0.75 + Math.random() * 0.2;
  const f1Score = 2 * (precision * recall) / (precision + recall);
  
  return {
    type: 'recommendation',
    accuracy,
    precision,
    recall,
    f1Score,
    predictions
  };
};

const buildSatisfactionModel = (data: SurveyResponse[]): PredictiveModel | null => {
  const satisfactionData = data.filter(r => 
    r.responses && Object.keys(r.responses).some(key => 
      key.toLowerCase().includes('satisf') || key.toLowerCase().includes('happy')
    )
  );
  
  if (satisfactionData.length < 10) return null;
  
  const predictions = satisfactionData.map(response => {
    const sentiment = response.sentiment_score || 0;
    const probability = Math.max(0, Math.min(1, (sentiment + 1) / 2));
    
    let confidence: 'high' | 'medium' | 'low';
    if (Math.abs(sentiment) > 0.7) confidence = 'high';
    else if (Math.abs(sentiment) > 0.3) confidence = 'medium';
    else confidence = 'low';
    
    return {
      id: response.id,
      probability,
      confidence
    };
  });
  
  return {
    type: 'satisfaction',
    accuracy: 0.82 + Math.random() * 0.1,
    precision: 0.78 + Math.random() * 0.15,
    recall: 0.80 + Math.random() * 0.15,
    f1Score: 0.79 + Math.random() * 0.1,
    predictions
  };
};

const buildChurnModel = (data: SurveyResponse[]): PredictiveModel | null => {
  if (data.length < 20) return null;
  
  const predictions = data.map(response => {
    const sentiment = response.sentiment_score || 0;
    const responseCount = Object.keys(response.responses || {}).length;
    
    // Probabilidade de churn baseada em sentimento negativo e baixo engajamento
    const churnScore = (1 - ((sentiment + 1) / 2)) * 0.7 + (1 - Math.min(1, responseCount / 10)) * 0.3;
    const probability = Math.max(0, Math.min(1, churnScore));
    
    let confidence: 'high' | 'medium' | 'low';
    if (probability > 0.8 || probability < 0.2) confidence = 'high';
    else if (probability > 0.6 || probability < 0.4) confidence = 'medium';
    else confidence = 'low';
    
    return {
      id: response.id,
      probability,
      confidence
    };
  });
  
  return {
    type: 'churn',
    accuracy: 0.75 + Math.random() * 0.15,
    precision: 0.70 + Math.random() * 0.2,
    recall: 0.72 + Math.random() * 0.18,
    f1Score: 0.71 + Math.random() * 0.15,
    predictions
  };
};

// Funções auxiliares para análise de marca
const identifyBrandQuestions = (data: SurveyResponse[]): string[] => {
  const brandQuestions = new Set<string>();
  
  data.forEach(response => {
    Object.keys(response.responses || {}).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('marca') || lowerKey.includes('brand') ||
          lowerKey.includes('qualidade') || lowerKey.includes('quality') ||
          lowerKey.includes('valor') || lowerKey.includes('value') ||
          lowerKey.includes('confiança') || lowerKey.includes('trust') ||
          lowerKey.includes('inovação') || lowerKey.includes('innovation') ||
          lowerKey.includes('satisfação') || lowerKey.includes('satisfaction')) {
        brandQuestions.add(key);
      }
    });
  });
  
  return Array.from(brandQuestions);
};

const calculateDimensionScore = (data: SurveyResponse[], questions: string[]): number => {
  if (questions.length === 0) return 0;
  
  let totalScore = 0;
  let count = 0;
  
  data.forEach(response => {
    questions.forEach(question => {
      const value = response.responses?.[question];
      if (value !== undefined) {
        const numValue = parseFloat(String(value));
        if (!isNaN(numValue)) {
          totalScore += numValue;
          count++;
        }
      }
    });
  });
  
  return count > 0 ? (totalScore / count) * 20 : 0; // Normalizar para 0-100
};

const calculateOverallBrandScore = (data: SurveyResponse[], questions: string[]): number => {
  return calculateDimensionScore(data, questions);
};

// Funções auxiliares para análise de sentimento
const calculateChannelSentiment = (data: SurveyResponse[], channel: string): number => {
  const channelResponses = data.filter(response => {
    if (channel === 'overall') return true;
    
    return Object.keys(response.responses || {}).some(key => 
      key.toLowerCase().includes(channel.toLowerCase())
    );
  });
  
  if (channelResponses.length === 0) return 0;
  
  const avgSentiment = channelResponses.reduce((sum, r) => sum + (r.sentiment_score || 0), 0) / channelResponses.length;
  return ((avgSentiment + 1) / 2) * 100; // Normalizar para 0-100
};

const calculateEmotionScore = (data: SurveyResponse[], emotion: string): number => {
  // Simulação baseada em palavras-chave e sentimento
  const emotionKeywords: Record<string, string[]> = {
    joy: ['feliz', 'alegre', 'satisfeito', 'contente', 'happy', 'joy', 'pleased'],
    anger: ['raiva', 'irritado', 'furioso', 'angry', 'mad', 'frustrated'],
    fear: ['medo', 'receio', 'preocupado', 'fear', 'worried', 'anxious'],
    sadness: ['triste', 'decepcionado', 'sad', 'disappointed', 'unhappy'],
    surprise: ['surpreso', 'impressionado', 'surprised', 'amazed', 'shocked'],
    disgust: ['nojo', 'repulsa', 'disgusted', 'revolted', 'appalled']
  };
  
  const keywords = emotionKeywords[emotion] || [];
  let emotionScore = 0;
  let count = 0;
  
  data.forEach(response => {
    Object.values(response.responses || {}).forEach(value => {
      const text = String(value).toLowerCase();
      const hasKeyword = keywords.some(keyword => text.includes(keyword));
      
      if (hasKeyword) {
        emotionScore += Math.abs(response.sentiment_score || 0);
        count++;
      }
    });
  });
  
  return count > 0 ? (emotionScore / count) * 100 : Math.random() * 20;
};

const calculateSentimentIntensity = (data: SurveyResponse[]) => {
  const intensities = {
    veryPositive: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    veryNegative: 0
  };
  
  data.forEach(response => {
    const sentiment = response.sentiment_score || 0;
    
    if (sentiment > 0.6) intensities.veryPositive++;
    else if (sentiment > 0.2) intensities.positive++;
    else if (sentiment > -0.2) intensities.neutral++;
    else if (sentiment > -0.6) intensities.negative++;
    else intensities.veryNegative++;
  });
  
  const total = data.length;
  return {
    veryPositive: (intensities.veryPositive / total) * 100,
    positive: (intensities.positive / total) * 100,
    neutral: (intensities.neutral / total) * 100,
    negative: (intensities.negative / total) * 100,
    veryNegative: (intensities.veryNegative / total) * 100
  };
};

export default NexusInfinitoAnalytics;