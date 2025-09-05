const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente necessárias não encontradas');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Definida' : '❌ Não definida');
  console.log('VITE_SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Definida' : '❌ Não definida');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyCriticalSecurityFix() {
  console.log('🔒 Aplicando correção crítica de segurança...');
  
  const securityCommands = [
    // 1. REVOGAR TODOS OS PRIVILÉGIOS ANÔNIMOS
    'REVOKE ALL PRIVILEGES ON TABLE public.surveys FROM anon;',
    'REVOKE SELECT ON TABLE public.surveys FROM anon;',
    'REVOKE INSERT ON TABLE public.surveys FROM anon;',
    'REVOKE UPDATE ON TABLE public.surveys FROM anon;',
    'REVOKE DELETE ON TABLE public.surveys FROM anon;',
    
    // 2. GARANTIR QUE RLS ESTÁ HABILITADO
    'ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;',
    
    // 3. REMOVER POLÍTICAS EXISTENTES QUE PODEM PERMITIR ACESSO ANÔNIMO
    'DROP POLICY IF EXISTS "Users can view own surveys" ON public.surveys;',
    'DROP POLICY IF EXISTS "Enable read access for all users" ON public.surveys;',
    'DROP POLICY IF EXISTS "Authenticated users can view own surveys" ON public.surveys;',
    'DROP POLICY IF EXISTS "auth_users_select_own_surveys" ON public.surveys;',
    'DROP POLICY IF EXISTS "authenticated_users_select_own_surveys" ON public.surveys;',
    'DROP POLICY IF EXISTS "public_access_for_responses_only" ON public.surveys;',
    
    // 4. CRIAR POLÍTICA RESTRITIVA APENAS PARA USUÁRIOS AUTENTICADOS
    `CREATE POLICY "secure_select_own_surveys" ON public.surveys
        FOR SELECT TO authenticated
        USING (auth.uid() = user_id);`,
    
    `CREATE POLICY "secure_insert_surveys" ON public.surveys
        FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = user_id);`,
    
    `CREATE POLICY "secure_update_own_surveys" ON public.surveys
        FOR UPDATE TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);`,
    
    `CREATE POLICY "secure_delete_own_surveys" ON public.surveys
        FOR DELETE TO authenticated
        USING (auth.uid() = user_id);`
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const [index, command] of securityCommands.entries()) {
    try {
      console.log(`\n📝 Executando comando ${index + 1}/${securityCommands.length}:`);
      console.log(command.substring(0, 80) + (command.length > 80 ? '...' : ''));
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: command });
      
      if (error) {
        console.log(`⚠️  Erro (pode ser esperado): ${error.message}`);
        errorCount++;
      } else {
        console.log('✅ Sucesso');
        successCount++;
      }
    } catch (err) {
      console.log(`⚠️  Erro de execução: ${err.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Resumo da aplicação:`);
  console.log(`✅ Sucessos: ${successCount}`);
  console.log(`⚠️  Erros: ${errorCount}`);
  
  // 5. VERIFICAR CONFIGURAÇÃO FINAL
  console.log('\n🔍 Verificando configuração final...');
  
  try {
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
      sql_query: `SELECT 
        schemaname,
        tablename,
        rowsecurity as rls_enabled,
        CASE 
            WHEN rowsecurity THEN '✅ RLS Habilitado'
            ELSE '❌ RLS Desabilitado'
        END as status
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'surveys';`
    });
    
    if (rlsError) {
      console.log('⚠️  Erro ao verificar RLS:', rlsError.message);
    } else {
      console.log('📋 Status RLS:', rlsStatus);
    }
  } catch (err) {
    console.log('⚠️  Erro ao verificar RLS:', err.message);
  }
  
  // 6. LISTAR POLÍTICAS ATIVAS
  try {
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql_query: `SELECT 
        policyname,
        roles,
        cmd,
        permissive
      FROM pg_policies 
      WHERE schemaname = 'public'
      AND tablename = 'surveys'
      ORDER BY policyname;`
    });
    
    if (policiesError) {
      console.log('⚠️  Erro ao listar políticas:', policiesError.message);
    } else {
      console.log('\n📋 Políticas ativas na tabela surveys:');
      console.log(policies);
    }
  } catch (err) {
    console.log('⚠️  Erro ao listar políticas:', err.message);
  }
  
  console.log('\n🔒 Correção crítica de segurança aplicada!');
  console.log('⚠️  IMPORTANTE: O acesso anônimo à tabela surveys foi completamente removido.');
  console.log('📝 Apenas usuários autenticados podem acessar suas próprias pesquisas.');
}

applyCriticalSecurityFix().catch(console.error);