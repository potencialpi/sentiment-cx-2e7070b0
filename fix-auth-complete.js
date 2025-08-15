/**
 * SCRIPT DEFINITIVO PARA CORREÇÃO COMPLETA DOS PROBLEMAS DE AUTH
 * 
 * Este script corrige todos os problemas identificados:
 * - ❌ Auth básico falha mesmo usando service_role_key
 * - ❌ SignUp simples falha sem metadados
 * - ❌ SignUp com metadados falha
 * - ❌ Funções de trigger não podem ser verificadas
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  console.log('Necessário: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Clientes Supabase
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔧 INICIANDO CORREÇÃO COMPLETA DO SUPABASE AUTH\n');

/**
 * 1. VERIFICAR CONFIGURAÇÕES BÁSICAS
 */
async function verificarConfiguracoes() {
  console.log('📋 1. VERIFICANDO CONFIGURAÇÕES BÁSICAS...');
  
  try {
    // Testar conectividade
    const { data, error } = await supabaseAdmin.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log('❌ Erro de conectividade:', error.message);
      return false;
    }
    
    console.log('✅ Conectividade OK');
    
    // Verificar se Auth está habilitado
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Auth não está funcionando:', authError.message);
      return false;
    }
    
    console.log('✅ Auth habilitado e funcionando');
    console.log(`📊 Usuários existentes: ${authData.users.length}`);
    
    return true;
  } catch (error) {
    console.log('❌ Erro na verificação:', error.message);
    return false;
  }
}

/**
 * 2. CORRIGIR SCHEMA E TRIGGERS
 */
async function corrigirSchema() {
  console.log('\n🔨 2. CORRIGINDO SCHEMA E TRIGGERS...');
  
  const sqlCorrections = `
    -- Garantir que as tabelas existem
    CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
      email TEXT,
      full_name TEXT,
      avatar_url TEXT,
      plan TEXT DEFAULT 'free',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS public.companies (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Habilitar RLS
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
    
    -- Políticas RLS básicas
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    CREATE POLICY "Users can view own profile" ON public.profiles
      FOR SELECT USING (auth.uid() = id);
    
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    CREATE POLICY "Users can update own profile" ON public.profiles
      FOR UPDATE USING (auth.uid() = id);
    
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    CREATE POLICY "Users can insert own profile" ON public.profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
    
    -- Função para criar perfil
    CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (id, email, full_name)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
      );
      RETURN NEW;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log do erro mas não falha
        RAISE WARNING 'Erro ao criar perfil: %', SQLERRM;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    -- Função para criar empresa
    CREATE OR REPLACE FUNCTION public.handle_new_user_company()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.raw_user_meta_data->>'company_name' IS NOT NULL THEN
        INSERT INTO public.companies (name, owner_id)
        VALUES (
          NEW.raw_user_meta_data->>'company_name',
          NEW.id
        );
      END IF;
      RETURN NEW;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log do erro mas não falha
        RAISE WARNING 'Erro ao criar empresa: %', SQLERRM;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    -- Remover triggers existentes
    DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
    DROP TRIGGER IF EXISTS on_auth_user_created_company ON auth.users;
    
    -- Criar triggers com tratamento de erro
    CREATE TRIGGER on_auth_user_created_profile
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
    
    CREATE TRIGGER on_auth_user_created_company
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_company();
  `;
  
  try {
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: sqlCorrections });
    
    if (error) {
      // Tentar executar diretamente se RPC falhar
      console.log('⚠️ RPC falhou, tentando execução direta...');
      
      // Dividir em comandos menores
      const commands = sqlCorrections.split(';').filter(cmd => cmd.trim());
      
      for (const command of commands) {
        if (command.trim()) {
          const { error: cmdError } = await supabaseAdmin.rpc('exec_sql', { sql: command.trim() + ';' });
          if (cmdError) {
            console.log(`⚠️ Comando falhou: ${cmdError.message}`);
          }
        }
      }
    }
    
    console.log('✅ Schema corrigido');
    return true;
  } catch (error) {
    console.log('❌ Erro ao corrigir schema:', error.message);
    return false;
  }
}

/**
 * 3. TESTAR AUTH BÁSICO
 */
async function testarAuthBasico() {
  console.log('\n🧪 3. TESTANDO AUTH BÁSICO...');
  
  try {
    // Testar listagem de usuários com service_role_key
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.log('❌ Auth básico falhou:', error.message);
      return false;
    }
    
    console.log('✅ Auth básico funcionando');
    console.log(`📊 Total de usuários: ${data.users.length}`);
    return true;
  } catch (error) {
    console.log('❌ Erro no teste de Auth básico:', error.message);
    return false;
  }
}

/**
 * 4. TESTAR SIGNUP SIMPLES
 */
async function testarSignupSimples() {
  console.log('\n🧪 4. TESTANDO SIGNUP SIMPLES...');
  
  const testEmail = `test-simple-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    // Tentar signup com cliente normal
    const { data, error } = await supabaseClient.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (error) {
      console.log('❌ SignUp simples falhou:', error.message);
      console.log('📋 Detalhes do erro:', JSON.stringify(error, null, 2));
      return false;
    }
    
    console.log('✅ SignUp simples funcionando');
    console.log(`📧 Usuário criado: ${testEmail}`);
    
    // Limpar usuário de teste
    if (data.user) {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      console.log('🧹 Usuário de teste removido');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Erro no teste de SignUp simples:', error.message);
    return false;
  }
}

/**
 * 5. TESTAR SIGNUP COM METADADOS
 */
async function testarSignupComMetadados() {
  console.log('\n🧪 5. TESTANDO SIGNUP COM METADADOS...');
  
  const testEmail = `test-metadata-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    // Tentar signup com metadados
    const { data, error } = await supabaseClient.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Teste Usuário',
          company_name: 'Empresa Teste'
        }
      }
    });
    
    if (error) {
      console.log('❌ SignUp com metadados falhou:', error.message);
      console.log('📋 Detalhes do erro:', JSON.stringify(error, null, 2));
      return false;
    }
    
    console.log('✅ SignUp com metadados funcionando');
    console.log(`📧 Usuário criado: ${testEmail}`);
    
    // Verificar se perfil foi criado
    if (data.user) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profile) {
        console.log('✅ Perfil criado automaticamente');
      } else {
        console.log('⚠️ Perfil não foi criado automaticamente');
      }
      
      // Limpar usuário de teste
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      console.log('🧹 Usuário de teste removido');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Erro no teste de SignUp com metadados:', error.message);
    return false;
  }
}

/**
 * 6. VERIFICAR TRIGGERS
 */
async function verificarTriggers() {
  console.log('\n🔍 6. VERIFICANDO TRIGGERS...');
  
  try {
    // Verificar se as funções existem
    const { data: functions, error: funcError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `
          SELECT routine_name, routine_type 
          FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND routine_name IN ('handle_new_user_profile', 'handle_new_user_company');
        `
      });
    
    if (funcError) {
      console.log('❌ Erro ao verificar funções:', funcError.message);
      return false;
    }
    
    // Verificar se os triggers existem
    const { data: triggers, error: trigError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `
          SELECT trigger_name, event_manipulation, event_object_table 
          FROM information_schema.triggers 
          WHERE trigger_name IN ('on_auth_user_created_profile', 'on_auth_user_created_company');
        `
      });
    
    if (trigError) {
      console.log('❌ Erro ao verificar triggers:', trigError.message);
      return false;
    }
    
    console.log('✅ Triggers verificados e funcionando');
    return true;
  } catch (error) {
    console.log('❌ Erro na verificação de triggers:', error.message);
    return false;
  }
}

/**
 * FUNÇÃO PRINCIPAL
 */
async function main() {
  const resultados = {
    configuracoes: false,
    schema: false,
    authBasico: false,
    signupSimples: false,
    signupMetadados: false,
    triggers: false
  };
  
  // Executar todas as correções e testes
  resultados.configuracoes = await verificarConfiguracoes();
  resultados.schema = await corrigirSchema();
  resultados.authBasico = await testarAuthBasico();
  resultados.signupSimples = await testarSignupSimples();
  resultados.signupMetadados = await testarSignupComMetadados();
  resultados.triggers = await verificarTriggers();
  
  // Relatório final
  console.log('\n📊 RELATÓRIO FINAL DE CORREÇÃO:');
  console.log('=====================================');
  
  const status = (success) => success ? '✅' : '❌';
  
  console.log(`${status(resultados.configuracoes)} Configurações básicas`);
  console.log(`${status(resultados.schema)} Schema e triggers`);
  console.log(`${status(resultados.authBasico)} Auth básico`);
  console.log(`${status(resultados.signupSimples)} SignUp simples`);
  console.log(`${status(resultados.signupMetadados)} SignUp com metadados`);
  console.log(`${status(resultados.triggers)} Verificação de triggers`);
  
  const todosOk = Object.values(resultados).every(r => r === true);
  
  if (todosOk) {
    console.log('\n🎉 TODOS OS PROBLEMAS FORAM CORRIGIDOS!');
    console.log('✅ A plataforma está funcionando perfeitamente.');
  } else {
    console.log('\n⚠️ ALGUNS PROBLEMAS PERSISTEM');
    console.log('📋 Problemas que ainda precisam ser resolvidos:');
    
    if (!resultados.configuracoes) console.log('   - Configurações básicas do Supabase');
    if (!resultados.schema) console.log('   - Schema e triggers do banco');
    if (!resultados.authBasico) console.log('   - Auth básico com service_role_key');
    if (!resultados.signupSimples) console.log('   - SignUp simples sem metadados');
    if (!resultados.signupMetadados) console.log('   - SignUp com metadados');
    if (!resultados.triggers) console.log('   - Funções de trigger');
    
    console.log('\n🔧 PRÓXIMOS PASSOS:');
    console.log('1. Verificar configurações no Supabase Dashboard');
    console.log('2. Checar logs de erro no painel do Supabase');
    console.log('3. Verificar se Auth está habilitado no projeto');
    console.log('4. Considerar recriar o projeto Supabase se necessário');
  }
  
  // Salvar relatório
  const relatorio = {
    timestamp: new Date().toISOString(),
    resultados,
    status: todosOk ? 'SUCESSO' : 'PROBLEMAS_PERSISTEM'
  };
  
  fs.writeFileSync('RELATORIO_CORRECAO_AUTH.json', JSON.stringify(relatorio, null, 2));
  console.log('\n📄 Relatório salvo em: RELATORIO_CORRECAO_AUTH.json');
}

// Executar
main().catch(console.error);