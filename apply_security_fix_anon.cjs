const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente necessárias não encontradas');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Definida' : '❌ Não definida');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Definida' : '❌ Não definida');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCurrentSurveysAccess() {
  console.log('🔍 Testando acesso atual à tabela surveys...');
  
  try {
    // Tentar acessar surveys como usuário anônimo
    const { data, error } = await supabase
      .from('surveys')
      .select('id, title, status')
      .limit(1);
    
    if (error) {
      if (error.message.includes('permission denied')) {
        console.log('✅ SEGURANÇA OK: Acesso anônimo à tabela surveys está bloqueado');
        console.log('📝 Erro esperado:', error.message);
        return true; // Isso é o que queremos - acesso negado
      } else {
        console.log('⚠️  Erro inesperado:', error.message);
        return false;
      }
    } else {
      console.log('❌ PROBLEMA DE SEGURANÇA: Acesso anônimo à tabela surveys está permitido!');
      console.log('📊 Dados retornados:', data);
      return false;
    }
  } catch (err) {
    console.log('⚠️  Erro de conexão:', err.message);
    return false;
  }
}

async function testMagicLinkFunction() {
  console.log('\n🔗 Testando Edge Function magic-link...');
  
  try {
    const { data, error } = await supabase.functions.invoke('magic-link', {
      body: {
        email: 'test@example.com',
        survey_id: 'test-survey-id'
      }
    });
    
    if (error) {
      console.log('⚠️  Erro na Edge Function:', error.message);
      
      // Verificar se é erro de permissão relacionado a surveys
      if (error.message.includes('permission denied') && error.message.includes('surveys')) {
        console.log('✅ Confirmado: Edge Function falha devido ao bloqueio de acesso anônimo a surveys');
        console.log('📝 Isso é esperado após a correção de segurança');
        return true;
      }
      return false;
    } else {
      console.log('✅ Edge Function executou com sucesso:', data);
      return true;
    }
  } catch (err) {
    console.log('⚠️  Erro ao testar Edge Function:', err.message);
    return false;
  }
}

async function checkSecurityStatus() {
  console.log('🔒 Verificando status de segurança do sistema...');
  console.log('=' .repeat(60));
  
  const surveysSecure = await testCurrentSurveysAccess();
  const magicLinkStatus = await testMagicLinkFunction();
  
  console.log('\n📊 RESUMO DO STATUS DE SEGURANÇA:');
  console.log('=' .repeat(60));
  console.log(`🔒 Tabela surveys protegida: ${surveysSecure ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`🔗 Edge Function magic-link: ${magicLinkStatus ? '⚠️  Afetada pela segurança' : '❌ Com problemas'}`);
  
  if (surveysSecure) {
    console.log('\n✅ SEGURANÇA APLICADA COM SUCESSO!');
    console.log('📝 O acesso anônimo à tabela surveys foi bloqueado.');
    console.log('⚠️  NOTA: A Edge Function magic-link pode precisar ser ajustada');
    console.log('   para funcionar com as novas políticas de segurança.');
  } else {
    console.log('\n❌ PROBLEMA DE SEGURANÇA DETECTADO!');
    console.log('📝 O acesso anônimo à tabela surveys ainda está permitido.');
    console.log('🔧 É necessário aplicar as correções de segurança manualmente.');
  }
  
  console.log('\n🔧 PRÓXIMOS PASSOS RECOMENDADOS:');
  console.log('1. Se a segurança não estiver aplicada, execute as correções SQL manualmente');
  console.log('2. Ajuste a Edge Function magic-link para usar autenticação adequada');
  console.log('3. Teste o fluxo completo de magic links com usuários autenticados');
}

checkSecurityStatus().catch(console.error);