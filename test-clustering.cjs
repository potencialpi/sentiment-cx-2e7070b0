const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://wnpkmkqtqtqtqtqtqtqt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGtta3F0cXRxdHF0cXRxdHF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NjU4NzQsImV4cCI6MjA3MjM0MTg3NH0.Ey7Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testClustering() {
  try {
    console.log('🔍 Testando funcionalidade de clustering...');
    
    // 1. Buscar dados de pesquisas
    console.log('📊 Buscando dados de pesquisas...');
    const { data: surveys, error: surveysError } = await supabase
      .from('surveys')
      .select('*')
      .limit(5);
    
    if (surveysError) {
      console.error('❌ Erro ao buscar pesquisas:', surveysError);
      return;
    }
    
    console.log('✅ Pesquisas encontradas:', surveys?.length || 0);
    
    if (!surveys || surveys.length === 0) {
      console.log('⚠️ Nenhuma pesquisa encontrada. Criando dados de teste...');
      await createTestData();
      return;
    }
    
    // 2. Buscar respostas para a primeira pesquisa
    const surveyId = surveys[0].id;
    console.log('🎯 Testando com survey ID:', surveyId);
    
    const { data: responses, error: responsesError } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('survey_id', surveyId)
      .limit(20);
    
    if (responsesError) {
      console.error('❌ Erro ao buscar respostas:', responsesError);
      return;
    }
    
    console.log('✅ Respostas encontradas:', responses?.length || 0);
    
    if (!responses || responses.length < 5) {
      console.log('⚠️ Poucas respostas encontradas. Criando dados de teste...');
      await createTestResponses(surveyId);
      return;
    }
    
    // 3. Simular processamento de clustering
    console.log('🧮 Simulando processamento de clustering...');
    const numericData = extractNumericData(responses);
    console.log('📈 Dados numéricos extraídos:', numericData);
    
    if (numericData.length < 3) {
      console.log('⚠️ Dados insuficientes para clustering');
      return;
    }
    
    // 4. Testar algoritmo K-means simples
    console.log('🎯 Testando K-means...');
    const clusters = performSimpleKMeans(numericData, 3);
    console.log('✅ Clustering concluído:', clusters);
    
    console.log('🎉 Teste de clustering finalizado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Função para extrair dados numéricos das respostas
function extractNumericData(responses) {
  const numericData = [];
  
  responses.forEach(response => {
    const point = [];
    
    // Extrair sentiment_score se disponível
    if (response.sentiment_score !== null && response.sentiment_score !== undefined) {
      point.push(parseFloat(response.sentiment_score));
    }
    
    // Extrair outros campos numéricos das respostas
    if (response.responses && typeof response.responses === 'object') {
      Object.values(response.responses).forEach(value => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          point.push(numValue);
        }
      });
    }
    
    // Adicionar timestamp como valor numérico
    if (response.created_at) {
      const timestamp = new Date(response.created_at).getTime();
      point.push(timestamp % 1000000); // Normalizar
    }
    
    if (point.length >= 2) {
      numericData.push(point);
    }
  });
  
  return numericData;
}

// Implementação simples do K-means para teste
function performSimpleKMeans(data, k) {
  if (data.length < k) return null;
  
  const dimensions = data[0].length;
  const centroids = [];
  
  // Inicializar centroides aleatoriamente
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
  
  const clusters = Array(k).fill().map(() => []);
  
  // Atribuir pontos aos clusters
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
    
    clusters[closestCluster].push(point);
  });
  
  return {
    clusters,
    centroids,
    clusterSizes: clusters.map(cluster => cluster.length)
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

// Função para criar dados de teste
async function createTestData() {
  console.log('🔧 Criando dados de teste...');
  
  // Criar uma pesquisa de teste
  const { data: survey, error: surveyError } = await supabase
    .from('surveys')
    .insert({
      title: 'Teste de Clustering',
      description: 'Pesquisa para testar funcionalidade de clustering',
      questions: {
        q1: 'Como você avalia nosso produto? (1-10)',
        q2: 'Qual sua satisfação geral? (1-10)',
        q3: 'Recomendaria para outros? (1-10)'
      },
      user_id: 'test-user'
    })
    .select()
    .single();
  
  if (surveyError) {
    console.error('❌ Erro ao criar pesquisa:', surveyError);
    return;
  }
  
  console.log('✅ Pesquisa de teste criada:', survey.id);
  
  // Criar respostas de teste
  await createTestResponses(survey.id);
}

// Função para criar respostas de teste
async function createTestResponses(surveyId) {
  console.log('📝 Criando respostas de teste...');
  
  const testResponses = [];
  
  for (let i = 0; i < 10; i++) {
    testResponses.push({
      survey_id: surveyId,
      responses: {
        q1: Math.floor(Math.random() * 10) + 1,
        q2: Math.floor(Math.random() * 10) + 1,
        q3: Math.floor(Math.random() * 10) + 1
      },
      sentiment_score: Math.random() * 2 - 1, // -1 a 1
      user_id: `test-user-${i}`
    });
  }
  
  const { error } = await supabase
    .from('survey_responses')
    .insert(testResponses);
  
  if (error) {
    console.error('❌ Erro ao criar respostas:', error);
    return;
  }
  
  console.log('✅ Respostas de teste criadas:', testResponses.length);
}

// Executar o teste
testClustering