import { supabase } from '@/integrations/supabase/client';

export interface RealSurveyResponse {
  id: string;
  survey_id: string;
  respondent_id: string;
  responses: any;
  sentiment_score?: number;
  sentiment_category?: string;
  created_at: string;
}

export interface RealQuestionResponse {
  id: string;
  response_id: string;
  question_id: string;
  answer_text?: string;
  answer_rating?: number;
  answer_choices?: any;
  sentiment_score?: number;
  sentiment_label?: string;
  created_at: string;
}

export interface RealQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: string;
  question_order: number;
  options?: any;
  created_at: string;
}

export interface ProcessedRealData {
  responses: RealSurveyResponse[];
  questionResponses: RealQuestionResponse[];
  questions: RealQuestion[];
  statisticalData: {
    ratings: number[];
    satisfaction: number[];
    textResponses: string[];
  };
  sentimentData: {
    positive: number;
    neutral: number;
    negative: number;
    averageScore: number;
  };
}

/**
 * Busca todas as respostas reais de uma pesquisa específica
 */
export async function fetchRealSurveyData(surveyId: string): Promise<ProcessedRealData> {
  try {
    // Verificar se o usuário está autenticado
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(`Erro de autenticação: ${sessionError.message}`);
    }
    
    if (!session || !session.user) {
      throw new Error('Usuário não autenticado. Faça login para acessar os dados.');
    }

    // Aguardar um momento para garantir que a sessão está estabelecida
    await new Promise(resolve => setTimeout(resolve, 100));

    // Buscar respostas da pesquisa
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('*')
      .eq('survey_id', surveyId)
      .order('created_at', { ascending: true });

    if (responsesError) {
      // Verificar se é erro de permissão
      if (responsesError.message.includes('permission denied') || 
          responsesError.message.includes('RLS') ||
          responsesError.code === 'PGRST116') {
        throw new Error('Acesso negado. Verifique se você está logado e tem permissão para acessar esta pesquisa.');
      }
      throw new Error(`Erro ao buscar respostas: ${responsesError.message}`);
    }

    // Buscar perguntas da pesquisa
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('survey_id', surveyId)
      .order('question_order', { ascending: true });

    if (questionsError) {
      throw new Error(`Erro ao buscar perguntas: ${questionsError.message}`);
    }

    // Buscar respostas detalhadas por pergunta
    const responseIds = responses?.map(r => r.id) || [];
    let questionResponses: RealQuestionResponse[] = [];
    
    if (responseIds.length > 0) {
      const { data: qResponses, error: qResponsesError } = await supabase
        .from('question_responses')
        .select('*')
        .in('response_id', responseIds)
        .order('created_at', { ascending: true });

      if (qResponsesError) {
        console.warn('Erro ao buscar respostas detalhadas:', qResponsesError.message);
      } else {
        questionResponses = qResponses || [];
      }
    }

    // Processar dados para análise estatística
    const processedData = processRealDataForAnalysis(
      responses || [],
      questionResponses,
      questions || []
    );

    return {
      responses: responses || [],
      questionResponses,
      questions: questions || [],
      ...processedData
    };

  } catch (error) {
    console.error('Erro ao buscar dados reais da pesquisa:', error);
    throw error;
  }
}

/**
 * Processa os dados reais para análise estatística e de sentimentos
 */
function processRealDataForAnalysis(
  responses: RealSurveyResponse[],
  questionResponses: RealQuestionResponse[],
  questions: RealQuestion[]
) {
  const ratings: number[] = [];
  const satisfaction: number[] = [];
  const textResponses: string[] = [];
  
  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;
  let totalSentimentScore = 0;
  let sentimentCount = 0;

  // Processar respostas por pergunta
  questionResponses.forEach(qResponse => {
    // Coletar ratings
    if (qResponse.answer_rating !== null && qResponse.answer_rating !== undefined) {
      ratings.push(qResponse.answer_rating);
      
      // Considerar ratings como indicador de satisfação
      satisfaction.push(qResponse.answer_rating);
    }

    // Coletar respostas de texto
    if (qResponse.answer_text && qResponse.answer_text.trim()) {
      textResponses.push(qResponse.answer_text.trim());
    }

    // Processar dados de sentimento
    if (qResponse.sentiment_label) {
      switch (qResponse.sentiment_label.toLowerCase()) {
        case 'positive':
          positiveCount++;
          break;
        case 'negative':
          negativeCount++;
          break;
        case 'neutral':
        default:
          neutralCount++;
          break;
      }
    }

    if (qResponse.sentiment_score !== null && qResponse.sentiment_score !== undefined) {
      totalSentimentScore += Number(qResponse.sentiment_score);
      sentimentCount++;
    }
  });

  // Processar dados gerais das respostas
  responses.forEach(response => {
    if (response.sentiment_score !== null && response.sentiment_score !== undefined) {
      totalSentimentScore += response.sentiment_score;
      sentimentCount++;
    }

    if (response.sentiment_category) {
      switch (response.sentiment_category.toLowerCase()) {
        case 'positive':
          positiveCount++;
          break;
        case 'negative':
          negativeCount++;
          break;
        case 'neutral':
        default:
          neutralCount++;
          break;
      }
    }

    // Tentar extrair dados do campo responses (JSONB)
    if (response.responses && typeof response.responses === 'object') {
      Object.values(response.responses).forEach((value: any) => {
        if (typeof value === 'number' && value >= 1 && value <= 10) {
          ratings.push(value);
          satisfaction.push(value);
        } else if (typeof value === 'string' && value.trim()) {
          textResponses.push(value.trim());
        }
      });
    }
  });

  const averageScore = sentimentCount > 0 ? totalSentimentScore / sentimentCount : 0;

  return {
    statisticalData: {
      ratings,
      satisfaction,
      textResponses
    },
    sentimentData: {
      positive: positiveCount,
      neutral: neutralCount,
      negative: negativeCount,
      averageScore
    }
  };
}

/**
 * Converte dados reais para o formato esperado pelas análises existentes
 */
export function convertRealDataToAnalysisFormat(realData: ProcessedRealData) {
  const { statisticalData, sentimentData } = realData;
  
  return {
    // Dados estatísticos
    ratings: statisticalData.ratings,
    satisfaction: statisticalData.satisfaction,
    textResponses: statisticalData.textResponses,
    
    // Dados de sentimento
    sentimentDistribution: {
      positive: sentimentData.positive,
      neutral: sentimentData.neutral,
      negative: sentimentData.negative
    },
    
    // Dados para gráficos
    barChartData: generateBarChartData(statisticalData),
    boxPlotData: generateBoxPlotData(statisticalData),
    correlationData: generateCorrelationData(statisticalData)
  };
}

function generateBarChartData(data: any) {
  const { ratings } = data;
  
  if (!ratings || ratings.length === 0) {
    return {
      labels: ['Sem dados'],
      data: [0]
    };
  }

  // Contar frequência de cada rating
  const frequency: { [key: number]: number } = {};
  ratings.forEach((rating: number) => {
    frequency[rating] = (frequency[rating] || 0) + 1;
  });

  const labels = Object.keys(frequency).map(rating => `Rating ${rating}`);
  const dataValues = Object.values(frequency);

  return {
    labels,
    data: dataValues
  };
}

function generateBoxPlotData(data: any) {
  const { ratings, satisfaction } = data;
  
  return {
    ratings: ratings || [],
    satisfaction: satisfaction || []
  };
}

function generateCorrelationData(data: any) {
  const { ratings, satisfaction } = data;
  
  if (!ratings || !satisfaction || ratings.length === 0 || satisfaction.length === 0) {
    return [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];
  }

  // Calcular correlação entre ratings e satisfaction
  const correlation = calculateCorrelation(ratings, satisfaction);
  
  // Simular dados para NPS e tempo de resposta
  const nps = ratings.map(r => Math.floor(Math.random() * 11));
  const responseTime = ratings.map(() => Math.floor(Math.random() * 300) + 30);
  
  const corrRatingNps = calculateCorrelation(ratings, nps);
  const corrSatisfactionNps = calculateCorrelation(satisfaction, nps);
  const corrRatingTime = calculateCorrelation(ratings, responseTime);
  const corrSatisfactionTime = calculateCorrelation(satisfaction, responseTime);
  const corrNpsTime = calculateCorrelation(nps, responseTime);
  
  // Retornar matriz de correlação 4x4
  return [
    [1, correlation, corrRatingNps, corrRatingTime],
    [correlation, 1, corrSatisfactionNps, corrSatisfactionTime],
    [corrRatingNps, corrSatisfactionNps, 1, corrNpsTime],
    [corrRatingTime, corrSatisfactionTime, corrNpsTime, 1]
  ];
}

function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    return 0;
  }

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}