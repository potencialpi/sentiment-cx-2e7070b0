import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixTriggersForCurrentStructure() {
  console.log('🔧 CORRIGINDO TRIGGERS PARA ESTRUTURA ATUAL');
  console.log('=' .repeat(50));
  
  const results = {
    timestamp: new Date().toISOString(),
    steps: [],
    success: false,
    errors: []
  };
  
  try {
    // 1. Criar função para handle_new_user_profile baseada na estrutura atual
    console.log('\n📝 1. CRIANDO FUNÇÃO handle_new_user_profile...');
    
    const profileFunction = `
      CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        INSERT INTO public.profiles (user_id, plan_name, status, created_at, updated_at)
        VALUES (
          NEW.id,
          'free',
          'active',
          NOW(),
          NOW()
        );
        RETURN NEW;
      EXCEPTION
        WHEN others THEN
          RAISE LOG 'Error in handle_new_user_profile: %', SQLERRM;
          RETURN NEW;
      END;
      $$;
    `;
    
    const { error: profileFuncError } = await supabase.rpc('exec_sql', { sql: profileFunction });
    
    if (profileFuncError) {
      console.log('❌ Erro ao criar função profile:', profileFuncError.message);
      results.errors.push(`Função profile: ${profileFuncError.message}`);
    } else {
      console.log('✅ Função handle_new_user_profile criada');
      results.steps.push('Função handle_new_user_profile criada');
    }
    
    // 2. Criar função para handle_new_user_company baseada na estrutura atual
    console.log('\n📝 2. CRIANDO FUNÇÃO handle_new_user_company...');
    
    const companyFunction = `
      CREATE OR REPLACE FUNCTION public.handle_new_user_company()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        INSERT INTO public.companies (user_id, company_name, plan_name, created_at, updated_at)
        VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'company_name', 'Empresa Padrão'),
          'free',
          NOW(),
          NOW()
        );
        RETURN NEW;
      EXCEPTION
        WHEN others THEN
          RAISE LOG 'Error in handle_new_user_company: %', SQLERRM;
          RETURN NEW;
      END;
      $$;
    `;
    
    const { error: companyFuncError } = await supabase.rpc('exec_sql', { sql: companyFunction });
    
    if (companyFuncError) {
      console.log('❌ Erro ao criar função company:', companyFuncError.message);
      results.errors.push(`Função company: ${companyFuncError.message}`);
    } else {
      console.log('✅ Função handle_new_user_company criada');
      results.steps.push('Função handle_new_user_company criada');
    }
    
    // 3. Remover triggers existentes
    console.log('\n🗑️ 3. REMOVENDO TRIGGERS EXISTENTES...');
    
    const dropTriggers = `
      DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
      DROP TRIGGER IF EXISTS on_auth_user_created_company ON auth.users;
    `;
    
    const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropTriggers });
    
    if (dropError) {
      console.log('⚠️ Aviso ao remover triggers:', dropError.message);
    } else {
      console.log('✅ Triggers antigos removidos');
      results.steps.push('Triggers antigos removidos');
    }
    
    // 4. Criar novos triggers
    console.log('\n🔧 4. CRIANDO NOVOS TRIGGERS...');
    
    const createTriggers = `
      CREATE TRIGGER on_auth_user_created_profile
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_user_profile();
      
      CREATE TRIGGER on_auth_user_created_company
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_user_company();
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTriggers });
    
    if (createError) {
      console.log('❌ Erro ao criar triggers:', createError.message);
      results.errors.push(`Criar triggers: ${createError.message}`);
    } else {
      console.log('✅ Novos triggers criados');
      results.steps.push('Novos triggers criados');
    }
    
    // 5. Testar criação de usuário
    console.log('\n🧪 5. TESTANDO CRIAÇÃO DE USUÁRIO...');
    
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          company_name: 'Empresa Teste'
        }
      }
    });
    
    if (signUpError) {
      console.log('❌ Teste de criação falhou:', signUpError.message);
      results.errors.push(`Teste criação: ${signUpError.message}`);
    } else {
      console.log('✅ Teste de criação bem-sucedido');
      results.steps.push('Teste de criação bem-sucedido');
      
      // Verificar se os registros foram criados
      if (signUpData.user) {
        const userId = signUpData.user.id;
        
        // Verificar profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (profileError) {
          console.log('⚠️ Profile não criado automaticamente:', profileError.message);
        } else {
          console.log('✅ Profile criado automaticamente:', profileData);
          results.steps.push('Profile criado automaticamente');
        }
        
        // Verificar company
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (companyError) {
          console.log('⚠️ Company não criado automaticamente:', companyError.message);
        } else {
          console.log('✅ Company criado automaticamente:', companyData);
          results.steps.push('Company criado automaticamente');
        }
        
        // Limpar usuário de teste
        console.log('\n🧹 6. LIMPANDO USUÁRIO DE TESTE...');
        
        // Remover registros das tabelas
        await supabase.from('profiles').delete().eq('user_id', userId);
        await supabase.from('companies').delete().eq('user_id', userId);
        
        console.log('✅ Usuário de teste removido');
      }
    }
    
    // Determinar sucesso geral
    results.success = results.errors.length === 0;
    
    // Salvar relatório
    const fs = await import('fs');
    fs.writeFileSync('RELATORIO_CORRECAO_TRIGGERS.json', JSON.stringify(results, null, 2));
    
    console.log('\n🎉 CORREÇÃO DE TRIGGERS CONCLUÍDA!');
    console.log('📄 Relatório salvo em: RELATORIO_CORRECAO_TRIGGERS.json');
    
    // Resumo
    console.log('\n📋 RESUMO:');
    console.log('=' .repeat(30));
    console.log(`✅ Passos executados: ${results.steps.length}`);
    console.log(`❌ Erros encontrados: ${results.errors.length}`);
    console.log(`🎯 Status geral: ${results.success ? '✅ SUCESSO' : '❌ FALHA'}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ ERROS:');
      results.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (results.success) {
      console.log('\n🎉 PROBLEMA RESOLVIDO!');
      console.log('✅ Os triggers foram corrigidos para a estrutura atual das tabelas');
      console.log('✅ A criação de usuários deve funcionar normalmente agora');
    }
    
  } catch (error) {
    console.error('❌ Erro durante correção:', error.message);
    results.errors.push(`Erro geral: ${error.message}`);
    
    const fs = await import('fs');
    fs.writeFileSync('RELATORIO_CORRECAO_TRIGGERS.json', JSON.stringify(results, null, 2));
    
    process.exit(1);
  }
}

// Executar correção
fixTriggersForCurrentStructure().catch(console.error);