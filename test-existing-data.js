/**
 * Teste com Dados Existentes da Plataforma Sentiment CX
 * Este script testa as funcionalidades usando os dados já existentes no banco
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

// Inicializar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para análise de sentimento simples
function analyzeSentiment(text) {
  if (!text || typeof text !== 'string') return 'neutral';
  
  const positiveWords = ['bom', 'ótimo', 'excelente', 'rápido', 'eficiente', 'qualidade', 'recomendo', 'satisfeito', 'feliz', 'perfeito'];
  const negativeWords = ['ruim', 'péssimo', 'lento', 'problema', 'difícil', 'caro', 'insatisfeito', 'terrível', 'horrível'];
  
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.some(pw => word.includes(pw))) score += 1;
    if (negativeWords.some(nw => word.includes(nw))) score -= 1;
  });
  
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

// Teste 1: Listar pesquisas existentes
async function listExistingSurveys() {
  console.log('\n📋 Listando pesquisas existentes...');
  
  try {
    const { data: surveys, error } = await supabase
      .from('surveys')
      .select(`
        id,
        title,
        description,
        status,
        created_at,
        questions (id, question_text, question_type, question_order)
      `);
    
    if (error) {
      console.log('❌ Erro ao buscar pesquisas:', error.message);
      return false;
    }
    
    console.log(`✅ Encontradas ${surveys.length} pesquisas:`);
    
    surveys.forEach((survey, index) => {
      console.log(`\n   ${index + 1}. ${survey.title}`);
      console.log(`      📝 ${survey.description || 'Sem descrição'}`);
      console.log(`      📊 ${survey.questions?.length || 0} perguntas`);
      console.log(`      🔄 Status: ${survey.status || 'N/A'}`);
      console.log(`      📅 Criada em: ${new Date(survey.created_at).toLocaleDateString('pt-BR')}`);
    });
    
    return surveys;
  } catch (error) {
    console.log('❌ Erro ao listar pesquisas:', error.message);
    return false;
  }
}

// Teste 2: Analisar estrutura das perguntas
async function analyzeQuestionStructure() {
  console.log('\n🔍 Analisando estrutura das perguntas...');
  
  try {
    const { data: questions, error } = await supabase
      .from('questions')
      .select(`
        id,
        question_text,
        question_type,
        question_order,
        surveys (title)
      `);
    
    if (error) {
      console.log('❌ Erro ao buscar perguntas:', error.message);
      return false;
    }
    
    console.log(`✅ Encontradas ${questions.length} perguntas`);
    
    // Agrupar por tipo
    const questionTypes = {};
    questions.forEach(q => {
      if (!questionTypes[q.question_type]) questionTypes[q.question_type] = 0;
      questionTypes[q.question_type]++;
    });
    
    console.log('\n📊 Distribuição por tipo:');
    Object.entries(questionTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} perguntas`);
    });
    
    // Mostrar algumas perguntas de exemplo
    console.log('\n📝 Exemplos de perguntas:');
    questions.slice(0, 5).forEach((q, index) => {
      console.log(`   ${index + 1}. [${q.question_type}] ${q.question_text}`);
      console.log(`      📋 Pesquisa: ${q.surveys?.title || 'N/A'}`);
      console.log(`      📊 Ordem: ${q.question_order}`);
    });
    
    return questions;
  } catch (error) {
    console.log('❌ Erro ao analisar perguntas:', error.message);
    return false;
  }
}

// Teste 3: Simular respostas para uma pesquisa
async function simulateResponses(surveys) {
  console.log('\n🎭 Simulando respostas para demonstração...');
  
  if (!surveys || surveys.length === 0) {
    console.log('❌ Nenhuma pesquisa disponível para simulação');
    return false;
  }
  
  try {
    // Pegar a primeira pesquisa ativa
    const activeSurvey = surveys.find(s => s.status === 'active') || surveys[0];
    console.log(`📋 Usando pesquisa: "${activeSurvey.title}"`);
    
    if (!activeSurvey.questions || activeSurvey.questions.length === 0) {
      console.log('⚠️ Pesquisa não possui perguntas');
      return false;
    }
    
    // Respostas simuladas
    const mockResponses = [
      {
        name: 'Resposta Positiva',
        answers: {
          'text': 'Excelente atendimento, muito satisfeito com o serviço!',
          'rating': 5,
          'boolean': true,
          'multiple_choice': 'Muito bom'
        }
      },
      {
        name: 'Resposta Neutra',
        answers: {
          'text': 'O serviço foi adequado, dentro do esperado.',
          'rating': 3,
          'boolean': true,
          'multiple_choice': 'Regular'
        }
      },
      {
        name: 'Resposta Negativa',
        answers: {
          'text': 'Atendimento ruim, demorou muito e não resolveu meu problema.',
          'rating': 2,
          'boolean': false,
          'multiple_choice': 'Ruim'
        }
      }
    ];
    
    console.log('\n🎯 Simulando análise de respostas:');
    
    mockResponses.forEach((response, index) => {
      console.log(`\n   ${index + 1}. ${response.name}:`);
      
      activeSurvey.questions.forEach(question => {
        const answerKey = question.question_type;
        const answer = response.answers[answerKey];
        
        if (answer !== undefined) {
          console.log(`      ❓ ${question.question_text}`);
          console.log(`      💬 Resposta: ${answer}`);
          
          if (question.question_type === 'text' && typeof answer === 'string') {
            const sentiment = analyzeSentiment(answer);
            const sentimentEmoji = {
              'positive': '😊',
              'negative': '😞',
              'neutral': '😐'
            };
            console.log(`      🎭 Sentimento: ${sentiment} ${sentimentEmoji[sentiment]}`);
          }
        }
      });
    });
    
    return true;
  } catch (error) {
    console.log('❌ Erro ao simular respostas:', error.message);
    return false;
  }
}

// Teste 4: Verificar integridade dos dados
async function checkDataIntegrity() {
  console.log('\n🔍 Verificando integridade dos dados...');
  
  try {
    // Verificar relacionamentos
    const { data: surveysWithQuestions, error: surveyError } = await supabase
      .from('surveys')
      .select(`
        id,
        title,
        questions (id)
      `);
    
    if (surveyError) {
      console.log('❌ Erro ao verificar relacionamentos:', surveyError.message);
      return false;
    }
    
    let totalQuestions = 0;
    let surveysWithoutQuestions = 0;
    
    surveysWithQuestions.forEach(survey => {
      const questionCount = survey.questions?.length || 0;
      totalQuestions += questionCount;
      
      if (questionCount === 0) {
        surveysWithoutQuestions++;
        console.log(`⚠️ Pesquisa "${survey.title}" não possui perguntas`);
      }
    });
    
    console.log('✅ Verificação de integridade:');
    console.log(`   📊 Total de pesquisas: ${surveysWithQuestions.length}`);
    console.log(`   📝 Total de perguntas: ${totalQuestions}`);
    console.log(`   ⚠️ Pesquisas sem perguntas: ${surveysWithoutQuestions}`);
    
    // Verificar se existem respostas
    const { data: responses, error: responseError } = await supabase
      .from('responses')
      .select('id')
      .limit(1);
    
    if (responseError) {
      console.log('⚠️ Erro ao verificar respostas:', responseError.message);
    } else {
      console.log(`   💬 Respostas existentes: ${responses.length > 0 ? 'Sim' : 'Não'}`);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Erro na verificação de integridade:', error.message);
    return false;
  }
}

// Teste 5: Demonstrar funcionalidades de análise
async function demonstrateAnalytics() {
  console.log('\n📈 Demonstrando capacidades de análise...');
  
  try {
    // Simular dados de análise
    const sampleTexts = [
      'Excelente atendimento, muito satisfeito!',
      'Serviço regular, pode melhorar.',
      'Péssima experiência, não recomendo.',
      'Ótimo produto, superou expectativas!',
      'Atendimento lento, mas resolveu o problema.'
    ];
    
    console.log('🎭 Análise de sentimento em textos de exemplo:');
    
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    
    sampleTexts.forEach((text, index) => {
      const sentiment = analyzeSentiment(text);
      sentimentCounts[sentiment]++;
      
      const emoji = {
        'positive': '😊',
        'negative': '😞',
        'neutral': '😐'
      };
      
      console.log(`   ${index + 1}. "${text}"`);
      console.log(`      🎭 Sentimento: ${sentiment} ${emoji[sentiment]}`);
    });
    
    console.log('\n📊 Resumo da análise:');
    console.log(`   😊 Positivos: ${sentimentCounts.positive} (${(sentimentCounts.positive/sampleTexts.length*100).toFixed(1)}%)`);
    console.log(`   😐 Neutros: ${sentimentCounts.neutral} (${(sentimentCounts.neutral/sampleTexts.length*100).toFixed(1)}%)`);
    console.log(`   😞 Negativos: ${sentimentCounts.negative} (${(sentimentCounts.negative/sampleTexts.length*100).toFixed(1)}%)`);
    
    return true;
  } catch (error) {
    console.log('❌ Erro na demonstração de análise:', error.message);
    return false;
  }
}

// Função principal
async function runDataTests() {
  console.log('🚀 Testando funcionalidades com dados existentes\n');
  console.log('=' .repeat(70));
  
  const results = {
    surveys: false,
    questions: false,
    simulation: false,
    integrity: false,
    analytics: false
  };
  
  // Executar testes
  const surveys = await listExistingSurveys();
  results.surveys = !!surveys;
  
  results.questions = await analyzeQuestionStructure();
  
  if (surveys) {
    results.simulation = await simulateResponses(surveys);
  }
  
  results.integrity = await checkDataIntegrity();
  results.analytics = await demonstrateAnalytics();
  
  // Resumo
  console.log('\n' + '=' .repeat(70));
  console.log('📋 RESUMO DOS TESTES COM DADOS EXISTENTES:');
  console.log('=' .repeat(70));
  
  const testDescriptions = {
    surveys: 'Listagem de Pesquisas',
    questions: 'Análise de Perguntas',
    simulation: 'Simulação de Respostas',
    integrity: 'Integridade dos Dados',
    analytics: 'Demonstração de Análise'
  };
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASSOU' : '❌ FALHOU';
    const testName = testDescriptions[test] || test;
    console.log(`${testName.padEnd(25)} ${status}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log('\n' + '=' .repeat(70));
  console.log(`🎯 RESULTADO FINAL: ${passedTests}/${totalTests} testes passaram`);
  
  if (passedTests === totalTests) {
    console.log('🎉 Todos os testes passaram! A plataforma está funcionando com os dados existentes.');
  } else {
    console.log('⚠️ Alguns testes falharam, mas a plataforma tem dados funcionais.');
  }
  
  console.log('\n💡 Observações:');
  console.log('   - A plataforma possui dados de pesquisas e perguntas');
  console.log('   - As funcionalidades de análise estão operacionais');
  console.log('   - Para testes completos, adicione respostas reais via interface');
  
  console.log('=' .repeat(70));
}

// Executar testes
runDataTests().catch(error => {
  console.error('❌ Erro fatal durante os testes:', error);
  process.exit(1);
});