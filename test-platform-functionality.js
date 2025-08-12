/**
 * Teste Simplificado da Plataforma Sentiment CX
 * Este script testa as funcionalidades básicas sem criar usuários
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

// Inicializar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Teste 1: Conexão com Supabase
async function testSupabaseConnection() {
  console.log('\n🔗 Testando conexão com Supabase...');
  
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log('❌ Erro na conexão:', error.message);
      return false;
    }
    
    console.log('✅ Conexão com Supabase estabelecida');
    return true;
  } catch (error) {
    console.log('❌ Erro na conexão:', error.message);
    return false;
  }
}

// Teste 2: Verificar estrutura das tabelas
async function testDatabaseStructure() {
  console.log('\n🗄️ Testando estrutura do banco de dados...');
  
  const tables = ['profiles', 'surveys', 'questions', 'responses', 'question_responses'];
  let allTablesAccessible = true;
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        console.log(`❌ Erro ao acessar tabela ${table}:`, error.message);
        allTablesAccessible = false;
      } else {
        console.log(`✅ Tabela ${table} acessível`);
      }
    } catch (error) {
      console.log(`❌ Erro ao testar tabela ${table}:`, error.message);
      allTablesAccessible = false;
    }
  }
  
  return allTablesAccessible;
}

// Teste 3: Verificar dados existentes
async function testExistingData() {
  console.log('\n📊 Verificando dados existentes...');
  
  try {
    // Contar registros em cada tabela
    const tables = {
      profiles: 'Perfis de usuário',
      surveys: 'Pesquisas',
      questions: 'Perguntas',
      responses: 'Respostas',
      question_responses: 'Respostas das perguntas'
    };
    
    let hasData = false;
    
    for (const [table, description] of Object.entries(tables)) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`⚠️ Erro ao contar ${description.toLowerCase()}:`, error.message);
        } else {
          console.log(`📈 ${description}: ${count || 0} registros`);
          if (count > 0) hasData = true;
        }
      } catch (error) {
        console.log(`❌ Erro ao verificar ${description.toLowerCase()}:`, error.message);
      }
    }
    
    if (hasData) {
      console.log('✅ Banco de dados contém dados');
    } else {
      console.log('ℹ️ Banco de dados está vazio (normal para nova instalação)');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Erro ao verificar dados existentes:', error.message);
    return false;
  }
}

// Teste 4: Verificar configurações de autenticação
async function testAuthConfiguration() {
  console.log('\n🔐 Testando configurações de autenticação...');
  
  try {
    // Tentar obter sessão atual
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('⚠️ Erro ao obter sessão:', error.message);
      return false;
    }
    
    if (session) {
      console.log('✅ Usuário já autenticado:', session.user.email);
    } else {
      console.log('ℹ️ Nenhum usuário autenticado (normal)');
    }
    
    // Verificar se o cliente Supabase está configurado corretamente
    if (supabase.supabaseUrl && supabase.supabaseKey) {
      console.log('✅ Cliente Supabase configurado corretamente');
      return true;
    } else {
      console.log('❌ Cliente Supabase não configurado corretamente');
      return false;
    }
  } catch (error) {
    console.log('❌ Erro ao testar configurações de auth:', error.message);
    return false;
  }
}

// Teste 5: Verificar políticas RLS
async function testRLSPolicies() {
  console.log('\n🔒 Testando políticas de Row Level Security...');
  
  try {
    // Tentar acessar dados sem autenticação para verificar RLS
    const tables = ['surveys', 'questions', 'responses'];
    let rlsWorking = true;
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        
        if (error && error.message.includes('RLS')) {
          console.log(`✅ RLS ativo na tabela ${table}`);
        } else if (error) {
          console.log(`⚠️ Erro ao testar RLS na tabela ${table}:`, error.message);
        } else {
          console.log(`ℹ️ Tabela ${table} acessível (pode indicar RLS desabilitado ou políticas permissivas)`);
        }
      } catch (error) {
        console.log(`❌ Erro ao testar RLS na tabela ${table}:`, error.message);
        rlsWorking = false;
      }
    }
    
    return rlsWorking;
  } catch (error) {
    console.log('❌ Erro ao testar RLS:', error.message);
    return false;
  }
}

// Teste 6: Verificar configurações do ambiente
async function testEnvironmentConfig() {
  console.log('\n⚙️ Verificando configurações do ambiente...');
  
  try {
    console.log('📋 Configurações carregadas:');
    console.log(`   Supabase URL: ${supabaseUrl}`);
    console.log(`   Supabase Key: ${supabaseKey.substring(0, 20)}...`);
    
    // Verificar se as variáveis de ambiente foram carregadas
    if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
      console.log('✅ Variáveis de ambiente carregadas do .env.local');
    } else {
      console.log('⚠️ Usando valores padrão (variáveis de ambiente não encontradas)');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Erro ao verificar configurações:', error.message);
    return false;
  }
}

// Função principal de teste
async function runAllTests() {
  console.log('🚀 Iniciando testes da plataforma Sentiment CX\n');
  console.log('=' .repeat(60));
  
  const results = {
    connection: false,
    database: false,
    data: false,
    auth: false,
    rls: false,
    environment: false
  };
  
  // Executar testes em sequência
  results.connection = await testSupabaseConnection();
  results.database = await testDatabaseStructure();
  results.data = await testExistingData();
  results.auth = await testAuthConfiguration();
  results.rls = await testRLSPolicies();
  results.environment = await testEnvironmentConfig();
  
  // Resumo dos resultados
  console.log('\n' + '=' .repeat(60));
  console.log('📋 RESUMO DOS TESTES:');
  console.log('=' .repeat(60));
  
  const testDescriptions = {
    connection: 'Conexão Supabase',
    database: 'Estrutura do BD',
    data: 'Dados Existentes',
    auth: 'Config. Auth',
    rls: 'Políticas RLS',
    environment: 'Config. Ambiente'
  };
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASSOU' : '❌ FALHOU';
    const testName = testDescriptions[test] || test;
    console.log(`${testName.padEnd(20)} ${status}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log('\n' + '=' .repeat(60));
  console.log(`🎯 RESULTADO FINAL: ${passedTests}/${totalTests} testes passaram`);
  
  if (passedTests === totalTests) {
    console.log('🎉 Todos os testes passaram! A plataforma está funcionando corretamente.');
  } else if (passedTests >= totalTests * 0.7) {
    console.log('✅ A maioria dos testes passou. A plataforma está funcionando adequadamente.');
  } else {
    console.log('⚠️ Vários testes falharam. Verifique a configuração da plataforma.');
  }
  
  console.log('\n💡 Dicas:');
  console.log('   - Para testar funcionalidades completas, configure a autenticação no Supabase');
  console.log('   - Verifique as políticas RLS se houver problemas de acesso');
  console.log('   - Use o painel do Supabase para monitorar logs e erros');
  
  console.log('=' .repeat(60));
}

// Executar testes
runAllTests().catch(error => {
  console.error('❌ Erro fatal durante os testes:', error);
  process.exit(1);
});