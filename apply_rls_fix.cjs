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

async function applyRLSFix() {
  console.log('🔧 Aplicando correções RLS via API...');
  
  try {
    // Executar as políticas RLS via SQL
    const sqlCommands = [
      // Habilitar RLS nas tabelas necessárias
      'ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;',
      
      // Política para permitir que qualquer pessoa veja pesquisas ativas com unique_link
      'DROP POLICY IF EXISTS "Anyone can view active surveys with unique_link" ON public.surveys;',
      `CREATE POLICY "Anyone can view active surveys with unique_link" ON public.surveys
        FOR SELECT USING (
          status = 'active' AND unique_link IS NOT NULL
        );`,
      
      // Política para permitir que qualquer pessoa veja perguntas de pesquisas ativas
      'DROP POLICY IF EXISTS "Anyone can view questions from active surveys" ON public.questions;',
      `CREATE POLICY "Anyone can view questions from active surveys" ON public.questions
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = questions.survey_id 
            AND surveys.status = 'active' 
            AND surveys.unique_link IS NOT NULL
          )
        );`,
      
      // Política para permitir que qualquer pessoa insira respostas
      'DROP POLICY IF EXISTS "Anyone can insert responses" ON public.responses;',
      'CREATE POLICY "Anyone can insert responses" ON public.responses FOR INSERT WITH CHECK (true);'
    ];
    
    console.log('📝 Executando comandos SQL...');
    
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      console.log(`   ${i + 1}/${sqlCommands.length}: ${command.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: command });
      
      if (error) {
        console.log(`   ❌ Erro: ${error.message}`);
        // Continuar com os próximos comandos mesmo se houver erro
      } else {
        console.log('   ✅ Sucesso');
      }
    }
    
    console.log('\n🧪 Testando as correções...');
    
    // Testar se conseguimos inserir uma resposta
    const testResponse = {
      survey_id: '4a706rzwahlgx72i1cmpf', // ID da pesquisa de teste
      respondent_id: 'test-respondent-' + Date.now(),
      responses: { '1': 'Resposta de teste' },
      sentiment_score: 5,
      sentiment_category: 'neutral'
    };
    
    const { data, error } = await supabase
      .from('responses')
      .insert(testResponse)
      .select();
    
    if (error) {
      console.log('❌ Ainda há problemas com RLS:', error.message);
      console.log('\n📋 Instruções manuais:');
      console.log('1. Acesse o Supabase Dashboard: https://supabase.com/dashboard/project/mjuxvppexydaeuoernxa');
      console.log('2. Vá para SQL Editor');
      console.log('3. Execute o conteúdo do arquivo fix_survey_response_rls.sql');
    } else {
      console.log('✅ Correções RLS aplicadas com sucesso!');
      console.log('✅ Resposta de teste inserida:', data[0]?.id);
      
      // Limpar a resposta de teste
      await supabase.from('responses').delete().eq('id', data[0]?.id);
      console.log('🧹 Resposta de teste removida');
    }
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
    console.log('\n📋 Instruções manuais:');
    console.log('1. Acesse o Supabase Dashboard: https://supabase.com/dashboard/project/mjuxvppexydaeuoernxa');
    console.log('2. Vá para SQL Editor');
    console.log('3. Execute o conteúdo do arquivo fix_survey_response_rls.sql');
  }
}

applyRLSFix();