// Script para testar o fluxo completo de checkout com cupom TESTA100
// Execute este script no console do navegador

// Função para navegar para checkout com plano selecionado
function navigateToCheckoutWithPlan() {
  console.log('🚀 Navegando para checkout com plano selecionado...');
  
  // Simular seleção de plano
  const planData = {
    selectedPlan: { id: 'start-quantico', name: 'Start Quântico' },
    billingType: 'monthly'
  };
  
  // Navegar para checkout-guest com state
  const checkoutUrl = '/checkout-guest';
  window.history.pushState(planData, '', checkoutUrl);
  
  // Recarregar a página para aplicar o state
  setTimeout(() => {
    window.location.reload();
  }, 500);
}

// Função para testar o cupom após a página carregar
function testCouponAfterLoad() {
  console.log('🧪 Testando cupom TESTA100...');
  
  // Aguardar a página carregar completamente
  setTimeout(() => {
    // Procurar pelo botão de mostrar cupom
    const showCouponButton = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent.includes('cupom de desconto') || 
      btn.textContent.includes('Tem um cupom')
    );
    
    if (showCouponButton) {
      console.log('✅ Botão de cupom encontrado, clicando...');
      showCouponButton.click();
      
      // Aguardar o campo aparecer
      setTimeout(() => {
        applyCoupon();
      }, 1000);
    } else {
      console.log('🔍 Procurando campo de cupom diretamente...');
      applyCoupon();
    }
  }, 2000);
}

// Função para aplicar o cupom
function applyCoupon() {
  const couponInput = document.querySelector('input[id="couponCode"]') || 
                     document.querySelector('input[placeholder*="cupom"]') ||
                     document.querySelector('input[placeholder*="Digite seu cupom"]');
  
  if (!couponInput) {
    console.log('❌ Campo de cupom não encontrado');
    console.log('🔍 Inputs disponíveis:', document.querySelectorAll('input'));
    return;
  }
  
  console.log('✅ Campo de cupom encontrado:', couponInput);
  
  // Focar no campo
  couponInput.focus();
  
  // Limpar e inserir o cupom
  couponInput.value = '';
  couponInput.value = 'TESTA100';
  
  // Disparar eventos
  couponInput.dispatchEvent(new Event('input', { bubbles: true }));
  couponInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  console.log('📝 Cupom TESTA100 inserido');
  
  // Procurar botão aplicar
  const applyButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.trim() === 'Aplicar'
  );
  
  if (applyButton && !applyButton.disabled) {
    console.log('🖱️ Clicando no botão Aplicar...');
    applyButton.click();
  } else {
    console.log('🔄 Usando onBlur para validar...');
    couponInput.blur();
  }
  
  // Verificar resultado após um tempo
  setTimeout(() => {
    checkCouponApplication();
  }, 3000);
}

// Função para verificar se o cupom foi aplicado
function checkCouponApplication() {
  console.log('🔍 Verificando aplicação do cupom...');
  
  // Verificar mensagens de erro
  const errorElements = document.querySelectorAll('.text-red-600, .text-red-500, [class*="text-red"]');
  const errors = Array.from(errorElements).map(el => el.textContent.trim()).filter(text => text);
  
  if (errors.length > 0) {
    console.log('❌ Erros encontrados:');
    errors.forEach(error => console.log('  -', error));
  }
  
  // Verificar mensagens de sucesso
  const successElements = document.querySelectorAll('.text-green-600, .text-green-500, .text-green-800, [class*="text-green"]');
  const successMessages = Array.from(successElements).map(el => el.textContent.trim()).filter(text => text);
  
  if (successMessages.length > 0) {
    console.log('✅ Mensagens de sucesso:');
    successMessages.forEach(msg => console.log('  -', msg));
  }
  
  // Verificar se há área de cupom aplicado
  const appliedCouponArea = document.querySelector('.bg-green-50') || 
                           document.querySelector('[class*="border-green"]');
  
  if (appliedCouponArea) {
    console.log('✅ Área de cupom aplicado encontrada:');
    console.log('📄 Conteúdo:', appliedCouponArea.textContent.trim());
  }
  
  // Verificar preços
  console.log('💰 Verificando preços...');
  const priceElements = document.querySelectorAll('[class*="price"], .text-lg, .font-bold');
  const prices = [];
  
  priceElements.forEach(el => {
    const text = el.textContent.trim();
    if (text.includes('R$')) {
      prices.push(text);
    }
  });
  
  console.log('💰 Preços encontrados:', prices);
  
  // Verificar preços riscados
  const strikethroughElements = document.querySelectorAll('.line-through');
  if (strikethroughElements.length > 0) {
    console.log('✅ Preços originais (riscados):');
    strikethroughElements.forEach(el => console.log('  -', el.textContent.trim()));
  }
  
  // Verificar botão de pagamento
  const payButton = Array.from(document.querySelectorAll('button[type="submit"]')).find(btn => 
    btn.textContent.includes('Pagar')
  );
  
  if (payButton) {
    console.log('💳 Botão de pagamento:', payButton.textContent.trim());
  }
  
  console.log('🏁 Verificação concluída!');
}

// Função principal para executar o teste completo
function runFullCouponTest() {
  console.log('🎯 Iniciando teste completo do cupom TESTA100...');
  
  // Verificar se já estamos na página de checkout
  if (window.location.pathname.includes('checkout')) {
    console.log('✅ Já estamos na página de checkout');
    testCouponAfterLoad();
  } else {
    console.log('📍 Navegando para página de checkout...');
    navigateToCheckoutWithPlan();
    
    // Aguardar navegação e testar
    setTimeout(() => {
      testCouponAfterLoad();
    }, 2000);
  }
}

// Disponibilizar funções globalmente
window.runFullCouponTest = runFullCouponTest;
window.testCouponAfterLoad = testCouponAfterLoad;
window.applyCoupon = applyCoupon;
window.checkCouponApplication = checkCouponApplication;

console.log('🛠️ Funções de teste disponíveis:');
console.log('  - runFullCouponTest(): Executa teste completo');
console.log('  - testCouponAfterLoad(): Testa cupom na página atual');
console.log('  - applyCoupon(): Aplica o cupom TESTA100');
console.log('  - checkCouponApplication(): Verifica se cupom foi aplicado');

// Executar automaticamente se estivermos na página de checkout
if (window.location.pathname.includes('checkout')) {
  console.log('🚀 Executando teste automaticamente...');
  testCouponAfterLoad();
}