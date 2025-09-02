/**
 * Utilitários para clustering K-means e análise preditiva
 */

export interface ClusterResult {
  clusters: number[][];
  centroids: number[];
  iterations: number;
  silhouetteScore: number;
  clusterLabels: string[];
  summary: {
    totalClusters: number;
    avgSilhouetteScore: number;
    convergenceReached: boolean;
  };
}

export interface PredictiveModel {
  type: 'recommendation' | 'satisfaction' | 'churn';
  probability: number;
  confidence: number;
  factors: Array<{
    factor: string;
    impact: number;
    importance: 'high' | 'medium' | 'low';
  }>;
}

/**
 * Executa clustering K-means nos dados
 */
export function performKMeansClustering(data: number[][], k: number = 3): ClusterResult {
  if (data.length === 0 || k <= 0) {
    return {
      clusters: [],
      centroids: [],
      iterations: 0,
      silhouetteScore: 0,
      clusterLabels: [],
      summary: {
        totalClusters: 0,
        avgSilhouetteScore: 0,
        convergenceReached: false
      }
    };
  }

  const maxIterations = 100;
  const tolerance = 0.001;
  const dimensions = data[0].length;

  // Inicializar centroides aleatoriamente
  let centroids = initializeCentroids(data, k, dimensions);
  let assignments = new Array(data.length).fill(0);
  let iterations = 0;
  let converged = false;

  while (iterations < maxIterations && !converged) {
    // Atribuir pontos aos clusters mais próximos
    const newAssignments = assignPointsToClusters(data, centroids);
    
    // Verificar convergência
    converged = arraysEqual(assignments, newAssignments);
    assignments = newAssignments;

    if (!converged) {
      // Atualizar centroides
      const newCentroids = updateCentroids(data, assignments, k, dimensions);
      
      // Verificar se a mudança nos centroides é menor que a tolerância
      const centroidChange = calculateCentroidChange(centroids, newCentroids);
      if (centroidChange < tolerance) {
        converged = true;
      }
      
      centroids = newCentroids;
    }

    iterations++;
  }

  // Organizar pontos por cluster
  const clusters = organizeClusters(data, assignments, k);
  
  // Calcular Silhouette Score
  const silhouetteScore = calculateSilhouetteScore(data, assignments);
  
  // Gerar labels descritivos para os clusters
  const clusterLabels = generateClusterLabels(clusters, centroids);

  return {
    clusters,
    centroids,
    iterations,
    silhouetteScore,
    clusterLabels,
    summary: {
      totalClusters: k,
      avgSilhouetteScore: silhouetteScore,
      convergenceReached: converged
    }
  };
}

/**
 * Inicializa centroides usando K-means++
 */
function initializeCentroids(data: number[][], k: number, dimensions: number): number[] {
  const centroids: number[] = [];
  
  // Escolher primeiro centroide aleatoriamente
  const firstIndex = Math.floor(Math.random() * data.length);
  centroids.push(...data[firstIndex]);

  // Escolher centroides restantes usando K-means++
  for (let i = 1; i < k; i++) {
    const distances = data.map(point => {
      let minDist = Infinity;
      for (let j = 0; j < i; j++) {
        const centroid = centroids.slice(j * dimensions, (j + 1) * dimensions);
        const dist = euclideanDistance(point, centroid);
        minDist = Math.min(minDist, dist);
      }
      return minDist * minDist; // Squared distance for probability
    });

    const totalDist = distances.reduce((sum, d) => sum + d, 0);
    const probabilities = distances.map(d => d / totalDist);
    
    // Seleção por roleta
    const rand = Math.random();
    let cumulative = 0;
    let selectedIndex = 0;
    
    for (let j = 0; j < probabilities.length; j++) {
      cumulative += probabilities[j];
      if (rand <= cumulative) {
        selectedIndex = j;
        break;
      }
    }

    centroids.push(...data[selectedIndex]);
  }

  return centroids;
}

/**
 * Atribui cada ponto ao cluster mais próximo
 */
function assignPointsToClusters(data: number[][], centroids: number[]): number[] {
  const k = centroids.length / data[0].length;
  const dimensions = data[0].length;
  
  return data.map(point => {
    let minDistance = Infinity;
    let closestCluster = 0;

    for (let i = 0; i < k; i++) {
      const centroid = centroids.slice(i * dimensions, (i + 1) * dimensions);
      const distance = euclideanDistance(point, centroid);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestCluster = i;
      }
    }

    return closestCluster;
  });
}

/**
 * Atualiza centroides com a média dos pontos atribuídos
 */
function updateCentroids(data: number[][], assignments: number[], k: number, dimensions: number): number[] {
  const newCentroids: number[] = new Array(k * dimensions).fill(0);
  const counts = new Array(k).fill(0);

  // Somar pontos de cada cluster
  data.forEach((point, index) => {
    const cluster = assignments[index];
    counts[cluster]++;
    
    for (let d = 0; d < dimensions; d++) {
      newCentroids[cluster * dimensions + d] += point[d];
    }
  });

  // Calcular médias
  for (let i = 0; i < k; i++) {
    if (counts[i] > 0) {
      for (let d = 0; d < dimensions; d++) {
        newCentroids[i * dimensions + d] /= counts[i];
      }
    }
  }

  return newCentroids;
}

/**
 * Calcula distância euclidiana entre dois pontos
 */
function euclideanDistance(point1: number[], point2: number[]): number {
  let sum = 0;
  for (let i = 0; i < point1.length; i++) {
    sum += Math.pow(point1[i] - point2[i], 2);
  }
  return Math.sqrt(sum);
}

/**
 * Verifica se dois arrays são iguais
 */
function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((val, i) => val === b[i]);
}

/**
 * Calcula a mudança total nos centroides
 */
function calculateCentroidChange(old: number[], new_: number[]): number {
  let totalChange = 0;
  for (let i = 0; i < old.length; i++) {
    totalChange += Math.abs(old[i] - new_[i]);
  }
  return totalChange;
}

/**
 * Organiza pontos em clusters
 */
function organizeClusters(data: number[][], assignments: number[], k: number): number[][] {
  const clusters: number[][] = Array.from({ length: k }, () => []);
  
  assignments.forEach((cluster, index) => {
    clusters[cluster].push(...data[index]);
  });

  return clusters;
}

/**
 * Calcula Silhouette Score para avaliar qualidade do clustering
 */
function calculateSilhouetteScore(data: number[][], assignments: number[]): number {
  if (data.length <= 1) return 0;

  let totalScore = 0;
  let validPoints = 0;

  data.forEach((point, i) => {
    const cluster = assignments[i];
    const sameClusterPoints = data.filter((_, j) => assignments[j] === cluster && j !== i);
    
    if (sameClusterPoints.length === 0) return;

    // Calcular distância média intra-cluster (a)
    const a = sameClusterPoints.reduce((sum, other) => 
      sum + euclideanDistance(point, other), 0) / sameClusterPoints.length;

    // Calcular distância média inter-cluster mínima (b)
    const clusters = [...new Set(assignments)];
    let b = Infinity;

    clusters.forEach(otherCluster => {
      if (otherCluster === cluster) return;
      
      const otherClusterPoints = data.filter((_, j) => assignments[j] === otherCluster);
      if (otherClusterPoints.length === 0) return;

      const avgDist = otherClusterPoints.reduce((sum, other) => 
        sum + euclideanDistance(point, other), 0) / otherClusterPoints.length;
      
      b = Math.min(b, avgDist);
    });

    if (b !== Infinity) {
      const silhouette = (b - a) / Math.max(a, b);
      totalScore += silhouette;
      validPoints++;
    }
  });

  return validPoints > 0 ? totalScore / validPoints : 0;
}

/**
 * Gera labels descritivos para os clusters
 */
function generateClusterLabels(clusters: number[][], centroids: number[]): string[] {
  return clusters.map((cluster, index) => {
    const size = cluster.length / (clusters[0]?.length || 1);
    const intensity = centroids[index] || 0;
    
    if (intensity > 0.7) {
      return size > clusters.length * 0.4 ? 'Grupo Principal Positivo' : 'Nicho Muito Positivo';
    } else if (intensity > 0.3) {
      return size > clusters.length * 0.4 ? 'Grupo Moderadamente Positivo' : 'Segmento Positivo';
    } else if (intensity > -0.3) {
      return size > clusters.length * 0.4 ? 'Grupo Neutro' : 'Segmento Neutro';
    } else if (intensity > -0.7) {
      return size > clusters.length * 0.4 ? 'Grupo Moderadamente Negativo' : 'Segmento Negativo';
    } else {
      return size > clusters.length * 0.4 ? 'Grupo Principal Negativo' : 'Nicho Muito Negativo';
    }
  });
}

/**
 * Calcula modelos preditivos baseados nos dados
 */
export function calculatePredictiveModels(sentimentData: number[]): PredictiveModel[] {
  const mean = sentimentData.reduce((sum, val) => sum + val, 0) / sentimentData.length;
  const variance = sentimentData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sentimentData.length;
  const stdDev = Math.sqrt(variance);

  const models: PredictiveModel[] = [];

  // Modelo de Recomendação
  const recommendationProb = 1 / (1 + Math.exp(-(mean * 2 + 0.5)));
  models.push({
    type: 'recommendation',
    probability: Math.round(recommendationProb * 100),
    confidence: Math.min(0.95, Math.max(0.5, 1 - stdDev)),
    factors: [
      { factor: 'Sentimento Geral', impact: mean, importance: 'high' },
      { factor: 'Consistência', impact: 1 - stdDev, importance: 'medium' },
      { factor: 'Volume de Feedback', impact: Math.min(1, sentimentData.length / 100), importance: 'low' }
    ]
  });

  // Modelo de Satisfação
  const satisfactionProb = (mean + 1) / 2; // Normalizar de [-1,1] para [0,1]
  models.push({
    type: 'satisfaction',
    probability: Math.round(satisfactionProb * 100),
    confidence: Math.min(0.9, Math.max(0.4, 1 - stdDev * 0.8)),
    factors: [
      { factor: 'Score Médio', impact: satisfactionProb, importance: 'high' },
      { factor: 'Variabilidade', impact: 1 - variance, importance: 'medium' },
      { factor: 'Tendência', impact: Math.sign(mean), importance: 'medium' }
    ]
  });

  // Modelo de Churn
  const churnProb = 1 / (1 + Math.exp(mean * 3)); // Invertido: sentiment negativo = mais churn
  models.push({
    type: 'churn',
    probability: Math.round(churnProb * 100),
    confidence: Math.min(0.85, Math.max(0.3, stdDev + 0.3)),
    factors: [
      { factor: 'Sentimento Negativo', impact: -mean, importance: 'high' },
      { factor: 'Instabilidade', impact: stdDev, importance: 'medium' },
      { factor: 'Feedback Crítico', impact: sentimentData.filter(s => s < -0.5).length / sentimentData.length, importance: 'high' }
    ]
  });

  return models;
}

/**
 * Converte dados de resposta em formato numérico para clustering
 */
export function prepareDataForClustering(responses: any[]): number[][] {
  if (!responses || responses.length === 0) {
    return [];
  }

  return responses.map(response => {
    const sentiment = response.sentiment_score || 0;
    const rating = response.rating || 3;
    const textLength = (response.answer_text || '').length;
    
    return [
      sentiment,
      rating,
      Math.min(textLength / 100, 5) // Normalizar comprimento do texto
    ];
  });
}

/**
 * Gera insights baseados nos resultados do clustering
 */
export function generateClusterInsights(clusterResult: ClusterResult, responseCount: number): string[] {
  const insights: string[] = [];
  
  if (clusterResult.summary.totalClusters === 0) {
    insights.push('📊 Dados insuficientes para análise de clustering.');
    return insights;
  }

  // Análise da qualidade do clustering
  if (clusterResult.silhouetteScore > 0.5) {
    insights.push('✅ Clustering de alta qualidade identificado - grupos bem definidos.');
  } else if (clusterResult.silhouetteScore > 0.25) {
    insights.push('📊 Clustering moderado - alguns grupos identificados.');
  } else {
    insights.push('⚠️ Clustering de baixa qualidade - grupos pouco definidos.');
  }

  // Análise da convergência
  if (clusterResult.summary.convergenceReached) {
    insights.push(`🎯 Algoritmo convergiu em ${clusterResult.iterations} iterações.`);
  } else {
    insights.push(`⏱️ Algoritmo parou após ${clusterResult.iterations} iterações sem convergência completa.`);
  }

  // Análise dos clusters
  const clusterSizes = clusterResult.clusters.map(cluster => 
    cluster.length / (clusterResult.clusters[0]?.length || 1)
  );
  
  const dominantCluster = clusterSizes.indexOf(Math.max(...clusterSizes));
  if (clusterSizes[dominantCluster] > responseCount * 0.6) {
    insights.push(`📈 Grupo dominante identificado: ${clusterResult.clusterLabels[dominantCluster]} (${Math.round((clusterSizes[dominantCluster] / responseCount) * 100)}% das respostas).`);
  }

  const diversityScore = 1 - Math.max(...clusterSizes) / responseCount;
  if (diversityScore > 0.7) {
    insights.push('🎯 Alta diversidade de opiniões detectada - múltiplos segmentos de usuários.');
  } else if (diversityScore < 0.3) {
    insights.push('📊 Baixa diversidade - opiniões concentradas em poucos grupos.');
  }

  return insights;
}