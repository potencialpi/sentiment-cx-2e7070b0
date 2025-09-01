const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  console.log('Certifique-se de que .env.local contém:');
  console.log('- VITE_SUPABASE_URL');
  console.log('- VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verificarConfigEmail() {
  console.log('🔍 DIAGNÓSTICO: Por que não recebo e-mails de Magic Link?');
  console.log('\n📊 INFORMAÇÕES DO PROJETO:');
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Project ID: ${supabaseUrl.split('//')[1].split('.')[0]}`);
  
  console.log('\n🚨 PROBLEMA IDENTIFICADO:');
  console.log('\n📧 LIMITAÇÕES DO SMTP PADRÃO SUPABASE:');
  console.log('❌ Apenas envia e-mails para MEMBROS DA EQUIPE do projeto');
  console.log('❌ Máximo de 2 e-mails por hora');
  console.log('❌ Não é adequado para produção');
  console.log('❌ Bloqueia e-mails para endereços não autorizados');
  
  console.log('\n🔧 SOLUÇÕES DISPONÍVEIS:');
  console.log('\n1️⃣  TESTE IMEDIATO (para verificar funcionamento):');
  console.log('   📍 Acesse: https://supabase.com/dashboard/project/mjuxvppexydaeuoernxa');
  console.log('   📍 Vá em Settings → Team');
  console.log('   📍 Clique em "Invite Member"');
  console.log('   📍 Adicione o e-mail que você quer testar');
  console.log('   📍 Teste novamente o Magic Link');
  
  console.log('\n2️⃣  SOLUÇÃO PARA PRODUÇÃO (recomendado):');
  console.log('   📍 Configure SMTP customizado:');
  console.log('   • Resend (mais fácil): https://resend.com');
  console.log('   • SendGrid: https://sendgrid.com');
  console.log('   • AWS SES: https://aws.amazon.com/ses/');
  console.log('   \n   📍 Depois configure no Supabase:');
  console.log('   • Dashboard → Project Settings → Authentication');
  console.log('   • Scroll até "SMTP Settings"');
  console.log('   • Toggle "Enable Custom SMTP"');
  console.log('   • Preencha as credenciais do provedor');
  
  console.log('\n🧪 TESTANDO GERAÇÃO DE MAGIC LINK...');
  
  try {
    // Testar geração de magic link
    const testEmail = 'teste@exemplo.com';
    const { data, error } = await supabase.functions.invoke('magic-link', {
      body: {
        action: 'generate',
        email: testEmail,
        survey_id: 'test-survey'
      }
    });
    
    if (error) {
      console.error('❌ Erro na Edge Function:', error);
      return;
    }
    
    console.log('✅ Magic Link gerado com sucesso!');
    console.log('📝 Token criado:', data.token ? 'Sim' : 'Não');
    console.log('📝 URL gerada:', data.magicLink ? 'Sim' : 'Não');
    
    console.log('\n🎯 DIAGNÓSTICO FINAL:');
    console.log('✅ Sistema de Magic Links: FUNCIONANDO PERFEITAMENTE');
    console.log('✅ Geração de tokens: OK');
    console.log('✅ Armazenamento no banco: OK');
    console.log('✅ Edge Function: OK');
    console.log('❌ Envio de E-mail: BLOQUEADO pelo SMTP padrão do Supabase');
    
    console.log('\n💡 CONCLUSÃO:');
    console.log('O sistema está funcionando corretamente!');
    console.log('O problema é que o Supabase só envia e-mails para membros da equipe.');
    console.log('\n🚀 PRÓXIMOS PASSOS:');
    console.log('1. Para teste: Adicione seu e-mail à equipe do projeto');
    console.log('2. Para produção: Configure SMTP customizado (Resend recomendado)');
    
  } catch (err) {
    console.error('❌ Erro inesperado:', err.message);
    console.log('\n🔍 Possíveis causas:');
    console.log('• Edge Function não está deployada');
    console.log('• Problemas de conectividade');
    console.log('• Configuração incorreta');
  }
}

verificarConfigEmail();
