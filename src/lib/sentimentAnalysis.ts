// Simulação de análise de sentimento
// Em produção, isso seria substituído por uma API de IA real como OpenAI, Google Cloud AI, etc.

export interface SentimentResult {
  label: 'positive' | 'neutral' | 'negative';
  score: number; // -1.0 a 1.0
  confidence: number; // 0.0 a 1.0
}

// Palavras-chave para análise básica de sentimento em português
const POSITIVE_WORDS = [
  'bom', 'boa', 'excelente', 'ótimo', 'ótima', 'maravilhoso', 'fantástico', 'perfeito', 'perfeita',
  'amor', 'amo', 'gosto', 'adoro', 'feliz', 'alegre', 'satisfeito', 'satisfeita', 'contente',
  'incrível', 'impressionante', 'surpreendente', 'recomendo', 'recomendaria', 'positivo', 'positiva',
  'sucesso', 'vencedor', 'vitória', 'conquista', 'realização', 'prazer', 'diversão', 'legal',
  'bacana', 'show', 'top', 'demais', 'sensacional', 'espetacular', 'formidável', 'genial',
  'lindo', 'linda', 'bonito', 'bonita', 'elegante', 'sofisticado', 'moderno', 'inovador',
  'eficiente', 'rápido', 'fácil', 'simples', 'prático', 'útil', 'conveniente', 'confortável'
];

const NEGATIVE_WORDS = [
  'ruim', 'péssimo', 'péssima', 'horrível', 'terrível', 'odioso', 'odeio', 'detesto', 'nojo',
  'triste', 'chateado', 'chateada', 'irritado', 'irritada', 'nervoso', 'nervosa', 'bravo', 'brava',
  'decepcionado', 'decepcionada', 'frustrado', 'frustrada', 'insatisfeito', 'insatisfeita',
  'problema', 'erro', 'falha', 'defeito', 'bug', 'lento', 'devagar', 'demorado', 'complicado',
  'difícil', 'impossível', 'inútil', 'desnecessário', 'caro', 'custoso', 'desperdício',
  'não', 'nunca', 'jamais', 'nenhum', 'nenhuma', 'zero', 'vazio', 'falta', 'ausência',
  'cancelar', 'desistir', 'parar', 'abandonar', 'sair', 'deixar', 'largar', 'esquecer',
  'feio', 'feia', 'desagradável', 'chato', 'chata', 'boring', 'monótono', 'repetitivo'
];

const NEUTRAL_WORDS = [
  'ok', 'okay', 'normal', 'comum', 'regular', 'médio', 'média', 'padrão', 'básico', 'básica',
  'talvez', 'pode', 'poderia', 'seria', 'deveria', 'quem sabe', 'possivelmente', 'provavelmente',
  'informação', 'dados', 'fatos', 'detalhes', 'especificações', 'características', 'funcionalidades',
  'processo', 'procedimento', 'método', 'sistema', 'estrutura', 'organização', 'formato'
];

// Intensificadores que aumentam o peso das palavras
const INTENSIFIERS = [
  'muito', 'super', 'extremamente', 'totalmente', 'completamente', 'absolutamente',
  'bastante', 'bem', 'demais', 'pra caramba', 'para caramba', 'imenso', 'enorme'
];

// Negadores que invertem o sentimento
const NEGATORS = [
  'não', 'nunca', 'jamais', 'nem', 'nenhum', 'nenhuma', 'nada', 'zero'
];

export function analyzeSentiment(text: string): SentimentResult {
  if (!text || text.trim().length === 0) {
    return {
      label: 'neutral',
      score: 0,
      confidence: 0
    };
  }

  // Normalizar texto: minúsculas, remover pontuação
  const normalizedText = text.toLowerCase()
    .replace(/[.,!?;:()[\]{}"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = normalizedText.split(' ');
  
  let positiveScore = 0;
  let negativeScore = 0;
  let neutralScore = 0;
  let totalWords = 0;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word.length < 2) continue; // Ignorar palavras muito curtas
    
    totalWords++;
    
    // Verificar se há negador antes da palavra
    const hasNegator = i > 0 && NEGATORS.includes(words[i - 1]);
    
    // Verificar se há intensificador antes da palavra
    const hasIntensifier = i > 0 && INTENSIFIERS.includes(words[i - 1]);
    const intensifierMultiplier = hasIntensifier ? 1.5 : 1.0;
    
    // Calcular score base
    let wordScore = 0;
    
    if (POSITIVE_WORDS.includes(word)) {
      wordScore = 1 * intensifierMultiplier;
      if (hasNegator) wordScore = -wordScore; // Inverter se houver negador
    } else if (NEGATIVE_WORDS.includes(word)) {
      wordScore = -1 * intensifierMultiplier;
      if (hasNegator) wordScore = -wordScore; // Inverter se houver negador
    } else if (NEUTRAL_WORDS.includes(word)) {
      wordScore = 0;
    }
    
    // Acumular scores
    if (wordScore > 0) {
      positiveScore += wordScore;
    } else if (wordScore < 0) {
      negativeScore += Math.abs(wordScore);
    } else {
      neutralScore += 0.1; // Pequeno peso para palavras neutras
    }
  }
  
  // Calcular score final normalizado
  const totalSentimentWords = positiveScore + negativeScore;
  
  if (totalSentimentWords === 0) {
    return {
      label: 'neutral',
      score: 0,
      confidence: 0.5
    };
  }
  
  // Score final entre -1 e 1
  const finalScore = (positiveScore - negativeScore) / Math.max(totalSentimentWords, 1);
  
  // Determinar label baseado no score
  let label: 'positive' | 'neutral' | 'negative';
  if (finalScore > 0.1) {
    label = 'positive';
  } else if (finalScore < -0.1) {
    label = 'negative';
  } else {
    label = 'neutral';
  }
  
  // Calcular confiança baseada na quantidade de palavras de sentimento encontradas
  const sentimentWordRatio = totalSentimentWords / Math.max(totalWords, 1);
  const confidence = Math.min(0.9, Math.max(0.1, sentimentWordRatio * 2));
  
  return {
    label,
    score: Math.max(-1, Math.min(1, finalScore)), // Garantir que está entre -1 e 1
    confidence
  };
}

// Função para analisar múltiplos textos e retornar estatísticas
export function analyzeBatchSentiment(texts: string[]): {
  results: SentimentResult[];
  summary: {
    positive: number;
    neutral: number;
    negative: number;
    averageScore: number;
    averageConfidence: number;
  };
} {
  const results = texts.map(text => analyzeSentiment(text));
  
  const positive = results.filter(r => r.label === 'positive').length;
  const neutral = results.filter(r => r.label === 'neutral').length;
  const negative = results.filter(r => r.label === 'negative').length;
  
  const averageScore = results.reduce((acc, r) => acc + r.score, 0) / results.length;
  const averageConfidence = results.reduce((acc, r) => acc + r.confidence, 0) / results.length;
  
  return {
    results,
    summary: {
      positive,
      neutral,
      negative,
      averageScore,
      averageConfidence
    }
  };
}

// Função para obter insights textuais sobre o sentimento
export function getSentimentInsights(summary: {
  positive: number;
  neutral: number;
  negative: number;
  averageScore: number;
  averageConfidence: number;
}): string[] {
  const insights: string[] = [];
  const total = summary.positive + summary.neutral + summary.negative;
  
  if (total === 0) {
    return ['Nenhuma resposta para analisar.'];
  }
  
  // Análise da distribuição
  const positivePercentage = (summary.positive / total) * 100;
  const negativePercentage = (summary.negative / total) * 100;
  const neutralPercentage = (summary.neutral / total) * 100;
  
  if (positivePercentage > 60) {
    insights.push(`🎉 Excelente! ${positivePercentage.toFixed(1)}% das respostas são positivas.`);
  } else if (positivePercentage > 40) {
    insights.push(`😊 Bom resultado: ${positivePercentage.toFixed(1)}% das respostas são positivas.`);
  }
  
  if (negativePercentage > 40) {
    insights.push(`⚠️ Atenção: ${negativePercentage.toFixed(1)}% das respostas são negativas. Considere investigar os problemas.`);
  } else if (negativePercentage > 20) {
    insights.push(`📊 ${negativePercentage.toFixed(1)}% das respostas são negativas. Há espaço para melhorias.`);
  }
  
  if (neutralPercentage > 50) {
    insights.push(`🤔 ${neutralPercentage.toFixed(1)}% das respostas são neutras. Considere fazer perguntas mais específicas.`);
  }
  
  // Análise do score médio
  if (summary.averageScore > 0.3) {
    insights.push('📈 O sentimento geral é bastante positivo!');
  } else if (summary.averageScore > 0.1) {
    insights.push('👍 O sentimento geral tende ao positivo.');
  } else if (summary.averageScore < -0.3) {
    insights.push('📉 O sentimento geral é preocupante. Ação imediata recomendada.');
  } else if (summary.averageScore < -0.1) {
    insights.push('⚡ O sentimento geral tende ao negativo.');
  } else {
    insights.push('⚖️ O sentimento geral é equilibrado.');
  }
  
  // Análise da confiança
  if (summary.averageConfidence < 0.3) {
    insights.push('🔍 A confiança da análise é baixa. Considere coletar mais respostas ou fazer perguntas mais diretas.');
  } else if (summary.averageConfidence > 0.7) {
    insights.push('✅ Alta confiança na análise de sentimento.');
  }
  
  return insights;
}