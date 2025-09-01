require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.log('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQL(sql) {
  try {
    // Usar REST API diretamente para executar SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // Tentar abordagem alternativa via SQL direto
      const altResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.pgrst.object+json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Prefer': 'return=minimal'
        },
        body: sql
      });
      
      if (!altResponse.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      return { success: true };
    }
    
    return { success: true, data: await response.json() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function fixRLSPolicies() {
  console.log('🔧 Corrigindo políticas RLS para tabela responses...');
  
  try {
    // 1. Remover políticas conflitantes
    console.log('📋 1. Removendo políticas conflitantes...');
    const dropPolicies = [
      'DROP POLICY IF EXISTS "allow_all_inserts" ON public.responses;',
      'DROP POLICY IF EXISTS "owners_select_responses" ON public.responses;',
      'DROP POLICY IF EXISTS "public_insert_responses" ON public.responses;',
      'DROP POLICY IF EXISTS "owners_view_survey_responses" ON public.responses;'
    ];
    
    for (const sql of dropPolicies) {
      const result = await executeSQL(sql);
      if (!result.success) {
        console.log(`⚠️ Aviso ao remover política: ${result.error}`);
      }
    }
    
    // 2. Habilitar RLS se não estiver habilitado
    console.log('📋 2. Habilitando RLS na tabela responses...');
    const enableRLS = 'ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;';
    const rlsResult = await executeSQL(enableRLS);
    if (!rlsResult.success) {
      console.log(`⚠️ RLS já pode estar habilitado: ${rlsResult.error}`);
    }
    
    // 3. Criar política de INSERT público
    console.log('📋 3. Criando política de INSERT público...');
    const insertPolicy = `
      CREATE POLICY "public_insert_responses" ON public.responses
      FOR INSERT TO anon, authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.surveys s 
          WHERE s.unique_link = responses.survey_unique_link 
          AND s.is_active = true 
          AND s.current_responses < s.max_responses
        )
      );
    `;
    
    const insertResult = await executeSQL(insertPolicy);
    if (!insertResult.success) {
      console.error('❌ Erro ao criar política de INSERT:', insertResult.error);
      return false;
    }
    console.log('✅ Política de INSERT criada');
    
    // 4. Criar política de SELECT para proprietários
    console.log('📋 4. Criando política de SELECT para proprietários...');
    const selectPolicy = `
      CREATE POLICY "owners_view_survey_responses" ON public.responses
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.surveys s 
          WHERE s.unique_link = responses.survey_unique_link 
          AND s.user_id = auth.uid()
        )
      );
    `;
    
    const selectResult = await executeSQL(selectPolicy);
    if (!selectResult.success) {
      console.error('❌ Erro ao criar política de SELECT:', selectResult.error);
      return false;
    }
    console.log('✅ Política de SELECT criada');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    return false;
  }
}

async function testRLS() {
  console.log('\n🧪 TESTANDO RLS...');
  
  // Criar cliente anônimo
  const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
  
  try {
    // Teste 1: SELECT anônimo de surveys
    console.log('📋 1. Testando SELECT anônimo de surveys...');
    const { data: surveys, error: surveyError } = await anonClient
      .from('surveys')
      .select('*')
      .eq('is_active', true)
      .limit(1);
    
    if (surveyError) {
      console.error('❌ Erro no SELECT de surveys:', surveyError.message);
      return false;
    }
    
    if (!surveys || surveys.length === 0) {
      console.log('⚠️ Nenhuma survey ativa encontrada para teste');
      return false;
    }
    
    console.log('✅ SELECT anônimo de surveys funcionando');
    
    // Teste 2: INSERT anônimo em responses
    console.log('📋 2. Testando INSERT anônimo em responses...');
    const testResponse = {
      survey_unique_link: surveys[0].unique_link,
      response_data: { test: 'RLS test response' },
      sentiment_score: 0.5
    };
    
    const { error: insertError } = await anonClient
      .from('responses')
      .insert(testResponse);
    
    if (insertError) {
      console.error('❌ Erro no INSERT de responses:', insertError.message);
      return false;
    }
    
    console.log('✅ INSERT anônimo em responses funcionando');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando correção RLS direta via REST API...');
  
  const fixSuccess = await fixRLSPolicies();
  if (!fixSuccess) {
    console.error('❌ Falha na correção das políticas RLS');
    process.exit(1);
  }
  
  console.log('\n✅ Políticas RLS corrigidas com sucesso!');
  
  const testSuccess = await testRLS();
  if (!testSuccess) {
    console.error('❌ Falha nos testes RLS');
    process.exit(1);
  }
  
  console.log('\n🎉 Correção RLS concluída com sucesso!');
  console.log('✅ Usuários anônimos podem inserir respostas');
  console.log('✅ Proprietários podem visualizar respostas de suas pesquisas');
}

main().catch(console.error);