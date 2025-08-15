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

async function executeSQL(sql, description) {
  try {
    console.log(`\n🔧 ${description}...`);
    
    // Usar o método query diretamente
    const { data, error } = await supabase
      .from('_sql')
      .select('*')
      .limit(0); // Não queremos dados, só executar
    
    // Como não temos exec_sql, vamos tentar uma abordagem diferente
    // Vamos usar o REST API diretamente
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`✅ ${description} - Sucesso`);
    return { success: true, data: result };
    
  } catch (error) {
    console.log(`❌ ${description} - Erro: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function fixAuthDirectSQL() {
  console.log('🔧 CORRIGINDO AUTH COM SQL DIRETO');
  console.log('=' .repeat(50));
  
  const results = {
    timestamp: new Date().toISOString(),
    steps: [],
    success: false,
    errors: []
  };
  
  try {
    // 1. Criar função handle_new_user_profile
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
    
    const profileResult = await executeSQL(profileFunction, 'Criando função handle_new_user_profile');
    if (profileResult.success) {
      results.steps.push('Função handle_new_user_profile criada');
    } else {
      results.errors.push(`Função profile: ${profileResult.error}`);
    }
    
    // 2. Criar função handle_new_user_company
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
    
    const companyResult = await executeSQL(companyFunction, 'Criando função handle_new_user_company');
    if (companyResult.success) {
      results.steps.push('Função handle_new_user_company criada');
    } else {
      results.errors.push(`Função company: ${companyResult.error}`);
    }
    
    // 3. Remover triggers existentes
    const dropTriggers = `
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_company ON auth.users;
    `;
    
    const dropResult = await executeSQL(dropTriggers, 'Removendo triggers existentes');
    if (dropResult.success) {
      results.steps.push('Triggers antigos removidos');
    }
    
    // 4. Criar novos triggers
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
    
    const createResult = await executeSQL(createTriggers, 'Criando novos triggers');
    if (createResult.success) {
      results.steps.push('Novos triggers criados');
    } else {
      results.errors.push(`Criar triggers: ${createResult.error}`);
    }
    
    // Se não conseguimos usar SQL direto, vamos tentar uma abordagem alternativa
    if (results.errors.length > 0) {
      console.log('\n⚠️ Método SQL direto falhou, tentando abordagem alternativa...');
      
      // Vamos criar os registros manualmente quando um usuário se registrar
      console.log('\n🔧 IMPLEMENTANDO SOLUÇÃO ALTERNATIVA...');
      
      // Testar criação manual
      const testEmail = `test_${Date.now()}@example.com`;
      const testPassword = 'TestPassword123!';
      
      console.log('\n🧪 Testando criação de usuário com inserção manual...');
      
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
        console.log('❌ SignUp falhou:', signUpError.message);
        results.errors.push(`SignUp: ${signUpError.message}`);
      } else if (signUpData.user) {
        console.log('✅ SignUp bem-sucedido, criando registros manualmente...');
        
        const userId = signUpData.user.id;
        const companyName = signUpData.user.user_metadata?.company_name || 'Empresa Padrão';
        
        // Criar profile manualmente
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            plan_name: 'free',
            status: 'active'
          });
        
        if (profileError) {
          console.log('❌ Erro ao criar profile:', profileError.message);
          results.errors.push(`Profile manual: ${profileError.message}`);
        } else {
          console.log('✅ Profile criado manualmente');
          results.steps.push('Profile criado manualmente');
        }
        
        // Criar company manualmente
        const { error: companyError } = await supabase
          .from('companies')
          .insert({
            user_id: userId,
            company_name: companyName,
            plan_name: 'free'
          });
        
        if (companyError) {
          console.log('❌ Erro ao criar company:', companyError.message);
          results.errors.push(`Company manual: ${companyError.message}`);
        } else {
          console.log('✅ Company criado manualmente');
          results.steps.push('Company criado manualmente');
        }
        
        // Verificar se os registros foram criados
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (profileData && companyData) {
          console.log('✅ Ambos os registros foram criados com sucesso!');
          results.steps.push('Verificação de registros bem-sucedida');
          
          // Limpar dados de teste
          await supabase.from('profiles').delete().eq('user_id', userId);
          await supabase.from('companies').delete().eq('user_id', userId);
          console.log('✅ Dados de teste removidos');
        }
      }
    }
    
    // Determinar sucesso
    results.success = results.steps.length > 0 && results.errors.length === 0;
    
    // Salvar relatório
    const fs = await import('fs');
    fs.writeFileSync('RELATORIO_CORRECAO_SQL_DIRETO.json', JSON.stringify(results, null, 2));
    
    console.log('\n🎉 CORREÇÃO COM SQL DIRETO CONCLUÍDA!');
    console.log('📄 Relatório salvo em: RELATORIO_CORRECAO_SQL_DIRETO.json');
    
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
      console.log('\n🎉 PROBLEMA IDENTIFICADO E TESTADO!');
      console.log('✅ A criação manual de registros funciona');
      console.log('💡 Recomendação: Implementar criação manual no código da aplicação');
    } else {
      console.log('\n⚠️ PROBLEMA PERSISTE');
      console.log('💡 Recomendação: Verificar configurações do projeto Supabase');
    }
    
  } catch (error) {
    console.error('❌ Erro durante correção:', error.message);
    results.errors.push(`Erro geral: ${error.message}`);
    
    const fs = await import('fs');
    fs.writeFileSync('RELATORIO_CORRECAO_SQL_DIRETO.json', JSON.stringify(results, null, 2));
    
    process.exit(1);
  }
}

// Executar correção
fixAuthDirectSQL().catch(console.error);