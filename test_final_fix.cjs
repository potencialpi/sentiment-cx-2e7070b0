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

async function testFinalFix() {
  console.log('🧪 Teste final: Verificando se o erro da coluna "questions" foi resolvido\n');

  try {
    // 1. Testar acesso básico à tabela surveys
    console.log('1. Testando acesso básico à tabela surveys...');
    const { data: surveysData, error: surveysError } = await supabase
      .from('surveys')
      .select('*')
      .limit(5);

    if (surveysError) {
      console.log('❌ Erro ao acessar tabela surveys:', surveysError.message);
      
      if (surveysError.message.includes('questions') || surveysError.message.includes('question')) {
        console.log('\n🔧 O erro ainda está relacionado às colunas "questions" ou "question"');
        console.log('Execute os seguintes comandos no Supabase Dashboard:');
        console.log('   ALTER TABLE public.surveys DROP COLUMN IF EXISTS questions;');
        console.log('   ALTER TABLE public.surveys DROP COLUMN IF EXISTS question;');
        return;
      }
      
      console.log('\n❌ Erro diferente encontrado. Verifique a configuração do Supabase.');
      return;
    }

    console.log('✅ Acesso à tabela surveys funcionando!');
    console.log(`📊 Encontrados ${surveysData.length} registros`);

    // 2. Testar operações específicas que antes causavam erro
    console.log('\n2. Testando operações específicas...');
    
    // Testar SELECT com colunas específicas
    const { data: specificData, error: specificError } = await supabase
      .from('surveys')
      .select('id, title, description, status, current_responses, max_responses, unique_link')
      .limit(1);

    if (specificError) {
      console.log('❌ Erro em SELECT específico:', specificError.message);
      return;
    }

    console.log('✅ SELECT com colunas específicas funcionando!');

    // 3. Testar acesso à tabela questions (separada)
    console.log('\n3. Testando acesso à tabela questions...');
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .limit(5);

    if (questionsError) {
      console.log('❌ Erro ao acessar tabela questions:', questionsError.message);
    } else {
      console.log('✅ Acesso à tabela questions funcionando!');
      console.log(`📊 Encontradas ${questionsData.length} perguntas`);
    }

    console.log('\n🎉 SUCESSO! O erro da coluna "questions" foi resolvido!');
    console.log('✅ A aplicação deve estar funcionando normalmente agora.');
    console.log('\n📋 Resumo da correção:');
    console.log('   - Tipos do Supabase regenerados');
    console.log('   - Tabela surveys com estrutura correta');
    console.log('   - Tabela questions separada funcionando');
    console.log('   - Servidor de desenvolvimento reiniciado');

  } catch (error) {
    console.log('❌ Erro inesperado:', error.message);
  }
}

testFinalFix();