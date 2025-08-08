const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSurveysSchema() {
  try {
    console.log('🔍 Verificando esquema da tabela surveys...');
    
    // Verificar colunas da tabela surveys
    const { data, error } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'surveys' AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });
    
    if (error) {
      console.error('❌ Erro ao verificar esquema:', error);
      
      // Tentar método alternativo
      console.log('\n🔄 Tentando método alternativo...');
      const { data: tableData, error: tableError } = await supabase
        .from('surveys')
        .select('*')
        .limit(1);
      
      if (tableError) {
        console.error('❌ Erro no método alternativo:', tableError.message);
        
        if (tableError.message.includes('questions')) {
          console.log('\n🎯 CONFIRMADO: O erro está relacionado à coluna "questions"!');
          console.log('\n📋 SOLUÇÃO IMEDIATA:');
          console.log('1. Acesse: https://supabase.com/dashboard/project/mjuxvppexydaeuoernxa/sql');
          console.log('2. Execute este SQL:');
          console.log('   ALTER TABLE public.surveys DROP COLUMN IF EXISTS questions;');
          console.log('   ALTER TABLE public.surveys DROP COLUMN IF EXISTS question;');
          console.log('3. Reinicie a aplicação com: npm run dev');
        }
      } else {
        console.log('✅ Tabela surveys acessível via método alternativo');
        console.log('Dados encontrados:', tableData?.length || 0, 'registros');
      }
    } else {
      console.log('✅ Esquema da tabela surveys:');
      console.table(data);
      
      // Verificar se existe coluna 'questions'
      const hasQuestionsColumn = data.some(col => col.column_name === 'questions');
      const hasQuestionColumn = data.some(col => col.column_name === 'question');
      
      if (hasQuestionsColumn || hasQuestionColumn) {
        console.log('\n⚠️  PROBLEMA ENCONTRADO!');
        if (hasQuestionsColumn) console.log('- Coluna "questions" ainda existe na tabela');
        if (hasQuestionColumn) console.log('- Coluna "question" ainda existe na tabela');
        
        console.log('\n📋 CORREÇÃO NECESSÁRIA:');
        console.log('1. Acesse: https://supabase.com/dashboard/project/mjuxvppexydaeuoernxa/sql');
        console.log('2. Execute:');
        if (hasQuestionsColumn) console.log('   ALTER TABLE public.surveys DROP COLUMN questions;');
        if (hasQuestionColumn) console.log('   ALTER TABLE public.surveys DROP COLUMN question;');
      } else {
        console.log('\n✅ Esquema correto - não há colunas problemáticas');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

checkSurveysSchema();