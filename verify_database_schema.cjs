const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabaseSchema() {
  console.log('🔍 Verificando esquema completo do banco de dados...');
  console.log('=' .repeat(60));
  
  try {
    // Verificar tabela profiles
    console.log('\n📋 Verificando tabela PROFILES:');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ Erro na tabela profiles:', profilesError.message);
    } else {
      console.log('✅ Tabela profiles existe e está acessível');
      if (profilesData && profilesData.length > 0) {
        console.log('   Colunas encontradas:', Object.keys(profilesData[0]));
      }
    }

    // Verificar tabela companies
    console.log('\n🏢 Verificando tabela COMPANIES:');
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (companiesError) {
      console.log('❌ Erro na tabela companies:', companiesError.message);
    } else {
      console.log('✅ Tabela companies existe e está acessível');
      if (companiesData && companiesData.length > 0) {
        console.log('   Colunas encontradas:', Object.keys(companiesData[0]));
      }
    }

    // Verificar tabela surveys
    console.log('\n📊 Verificando tabela SURVEYS:');
    const { data: surveysData, error: surveysError } = await supabase
      .from('surveys')
      .select('*')
      .limit(1);
    
    if (surveysError) {
      console.log('❌ Erro na tabela surveys:', surveysError.message);
    } else {
      console.log('✅ Tabela surveys existe e está acessível');
      if (surveysData && surveysData.length > 0) {
        console.log('   Colunas encontradas:', Object.keys(surveysData[0]));
      }
    }

    // Verificar tabela questions
    console.log('\n❓ Verificando tabela QUESTIONS:');
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .limit(1);
    
    if (questionsError) {
      console.log('❌ Erro na tabela questions:', questionsError.message);
    } else {
      console.log('✅ Tabela questions existe e está acessível');
      if (questionsData && questionsData.length > 0) {
        console.log('   Colunas encontradas:', Object.keys(questionsData[0]));
      }
    }

    // Verificar tabela responses
    console.log('\n💬 Verificando tabela RESPONSES:');
    const { data: responsesData, error: responsesError } = await supabase
      .from('responses')
      .select('*')
      .limit(1);
    
    if (responsesError) {
      console.log('❌ Erro na tabela responses:', responsesError.message);
    } else {
      console.log('✅ Tabela responses existe e está acessível');
      if (responsesData && responsesData.length > 0) {
        console.log('   Colunas encontradas:', Object.keys(responsesData[0]));
      }
    }

    // Verificar tabela question_responses
    console.log('\n🔗 Verificando tabela QUESTION_RESPONSES:');
    const { data: questionResponsesData, error: questionResponsesError } = await supabase
      .from('question_responses')
      .select('*')
      .limit(1);
    
    if (questionResponsesError) {
      console.log('❌ Erro na tabela question_responses:', questionResponsesError.message);
    } else {
      console.log('✅ Tabela question_responses existe e está acessível');
      if (questionResponsesData && questionResponsesData.length > 0) {
        console.log('   Colunas encontradas:', Object.keys(questionResponsesData[0]));
      }
    }

    // Verificar tabela respondents
    console.log('\n👥 Verificando tabela RESPONDENTS:');
    const { data: respondentsData, error: respondentsError } = await supabase
      .from('respondents')
      .select('*')
      .limit(1);
    
    if (respondentsError) {
      console.log('❌ Erro na tabela respondents:', respondentsError.message);
    } else {
      console.log('✅ Tabela respondents existe e está acessível');
      if (respondentsData && respondentsData.length > 0) {
        console.log('   Colunas encontradas:', Object.keys(respondentsData[0]));
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎯 RESUMO DA VERIFICAÇÃO:');
    console.log('- Todas as tabelas principais foram verificadas');
    console.log('- Erros indicam problemas de RLS ou tabelas inexistentes');
    console.log('- Tabelas acessíveis mostram suas colunas disponíveis');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Erro geral na verificação:', error);
  }
}

// Executar verificação
verifyDatabaseSchema();