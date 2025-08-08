const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const SUPABASE_URL = 'https://mjuxvppexydaeuoernxa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDatabaseAfterFix() {
  console.log('🔍 TESTANDO BANCO DE DADOS APÓS CORREÇÕES\n');
  
  const tables = [
    'profiles',
    'companies', 
    'surveys',
    'questions',
    'responses',
    'question_responses',
    'respondents'
  ];
  
  // Teste 1: Verificar se todas as tabelas existem
  console.log('📋 1. VERIFICANDO EXISTÊNCIA DAS TABELAS:');
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Tabela acessível`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Erro - ${err.message}`);
    }
  }
  
  console.log('\n📊 2. VERIFICANDO ESTRUTURA DAS TABELAS:');
  
  // Teste 2: Verificar estrutura específica da tabela surveys
  console.log('\n🔍 Testando estrutura da tabela SURVEYS:');
  try {
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: 'surveys'
    });
    
    if (error) {
      console.log('⚠️  Não foi possível verificar colunas via RPC');
      
      // Teste alternativo: tentar inserir dados de teste
      const testSurvey = {
        title: 'Teste Survey',
        description: 'Descrição de teste',
        max_responses: 100,
        current_responses: 0,
        status: 'active'
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('surveys')
        .insert(testSurvey)
        .select();
      
      if (insertError) {
        console.log(`❌ Erro ao inserir survey de teste: ${insertError.message}`);
      } else {
        console.log('✅ Survey de teste inserido com sucesso');
        
        // Limpar dados de teste
        if (insertData && insertData[0]) {
          await supabase
            .from('surveys')
            .delete()
            .eq('id', insertData[0].id);
          console.log('🧹 Dados de teste removidos');
        }
      }
    }
  } catch (err) {
    console.log(`❌ Erro ao testar surveys: ${err.message}`);
  }
  
  // Teste 3: Verificar estrutura da tabela questions
  console.log('\n🔍 Testando estrutura da tabela QUESTIONS:');
  try {
    // Primeiro, criar um survey de teste para referenciar
    const { data: surveyData, error: surveyError } = await supabase
      .from('surveys')
      .insert({
        title: 'Survey para teste de questions',
        description: 'Teste',
        max_responses: 100,
        current_responses: 0,
        status: 'active'
      })
      .select()
      .single();
    
    if (surveyError) {
      console.log(`❌ Erro ao criar survey para teste: ${surveyError.message}`);
    } else {
      // Tentar inserir uma question
      const testQuestion = {
        survey_id: surveyData.id,
        question_text: 'Pergunta de teste',
        question_type: 'text',
        question_order: 1
      };
      
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .insert(testQuestion)
        .select();
      
      if (questionError) {
        console.log(`❌ Erro ao inserir question de teste: ${questionError.message}`);
      } else {
        console.log('✅ Question de teste inserida com sucesso');
        
        // Limpar dados de teste
        if (questionData && questionData[0]) {
          await supabase
            .from('questions')
            .delete()
            .eq('id', questionData[0].id);
        }
      }
      
      // Limpar survey de teste
      await supabase
        .from('surveys')
        .delete()
        .eq('id', surveyData.id);
      console.log('🧹 Dados de teste removidos');
    }
  } catch (err) {
    console.log(`❌ Erro ao testar questions: ${err.message}`);
  }
  
  // Teste 4: Verificar tabela respondents
  console.log('\n🔍 Testando estrutura da tabela RESPONDENTS:');
  try {
    const testRespondent = {
      name: 'Teste Respondent',
      email: 'teste@exemplo.com'
    };
    
    const { data, error } = await supabase
      .from('respondents')
      .insert(testRespondent)
      .select();
    
    if (error) {
      console.log(`❌ Erro ao inserir respondent de teste: ${error.message}`);
      if (error.message.includes('user_id')) {
        console.log('ℹ️  Erro esperado: user_id é obrigatório (RLS funcionando)');
      }
    } else {
      console.log('✅ Respondent de teste inserido (não deveria acontecer sem autenticação)');
      
      // Limpar dados se inseriu
      if (data && data[0]) {
        await supabase
          .from('respondents')
          .delete()
          .eq('id', data[0].id);
      }
    }
  } catch (err) {
    console.log(`❌ Erro ao testar respondents: ${err.message}`);
  }
  
  // Teste 5: Verificar se as colunas problemáticas foram removidas
  console.log('\n🔍 5. VERIFICANDO REMOÇÃO DE COLUNAS PROBLEMÁTICAS:');
  
  try {
    // Tentar acessar coluna 'questions' que deveria ter sido removida
    const { data, error } = await supabase
      .from('surveys')
      .select('questions')
      .limit(1);
    
    if (error && error.message.includes('column "questions" does not exist')) {
      console.log('✅ Coluna "questions" foi removida corretamente da tabela surveys');
    } else if (error) {
      console.log(`⚠️  Erro inesperado: ${error.message}`);
    } else {
      console.log('❌ Coluna "questions" ainda existe na tabela surveys');
    }
  } catch (err) {
    console.log(`❌ Erro ao verificar remoção de colunas: ${err.message}`);
  }
  
  console.log('\n🎯 TESTE COMPLETO FINALIZADO!');
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('1. Execute o script fix_complete_database_schema.sql no Supabase Dashboard');
  console.log('2. Execute este teste novamente para verificar as correções');
  console.log('3. Teste a aplicação para garantir que tudo funciona');
}

testDatabaseAfterFix().catch(console.error);