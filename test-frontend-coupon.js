// Script para testar o cupom TESTA100 no frontend
// Execute este script no console do navegador na página de checkout

// Função para testar o cupom no frontend
function testCouponInFrontend() {
  console.log('🧪 Iniciando teste do cupom TESTA100 no frontend...');
  
  // Verificar se estamos na página correta
  const currentUrl = window.location.href;
  console.log('📍 URL atual:', currentUrl);
  
  if (!currentUrl.includes('checkout')) {
    console.log('❌ Não estamos na página de checkout. Navegue para /checkout-guest ou /checkout primeiro.');
    return;
  }
  
  // Procurar pelo botão de cupom
  const couponButton = document.querySelector('button[type="button"]');
  const couponButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.includes('cupom') || btn.textContent.includes('desconto')
  );
  
  console.log('🔍 Botões de cupom encontrados:', couponButtons.length);
  
  // Procurar pelo campo de input do cupom
  let couponInput = document.querySelector('input[id="couponCode"]');
  
  if (!couponInput) {
    // Se não encontrou o input, tentar clicar no botão para mostrar o campo
    const showCouponBtn = couponButtons.find(btn => 
      btn.textContent.includes('Tem um cupom') || 
      btn.textContent.includes('cupom de desconto')
    );
    
    if (showCouponBtn) {
      console.log('🖱️ Clicando no botão para mostrar campo de cupom...');
      showCouponBtn.click();
      
      // Aguardar um pouco para o campo aparecer
      setTimeout(() => {
        couponInput = document.querySelector('input[id="couponCode"]');
        if (couponInput) {
          testCouponInput(couponInput);
        } else {
          console.log('❌ Campo de cupom não encontrado após clicar no botão');
        }
      }, 500);
    } else {
      console.log('❌ Botão para mostrar cupom não encontrado');
    }
  } else {
    testCouponInput(couponInput);
  }
}

// Função para testar o input do cupom
function testCouponInput(couponInput) {
  console.log('✅ Campo de cupom encontrado:', couponInput);
  
  // Limpar o campo
  couponInput.value = '';
  couponInput.dispatchEvent(new Event('input', { bubbles: true }));
  
  // Inserir o cupom TESTA100
  console.log('📝 Inserindo cupom TESTA100...');
  couponInput.value = 'TESTA100';
  couponInput.dispatchEvent(new Event('input', { bubbles: true }));
  couponInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Procurar pelo botão "Aplicar"
  const applyButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Aplicar')
  );
  
  if (applyButton) {
    console.log('🖱️ Clicando no botão Aplicar...');
    applyButton.click();
    
    // Aguardar resposta
    setTimeout(() => {
      checkCouponResult();
    }, 2000);
  } else {
    // Tentar usar onBlur
    console.log('🔄 Tentando validar via onBlur...');
    couponInput.dispatchEvent(new Event('blur', { bubbles: true }));
    
    setTimeout(() => {
      checkCouponResult();
    }, 2000);
  }
}

// Função para verificar o resultado da aplicação do cupom
function checkCouponResult() {
  console.log('🔍 Verificando resultado da aplicação do cupom...');
  
  // Procurar por mensagens de erro
  const errorMessages = document.querySelectorAll('.text-red-600, .text-red-500');
  if (errorMessages.length > 0) {
    console.log('❌ Mensagens de erro encontradas:');
    errorMessages.forEach(msg => console.log('  -', msg.textContent));
  }
  
  // Procurar por mensagens de sucesso
  const successMessages = document.querySelectorAll('.text-green-600, .text-green-500, .text-green-800');
  if (successMessages.length > 0) {
    console.log('✅ Mensagens de sucesso encontradas:');
    successMessages.forEach(msg => console.log('  -', msg.textContent));
  }
  
  // Verificar se há indicação visual de cupom aplicado
  const couponApplied = document.querySelector('.bg-green-50, .border-green-200');
  if (couponApplied) {
    console.log('✅ Cupom parece estar aplicado (elemento visual encontrado)');
    console.log('📄 Conteúdo:', couponApplied.textContent);
  }
  
  // Verificar preços
  const priceElements = document.querySelectorAll('[class*="price"], .text-lg, .font-bold');
  console.log('💰 Elementos de preço encontrados:');
  priceElements.forEach(el => {
    if (el.textContent.includes('R$')) {
      console.log('  -', el.textContent);
    }
  });
  
  // Verificar se há preço riscado (indicando desconto)
  const strikethroughPrices = document.querySelectorAll('.line-through');
  if (strikethroughPrices.length > 0) {
    console.log('✅ Preços riscados encontrados (indicando desconto):');
    strikethroughPrices.forEach(price => console.log('  -', price.textContent));
  }
  
  console.log('🏁 Teste concluído!');
}

// Executar o teste
testCouponInFrontend();

// Também disponibilizar as funções globalmente para uso manual
window.testCouponInFrontend = testCouponInFrontend;
window.checkCouponResult = checkCouponResult;

console.log('📋 Funções disponíveis:');
console.log('  - testCouponInFrontend(): Executa o teste completo');
console.log('  - checkCouponResult(): Verifica apenas o resultado atual');