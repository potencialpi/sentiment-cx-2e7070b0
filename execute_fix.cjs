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


// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeFix() {
  console.log('🔧 Executando correção do schema da tabela surveys...');
  
  try {
    // Tentar acessar a tabela surveys para verificar se existe
    console.log('\n1. Verificando acesso à tabela surveys...');
    const { data: surveysData, error: surveysError } = await supabase
      .from('surveys')
      .select('*')
      .limit(1);
    
    if (surveysError) {
      console.log('❌ Erro ao acessar tabela surveys:', surveysError.message);
      
      // Se o erro menciona a coluna 'question', isso confirma o problema
      if (surveysError.message.includes('question')) {
        console.log('\n⚠️  PROBLEMA CONFIRMADO: Erro relacionado à coluna question detectado!');
        console.log('\n📋 SOLUÇÃO: Execute o seguinte SQL no painel do Supabase:');
        console.log('\n```sql');
        console.log('-- Remover colunas problemáticas se existirem');
        console.log('ALTER TABLE public.surveys DROP COLUMN IF EXISTS questions;');
        console.log('ALTER TABLE public.surveys DROP COLUMN IF EXISTS question;');
        console.log('');
        console.log('-- Adicionar colunas necessárias se não existirem');
        console.log('ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS unique_link text UNIQUE;');
        console.log('ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS current_responses integer NOT NULL DEFAULT 0;');
        console.log('ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT \'active\';');
        console.log('```');
        console.log('\n🔗 Acesse: https://supabase.com/dashboard/project/mjuxvppexydaeuoernxa/sql');
        console.log('\n⚠️  IMPORTANTE: Após executar o SQL, reinicie a aplicação!');
      }
    } else {
      console.log('✅ Tabela surveys acessível!');
      console.log(`📊 Encontrados ${surveysData.length} registros na tabela`);
      
      if (surveysData.length > 0) {
        console.log('\n📋 Estrutura detectada (baseada no primeiro registro):');
        const columns = Object.keys(surveysData[0]);
        columns.forEach(col => {
          console.log(`- ${col}: ${typeof surveysData[0][col]}`);
        });
        
        // Verificar se há colunas problemáticas
        const problematicColumns = ['questions', 'question'];
        const foundProblematic = problematicColumns.filter(col => columns.includes(col));
        
        if (foundProblematic.length > 0) {
          console.log('\n⚠️  COLUNAS PROBLEMÁTICAS ENCONTRADAS:');
          foundProblematic.forEach(col => console.log(`- ${col}`));
          console.log('\n📋 Execute o seguinte SQL no painel do Supabase:');
          foundProblematic.forEach(col => {
            console.log(`ALTER TABLE public.surveys DROP COLUMN IF EXISTS ${col};`);
          });
        } else {
          console.log('\n✅ Nenhuma coluna problemática encontrada!');
        }
        
        // Verificar colunas necessárias
        const requiredColumns = ['unique_link', 'current_responses', 'status'];
        const missingColumns = requiredColumns.filter(col => !columns.includes(col));
        
        if (missingColumns.length > 0) {
          console.log('\n⚠️  COLUNAS NECESSÁRIAS AUSENTES:');
          missingColumns.forEach(col => console.log(`- ${col}`));
          console.log('\n📋 Execute o seguinte SQL no painel do Supabase:');
          missingColumns.forEach(col => {
            if (col === 'unique_link') {
              console.log(`ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS ${col} text UNIQUE;`);
            } else if (col === 'current_responses') {
              console.log(`ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS ${col} integer NOT NULL DEFAULT 0;`);
            } else if (col === 'status') {
              console.log(`ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS ${col} text NOT NULL DEFAULT 'active';`);
            }
          });
        } else {
          console.log('\n✅ Todas as colunas necessárias estão presentes!');
        }
      }
    }
    
    console.log('\n🎉 Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    
    if (error.message.includes('question')) {
      console.log('\n⚠️  PROBLEMA CONFIRMADO: Erro relacionado à coluna question!');
      console.log('\n📋 EXECUTE ESTE SQL NO PAINEL DO SUPABASE:');
      console.log('ALTER TABLE public.surveys DROP COLUMN IF EXISTS questions;');
      console.log('ALTER TABLE public.surveys DROP COLUMN IF EXISTS question;');
      console.log('\n🔗 Acesse: https://supabase.com/dashboard/project/mjuxvppexydaeuoernxa/sql');
    }
  }
}

executeFix();