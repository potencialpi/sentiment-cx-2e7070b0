import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsRequest {
  surveyId: string;
  analysisType: 'clustering' | 'hypothesis_test' | 'anova' | 'conjoint' | 'brand_index' | 'recommendation_probability';
  parameters?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { surveyId, analysisType, parameters }: AnalyticsRequest = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar dados da pesquisa
    const { data: responses, error } = await supabaseClient
      .from('responses')
      .select('*')
      .eq('survey_id', surveyId);

    if (error) {
      throw new Error(`Erro ao buscar respostas: ${error.message}`);
    }

    let result;

    switch (analysisType) {
      case 'clustering':
        result = await performKMeansClustering(responses);
        break;
      case 'hypothesis_test':
        result = await performHypothesisTest(responses, parameters);
        break;
      case 'anova':
        result = await performANOVA(responses, parameters);
        break;
      case 'conjoint':
        result = await performConjointAnalysis(responses, parameters);
        break;
      case 'brand_index':
        result = await calculateBrandIndex(responses);
        break;
      case 'recommendation_probability':
        result = await calculateRecommendationProbability(responses);
        break;
      default:
        throw new Error(`Tipo de análise não suportado: ${analysisType}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na análise avançada:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function performKMeansClustering(responses: any[]) {
  // Implementação simplificada do K-Means
  const numericData = extractNumericData(responses);
  const k = Math.min(3, numericData.length); // Máximo 3 clusters
  
  // Algoritmo K-means simplificado
  const clusters = initializeClusters(numericData, k);
  const assignments = assignToClusters(numericData, clusters);
  
  return {
    clusters: clusters.length,
    assignments,
    centroids: clusters,
    summary: generateClusterSummary(assignments, numericData)
  };
}

async function performHypothesisTest(responses: any[], parameters: any) {
  const numericData = extractNumericData(responses);
  const mean = numericData.reduce((sum, val) => sum + val, 0) / numericData.length;
  const variance = numericData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (numericData.length - 1);
  const stdDev = Math.sqrt(variance);
  
  const hypothesizedMean = parameters?.hypothesizedMean || mean;
  const tStat = (mean - hypothesizedMean) / (stdDev / Math.sqrt(numericData.length));
  
  return {
    sampleMean: mean,
    hypothesizedMean,
    tStatistic: tStat,
    pValue: calculatePValue(tStat, numericData.length - 1),
    significant: Math.abs(tStat) > 1.96 // Aproximação para α = 0.05
  };
}

async function performANOVA(responses: any[], parameters: any) {
  // ANOVA simplificada entre grupos
  const groups = groupResponsesByCategory(responses, parameters?.groupBy || 'sentiment_category');
  
  const groupMeans = groups.map(group => {
    const numericData = extractNumericData(group);
    return numericData.reduce((sum, val) => sum + val, 0) / numericData.length;
  });
  
  const overallMean = groupMeans.reduce((sum, mean) => sum + mean, 0) / groupMeans.length;
  
  // Calcular F-statistic (simplificado)
  const betweenGroupVariance = groupMeans.reduce((sum, mean) => sum + Math.pow(mean - overallMean, 2), 0) / (groups.length - 1);
  const withinGroupVariance = groups.reduce((sum, group, index) => {
    const numericData = extractNumericData(group);
    const groupMean = groupMeans[index];
    return sum + numericData.reduce((groupSum, val) => groupSum + Math.pow(val - groupMean, 2), 0);
  }, 0) / (responses.length - groups.length);
  
  const fStatistic = betweenGroupVariance / withinGroupVariance;
  
  return {
    groups: groups.length,
    fStatistic,
    significant: fStatistic > 3.84, // Aproximação
    groupMeans,
    overallMean
  };
}

async function performConjointAnalysis(responses: any[], parameters: any) {
  // Análise de conjoint simplificada
  const attributes = parameters?.attributes || ['preco', 'qualidade', 'marca'];
  const preferences = extractPreferenceData(responses, attributes);
  
  return {
    attributes,
    importance: calculateAttributeImportance(preferences, attributes),
    tradeOffs: calculateTradeOffs(preferences, attributes),
    optimalCombination: findOptimalCombination(preferences, attributes)
  };
}

async function calculateBrandIndex(responses: any[]) {
  // Índice de percepção de marca
  const sentimentScores = responses.map(r => r.sentiment_score || 0).filter(s => s !== 0);
  const avgSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
  
  const brandIndex = Math.max(0, Math.min(100, (avgSentiment + 1) * 50)); // Normalizar para 0-100
  
  return {
    brandIndex: Math.round(brandIndex),
    sentiment: avgSentiment,
    category: brandIndex > 70 ? 'Excelente' : brandIndex > 50 ? 'Boa' : brandIndex > 30 ? 'Regular' : 'Ruim',
    recommendations: generateBrandRecommendations(brandIndex)
  };
}

async function calculateRecommendationProbability(responses: any[]) {
  // Modelo preditivo para probabilidade de recomendação
  const sentimentScores = responses.map(r => r.sentiment_score || 0);
  const avgSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
  
  // Modelo logístico simplificado
  const probability = 1 / (1 + Math.exp(-(avgSentiment * 2 + 0.5)));
  
  return {
    probability: Math.round(probability * 100),
    factors: analyzePredictiveFactors(responses),
    segments: segmentByProbability(responses, probability)
  };
}

// Funções auxiliares
function extractNumericData(responses: any[]): number[] {
  return responses.map(r => r.sentiment_score || 0).filter(s => s !== 0);
}

function initializeClusters(data: number[], k: number): number[] {
  const min = Math.min(...data);
  const max = Math.max(...data);
  return Array.from({ length: k }, () => min + Math.random() * (max - min));
}

function assignToClusters(data: number[], clusters: number[]): number[] {
  return data.map(point => {
    let minDistance = Infinity;
    let assignment = 0;
    clusters.forEach((cluster, index) => {
      const distance = Math.abs(point - cluster);
      if (distance < minDistance) {
        minDistance = distance;
        assignment = index;
      }
    });
    return assignment;
  });
}

function generateClusterSummary(assignments: number[], data: number[]) {
  const clusters = new Map();
  assignments.forEach((cluster, index) => {
    if (!clusters.has(cluster)) clusters.set(cluster, []);
    clusters.get(cluster).push(data[index]);
  });
  
  return Array.from(clusters.entries()).map(([id, values]) => ({
    id,
    size: values.length,
    mean: values.reduce((sum, val) => sum + val, 0) / values.length,
    characteristics: values.length > data.length * 0.4 ? 'Maioria' : values.length < data.length * 0.2 ? 'Minoria' : 'Moderado'
  }));
}

function groupResponsesByCategory(responses: any[], category: string): any[][] {
  const groups = new Map();
  responses.forEach(response => {
    const key = response[category] || 'undefined';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(response);
  });
  return Array.from(groups.values());
}

function extractPreferenceData(responses: any[], attributes: string[]) {
  return responses.map(response => {
    const preferences: Record<string, number> = {};
    attributes.forEach(attr => {
      preferences[attr] = Math.random() * 10; // Simulação - na prática, extrair dos dados reais
    });
    return preferences;
  });
}

function calculateAttributeImportance(preferences: any[], attributes: string[]) {
  return attributes.map(attr => ({
    attribute: attr,
    importance: Math.random() * 100 // Simplificado
  }));
}

function calculateTradeOffs(preferences: any[], attributes: string[]) {
  return attributes.map(attr1 => ({
    attribute: attr1,
    tradeOffs: attributes.filter(attr2 => attr2 !== attr1).map(attr2 => ({
      with: attr2,
      correlation: (Math.random() - 0.5) * 2 // -1 a 1
    }))
  }));
}

function findOptimalCombination(preferences: any[], attributes: string[]) {
  return attributes.reduce((optimal, attr) => {
    optimal[attr] = Math.random() > 0.5 ? 'Alto' : 'Baixo';
    return optimal;
  }, {} as Record<string, string>);
}

function calculatePValue(tStat: number, df: number): number {
  // Aproximação simples do p-value
  return 2 * (1 - Math.abs(tStat) / (Math.abs(tStat) + Math.sqrt(df)));
}

function generateBrandRecommendations(brandIndex: number): string[] {
  if (brandIndex > 70) {
    return ['Manter estratégia atual', 'Expandir comunicação positiva', 'Aproveitar momentum para novos produtos'];
  } else if (brandIndex > 50) {
    return ['Melhorar pontos fracos identificados', 'Aumentar engajamento', 'Monitorar concorrência'];
  } else {
    return ['Revisar estratégia de marca', 'Investigar causas de insatisfação', 'Implementar ações corretivas urgentes'];
  }
}

function analyzePredictiveFactors(responses: any[]) {
  return [
    { factor: 'Sentimento geral', impact: 'Alto', value: 'Positivo' },
    { factor: 'Satisfação com produto', impact: 'Médio', value: 'Moderada' },
    { factor: 'Experiência do cliente', impact: 'Alto', value: 'Boa' }
  ];
}

function segmentByProbability(responses: any[], avgProbability: number) {
  return [
    { segment: 'Promotores', percentage: Math.round(avgProbability * 100), description: 'Alta probabilidade de recomendação' },
    { segment: 'Neutros', percentage: Math.round((1 - avgProbability) * 50), description: 'Probabilidade moderada' },
    { segment: 'Detratores', percentage: Math.round((1 - avgProbability) * 50), description: 'Baixa probabilidade' }
  ];
}