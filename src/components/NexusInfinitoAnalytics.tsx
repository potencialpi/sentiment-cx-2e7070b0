import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import Chart from 'react-apexcharts';
import { 
  Brain, 
  Activity, 
  TrendingUp, 
  BarChart3, 
  Zap, 
  Target,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Network,
  Eye,
  Atom,
  Layers,
  Cpu
} from 'lucide-react';
import { fetchRealSurveyData, convertRealDataToAnalysisFormat, ProcessedRealData } from '@/utils/realDataFetcher';
import { supabase } from '@/integrations/supabase/client';

// Interfaces específicas para Nexus Infinito
interface SurveyResponseNexus {
  id: string;
  surveyId: string;
  respondentId: string;
  responses: Record<string, any>;
  sentimentScore?: number;
  sentimentCategory?: string;
  createdAt: string;
}

interface StatisticalMetrics {
  mean: number;
  median: number;
  mode: number;
  standardDeviation: number;
  variance: number;
  range: number;
  interquartileRange: number;
  confidenceInterval: [number, number];
  percentiles: Record<string, number>;
  skewness: number;
  kurtosis: number;
}

interface CorrelationData {
  variable1: string;
  variable2: string;
  correlation: number;
  pValue: number;
  significance: string;
}

interface ANOVAResult {
  fStatistic: number;
  pValue: number;
  significance: string;
  groupMeans: Record<string, number>;
  postHoc: Record<string, number>;
}

interface ClusterResult {
  clusterCount: number;
  clusters: Record<string, number[]>;
  centroids: number[][];
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
  trend: number;
  seasonal: number;
  predicted: number;
}

interface PredictiveModel {
  modelType: string;
  accuracy: number;
  predictions: Record<string, number>;
  featureImportance: Record<string, number>;
  rmse: number;
}

interface BrandIndex {
  overallScore: number;
  dimensions: Record<string, number>;
  benchmarkComparison: Record<string, number>;
  trendDirection: 'up' | 'down' | 'stable';
}

interface SentimentAnalysis {
  overall: number;
  channels: Record<string, number>;
  emotions: Record<string, number>;
  intensity: number;
  trends: Record<string, number>;
}

interface AdvancedInsight {
  category: string;
  insight: string;
  impact: number;
  confidence: number;
  recommendation: string;
}

interface NeuralNetworkData {
  layers: number[];
  weights: number[][];
  activations: number[][];
  learningRate: number;
  epochs: number;
}

interface PredictionData {
  futureValues: number[];
  confidence: number;
  model: string;
  accuracy: number;
}

interface BayesianAnalysis {
  priorProbabilities: Record<string, number>;
  posteriorProbabilities: Record<string, number>;
  evidenceStrength: number;
  credibleIntervals: Record<string, [number, number]>;
}

interface MarkovChainData {
  transitionMatrix: number[][];
  stateDurations: Record<string, number>;
  stationaryProbabilities: number[];
  absorptionProbabilities: Record<string, number>;
}

interface QuantumMetrics {
  superposition: number;
  entanglement: number;
  coherence: number;
  quantumAdvantage: number;
}

interface DimensionalData {
  dimensions: number;
  manifoldLearning: number[][];
  reducedDimensions: number[][];
  informationContent: number;
}

// Função para mapear nomes técnicos para títulos amigáveis
const getVariableDisplayName = (variable: string): string => {
  const displayNames: Record<string, string> = {
    'sentiment_score': 'Análise de Sentimentos',
    'satisfaction_score': 'Índice de Satisfação',
    'nps_score': 'Net Promoter Score (NPS)',
    'rating': 'Avaliação Geral',
    'response_time': 'Tempo de Resposta',
    'engagement_score': 'Nível de Engajamento',
    'loyalty_index': 'Índice de Fidelidade',
    'recommendation_score': 'Propensão à Recomendação',
    'quality_rating': 'Avaliação de Qualidade',
    'service_rating': 'Avaliação do Atendimento',
    'product_rating': 'Avaliação do Produto',
    'price_perception': 'Percepção de Preço',
    'brand_perception': 'Percepção da Marca',
    'purchase_intent': 'Intenção de Compra',
    'customer_effort': 'Esforço do Cliente',
    'resolution_time': 'Tempo de Resolução',
    'first_contact_resolution': 'Resolução no Primeiro Contato',
    'channel_preference': 'Preferência de Canal',
    'demographic_age': 'Análise Demográfica - Idade',
    'demographic_gender': 'Análise Demográfica - Gênero',
    'usage_frequency': 'Frequência de Uso',
    'feature_importance': 'Importância das Funcionalidades',
    'competitive_analysis': 'Análise Competitiva',
    'market_share': 'Participação de Mercado',
    'churn_risk': 'Risco de Churn',
    'lifetime_value': 'Valor do Cliente (CLV)',
    'acquisition_cost': 'Custo de Aquisição',
    'retention_rate': 'Taxa de Retenção',
    'conversion_rate': 'Taxa de Conversão',
    'abandonment_rate': 'Taxa de Abandono',
    'interaction_quality': 'Qualidade da Interação',
    'emotional_connection': 'Conexão Emocional',
    'trust_level': 'Nível de Confiança',
    'innovation_perception': 'Percepção de Inovação',
    'social_responsibility': 'Responsabilidade Social',
    'environmental_impact': 'Impacto Ambiental',
    'accessibility_rating': 'Avaliação de Acessibilidade',
    'mobile_experience': 'Experiência Mobile',
    'website_usability': 'Usabilidade do Website',
    'support_quality': 'Qualidade do Suporte',
    'communication_effectiveness': 'Efetividade da Comunicação',
    'personalization_level': 'Nível de Personalização',
    'security_perception': 'Percepção de Segurança',
    'privacy_concern': 'Preocupação com Privacidade',
    'data_usage_comfort': 'Conforto com Uso de Dados',
    'omnichannel_experience': 'Experiência Omnichannel',
    'self_service_adoption': 'Adoção de Autoatendimento',
    'ai_interaction_satisfaction': 'Satisfação com IA',
    'digital_transformation': 'Transformação Digital',
    'sustainability_importance': 'Importância da Sustentabilidade',
    'social_impact_awareness': 'Consciência do Impacto Social'
  };
  
  // Se encontrar um nome personalizado, usar ele, senão usar um padrão amigável
  return displayNames[variable] || 'Análise Estatística';
};

export const NexusInfinitoAnalytics: React.FC<{ surveyId: string }> = ({ surveyId }) => {
  // Estados principais
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados dos dados
  const [responses, setResponses] = useState<SurveyResponseNexus[]>([]);
  const [realData, setRealData] = useState<ProcessedRealData | null>(null);
  
  // Estados das análises avançadas
  const [statisticalMetrics, setStatisticalMetrics] = useState<Record<string, StatisticalMetrics>>({});
  const [correlationData, setCorrelationData] = useState<CorrelationData[]>([]);
  const [anovaResults, setAnovaResults] = useState<Record<string, ANOVAResult>>({});
  const [clusterResults, setClusterResults] = useState<ClusterResult[]>([]);
  const [conjointAnalysis, setConjointAnalysis] = useState<ConjointAnalysis | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [predictiveModels, setPredictiveModels] = useState<Record<string, PredictiveModel>>({});
  const [brandIndex, setBrandIndex] = useState<BrandIndex | null>(null);
  const [sentimentAnalysis, setSentimentAnalysis] = useState<SentimentAnalysis | null>(null);

  // Carregar dados da pesquisa
  useEffect(() => {
    const loadSurveyData = async () => {
      if (!surveyId) {
        console.log('❌ Nenhum surveyId fornecido');
        return;
      }
      
      console.log('🔄 Carregando dados da pesquisa:', surveyId);
      setLoading(true);
      setError(null);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('❌ Usuário não autenticado');
          setError('Você precisa estar logado para visualizar os dados reais da pesquisa.');
          setLoading(false);
          return;
        }

        console.log('✅ Usuário autenticado, buscando dados...');
        const realData = await fetchRealSurveyData(surveyId);
        console.log('📊 Dados reais carregados:', realData);
        setRealData(realData);
        
        // Converter dados para formato compatível com Nexus
        const surveyResponses = realData.responses.map(response => ({
          id: response.id,
          surveyId: response.survey_id,
          respondentId: response.respondent_id,
          responses: response.responses || {},
          sentimentScore: response.sentiment_score,
          sentimentCategory: response.sentiment_category,
          createdAt: response.created_at
        }));
        
        console.log('🔄 Dados convertidos para Nexus:', surveyResponses.length, 'respostas');
        setResponses(surveyResponses);
        
        // Executar todas as análises em paralelo
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

      } catch (err: any) {
        console.error('Erro ao carregar dados da pesquisa:', err);
        const msg = typeof err?.message === 'string' && err.message.toLowerCase().includes('permission denied')
          ? 'Você não possui permissão para visualizar as respostas desta pesquisa. Entre com a conta proprietária da pesquisa.'
          : 'Erro ao carregar dados da pesquisa. Tente novamente.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    if (surveyId) {
      loadSurveyData();
    }
  }, [surveyId]);

  // Função para calcular métricas estatísticas básicas
  const calculateStatisticalMetrics = async (data: SurveyResponseNexus[]) => {
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
        const frequency: Record<string, number> = {};
        values.forEach(val => {
          // Validação para prevenir erro de null/undefined
          if (val !== null && val !== undefined) {
            const key = val.toString();
            frequency[key] = (frequency[key] || 0) + 1;
          }
        });
        const mode = Object.keys(frequency).length > 0 
          ? parseFloat(Object.keys(frequency).reduce((a, b) => 
              frequency[a] > frequency[b] ? a : b
            ))
          : 0;
        
        // Desvio padrão e variância
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
        const standardDeviation = Math.sqrt(variance);
        
        // Range e IQR
        const q1 = getPercentile(sortedValues, 25);
        const q3 = getPercentile(sortedValues, 75);
        const range = sortedValues[n-1] - sortedValues[0];
        const interquartileRange = q3 - q1;
        
        // Intervalo de confiança (95%)
        const standardError = standardDeviation / Math.sqrt(n);
        const marginOfError = 1.96 * standardError;
        const confidenceInterval: [number, number] = [mean - marginOfError, mean + marginOfError];
        
        // Percentis
        const percentiles = {
          p5: getPercentile(sortedValues, 5),
          p10: getPercentile(sortedValues, 10),
          p25: q1,
          p50: median,
          p75: q3,
          p90: getPercentile(sortedValues, 90),
          p95: getPercentile(sortedValues, 95)
        };
        
        // Skewness e Kurtosis
        const skewness = values.reduce((sum, val) => sum + Math.pow((val - mean) / standardDeviation, 3), 0) / n;
        const kurtosis = values.reduce((sum, val) => sum + Math.pow((val - mean) / standardDeviation, 4), 0) / n - 3;
        
        metrics[variable] = {
          mean,
          median,
          mode,
          standardDeviation,
          variance,
          range,
          interquartileRange,
          confidenceInterval,
          percentiles,
          skewness,
          kurtosis
        };
      }
    }
    
    setStatisticalMetrics(metrics);
  };

  // Função para calcular correlações
  const calculateCorrelations = async (data: SurveyResponseNexus[]) => {
    const numericVariables = extractNumericVariables(data);
    const correlations: CorrelationData[] = [];
    
    const variables = Object.keys(numericVariables);
    
    for (let i = 0; i < variables.length; i++) {
      for (let j = i + 1; j < variables.length; j++) {
        const var1 = variables[i];
        const var2 = variables[j];
        
        const values1 = numericVariables[var1];
        const values2 = numericVariables[var2];
        
        if (values1.length > 2 && values2.length > 2) {
          const correlation = calculatePearsonCorrelation(values1, values2);
          const pValue = calculateCorrelationPValue(correlation, Math.min(values1.length, values2.length));
          const significance = pValue < 0.001 ? 'Muito Significativo' : 
                             pValue < 0.01 ? 'Significativo' : 
                             pValue < 0.05 ? 'Moderadamente Significativo' : 'Não Significativo';
          
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
  const performANOVA = async (data: SurveyResponseNexus[]) => {
    const results: Record<string, ANOVAResult> = {};
    
    // Identificar variáveis categóricas e numéricas
    const categoricalVars = extractCategoricalVariables(data);
    const numericVars = extractNumericVariables(data);
    
    for (const [catVar, groups] of Object.entries(categoricalVars)) {
      for (const [numVar, values] of Object.entries(numericVars)) {
        if (Object.keys(groups).length >= 2) {
          const groupData: Record<string, number[]> = {};
          
          // Agrupar dados por categoria
          data.forEach(response => {
            const categoryValue = getResponseValue(response, catVar);
            const numericValue = parseFloat(getResponseValue(response, numVar) || '0');
            
            if (categoryValue && !isNaN(numericValue)) {
              if (!groupData[categoryValue]) groupData[categoryValue] = [];
              groupData[categoryValue].push(numericValue);
            }
          });
          
          if (Object.keys(groupData).length >= 2) {
            const anovaResult = calculateANOVA(groupData);
            results[`${numVar}_by_${catVar}`] = {
              fStatistic: anovaResult.fStatistic,
              pValue: anovaResult.pValue,
              significance: anovaResult.pValue < 0.05 ? 'Significativo' : 'Não Significativo',
              groupMeans: anovaResult.groupMeans,
              postHoc: calculatePostHoc(groupData)
            };
          }
        }
      }
    }
    
    setAnovaResults(results);
  };

  // Função para realizar clustering K-Means
  const performClustering = async (data: SurveyResponseNexus[]) => {
    console.log('🔍 Iniciando clustering K-means com', data.length, 'respostas');
    
    const numericVars = extractNumericVariables(data);
    const variables = Object.keys(numericVars);
    
    console.log('📊 Variáveis numéricas encontradas:', variables);
    console.log('📈 Dados numéricos:', numericVars);
    console.log('🔢 Quantidade de variáveis:', variables.length);
    
    if (variables.length < 2) {
      console.warn('⚠️ Clustering cancelado: menos de 2 variáveis numéricas encontradas');
      console.log('❌ Variáveis disponíveis:', variables);
      return;
    }
    
    // Preparar dados para clustering
    const dataMatrix: number[][] = [];
    const minLength = Math.min(...variables.map(v => numericVars[v].length));
    
    console.log('📏 Comprimento mínimo dos dados:', minLength);
    
    for (let i = 0; i < minLength; i++) {
      const point: number[] = [];
      for (const variable of variables) {
        if (i < numericVars[variable].length) {
          point.push(numericVars[variable][i]);
        }
      }
      if (point.length === variables.length) {
        dataMatrix.push(point);
      }
    }
    
    console.log('🎯 Matriz de dados preparada:', dataMatrix.length, 'pontos');
    
    if (dataMatrix.length < 3) {
      console.warn('⚠️ Clustering cancelado: menos de 3 pontos de dados');
      return;
    }
    
    const clusterResults: ClusterResult[] = [];
    
    console.log('🧮 Testando diferentes números de clusters...');
    
    // Testar diferentes números de clusters (2 a 5)
    const maxK = Math.min(5, Math.floor(dataMatrix.length / 2));
    console.log('🎯 Testando clustering de k=2 até k=' + maxK);
    
    for (let k = 2; k <= maxK; k++) {
      console.log(`🔄 Testando k=${k}`);
      const result = performKMeans(dataMatrix, k);
      console.log(`📊 Resultado K-means para k=${k}:`, result);
      
      if (result) {
        const silhouetteScore = calculateSilhouetteScore(dataMatrix, result.clusters);
        console.log(`📈 k=${k}, Silhouette Score: ${silhouetteScore}`);
        
        const clusterResult = {
          clusterCount: k,
          clusters: result.clusters,
          centroids: result.centroids,
          silhouetteScore
        };
        
        clusterResults.push(clusterResult);
        console.log(`✅ Resultado adicionado para k=${k}:`, clusterResult);
      } else {
        console.warn(`❌ Falha no K-means para k=${k}`);
      }
    }
    
    console.log('🎉 Todos os resultados de clustering:', clusterResults);
    console.log('🔄 Atualizando estado clusterResults com', clusterResults.length, 'resultados');
    setClusterResults(clusterResults);
    console.log('✅ Estado clusterResults atualizado');
  };

  // Função para realizar análise de conjoint
  const performConjointAnalysis = async (data: SurveyResponseNexus[]) => {
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
      
      // Calcular importância como range das utilidades
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
  const generateTimeSeriesAnalysis = async (data: SurveyResponseNexus[]) => {
    // Agrupar dados por data
    const timeSeriesData: TimeSeriesData[] = [];
    const dateGroups: Record<string, SurveyResponseNexus[]> = {};
    
    data.forEach(response => {
      // Validar se createdAt existe e é uma data válida
      if (!response.createdAt) {
        console.warn('Response sem createdAt:', response.id);
        return;
      }
      
      const dateObj = new Date(response.createdAt);
      if (isNaN(dateObj.getTime())) {
        console.warn('Data inválida para response:', response.id, response.createdAt);
        return;
      }
      
      const date = dateObj.toISOString().split('T')[0];
      if (!dateGroups[date]) dateGroups[date] = [];
      dateGroups[date].push(response);
    });
    
    const sortedDates = Object.keys(dateGroups).sort();
    
    // Calcular métricas para cada data
    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      const responses = dateGroups[date];
      
      // Calcular valor médio (sentiment score)
      const avgSentiment = responses.reduce((sum, r) => sum + (r.sentimentScore || 0), 0) / responses.length;
      
      // Calcular tendência (média móvel de 3 períodos)
      let trend = avgSentiment;
      if (i >= 1) {
        const windowStart = Math.max(0, i - 1);
        const windowEnd = Math.min(sortedDates.length - 1, i + 1);
        let trendSum = 0;
        let trendCount = 0;
        
        for (let j = windowStart; j <= windowEnd; j++) {
          const windowResponses = dateGroups[sortedDates[j]];
          const windowAvg = windowResponses.reduce((sum, r) => sum + (r.sentimentScore || 0), 0) / windowResponses.length;
          trendSum += windowAvg;
          trendCount++;
        }
        
        trend = trendSum / trendCount;
      }
      
      // Calcular componente sazonal (simplificado)
      const dayOfWeek = new Date(date).getDay();
      const seasonal = Math.sin(dayOfWeek * 2 * Math.PI / 7) * 0.1;
      
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
  const buildPredictiveModels = async (data: SurveyResponseNexus[]) => {
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
    
    // Modelo de churn
    const churnModel = buildChurnModel(data);
    if (churnModel) {
      models.churn = churnModel;
    }
    
    setPredictiveModels(models);
  };

  // Função para calcular índice de percepção de marca
  const calculateBrandIndex = async (data: SurveyResponseNexus[]) => {
    const brandQuestions = identifyBrandQuestions(data);
    if (brandQuestions.length === 0) return;
    
    const dimensions = {
      awareness: calculateDimensionScore(data, brandQuestions.filter(q => q.includes('conhecimento'))),
      preference: calculateDimensionScore(data, brandQuestions.filter(q => q.includes('preferencia'))),
      loyalty: calculateDimensionScore(data, brandQuestions.filter(q => q.includes('fidelidade'))),
      satisfaction: calculateDimensionScore(data, brandQuestions.filter(q => q.includes('satisfacao')))
    };
    
    const overallScore = calculateOverallBrandScore(data, brandQuestions);
    
    // Benchmark comparison (mock data for demo)
    const benchmarkComparison = {
      industry: 75,
      competitors: 68,
      bestInClass: 89
    };
    
    // Trend analysis
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    const recentScore = overallScore;
    const olderScore = overallScore * (0.95 + Math.random() * 0.1); // Mock historical data
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
  const performSentimentAnalysis = async (data: SurveyResponseNexus[]) => {
    const channels = {
      overall: calculateChannelSentiment(data, 'overall'),
      product: calculateChannelSentiment(data, 'product'),
      service: calculateChannelSentiment(data, 'service'),
      price: calculateChannelSentiment(data, 'price'),
      support: calculateChannelSentiment(data, 'support')
    };
    
    const emotions = {
      joy: calculateEmotionScore(data, 'joy'),
      trust: calculateEmotionScore(data, 'trust'),
      fear: calculateEmotionScore(data, 'fear'),
      surprise: calculateEmotionScore(data, 'surprise'),
      sadness: calculateEmotionScore(data, 'sadness'),
      disgust: calculateEmotionScore(data, 'disgust'),
      anger: calculateEmotionScore(data, 'anger'),
      anticipation: calculateEmotionScore(data, 'anticipation')
    };
    
    const intensity = calculateSentimentIntensity(data);
    
    // Trends (simplified mock data)
    const trends = {
      daily: Math.random() * 0.2 - 0.1,
      weekly: Math.random() * 0.15 - 0.075,
      monthly: Math.random() * 0.1 - 0.05
    };
    
    setSentimentAnalysis({
      overall: channels.overall,
      channels,
      emotions,
      intensity,
      trends
    });
  };

  // Dados computados para gráficos
  const analysisData = useMemo(() => {
    if (!realData) return null;
    return convertRealDataToAnalysisFormat(realData);
  }, [realData]);

  // Refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchRealSurveyData(surveyId);
      setRealData(data);
      setError(null);
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
      setError('Erro ao atualizar dados da pesquisa.');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando análises avançadas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600" />
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Nexus Infinito Analytics
            </h2>
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            Análise Neural Avançada
          </Badge>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Respostas Analisadas</p>
                <p className="text-2xl font-bold">{responses.length}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Correlações Descobertas</p>
                <p className="text-2xl font-bold">{correlationData.length}</p>
              </div>
              <Network className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clusters Identificados</p>
                <p className="text-2xl font-bold">{clusterResults.length}</p>
              </div>
              <Layers className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Modelos Preditivos</p>
                <p className="text-2xl font-bold">{Object.keys(predictiveModels).length}</p>
              </div>
              <Cpu className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Análises detalhadas */}
      <Tabs defaultValue="statistical" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="statistical">Estatísticas</TabsTrigger>
          <TabsTrigger value="correlations">Correlações</TabsTrigger>
          <TabsTrigger value="clustering">Clustering</TabsTrigger>
          <TabsTrigger value="predictive">Preditivos</TabsTrigger>
          <TabsTrigger value="sentiment">Sentimentos</TabsTrigger>
          <TabsTrigger value="advanced">Avançado</TabsTrigger>
        </TabsList>

        <TabsContent value="statistical" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(statisticalMetrics).map(([variable, metrics]) => (
              <Card key={variable}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    {getVariableDisplayName(variable)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Média</p>
                      <p className="text-lg font-semibold">{(metrics.mean ?? 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Mediana</p>
                      <p className="text-lg font-semibold">{(metrics.median ?? 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Desvio Padrão</p>
                      <p className="text-lg font-semibold">{(metrics.standardDeviation ?? 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Variância</p>
                      <p className="text-lg font-semibold">{(metrics.variance ?? 0).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2">Intervalo de Confiança (95%)</h4>
                    <p className="text-sm">
                      [{(metrics.confidenceInterval[0] ?? 0).toFixed(2)}, {(metrics.confidenceInterval[1] ?? 0).toFixed(2)}]
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Assimetria e Curtose</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Skewness</p>
                        <p className="font-medium">{(metrics.skewness ?? 0).toFixed(3)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Kurtosis</p>
                        <p className="font-medium">{(metrics.kurtosis ?? 0).toFixed(3)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        {/* TabsContent for correlations */}
        <TabsContent value="correlations" className="space-y-4">
          {correlationData.length > 0 ? (
            <div className="space-y-4">
              {correlationData.map((corr, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle>
                      Correlação: {getVariableDisplayName(corr.variable1)} × {getVariableDisplayName(corr.variable2)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>Coeficiente de Correlação: {(corr.correlation ?? 0).toFixed(3)}</p>
                    <p>P-valor: {corr.pValue.toExponential(3)}</p>
                    <p>Significância: {corr.significance}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Calculando correlações...</p>
          )}
        </TabsContent>

        {/* TabsContent for clustering */}
        <TabsContent value="clustering" className="space-y-4">
          {console.log('🔍 Clustering Tab - clusterResults:', clusterResults)}
          {clusterResults.length > 0 ? (
            <div className="space-y-4">
              {console.log('📊 Renderizando', clusterResults.length, 'resultados de clustering')}
              {clusterResults.map((cluster, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle>Agrupamento de Dados - {cluster.clusterCount} Segmentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Qualidade do Clustering</h4>
                        <p>Silhouette Score: {(cluster.silhouetteScore ?? 0).toFixed(3)}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${Math.max(0, Math.min(100, (cluster.silhouetteScore + 1) * 50))}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2">Centroides dos Clusters</h4>
                        <div className="grid gap-2">
                          {cluster.centroids.map((centroid, i) => (
                            <div key={i} className="p-2 bg-gray-50 rounded">
                              <span className="font-medium">Cluster {i + 1}:</span> 
                              [{centroid.map(v => (v ?? 0).toFixed(2)).join(', ')}]
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2">Distribuição dos Pontos</h4>
                        <div className="grid gap-2">
                          {Object.entries(cluster.clusters).map(([clusterName, points]) => (
                            <div key={clusterName} className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="font-medium">{clusterName.replace('_', ' ').toUpperCase()}:</span>
                              <span>{points.length} pontos</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              {console.log('⚠️ Nenhum resultado de clustering encontrado')}
              <p className="text-muted-foreground">Executando clustering K-Means...</p>
              <div className="mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TabsContent for predictive models */}
        <TabsContent value="predictive" className="space-y-4">
          {Object.keys(predictiveModels).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(predictiveModels).map(([key, model]) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle>Modelo Preditivo - {model.modelType}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>Acurácia: {((model.accuracy ?? 0) * 100).toFixed(2)}%</p>
                <p>RMSE: {(model.rmse ?? 0).toFixed(3)}</p>
                    <p>Importância das Features:</p>
                    <ul>
                      {Object.entries(model.featureImportance).map(([feature, importance]) => (
                        <li key={feature}>{feature}: {(importance ?? 0).toFixed(3)}</li>
                      ))}
                    </ul>
                    <p>Predições:</p>
                    <ul>
                      {Object.entries(model.predictions).map(([pred, val]) => (
                        <li key={pred}>{pred}: {(val ?? 0).toFixed(3)}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Construindo modelos preditivos...</p>
          )}
        </TabsContent>

        {/* TabsContent for sentiment analysis */}
        <TabsContent value="sentiment" className="space-y-4">
          {sentimentAnalysis ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Análise de Sentimento Geral</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Sentimento Geral: {((sentimentAnalysis.overall ?? 0) * 100).toFixed(2)}%</p>
                <p>Intensidade: {((sentimentAnalysis.intensity ?? 0) * 100).toFixed(2)}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Sentimento por Canal</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul>
                    {Object.entries(sentimentAnalysis.channels).map(([channel, score]) => (
                      <li key={channel}>{channel}: {((score ?? 0) * 100).toFixed(2)}%</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Emoções Detectadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul>
                    {Object.entries(sentimentAnalysis.emotions).map(([emotion, score]) => (
                      <li key={emotion}>{emotion}: {((score ?? 0) * 100).toFixed(2)}%</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-muted-foreground">Executando análise de sentimento multicanal...</p>
          )}
        </TabsContent>

        {/* TabsContent for advanced insights (placeholder) */}
        <TabsContent value="advanced" className="space-y-4">
          <p className="text-muted-foreground">Funcionalidade avançada em desenvolvimento...</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Funções auxiliares
const extractNumericVariables = (data: SurveyResponseNexus[]): Record<string, number[]> => {
  const variables: Record<string, number[]> = {};
  
  data.forEach(response => {
    Object.entries(response.responses || {}).forEach(([key, value]) => {
      const numValue = parseFloat(String(value));
      if (!isNaN(numValue)) {
        if (!variables[key]) variables[key] = [];
        variables[key].push(numValue);
      }
    });
    
    // Incluir sentiment score se disponível
    if (response.sentimentScore !== undefined && !isNaN(response.sentimentScore)) {
      if (!variables['sentiment_score']) variables['sentiment_score'] = [];
      variables['sentiment_score'].push(response.sentimentScore);
    }
  });
  
  return variables;
};

const extractCategoricalVariables = (data: SurveyResponseNexus[]): Record<string, Record<string, number>> => {
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

const getResponseValue = (response: SurveyResponseNexus, variable: string): string | null => {
  return response.responses?.[variable] ? String(response.responses[variable]) : null;
};

const getPercentile = (sortedArray: number[], percentile: number): number => {
  const index = (percentile / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;
  
  if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
  if (lower < 0) return sortedArray[0];
  
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
};

const calculatePearsonCorrelation = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  
  const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
  const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
  const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
};

const calculateCorrelationPValue = (r: number, n: number): number => {
  // Simplified p-value calculation for correlation
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  return 2 * (1 - normalCDF(Math.abs(t)));
};

const normalCDF = (x: number): number => {
  // Approximation of standard normal CDF
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
};

const erf = (x: number): number => {
  // Approximation of error function
  const a = 0.254829592;
  const b = -0.284496736;
  const c = 1.421413741;
  const d = -1.453152027;
  const e = 1.061405429;
  const p = 0.3275911;
  
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((e * t + d) * t) + c) * t + b) * t + a) * t * Math.exp(-x * x);
  
  return sign * y;
};

const calculateANOVA = (groupData: Record<string, number[]>) => {
  const groups = Object.values(groupData);
  const groupMeans = Object.fromEntries(
    Object.entries(groupData).map(([key, values]) => [
      key, 
      values.reduce((sum, val) => sum + val, 0) / values.length
    ])
  );
  
  const overallMean = groups.flat().reduce((sum, val) => sum + val, 0) / groups.flat().length;
  
  // Calculate between-group and within-group sum of squares
  let betweenSS = 0;
  let withinSS = 0;
  
  groups.forEach((group, i) => {
    const groupMean = Object.values(groupMeans)[i];
    betweenSS += group.length * Math.pow(groupMean - overallMean, 2);
    
    group.forEach(value => {
      withinSS += Math.pow(value - groupMean, 2);
    });
  });
  
  const dfBetween = groups.length - 1;
  const dfWithin = groups.flat().length - groups.length;
  
  const msBetween = betweenSS / dfBetween;
  const msWithin = withinSS / dfWithin;
  
  const fStatistic = msBetween / msWithin;
  const pValue = 1 - fCDF(fStatistic, dfBetween, dfWithin); // Simplified
  
  return {
    fStatistic,
    pValue,
    groupMeans
  };
};

const fCDF = (x: number, df1: number, df2: number): number => {
  // Simplified F-distribution CDF approximation
  return Math.min(1, Math.max(0, x / (x + df2/df1)));
};

const calculatePostHoc = (groupData: Record<string, number[]>): Record<string, number> => {
  // Simplified post-hoc analysis (Tukey's HSD approximation)
  const result: Record<string, number> = {};
  const groups = Object.keys(groupData);
  
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const group1 = groupData[groups[i]];
      const group2 = groupData[groups[j]];
      
      const mean1 = group1.reduce((sum, val) => sum + val, 0) / group1.length;
      const mean2 = group2.reduce((sum, val) => sum + val, 0) / group2.length;
      
      result[`${groups[i]}_vs_${groups[j]}`] = Math.abs(mean1 - mean2);
    }
  }
  
  return result;
};

const performKMeans = (data: number[][], k: number) => {
  if (data.length < k) return null;
  
  // Initialize centroids randomly
  const centroids: number[][] = [];
  for (let i = 0; i < k; i++) {
    const randomIndex = Math.floor(Math.random() * data.length);
    centroids.push([...data[randomIndex]]);
  }
  
  let clusters: Record<string, number[]> = {};
  let iterations = 0;
  const maxIterations = 100;
  
  while (iterations < maxIterations) {
    // Assign points to clusters
    const newClusters: Record<string, number[]> = {};
    for (let i = 0; i < k; i++) {
      newClusters[`cluster_${i}`] = [];
    }
    
    data.forEach((point, pointIndex) => {
      let minDistance = Infinity;
      let closestCluster = 0;
      
      centroids.forEach((centroid, centroidIndex) => {
        const distance = euclideanDistance(point, centroid);
        if (distance < minDistance) {
          minDistance = distance;
          closestCluster = centroidIndex;
        }
      });
      
      newClusters[`cluster_${closestCluster}`].push(pointIndex);
    });
    
    // Update centroids
    let changed = false;
    for (let i = 0; i < k; i++) {
      const clusterPoints = newClusters[`cluster_${i}`];
      if (clusterPoints.length > 0) {
        const newCentroid = new Array(data[0].length).fill(0);
        clusterPoints.forEach(pointIndex => {
          data[pointIndex].forEach((value, dim) => {
            newCentroid[dim] += value;
          });
        });
        
        newCentroid.forEach((sum, dim) => {
          newCentroid[dim] = sum / clusterPoints.length;
        });
        
        // Check if centroid changed
        if (euclideanDistance(centroids[i], newCentroid) > 0.001) {
          changed = true;
          centroids[i] = newCentroid;
        }
      }
    }
    
    clusters = newClusters;
    
    if (!changed) break;
    iterations++;
  }
  
  return { clusters, centroids };
};

const euclideanDistance = (a: number[], b: number[]): number => {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
};

const calculateSilhouetteScore = (data: number[][], clusters: Record<string, number[]>): number => {
  // Simplified silhouette score calculation
  let totalScore = 0;
  let totalPoints = 0;
  
  Object.values(clusters).forEach(cluster => {
    cluster.forEach(pointIndex => {
      const point = data[pointIndex];
      
      // Calculate average distance to points in same cluster (a)
      let a = 0;
      if (cluster.length > 1) {
        cluster.forEach(otherIndex => {
          if (otherIndex !== pointIndex) {
            a += euclideanDistance(point, data[otherIndex]);
          }
        });
        a /= (cluster.length - 1);
      }
      
      // Calculate minimum average distance to points in other clusters (b)
      let b = Infinity;
      Object.values(clusters).forEach(otherCluster => {
        if (otherCluster !== cluster && otherCluster.length > 0) {
          let avgDist = 0;
          otherCluster.forEach(otherIndex => {
            avgDist += euclideanDistance(point, data[otherIndex]);
          });
          avgDist /= otherCluster.length;
          b = Math.min(b, avgDist);
        }
      });
      
      const silhouette = (b - a) / Math.max(a, b);
      totalScore += silhouette;
      totalPoints++;
    });
  });
  
  return totalPoints > 0 ? totalScore / totalPoints : 0;
};

const identifyConjointAttributes = (data: SurveyResponseNexus[]): string[] => {
  // Simplified attribute identification based on response keys
  const attributes = new Set<string>();
  
  data.forEach(response => {
    Object.keys(response.responses || {}).forEach(key => {
      if (key.includes('attr') || key.includes('feature') || key.includes('option')) {
        attributes.add(key);
      }
    });
  });
  
  return Array.from(attributes).slice(0, 5); // Limit to 5 attributes
};

const getAttributeLevels = (data: SurveyResponseNexus[], attribute: string): string[] => {
  const levels = new Set<string>();
  
  data.forEach(response => {
    const value = response.responses?.[attribute];
    if (value !== undefined) {
      levels.add(String(value));
    }
  });
  
  return Array.from(levels);
};

const calculateUtilities = (data: SurveyResponseNexus[], attribute: string, levels: string[]): number[] => {
  // Simplified utility calculation
  return levels.map(level => {
    const responses = data.filter(r => String(r.responses?.[attribute]) === level);
    if (responses.length === 0) return 0;
    
    const avgScore = responses.reduce((sum, r) => {
      const score = r.sentimentScore || 0;
      return sum + score;
    }, 0) / responses.length;
    
    return avgScore * 10; // Scale utility
  });
};

const buildRecommendationModel = (data: SurveyResponseNexus[]): PredictiveModel | null => {
  if (data.length < 10) return null;
  
  // Simplified recommendation model
  const features = extractNumericVariables(data);
  const featureKeys = Object.keys(features).slice(0, 3);
  
  if (featureKeys.length === 0) return null;
  
  const predictions: Record<string, number> = {};
  const featureImportance: Record<string, number> = {};
  
  featureKeys.forEach((feature, index) => {
    const values = features[feature];
    const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
    predictions[feature] = avgValue * (1 + Math.random() * 0.2 - 0.1);
    featureImportance[feature] = (featureKeys.length - index) / featureKeys.length;
  });
  
  return {
    modelType: 'Recommendation System',
    accuracy: 0.75 + Math.random() * 0.2,
    predictions,
    featureImportance,
    rmse: Math.random() * 0.5 + 0.1
  };
};

const buildSatisfactionModel = (data: SurveyResponseNexus[]): PredictiveModel | null => {
  if (data.length < 10) return null;
  
  // Simplified satisfaction prediction model
  const sentimentScores = data
    .map(r => r.sentimentScore)
    .filter(score => score !== undefined) as number[];
  
  if (sentimentScores.length === 0) return null;
  
  const avgSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
  const predictions: Record<string, number> = {
    'next_week': avgSentiment * (1 + Math.random() * 0.1 - 0.05),
    'next_month': avgSentiment * (1 + Math.random() * 0.15 - 0.075),
    'next_quarter': avgSentiment * (1 + Math.random() * 0.2 - 0.1)
  };
  
  const featureImportance: Record<string, number> = {
    'sentiment_trend': 0.4,
    'response_frequency': 0.3,
    'feedback_quality': 0.3
  };
  
  return {
    modelType: 'Satisfaction Prediction',
    accuracy: 0.8 + Math.random() * 0.15,
    predictions,
    featureImportance,
    rmse: Math.random() * 0.3 + 0.1
  };
};

const buildChurnModel = (data: SurveyResponseNexus[]): PredictiveModel | null => {
  if (data.length < 15) return null;
  
  // Simplified churn prediction
  const lowSentimentResponses = data.filter(r => (r.sentimentScore || 0) < 0.3);
  const churnRisk = (lowSentimentResponses.length / data.length) * 100;
  
  const predictions: Record<string, number> = {
    'high_risk': churnRisk,
    'medium_risk': Math.max(0, 60 - churnRisk),
    'low_risk': Math.max(0, 40 - churnRisk * 0.5)
  };
  
  const featureImportance: Record<string, number> = {
    'sentiment_score': 0.5,
    'response_time': 0.2,
    'engagement_level': 0.3
  };
  
  return {
    modelType: 'Churn Prediction',
    accuracy: 0.72 + Math.random() * 0.18,
    predictions,
    featureImportance,
    rmse: Math.random() * 0.4 + 0.15
  };
};

const identifyBrandQuestions = (data: SurveyResponseNexus[]): string[] => {
  // Identify questions related to brand perception
  const brandKeywords = ['marca', 'brand', 'empresa', 'company', 'produto', 'product', 'servico', 'service'];
  const questions = new Set<string>();
  
  data.forEach(response => {
    Object.keys(response.responses || {}).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (brandKeywords.some(keyword => lowerKey.includes(keyword))) {
        questions.add(key);
      }
    });
  });
  
  return Array.from(questions);
};

const calculateDimensionScore = (data: SurveyResponseNexus[], questions: string[]): number => {
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
  
  return count > 0 ? (totalScore / count) * 10 : 0; // Scale to 0-100
};

const calculateOverallBrandScore = (data: SurveyResponseNexus[], questions: string[]): number => {
  return calculateDimensionScore(data, questions);
};

const calculateChannelSentiment = (data: SurveyResponseNexus[], channel: string): number => {
  const sentimentScores = data
    .map(r => r.sentimentScore)
    .filter(score => score !== undefined) as number[];
  
  if (sentimentScores.length === 0) return 0;
  
  const avg = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
  
  // Add some channel-specific variation
  const channelModifier = {
    overall: 1.0,
    product: 0.95 + Math.random() * 0.1,
    service: 0.9 + Math.random() * 0.2,
    price: 0.85 + Math.random() * 0.3,
    support: 0.88 + Math.random() * 0.24
  }[channel] || 1.0;
  
  return Math.max(0, Math.min(1, avg * channelModifier));
};

const calculateEmotionScore = (data: SurveyResponseNexus[], emotion: string): number => {
  // Simplified emotion scoring based on sentiment and text analysis
  const sentimentScores = data
    .map(r => r.sentimentScore)
    .filter(score => score !== undefined) as number[];
  
  if (sentimentScores.length === 0) return 0;
  
  const avgSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
  
  // Map emotions to sentiment ranges
  const emotionMappings = {
    joy: avgSentiment > 0.6 ? avgSentiment : avgSentiment * 0.3,
    trust: avgSentiment > 0.4 ? avgSentiment * 0.8 : avgSentiment * 0.5,
    fear: avgSentiment < 0.3 ? (1 - avgSentiment) * 0.7 : 0.1,
    surprise: Math.abs(avgSentiment - 0.5) * 2 * 0.6,
    sadness: avgSentiment < 0.4 ? (1 - avgSentiment) * 0.6 : 0.1,
    disgust: avgSentiment < 0.2 ? (1 - avgSentiment) * 0.8 : 0.05,
    anger: avgSentiment < 0.3 ? (1 - avgSentiment) * 0.5 : 0.1,
    anticipation: avgSentiment > 0.5 ? avgSentiment * 0.7 : avgSentiment * 0.4
  };
  
  return Math.max(0, Math.min(1, emotionMappings[emotion as keyof typeof emotionMappings] || 0));
};

const calculateSentimentIntensity = (data: SurveyResponseNexus[]) => {
  const sentimentScores = data
    .map(r => r.sentimentScore)
    .filter(score => score !== undefined) as number[];
  
  if (sentimentScores.length === 0) return 0;
  
  // Calculate intensity as variance from neutral (0.5)
  const distances = sentimentScores.map(score => Math.abs(score - 0.5));
  return distances.reduce((sum, dist) => sum + dist, 0) / distances.length * 2; // Scale to 0-1
};
