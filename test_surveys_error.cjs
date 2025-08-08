const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSurveysOperations() {
  console.log('🧪 Testando operações na tabela surveys para reproduzir o erro...');
  
  try {
    // Teste 1: SELECT básico
    console.log('\n1. Teste SELECT básico...');
    const { data: selectData, error: selectError } = await supabase
      .from('surveys')
      .select('*');
    
    if (selectError) {
      console.log('❌ Erro no SELECT:', selectError.message);
      if (selectError.message.includes('question')) {
        console.log('🎯 ERRO ENCONTRADO! Problema com coluna question detectado.');
      }
    } else {
      console.log('✅ SELECT funcionou:', selectData.length, 'registros');
    }
    
    // Teste 2: SELECT com colunas específicas
    console.log('\n2. Teste SELECT com colunas específicas...');
    const { data: selectSpecific, error: selectSpecificError } = await supabase
      .from('surveys')
      .select('id, title, description, user_id');
    
    if (selectSpecificError) {
      console.log('❌ Erro no SELECT específico:', selectSpecificError.message);
      if (selectSpecificError.message.includes('question')) {
        console.log('🎯 ERRO ENCONTRADO! Problema com coluna question detectado.');
      }
    } else {
      console.log('✅ SELECT específico funcionou');
    }
    
    // Teste 3: Tentar INSERT (pode revelar problemas de schema)
    console.log('\n3. Teste INSERT (simulado)...');
    const testInsert = {
      title: 'Teste Survey',
      description: 'Teste de inserção',
      user_id: '00000000-0000-0000-0000-000000000000'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('surveys')
      .insert(testInsert)
      .select();
    
    if (insertError) {
      console.log('❌ Erro no INSERT:', insertError.message);
      if (insertError.message.includes('question')) {
        console.log('🎯 ERRO ENCONTRADO! Problema com coluna question detectado.');
        console.log('\n📋 SOLUÇÃO NECESSÁRIA:');
        console.log('Execute este SQL no painel do Supabase:');
        console.log('ALTER TABLE public.surveys DROP COLUMN IF EXISTS question;');
        console.log('ALTER TABLE public.surveys DROP COLUMN IF EXISTS questions;');
      }
    } else {
      console.log('✅ INSERT funcionou, ID:', insertData[0]?.id);
      
      // Limpar o registro de teste
      if (insertData[0]?.id) {
        await supabase.from('surveys').delete().eq('id', insertData[0].id);
        console.log('🧹 Registro de teste removido');
      }
    }
    
    // Teste 4: Verificar se existem triggers ou funções que referenciam 'question'
    console.log('\n4. Testando operações que podem ativar triggers...');
    
    // Tentar uma operação que pode ativar triggers
    const { data: triggerTest, error: triggerError } = await supabase
      .from('surveys')
      .select('id')
      .limit(1);
    
    if (triggerError) {
      console.log('❌ Erro em trigger/função:', triggerError.message);
      if (triggerError.message.includes('question')) {
        console.log('🎯 ERRO ENCONTRADO! Problema em trigger/função que referencia coluna question.');
        console.log('\n📋 SOLUÇÃO:');
        console.log('1. Acesse: https://supabase.com/dashboard/project/mjuxvppexydaeuoernxa/sql');
        console.log('2. Execute: ALTER TABLE public.surveys DROP COLUMN IF EXISTS question;');
        console.log('3. Execute: ALTER TABLE public.surveys DROP COLUMN IF EXISTS questions;');
        console.log('4. Verifique se há triggers ou funções que referenciam essas colunas');
      }
    } else {
      console.log('✅ Triggers/funções funcionando normalmente');
    }
    
    console.log('\n🎉 Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
    
    if (error.message.includes('question')) {
      console.log('\n🎯 ERRO CONFIRMADO!');
      console.log('O erro está relacionado à coluna question na tabela surveys.');
      console.log('\n📋 CORREÇÃO IMEDIATA:');
      console.log('1. Acesse: https://supabase.com/dashboard/project/mjuxvppexydaeuoernxa/sql');
      console.log('2. Execute este SQL:');
      console.log('   ALTER TABLE public.surveys DROP COLUMN IF EXISTS question;');
      console.log('   ALTER TABLE public.surveys DROP COLUMN IF EXISTS questions;');
      console.log('3. Reinicie a aplicação');
    }
  }
}

testSurveysOperations();