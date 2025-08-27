// Teste da Edge Function validate-coupon para o cupom TESTANDO100
require('dotenv').config({ path: '.env.local' });

async function testTESTANDO100EdgeFunction() {
  console.log('🧪 Testando cupom TESTANDO100 via Edge Function...');
  console.log('='.repeat(60));

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Variáveis de ambiente do Supabase não encontradas');
    console.log('Verifique se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão definidas em .env.local');
    return;
  }

  try {
    console.log('🔍 Testando cupom: TESTANDO100');
    console.log('📡 URL:', `${supabaseUrl}/functions/v1/validate-coupon`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/validate-coupon`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        couponCode: 'TESTANDO100'
      })
    });

    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Status text:', response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na resposta:', errorText);
      return;
    }

    const data = await response.json();
    console.log('\n✅ Resposta da Edge Function:');
    console.log('📋 Dados completos:', JSON.stringify(data, null, 2));

    if (data.valid) {
      console.log('\n🎉 CUPOM VÁLIDO!');
      console.log('   ID:', data.couponId);
      console.log('   Desconto:', data.percentOff ? `${data.percentOff}%` : `$${data.amountOff / 100}`);
      console.log('   Duração:', data.duration);
      console.log('   Nome:', data.name);
      
      // Verificação especial para 100% de desconto
      if (data.percentOff === 100) {
        console.log('\n🎯 VERIFICAÇÃO ESPECIAL:');
        console.log('✅ Cupom oferece 100% de desconto - CORRETO!');
        console.log('⚠️  Este cupom torna o produto GRATUITO');
      } else {
        console.log('\n⚠️  ATENÇÃO: Desconto não é 100%');
        console.log('   Desconto atual:', data.percentOff ? `${data.percentOff}%` : `$${data.amountOff / 100}`);
      }
    } else {
      console.log('\n❌ CUPOM INVÁLIDO!');
      console.log('   Erro:', data.error || 'Motivo não especificado');
    }

  } catch (error) {
    console.error('\n💥 Erro ao testar Edge Function:');
    console.error('   Mensagem:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Executar o teste
if (require.main === module) {
  testTESTANDO100EdgeFunction()
    .then(() => {
      console.log('\n🏁 Teste concluído!');
      console.log('\n💡 Próximos passos:');
      console.log('1. Se o cupom for válido, teste no frontend');
      console.log('2. Verifique se o desconto de 100% é aplicado corretamente');
      console.log('3. Confirme que o valor final fica R$ 0,00');
    })
    .catch((error) => {
      console.error('\n💥 Falha no teste:', error.message);
      process.exit(1);
    });
}

module.exports = { testTESTANDO100EdgeFunction };