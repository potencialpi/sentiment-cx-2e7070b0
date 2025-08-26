/**
 * Dados mock realistas para demonstração das funcionalidades da conta Vórtex Neural
 * Inclui dados para análise estatística, sentimentos temáticos e gráficos interativos
 */

import { 
  ThematicAnalysisResult, 
  SentimentTheme, 
  SentimentIntensity 
} from './thematicSentimentAnalysis';
import { BarChartDataItem } from '../components/charts/EnhancedBarChart';

// Dados de respostas simuladas para análise temática
export const mockSurveyResponses = [
  {
    id: '1',
    text: 'O atendimento foi excelente, muito prestativo e rápido. Produto de ótima qualidade, vale muito a pena o preço pago.',
    rating: 5,
    date: '2024-01-15',
    questionId: 'q1',
    userId: 'user1'
  },
  {
    id: '2', 
    text: 'Atendimento demorado e mal educado. O produto chegou com defeito e o preço é muito caro para a qualidade oferecida.',
    rating: 1,
    date: '2024-01-16',
    questionId: 'q1',
    userId: 'user2'
  },
  {
    id: '3',
    text: 'Produto funciona bem, preço justo. Atendimento foi ok, nada excepcional mas resolveu meu problema.',
    rating: 4,
    date: '2024-01-17',
    questionId: 'q2',
    userId: 'user3'
  },
  {
    id: '4',
    text: 'Excelente custo-benefício! Produto superou expectativas e o suporte foi muito competente e educado.',
    rating: 5,
    date: '2024-01-18',
    questionId: 'q2',
    userId: 'user4'
  },
  {
    id: '5',
    text: 'Produto razoável, mas o atendimento deixa muito a desejar. Preço poderia ser mais acessível.',
    rating: 2,
    date: '2024-01-19',
    questionId: 'q3',
    userId: 'user5'
  },
  {
    id: '6',
    text: 'Fantástico! Melhor produto que já comprei. Atendimento nota 10 e preço muito justo.',
    rating: 5,
    date: '2024-01-20',
    questionId: 'q3',
    userId: 'user6'
  },
  {
    id: '7',
    text: 'Produto bom, mas o suporte técnico é péssimo. Não conseguem resolver problemas simples.',
    rating: 2,
    date: '2024-01-21',
    questionId: 'q1',
    userId: 'user7'
  },
  {
    id: '8',
    text: 'Preço alto demais para o que oferece. Produto até que é bom, mas não vale o investimento.',
    rating: 2,
    date: '2024-01-22',
    questionId: 'q2',
    userId: 'user8'
  },
  {
    id: '9',
    text: 'Atendimento cordial e eficiente. Produto de qualidade excepcional, recomendo!',
    rating: 5,
    date: '2024-01-23',
    questionId: 'q3',
    userId: 'user9'
  },
  {
    id: '10',
    text: 'Mais ou menos. Produto funciona, atendimento é aceitável, preço está na média do mercado.',
    rating: 3,
    date: '2024-01-24',
    questionId: 'q1',
    userId: 'user10'
  },
  {
    id: '11',
    text: 'Horrível experiência! Produto quebrou no primeiro dia, atendimento grosso e preço abusivo.',
    rating: 1,
    date: '2024-01-25',
    questionId: 'q2',
    userId: 'user11'
  },
  {
    id: '12',
    text: 'Produto incrível, durável e bonito. Suporte sempre disponível e prestativo. Vale cada centavo!',
    rating: 5,
    date: '2024-01-26',
    questionId: 'q3',
    userId: 'user12'
  },
  {
    id: '13',
    text: 'Atendimento profissional, produto satisfatório. Preço um pouco salgado mas compensa.',
    rating: 4,
    date: '2024-01-27',
    questionId: 'q1',
    userId: 'user13'
  },
  {
    id: '14',
    text: 'Produto com falhas constantes. Atendimento tenta ajudar mas não resolve. Preço não justifica.',
    rating: 2,
    date: '2024-01-28',
    questionId: 'q2',
    userId: 'user14'
  },
  {
    id: '15',
    text: 'Excelente em todos os aspectos! Produto, atendimento e preço estão perfeitos.',
    rating: 5,
    date: '2024-01-29',
    questionId: 'q3',
    userId: 'user15'
  }
];

// Dados para análise estatística
export const mockStatisticalData = {
  ratings: [5, 1, 4, 5, 2, 5, 2, 2, 5, 3, 1, 5, 4, 2, 5],
  responseTimes: [120, 45, 89, 156, 78, 203, 67, 134, 91, 112, 56, 178, 145, 98, 187], // em segundos
  satisfactionScores: [9.2, 2.1, 7.8, 9.5, 4.3, 9.8, 4.1, 3.9, 9.1, 6.5, 1.8, 9.7, 8.2, 3.7, 9.6],
  npsScores: [10, 1, 8, 10, 4, 10, 3, 2, 9, 6, 0, 10, 8, 3, 10],
  monthlyResponses: [
    { month: 'Jan', responses: 45, satisfaction: 7.2 },
    { month: 'Fev', responses: 52, satisfaction: 7.8 },
    { month: 'Mar', responses: 38, satisfaction: 6.9 },
    { month: 'Abr', responses: 61, satisfaction: 8.1 },
    { month: 'Mai', responses: 47, satisfaction: 7.5 },
    { month: 'Jun', responses: 55, satisfaction: 8.3 }
  ]
};

// Dados para gráficos de barra aprimorados
export const mockBarChartData: BarChartDataItem[] = [
  {
    name: 'Atendimento',
    value: 78,
    category: 'positive',
    color: '#10b981',
    metadata: {
      totalRespostas: 156,
      mediaAvaliacao: 4.2,
      tendencia: 'crescente'
    }
  },
  {
    name: 'Produto',
    value: 85,
    category: 'positive', 
    color: '#059669',
    metadata: {
      totalRespostas: 142,
      mediaAvaliacao: 4.5,
      tendencia: 'estavel'
    }
  },
  {
    name: 'Preço',
    value: 62,
    category: 'neutral',
    color: '#6b7280',
    metadata: {
      totalRespostas: 134,
      mediaAvaliacao: 3.8,
      tendencia: 'decrescente'
    }
  },
  {
    name: 'Entrega',
    value: 71,
    category: 'positive',
    color: '#34d399',
    metadata: {
      totalRespostas: 98,
      mediaAvaliacao: 4.1,
      tendencia: 'crescente'
    }
  },
  {
    name: 'Suporte',
    value: 68,
    category: 'neutral',
    color: '#f59e0b',
    metadata: {
      totalRespostas: 87,
      mediaAvaliacao: 3.9,
      tendencia: 'estavel'
    }
  }
];

// Dados para BoxPlot (identificação de outliers)
export const mockBoxPlotData = {
  satisfactionByCategory: {
    atendimento: [8.5, 7.2, 9.1, 6.8, 8.9, 7.5, 9.3, 8.1, 7.8, 8.7, 2.1, 9.2, 8.4, 7.9, 8.6],
    produto: [9.1, 8.7, 9.5, 8.2, 9.0, 8.8, 9.4, 8.9, 8.5, 9.2, 3.2, 9.6, 9.1, 8.6, 9.3],
    preco: [6.2, 5.8, 7.1, 5.5, 6.8, 6.1, 7.3, 6.5, 5.9, 6.7, 2.8, 7.5, 6.9, 5.7, 6.4],
    entrega: [7.8, 7.2, 8.1, 6.9, 7.5, 7.7, 8.3, 7.4, 7.1, 7.9, 4.1, 8.5, 7.8, 7.3, 8.0],
    suporte: [7.1, 6.8, 7.5, 6.5, 7.2, 6.9, 7.8, 7.0, 6.7, 7.4, 3.5, 8.1, 7.3, 6.8, 7.6]
  },
  responseTimesByHour: {
    '08:00': [45, 52, 38, 61, 47, 55, 42, 58, 49, 53, 156, 41, 46, 51, 44],
    '10:00': [38, 45, 32, 48, 41, 46, 35, 49, 42, 44, 134, 36, 39, 43, 37],
    '12:00': [52, 58, 45, 67, 54, 61, 48, 64, 56, 59, 178, 47, 53, 57, 51],
    '14:00': [41, 47, 35, 54, 44, 49, 38, 51, 45, 48, 145, 39, 42, 46, 40],
    '16:00': [48, 54, 41, 61, 51, 56, 44, 58, 52, 55, 167, 46, 49, 53, 47],
    '18:00': [55, 61, 48, 68, 58, 63, 51, 65, 59, 62, 189, 53, 56, 60, 54]
  }
};

// Dados de análise temática de sentimentos
export const mockThematicSentimentData: ThematicAnalysisResult[] = [
  {
    text: 'O atendimento foi excelente, muito prestativo e rápido.',
    results: [
      {
        theme: 'atendimento',
        sentiment: 'positive',
        intensity: 'muito_positivo',
        confidence: 0.9,
        keywords: ['atendimento', 'excelente', 'prestativo', 'rápido'],
        score: 0.85
      }
    ],
    overallSentiment: {
      sentiment: 'positive',
      intensity: 'muito_positivo',
      score: 0.85
    }
  },
  {
    text: 'Produto de ótima qualidade, vale muito a pena o preço pago.',
    results: [
      {
        theme: 'produto',
        sentiment: 'positive',
        intensity: 'muito_positivo',
        confidence: 0.8,
        keywords: ['produto', 'ótima', 'qualidade'],
        score: 0.8
      },
      {
        theme: 'preço',
        sentiment: 'positive',
        intensity: 'positivo',
        confidence: 0.7,
        keywords: ['vale a pena', 'preço'],
        score: 0.6
      }
    ],
    overallSentiment: {
      sentiment: 'positive',
      intensity: 'muito_positivo',
      score: 0.7
    }
  },
  {
    text: 'Atendimento demorado e mal educado. Preço muito caro.',
    results: [
      {
        theme: 'atendimento',
        sentiment: 'negative',
        intensity: 'muito_negativo',
        confidence: 0.9,
        keywords: ['atendimento', 'demorado', 'mal educado'],
        score: -0.8
      },
      {
        theme: 'preço',
        sentiment: 'negative',
        intensity: 'negativo',
        confidence: 0.8,
        keywords: ['preço', 'muito caro'],
        score: -0.7
      }
    ],
    overallSentiment: {
      sentiment: 'negative',
      intensity: 'muito_negativo',
      score: -0.75
    }
  }
];

// Resumo de sentimentos por tema
export const mockThematicSummary = [
  {
    theme: 'atendimento' as SentimentTheme,
    totalResponses: 156,
    sentimentDistribution: {
      muito_positivo: 45,
      positivo: 38,
      levemente_positivo: 22,
      neutro: 18,
      levemente_negativo: 15,
      negativo: 12,
      muito_negativo: 6
    },
    averageScore: 0.42,
    topKeywords: [
      { keyword: 'atendimento', frequency: 89, sentiment: 'positive' },
      { keyword: 'prestativo', frequency: 34, sentiment: 'positive' },
      { keyword: 'rápido', frequency: 28, sentiment: 'positive' },
      { keyword: 'educado', frequency: 25, sentiment: 'positive' },
      { keyword: 'demorado', frequency: 18, sentiment: 'negative' }
    ]
  },
  {
    theme: 'produto' as SentimentTheme,
    totalResponses: 142,
    sentimentDistribution: {
      muito_positivo: 52,
      positivo: 41,
      levemente_positivo: 19,
      neutro: 12,
      levemente_negativo: 8,
      negativo: 7,
      muito_negativo: 3
    },
    averageScore: 0.58,
    topKeywords: [
      { keyword: 'produto', frequency: 95, sentiment: 'positive' },
      { keyword: 'qualidade', frequency: 67, sentiment: 'positive' },
      { keyword: 'excelente', frequency: 42, sentiment: 'positive' },
      { keyword: 'funciona', frequency: 38, sentiment: 'positive' },
      { keyword: 'defeito', frequency: 12, sentiment: 'negative' }
    ]
  },
  {
    theme: 'preço' as SentimentTheme,
    totalResponses: 134,
    sentimentDistribution: {
      muito_positivo: 28,
      positivo: 31,
      levemente_positivo: 24,
      neutro: 22,
      levemente_negativo: 15,
      negativo: 10,
      muito_negativo: 4
    },
    averageScore: 0.18,
    topKeywords: [
      { keyword: 'preço', frequency: 78, sentiment: 'neutral' },
      { keyword: 'vale a pena', frequency: 35, sentiment: 'positive' },
      { keyword: 'justo', frequency: 29, sentiment: 'positive' },
      { keyword: 'caro', frequency: 24, sentiment: 'negative' },
      { keyword: 'barato', frequency: 18, sentiment: 'positive' }
    ]
  }
];

// Dados para correlação entre variáveis
export const mockCorrelationData = {
  variables: ['Satisfação', 'Tempo Resposta', 'NPS', 'Avaliação', 'Recompra'],
  correlationMatrix: [
    [1.00, -0.72, 0.89, 0.94, 0.81],
    [-0.72, 1.00, -0.68, -0.75, -0.59],
    [0.89, -0.68, 1.00, 0.87, 0.76],
    [0.94, -0.75, 0.87, 1.00, 0.83],
    [0.81, -0.59, 0.76, 0.83, 1.00]
  ]
};

// Dados de tendências temporais
export const mockTrendData = {
  daily: [
    { date: '2024-01-15', responses: 12, avgSatisfaction: 7.8, avgRating: 4.2 },
    { date: '2024-01-16', responses: 15, avgSatisfaction: 6.9, avgRating: 3.8 },
    { date: '2024-01-17', responses: 18, avgSatisfaction: 8.1, avgRating: 4.5 },
    { date: '2024-01-18', responses: 14, avgSatisfaction: 8.7, avgRating: 4.7 },
    { date: '2024-01-19', responses: 16, avgSatisfaction: 7.2, avgRating: 4.0 },
    { date: '2024-01-20', responses: 20, avgSatisfaction: 8.9, avgRating: 4.8 },
    { date: '2024-01-21', responses: 13, avgSatisfaction: 6.8, avgRating: 3.7 }
  ],
  weekly: [
    { week: 'Sem 1', responses: 89, avgSatisfaction: 7.5, nps: 42 },
    { week: 'Sem 2', responses: 94, avgSatisfaction: 7.8, nps: 48 },
    { week: 'Sem 3', responses: 87, avgSatisfaction: 7.2, nps: 38 },
    { week: 'Sem 4', responses: 102, avgSatisfaction: 8.1, nps: 55 }
  ]
};

// Função para gerar dados aleatórios adicionais
export const generateRandomData = (count: number, min: number, max: number): number[] => {
  return Array.from({ length: count }, () => 
    Math.random() * (max - min) + min
  ).map(val => Math.round(val * 100) / 100);
};

// Função para simular dados de outliers
export const generateOutlierData = (normalData: number[], outlierCount: number = 2): number[] => {
  const data = [...normalData];
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const std = Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length);
  
  // Adicionar outliers (valores além de 2 desvios padrão)
  for (let i = 0; i < outlierCount; i++) {
    const outlier = Math.random() > 0.5 
      ? mean + (2.5 + Math.random()) * std  // Outlier positivo
      : mean - (2.5 + Math.random()) * std; // Outlier negativo
    data.push(Math.max(0, Math.round(outlier * 100) / 100));
  }
  
  return data;
};

export default {
  mockSurveyResponses,
  mockStatisticalData,
  mockBarChartData,
  mockBoxPlotData,
  mockThematicSentimentData,
  mockThematicSummary,
  mockCorrelationData,
  mockTrendData,
  generateRandomData,
  generateOutlierData
};