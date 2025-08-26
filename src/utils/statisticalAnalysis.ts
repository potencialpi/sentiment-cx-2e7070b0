/**
 * Utilitários para análise estatística avançada
 * Implementa cálculos de média, mediana, moda, desvio padrão, percentis e correlação
 */

export interface StatisticalSummary {
  mean: number;
  median: number;
  mode: number | number[];
  standardDeviation: number;
  variance: number;
  min: number;
  max: number;
  range: number;
  count: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
}

export interface CorrelationResult {
  coefficient: number;
  strength: 'muito fraca' | 'fraca' | 'moderada' | 'forte' | 'muito forte';
  direction: 'positiva' | 'negativa' | 'nenhuma';
}

/**
 * Calcula a média aritmética de um array de números
 */
export const calculateMean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

/**
 * Calcula a mediana de um array de números
 */
export const calculateMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

/**
 * Calcula a moda de um array de números
 */
export const calculateMode = (values: number[]): number | number[] => {
  if (values.length === 0) return 0;
  
  const frequency: { [key: number]: number } = {};
  let maxFreq = 0;
  
  // Contar frequências
  values.forEach(value => {
    frequency[value] = (frequency[value] || 0) + 1;
    maxFreq = Math.max(maxFreq, frequency[value]);
  });
  
  // Encontrar valores com frequência máxima
  const modes = Object.keys(frequency)
    .filter(key => frequency[Number(key)] === maxFreq)
    .map(Number);
  
  // Se todos os valores têm a mesma frequência, não há moda
  if (modes.length === values.length) return 0;
  
  return modes.length === 1 ? modes[0] : modes;
};

/**
 * Calcula a variância de um array de números
 */
export const calculateVariance = (values: number[]): number => {
  if (values.length === 0) return 0;
  
  const mean = calculateMean(values);
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
  return calculateMean(squaredDifferences);
};

/**
 * Calcula o desvio padrão de um array de números
 */
export const calculateStandardDeviation = (values: number[]): number => {
  return Math.sqrt(calculateVariance(values));
};

/**
 * Calcula um percentil específico de um array de números
 */
export const calculatePercentile = (values: number[], percentile: number): number => {
  if (values.length === 0) return 0;
  if (percentile < 0 || percentile > 100) {
    throw new Error('Percentil deve estar entre 0 e 100');
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  
  if (Number.isInteger(index)) {
    return sorted[index];
  }
  
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

/**
 * Calcula múltiplos percentis de um array de números
 */
export const calculatePercentiles = (values: number[]): StatisticalSummary['percentiles'] => {
  return {
    p25: calculatePercentile(values, 25),
    p50: calculatePercentile(values, 50), // mediana
    p75: calculatePercentile(values, 75),
    p90: calculatePercentile(values, 90),
    p95: calculatePercentile(values, 95)
  };
};

/**
 * Calcula o coeficiente de correlação de Pearson entre dois arrays
 */
export const calculateCorrelation = (x: number[], y: number[]): CorrelationResult => {
  if (x.length !== y.length || x.length === 0) {
    return {
      coefficient: 0,
      strength: 'muito fraca',
      direction: 'nenhuma'
    };
  }
  
  const n = x.length;
  const meanX = calculateMean(x);
  const meanY = calculateMean(y);
  
  let numerator = 0;
  let sumXSquared = 0;
  let sumYSquared = 0;
  
  for (let i = 0; i < n; i++) {
    const deltaX = x[i] - meanX;
    const deltaY = y[i] - meanY;
    
    numerator += deltaX * deltaY;
    sumXSquared += deltaX * deltaX;
    sumYSquared += deltaY * deltaY;
  }
  
  const denominator = Math.sqrt(sumXSquared * sumYSquared);
  const coefficient = denominator === 0 ? 0 : numerator / denominator;
  
  // Classificar força da correlação
  const absCoeff = Math.abs(coefficient);
  let strength: CorrelationResult['strength'];
  
  if (absCoeff >= 0.9) strength = 'muito forte';
  else if (absCoeff >= 0.7) strength = 'forte';
  else if (absCoeff >= 0.5) strength = 'moderada';
  else if (absCoeff >= 0.3) strength = 'fraca';
  else strength = 'muito fraca';
  
  // Determinar direção
  let direction: CorrelationResult['direction'];
  if (coefficient > 0.1) direction = 'positiva';
  else if (coefficient < -0.1) direction = 'negativa';
  else direction = 'nenhuma';
  
  return { coefficient, strength, direction };
};

/**
 * Calcula um resumo estatístico completo de um array de números
 */
export const calculateStatisticalSummary = (values: number[]): StatisticalSummary => {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      mode: 0,
      standardDeviation: 0,
      variance: 0,
      min: 0,
      max: 0,
      range: 0,
      count: 0,
      percentiles: {
        p25: 0,
        p50: 0,
        p75: 0,
        p90: 0,
        p95: 0
      }
    };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  return {
    mean: calculateMean(values),
    median: calculateMedian(values),
    mode: calculateMode(values),
    standardDeviation: calculateStandardDeviation(values),
    variance: calculateVariance(values),
    min,
    max,
    range: max - min,
    count: values.length,
    percentiles: calculatePercentiles(values)
  };
};

/**
 * Identifica outliers usando o método IQR (Interquartile Range)
 */
export const identifyOutliers = (values: number[]): {
  outliers: number[];
  lowerBound: number;
  upperBound: number;
  q1: number;
  q3: number;
  iqr: number;
} => {
  if (values.length === 0) {
    return {
      outliers: [],
      lowerBound: 0,
      upperBound: 0,
      q1: 0,
      q3: 0,
      iqr: 0
    };
  }
  
  const q1 = calculatePercentile(values, 25);
  const q3 = calculatePercentile(values, 75);
  const iqr = q3 - q1;
  
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  const outliers = values.filter(value => value < lowerBound || value > upperBound);
  
  return {
    outliers,
    lowerBound,
    upperBound,
    q1,
    q3,
    iqr
  };
};

/**
 * Calcula estatísticas para dados categóricos (frequência, porcentagem)
 */
export const calculateCategoricalStats = (values: string[]): {
  frequencies: { [key: string]: number };
  percentages: { [key: string]: number };
  mostFrequent: string;
  leastFrequent: string;
  uniqueCount: number;
} => {
  if (values.length === 0) {
    return {
      frequencies: {},
      percentages: {},
      mostFrequent: '',
      leastFrequent: '',
      uniqueCount: 0
    };
  }
  
  const frequencies: { [key: string]: number } = {};
  
  values.forEach(value => {
    frequencies[value] = (frequencies[value] || 0) + 1;
  });
  
  const total = values.length;
  const percentages: { [key: string]: number } = {};
  
  Object.keys(frequencies).forEach(key => {
    percentages[key] = (frequencies[key] / total) * 100;
  });
  
  const sortedByFreq = Object.entries(frequencies).sort(([,a], [,b]) => b - a);
  
  return {
    frequencies,
    percentages,
    mostFrequent: sortedByFreq[0]?.[0] || '',
    leastFrequent: sortedByFreq[sortedByFreq.length - 1]?.[0] || '',
    uniqueCount: Object.keys(frequencies).length
  };
};