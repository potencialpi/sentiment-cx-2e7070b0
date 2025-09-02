console.log('🔍 Testando funcionalidade de clustering...');

// Simular dados de teste para clustering
const testData = [
  [1, 2, 3],
  [2, 3, 4],
  [1, 1, 2],
  [8, 9, 10],
  [9, 10, 11],
  [7, 8, 9],
  [15, 16, 17],
  [16, 17, 18],
  [14, 15, 16]
];

console.log('📊 Dados de teste:', testData);

// Implementação simples do K-means
function performKMeans(data, k) {
  console.log(`🎯 Executando K-means com k=${k}`);
  
  if (data.length < k) {
    console.log('❌ Dados insuficientes para k=' + k);
    return null;
  }
  
  const dimensions = data[0].length;
  console.log('📏 Dimensões:', dimensions);
  
  // Inicializar centroides
  const centroids = [];
  for (let i = 0; i < k; i++) {
    const centroid = [];
    for (let d = 0; d < dimensions; d++) {
      const values = data.map(point => point[d]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      centroid.push(min + Math.random() * (max - min));
    }
    centroids.push(centroid);
  }
  
  console.log('🎲 Centroides iniciais:', centroids);
  
  // Iterações do K-means
  let iterations = 0;
  const maxIterations = 10;
  
  while (iterations < maxIterations) {
    console.log(`🔄 Iteração ${iterations + 1}`);
    
    // Atribuir pontos aos clusters
    const clusters = Array(k).fill().map(() => []);
    
    data.forEach((point, index) => {
      let minDistance = Infinity;
      let closestCluster = 0;
      
      centroids.forEach((centroid, clusterIndex) => {
        const distance = euclideanDistance(point, centroid);
        if (distance < minDistance) {
          minDistance = distance;
          closestCluster = clusterIndex;
        }
      });
      
      clusters[closestCluster].push(point);
    });
    
    console.log('📊 Clusters:', clusters.map(cluster => cluster.length));
    
    // Atualizar centroides
    let converged = true;
    for (let i = 0; i < k; i++) {
      if (clusters[i].length > 0) {
        const newCentroid = [];
        for (let d = 0; d < dimensions; d++) {
          const sum = clusters[i].reduce((acc, point) => acc + point[d], 0);
          newCentroid.push(sum / clusters[i].length);
        }
        
        // Verificar convergência
        const distance = euclideanDistance(centroids[i], newCentroid);
        if (distance > 0.001) {
          converged = false;
        }
        
        centroids[i] = newCentroid;
      }
    }
    
    if (converged) {
      console.log('✅ Convergência alcançada na iteração', iterations + 1);
      break;
    }
    
    iterations++;
  }
  
  // Resultado final
  const finalClusters = Array(k).fill().map(() => []);
  data.forEach(point => {
    let minDistance = Infinity;
    let closestCluster = 0;
    
    centroids.forEach((centroid, index) => {
      const distance = euclideanDistance(point, centroid);
      if (distance < minDistance) {
        minDistance = distance;
        closestCluster = index;
      }
    });
    
    finalClusters[closestCluster].push(point);
  });
  
  return {
    clusters: finalClusters,
    centroids: centroids,
    iterations: iterations + 1
  };
}

// Função para calcular distância euclidiana
function euclideanDistance(point1, point2) {
  let sum = 0;
  for (let i = 0; i < point1.length; i++) {
    sum += Math.pow(point1[i] - point2[i], 2);
  }
  return Math.sqrt(sum);
}

// Função para calcular Silhouette Score
function calculateSilhouetteScore(data, clusters) {
  console.log('📈 Calculando Silhouette Score...');
  
  let totalScore = 0;
  let pointCount = 0;
  
  clusters.forEach((cluster, clusterIndex) => {
    cluster.forEach(point => {
      if (cluster.length <= 1) return;
      
      // Calcular distância média intra-cluster (a)
      let intraDistance = 0;
      cluster.forEach(otherPoint => {
        if (point !== otherPoint) {
          intraDistance += euclideanDistance(point, otherPoint);
        }
      });
      const a = intraDistance / (cluster.length - 1);
      
      // Calcular distância média inter-cluster mínima (b)
      let minInterDistance = Infinity;
      clusters.forEach((otherCluster, otherIndex) => {
        if (otherIndex !== clusterIndex && otherCluster.length > 0) {
          let interDistance = 0;
          otherCluster.forEach(otherPoint => {
            interDistance += euclideanDistance(point, otherPoint);
          });
          const avgInterDistance = interDistance / otherCluster.length;
          minInterDistance = Math.min(minInterDistance, avgInterDistance);
        }
      });
      const b = minInterDistance;
      
      // Calcular silhouette score para este ponto
      const silhouette = (b - a) / Math.max(a, b);
      totalScore += silhouette;
      pointCount++;
    });
  });
  
  const avgScore = pointCount > 0 ? totalScore / pointCount : 0;
  console.log('📊 Silhouette Score:', avgScore);
  return avgScore;
}

// Executar testes
console.log('\n🧮 Testando K-means com diferentes valores de k...');

for (let k = 2; k <= 4; k++) {
  console.log(`\n--- Teste com k=${k} ---`);
  const result = performKMeans(testData, k);
  
  if (result) {
    console.log('✅ Resultado:', {
      k: k,
      iterations: result.iterations,
      clusterSizes: result.clusters.map(cluster => cluster.length),
      centroids: result.centroids.map(centroid => centroid.map(v => v.toFixed(2)))
    });
    
    const silhouetteScore = calculateSilhouetteScore(testData, result.clusters);
    console.log('📈 Silhouette Score:', silhouetteScore.toFixed(3));
  }
}

console.log('\n🎉 Teste de clustering concluído!');