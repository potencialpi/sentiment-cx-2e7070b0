const { createClient } = require('@supabase/supabase-js');

// Verificação de variáveis de ambiente
if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
  console.error('❌ SUPABASE_URL não encontrada nas variáveis de ambiente');
  console.log('💡 Certifique-se de que o arquivo .env.local existe e contém VITE_SUPABASE_URL');
  process.exit(1);
}

if (!process.env.SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY não encontrada nas variáveis de ambiente');
  console.log('💡 Certifique-se de que o arquivo .env.local existe e contém VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}


const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuestionsColumn() {
  try {
    console.log('🔍 Testando se a coluna "questions" existe na tabela surveys...');
    
    // Teste 1: Tentar selecionar apenas a coluna questions
    console.log('\n1. Tentando SELECT questions FROM surveys...');
    const { data: questionsData, error: questionsError } = await supabase
      .from('surveys')
      .select('questions')
      .limit(1);
    
    if (questionsError) {
      console.log('❌ Erro ao acessar coluna "questions":', questionsError.message);
      
      if (questionsError.message.includes('questions')) {
        console.log('\n🎯 CONFIRMADO: A coluna "questions" está causando o erro!');
        console.log('\n📋 SOLUÇÃO IMEDIATA:');
        console.log('1. Acesse: https://supabase.com/dashboard/project/mjuxvppexydaeuoernxa/sql');
        console.log('2. Execute este SQL:');
        console.log('   ALTER TABLE public.surveys DROP COLUMN IF EXISTS questions;');
        console.log('3. Reinicie a aplicação com: npm run dev');
      }
    } else {
      console.log('✅ Coluna "questions" acessível');
      console.log('Dados encontrados:', questionsData?.length || 0, 'registros');
    }
    
    // Teste 2: Tentar selecionar apenas a coluna question (singular)
    console.log('\n2. Tentando SELECT question FROM surveys...');
    const { data: questionData, error: questionError } = await supabase
      .from('surveys')
      .select('question')
      .limit(1);
    
    if (questionError) {
      console.log('❌ Erro ao acessar coluna "question":', questionError.message);
      
      if (questionError.message.includes('question')) {
        console.log('\n🎯 CONFIRMADO: A coluna "question" está causando o erro!');
        console.log('\n📋 SOLUÇÃO ADICIONAL:');
        console.log('   ALTER TABLE public.surveys DROP COLUMN IF EXISTS question;');
      }
    } else {
      console.log('✅ Coluna "question" acessível');
      console.log('Dados encontrados:', questionData?.length || 0, 'registros');
    }
    
    // Teste 3: Tentar selecionar todas as colunas válidas
    console.log('\n3. Tentando SELECT de colunas válidas...');
    const { data: validData, error: validError } = await supabase
      .from('surveys')
      .select('id, title, description, user_id, status, created_at, updated_at')
      .limit(1);
    
    if (validError) {
      console.log('❌ Erro ao acessar colunas válidas:', validError.message);
    } else {
      console.log('✅ Colunas válidas acessíveis');
      console.log('Estrutura encontrada:', Object.keys(validData?.[0] || {}));
    }
    
    // Teste 4: Reproduzir o erro original
    console.log('\n4. Reproduzindo o erro original...');
    try {
      const { data: allData, error: allError } = await supabase
        .from('surveys')
        .select('*')
        .limit(1);
      
      if (allError) {
        console.log('❌ Erro ao fazer SELECT *:', allError.message);
        
        if (allError.message.includes('questions') || allError.message.includes('question')) {
          console.log('\n🎯 ERRO REPRODUZIDO COM SUCESSO!');
          console.log('O problema está na coluna "questions" ou "question" na tabela surveys.');
          console.log('\n📋 CORREÇÃO DEFINITIVA:');
          console.log('Execute no SQL Editor do Supabase:');
          console.log('ALTER TABLE public.surveys DROP COLUMN IF EXISTS questions;');
          console.log('ALTER TABLE public.surveys DROP COLUMN IF EXISTS question;');
        }
      } else {
        console.log('✅ SELECT * funcionou normalmente');
        console.log('Colunas encontradas:', Object.keys(allData?.[0] || {}));
      }
    } catch (selectError) {
      console.log('❌ Erro no SELECT *:', selectError.message);
    }
    
    console.log('\n🎉 Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
    
    if (error.message.includes('questions') || error.message.includes('question')) {
      console.log('\n🎯 ERRO CONFIRMADO!');
      console.log('O erro está relacionado à coluna "questions" ou "question" na tabela surveys.');
      console.log('\n📋 CORREÇÃO IMEDIATA:');
      console.log('1. Acesse: https://supabase.com/dashboard/project/mjuxvppexydaeuoernxa/sql');
      console.log('2. Execute este SQL:');
      console.log('   ALTER TABLE public.surveys DROP COLUMN IF EXISTS questions;');
      console.log('   ALTER TABLE public.surveys DROP COLUMN IF EXISTS question;');
      console.log('3. Reinicie a aplicação');
    }
  }
}

testQuestionsColumn();