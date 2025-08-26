/**
 * Análise de sentimentos segmentada por temas com classificação de intensidade
 * Implementa análise temática para atendimento, produto e preço
 */

export type SentimentTheme = 'atendimento' | 'produto' | 'preço' | 'geral';

export type SentimentIntensity = 
  | 'muito_positivo' 
  | 'positivo' 
  | 'levemente_positivo'
  | 'neutro'
  | 'levemente_negativo'
  | 'negativo'
  | 'muito_negativo';

export interface ThematicSentimentResult {
  theme: SentimentTheme;
  sentiment: 'positive' | 'neutral' | 'negative';
  intensity: SentimentIntensity;
  confidence: number;
  keywords: string[];
  score: number; // -1 a 1
}

export interface ThematicAnalysisResult {
  text: string;
  results: ThematicSentimentResult[];
  overallSentiment: {
    sentiment: 'positive' | 'neutral' | 'negative';
    intensity: SentimentIntensity;
    score: number;
  };
}

export interface ThematicSummary {
  theme: SentimentTheme;
  totalResponses: number;
  sentimentDistribution: {
    muito_positivo: number;
    positivo: number;
    levemente_positivo: number;
    neutro: number;
    levemente_negativo: number;
    negativo: number;
    muito_negativo: number;
  };
  averageScore: number;
  topKeywords: Array<{ keyword: string; frequency: number; sentiment: string }>;
}

// Palavras-chave por tema
const THEME_KEYWORDS = {
  atendimento: {
    positive: [
      'atendimento', 'atendente', 'suporte', 'ajuda', 'cordial', 'educado', 
      'prestativo', 'rápido', 'eficiente', 'gentil', 'profissional', 'competente',
      'solução', 'resolver', 'atencioso', 'disponível', 'simpático', 'qualidade'
    ],
    negative: [
      'demora', 'demorado', 'lento', 'mal atendido', 'grosso', 'rude', 
      'incompetente', 'despreparado', 'ignorou', 'não ajudou', 'péssimo atendimento',
      'mal educado', 'não resolve', 'não sabe', 'transferiu', 'desligou'
    ]
  },
  produto: {
    positive: [
      'produto', 'qualidade', 'excelente', 'bom', 'funciona', 'durável',
      'resistente', 'bonito', 'útil', 'prático', 'fácil', 'recomendo',
      'satisfeito', 'vale a pena', 'superou expectativas', 'perfeito'
    ],
    negative: [
      'defeito', 'quebrou', 'ruim', 'péssimo', 'não funciona', 'problema',
      'falha', 'frágil', 'barato', 'mal feito', 'decepcionante', 'não serve',
      'não vale', 'arrependido', 'devolver', 'trocar'
    ]
  },
  preço: {
    positive: [
      'preço', 'barato', 'em conta', 'acessível', 'justo', 'vale a pena',
      'bom custo', 'benefício', 'promoção', 'desconto', 'oferta', 'econômico',
      'compensou', 'investimento', 'custo baixo'
    ],
    negative: [
      'caro', 'custoso', 'alto', 'não vale', 'superfaturado', 'abusivo',
      'exagerado', 'salgado', 'muito caro', 'preço alto', 'não compensa',
      'não vale o preço', 'overpriced'
    ]
  }
};

// Palavras intensificadoras
const INTENSITY_MODIFIERS = {
  very_positive: [
    'excelente', 'perfeito', 'maravilhoso', 'fantástico', 'incrível', 
    'excepcional', 'extraordinário', 'sensacional', 'espetacular'
  ],
  positive: [
    'bom', 'ótimo', 'legal', 'bacana', 'satisfeito', 'contente', 'feliz'
  ],
  slightly_positive: [
    'ok', 'razoável', 'aceitável', 'até que', 'mais ou menos positivo'
  ],
  slightly_negative: [
    'mais ou menos', 'poderia ser melhor', 'deixa a desejar', 'não muito bom'
  ],
  negative: [
    'ruim', 'péssimo', 'mal', 'chato', 'irritante', 'decepcionante'
  ],
  very_negative: [
    'horrível', 'terrível', 'péssimo', 'inaceitável', 'revoltante', 
    'inadmissível', 'absurdo', 'ridículo'
  ]
};

/**
 * Identifica temas presentes no texto
 */
export const identifyThemes = (text: string): SentimentTheme[] => {
  const lowerText = text.toLowerCase();
  const themes: SentimentTheme[] = [];
  
  // Verificar cada tema
  Object.entries(THEME_KEYWORDS).forEach(([theme, keywords]) => {
    const allKeywords = [...keywords.positive, ...keywords.negative];
    const hasThemeKeywords = allKeywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
    
    if (hasThemeKeywords) {
      themes.push(theme as SentimentTheme);
    }
  });
  
  // Se não encontrou temas específicos, classificar como geral
  if (themes.length === 0) {
    themes.push('geral');
  }
  
  return themes;
};

/**
 * Calcula o score de sentimento para um tema específico
 */
export const calculateThemeScore = (text: string, theme: SentimentTheme): {
  score: number;
  keywords: string[];
  confidence: number;
} => {
  if (theme === 'geral') {
    return calculateGeneralSentiment(text);
  }
  
  const lowerText = text.toLowerCase();
  const themeKeywords = THEME_KEYWORDS[theme as keyof typeof THEME_KEYWORDS];
  
  if (!themeKeywords) {
    return { score: 0, keywords: [], confidence: 0 };
  }
  
  let score = 0;
  const foundKeywords: string[] = [];
  
  // Verificar palavras positivas
  themeKeywords.positive.forEach(keyword => {
    if (lowerText.includes(keyword.toLowerCase())) {
      score += 1;
      foundKeywords.push(keyword);
    }
  });
  
  // Verificar palavras negativas
  themeKeywords.negative.forEach(keyword => {
    if (lowerText.includes(keyword.toLowerCase())) {
      score -= 1;
      foundKeywords.push(keyword);
    }
  });
  
  // Aplicar modificadores de intensidade
  const intensityBonus = calculateIntensityBonus(text);
  score += intensityBonus;
  
  // Normalizar score (-1 a 1)
  const maxPossible = Math.max(themeKeywords.positive.length, themeKeywords.negative.length);
  const normalizedScore = maxPossible > 0 ? Math.max(-1, Math.min(1, score / maxPossible)) : 0;
  
  // Calcular confiança baseada no número de palavras-chave encontradas
  const confidence = Math.min(1, foundKeywords.length / 3);
  
  return {
    score: normalizedScore,
    keywords: foundKeywords,
    confidence
  };
};

/**
 * Calcula sentimento geral quando não há tema específico
 */
const calculateGeneralSentiment = (text: string): {
  score: number;
  keywords: string[];
  confidence: number;
} => {
  const lowerText = text.toLowerCase();
  
  // Palavras gerais de sentimento
  const positiveWords = ['bom', 'ótimo', 'excelente', 'gostei', 'recomendo', 'satisfeito'];
  const negativeWords = ['ruim', 'péssimo', 'não gostei', 'problema', 'decepcionado', 'insatisfeito'];
  
  let score = 0;
  const foundKeywords: string[] = [];
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) {
      score += 1;
      foundKeywords.push(word);
    }
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) {
      score -= 1;
      foundKeywords.push(word);
    }
  });
  
  const intensityBonus = calculateIntensityBonus(text);
  score += intensityBonus;
  
  const normalizedScore = Math.max(-1, Math.min(1, score / 3));
  const confidence = Math.min(1, foundKeywords.length / 2);
  
  return {
    score: normalizedScore,
    keywords: foundKeywords,
    confidence
  };
};

/**
 * Calcula bônus de intensidade baseado em modificadores
 */
const calculateIntensityBonus = (text: string): number => {
  const lowerText = text.toLowerCase();
  let bonus = 0;
  
  // Verificar modificadores muito positivos
  INTENSITY_MODIFIERS.very_positive.forEach(modifier => {
    if (lowerText.includes(modifier)) bonus += 0.5;
  });
  
  // Verificar modificadores muito negativos
  INTENSITY_MODIFIERS.very_negative.forEach(modifier => {
    if (lowerText.includes(modifier)) bonus -= 0.5;
  });
  
  return Math.max(-1, Math.min(1, bonus));
};

/**
 * Determina a intensidade do sentimento baseada no score
 */
export const determineIntensity = (score: number): SentimentIntensity => {
  if (score >= 0.7) return 'muito_positivo';
  if (score >= 0.3) return 'positivo';
  if (score >= 0.1) return 'levemente_positivo';
  if (score >= -0.1) return 'neutro';
  if (score >= -0.3) return 'levemente_negativo';
  if (score >= -0.7) return 'negativo';
  return 'muito_negativo';
};

/**
 * Determina o sentimento básico baseado no score
 */
export const determineSentiment = (score: number): 'positive' | 'neutral' | 'negative' => {
  if (score > 0.1) return 'positive';
  if (score < -0.1) return 'negative';
  return 'neutral';
};

/**
 * Analisa sentimento temático de um texto
 */
export const analyzeThematicSentiment = (text: string): ThematicAnalysisResult => {
  const themes = identifyThemes(text);
  const results: ThematicSentimentResult[] = [];
  
  themes.forEach(theme => {
    const { score, keywords, confidence } = calculateThemeScore(text, theme);
    const sentiment = determineSentiment(score);
    const intensity = determineIntensity(score);
    
    results.push({
      theme,
      sentiment,
      intensity,
      confidence,
      keywords,
      score
    });
  });
  
  // Calcular sentimento geral
  const overallScore = results.length > 0 
    ? results.reduce((sum, result) => sum + result.score, 0) / results.length
    : 0;
  
  const overallSentiment = determineSentiment(overallScore);
  const overallIntensity = determineIntensity(overallScore);
  
  return {
    text,
    results,
    overallSentiment: {
      sentiment: overallSentiment,
      intensity: overallIntensity,
      score: overallScore
    }
  };
};

/**
 * Analisa múltiplos textos e gera resumo por tema
 */
export const analyzeMultipleTexts = (texts: string[]): {
  analyses: ThematicAnalysisResult[];
  summary: ThematicSummary[];
} => {
  const analyses = texts.map(text => analyzeThematicSentiment(text));
  
  // Agrupar por tema
  const themeGroups: { [key in SentimentTheme]?: ThematicSentimentResult[] } = {};
  
  analyses.forEach(analysis => {
    analysis.results.forEach(result => {
      if (!themeGroups[result.theme]) {
        themeGroups[result.theme] = [];
      }
      themeGroups[result.theme]!.push(result);
    });
  });
  
  // Gerar resumo por tema
  const summary: ThematicSummary[] = Object.entries(themeGroups).map(([theme, results]) => {
    const totalResponses = results.length;
    
    // Contar distribuição de intensidade
    const sentimentDistribution = {
      muito_positivo: 0,
      positivo: 0,
      levemente_positivo: 0,
      neutro: 0,
      levemente_negativo: 0,
      negativo: 0,
      muito_negativo: 0
    };
    
    results.forEach(result => {
      sentimentDistribution[result.intensity]++;
    });
    
    // Calcular score médio
    const averageScore = results.reduce((sum, result) => sum + result.score, 0) / totalResponses;
    
    // Encontrar palavras-chave mais frequentes
    const keywordFreq: { [key: string]: { count: number; sentiment: string } } = {};
    
    results.forEach(result => {
      result.keywords.forEach(keyword => {
        if (!keywordFreq[keyword]) {
          keywordFreq[keyword] = { count: 0, sentiment: result.sentiment };
        }
        keywordFreq[keyword].count++;
      });
    });
    
    const topKeywords = Object.entries(keywordFreq)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 10)
      .map(([keyword, data]) => ({
        keyword,
        frequency: data.count,
        sentiment: data.sentiment
      }));
    
    return {
      theme: theme as SentimentTheme,
      totalResponses,
      sentimentDistribution,
      averageScore,
      topKeywords
    };
  });
  
  return { analyses, summary };
};

/**
 * Obtém a cor associada a uma intensidade de sentimento
 */
export const getIntensityColor = (intensity: SentimentIntensity): string => {
  const colors = {
    muito_positivo: '#059669', // green-600
    positivo: '#10b981', // green-500
    levemente_positivo: '#34d399', // green-400
    neutro: '#6b7280', // gray-500
    levemente_negativo: '#f59e0b', // amber-500
    negativo: '#ef4444', // red-500
    muito_negativo: '#dc2626' // red-600
  };
  
  return colors[intensity];
};

/**
 * Obtém o rótulo em português para uma intensidade
 */
export const getIntensityLabel = (intensity: SentimentIntensity): string => {
  const labels = {
    muito_positivo: 'Muito Positivo',
    positivo: 'Positivo',
    levemente_positivo: 'Levemente Positivo',
    neutro: 'Neutro',
    levemente_negativo: 'Levemente Negativo',
    negativo: 'Negativo',
    muito_negativo: 'Muito Negativo'
  };
  
  return labels[intensity];
};

/**
 * Obtém o rótulo em português para um tema
 */
export const getThemeLabel = (theme: SentimentTheme): string => {
  const labels = {
    atendimento: 'Atendimento',
    produto: 'Produto',
    preço: 'Preço',
    geral: 'Geral'
  };
  
  return labels[theme];
};