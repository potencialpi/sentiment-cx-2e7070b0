// Script para testar a função validate-coupon do Supabase
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';

const supabase = createClient(supabaseUrl, supabaseKey);

// Função para testar a validação de cupons
async function testCouponValidation() {
  console.log('🧪 Iniciando testes da função validate-coupon...');
  console.log('='.repeat(50));

  // Lista de cupons para testar
  const testCoupons = [
    { code: 'TESTA100', description: 'Cupom TESTA100 (teste principal)' },
    { code: 'DESCONTO10', description: 'Cupom válido (se existir)' },
    { code: 'PROMO20', description: 'Cupom promocional (se existir)' },
    { code: 'INVALID_COUPON', description: 'Cupom inválido' },
    { code: 'EXPIRED_COUPON', description: 'Cupom expirado (se existir)' },
    { code: '', description: 'Cupom vazio' },
    { code: 'null', description: 'Cupom nulo' }
  ];

  for (const testCoupon of testCoupons) {
    console.log(`\n📋 Testando: ${testCoupon.description}`);
    console.log(`   Código: "${testCoupon.code}"`);
    
    try {
      const { data, error } = await supabase.functions.invoke('validate-coupon', {
        body: { couponCode: testCoupon.code }
      });

      if (error) {
        console.log(`❌ Erro na chamada da função:`);
        console.log(`   Status: ${error.status || 'N/A'}`);
        console.log(`   Mensagem: ${error.message || 'Erro desconhecido'}`);
        if (error.details) {
          console.log(`   Detalhes: ${JSON.stringify(error.details, null, 2)}`);
        }
      } else {
        console.log(`✅ Função executada com sucesso:`);
        console.log(`   Resposta: ${JSON.stringify(data, null, 2)}`);
        
        // Analisar a resposta
        if (data && data.valid) {
          console.log(`   🎉 Cupom válido! Desconto: ${data.discount}%`);
          if (data.type) console.log(`   Tipo: ${data.type}`);
        } else if (data && data.error) {
          console.log(`   ⚠️  Erro de negócio: ${data.error}`);
        } else {
          console.log(`   ❓ Resposta inesperada`);
        }
      }
    } catch (err) {
      console.log(`💥 Erro inesperado:`);
      console.log(`   ${err.message}`);
      console.log(`   Stack: ${err.stack}`);
    }
    
    console.log('-'.repeat(40));
  }

  console.log('\n🏁 Testes concluídos!');
  console.log('\n📊 Resumo dos resultados:');
  console.log('- Se você viu "✅ Função executada com sucesso" para alguns testes, a Edge Function está funcionando');
  console.log('- Se todos os testes mostraram "❌ Erro na chamada da função", há um problema na configuração');
  console.log('- Erros de negócio (⚠️) são normais para cupons inválidos');
  console.log('\n💡 Próximos passos:');
  console.log('1. Verifique se há cupons válidos no seu Stripe Dashboard');
  console.log('2. Crie cupons de teste no Stripe se necessário');
  console.log('3. Teste a integração no frontend se a função estiver funcionando');
}

// Função para testar a conectividade básica
async function testConnection() {
  console.log('🔗 Testando conectividade com Supabase...');
  
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116' && !error.message.includes('permission denied')) { 
      console.log('❌ Erro de conectividade:', error.message);
      return false;
    } else {
      console.log('✅ Conectividade OK (erro de permissão esperado)');
      return true;
    }
  } catch (err) {
    console.log('❌ Erro de conectividade:', err.message);
    return false;
  }
}

// Executar os testes
async function runTests() {
  console.log('🚀 Iniciando diagnóstico da função validate-coupon');
  console.log('='.repeat(60));
  
  // Primeiro testar conectividade
  const isConnected = await testConnection();
  
  if (!isConnected) {
    console.log('\n❌ Não foi possível conectar ao Supabase. Verifique as configurações.');
    return;
  }
  
  console.log('\n');
  
  // Depois testar a função
  await testCouponValidation();
}

// Executar se chamado diretamente
runTests().catch(console.error);