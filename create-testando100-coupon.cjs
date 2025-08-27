require('dotenv').config({ path: '.env.local' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createTESTANDO100Coupon() {
  console.log('🚀 Criando cupom TESTANDO100 no Stripe...');
  console.log('='.repeat(50));

  try {
    // Primeiro, vamos verificar se o cupom já existe
    console.log('🔍 Verificando se o cupom TESTANDO100 já existe...');
    
    try {
      const existingCoupon = await stripe.coupons.retrieve('TESTANDO100');
      console.log('✅ Cupom TESTANDO100 já existe:');
      console.log('   ID:', existingCoupon.id);
      console.log('   Desconto:', existingCoupon.percent_off ? `${existingCoupon.percent_off}%` : `$${existingCoupon.amount_off / 100}`);
      console.log('   Válido:', existingCoupon.valid);
      console.log('   Criado em:', new Date(existingCoupon.created * 1000).toLocaleString());
      return existingCoupon;
    } catch (error) {
      if (error.code === 'resource_missing') {
        console.log('ℹ️  Cupom TESTANDO100 não existe, criando...');
      } else {
        throw error;
      }
    }

    // Criar o cupom TESTANDO100 com 100% de desconto
    const coupon = await stripe.coupons.create({
      id: 'TESTANDO100',
      percent_off: 100,
      duration: 'forever',
      name: 'TESTANDO100 - 100% Desconto',
      metadata: {
        created_by: 'test_script',
        purpose: 'testing_100_percent_discount',
        discount_type: 'full_discount'
      }
    });

    console.log('✅ Cupom TESTANDO100 criado com sucesso!');
    console.log('   ID:', coupon.id);
    console.log('   Desconto:', `${coupon.percent_off}%`);
    console.log('   Duração:', coupon.duration);
    console.log('   Nome:', coupon.name);
    console.log('   Válido:', coupon.valid);
    
    // Também vamos criar um promotion code para facilitar o uso
    console.log('\n🎫 Criando código promocional...');
    
    try {
      const promoCode = await stripe.promotionCodes.create({
        coupon: coupon.id,
        code: 'TESTANDO100',
        active: true,
        metadata: {
          created_by: 'test_script',
          purpose: 'testing_100_percent_discount',
          discount_type: 'full_discount'
        }
      });
      
      console.log('✅ Código promocional criado:');
      console.log('   Código:', promoCode.code);
      console.log('   Ativo:', promoCode.active);
      console.log('   ID:', promoCode.id);
    } catch (promoError) {
      if (promoError.code === 'resource_already_exists') {
        console.log('ℹ️  Código promocional TESTANDO100 já existe');
      } else {
        console.log('⚠️  Erro ao criar código promocional:', promoError.message);
      }
    }

    return coupon;

  } catch (error) {
    console.error('❌ Erro ao criar cupom TESTANDO100:');
    console.error('   Código:', error.code);
    console.error('   Mensagem:', error.message);
    console.error('   Tipo:', error.type);
    
    if (error.code === 'resource_already_exists') {
      console.log('\n💡 O cupom já existe. Tentando recuperá-lo...');
      try {
        const existingCoupon = await stripe.coupons.retrieve('TESTANDO100');
        console.log('✅ Cupom recuperado:', existingCoupon.id);
        return existingCoupon;
      } catch (retrieveError) {
        console.error('❌ Erro ao recuperar cupom existente:', retrieveError.message);
      }
    }
    
    throw error;
  }
}

// Executar o script
if (require.main === module) {
  createTESTANDO100Coupon()
    .then((coupon) => {
      console.log('\n🎉 Processo concluído com sucesso!');
      console.log('\n💡 Próximos passos:');
      console.log('1. Teste o cupom TESTANDO100 no frontend');
      console.log('2. Verifique se o desconto de 100% está sendo aplicado corretamente');
      console.log('3. Confirme que o valor final fica R$ 0,00');
      console.log('\n⚠️  ATENÇÃO: Este cupom oferece 100% de desconto!');
    })
    .catch((error) => {
      console.error('\n💥 Falha no processo:', error.message);
      process.exit(1);
    });
}

module.exports = { createTESTANDO100Coupon };