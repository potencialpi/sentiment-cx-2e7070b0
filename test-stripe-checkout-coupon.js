// Script para testar o cupom TESTA100 no StripeCheckout.tsx
// Execute este script no console do navegador na página de checkout

(function testTESTA100Coupon() {
  console.log('🧪 Iniciando teste do cupom TESTA100 no StripeCheckout...');
  
  // Função para aguardar elemento aparecer
  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Elemento ${selector} não encontrado em ${timeout}ms`));
      }, timeout);
    });
  }
  
  // Função para simular clique
  function simulateClick(element) {
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
  }
  
  // Função para simular digitação
  function simulateTyping(input, text) {
    input.focus();
    input.value = text;
    
    // Disparar eventos de input
    const inputEvent = new Event('input', { bubbles: true });
    const changeEvent = new Event('change', { bubbles: true });
    const blurEvent = new Event('blur', { bubbles: true });
    
    input.dispatchEvent(inputEvent);
    input.dispatchEvent(changeEvent);
    input.dispatchEvent(blurEvent);
  }
  
  async function runTest() {
    try {
      console.log('📍 Verificando se estamos na página correta...');
      
      // Verificar se existe o componente StripeCheckout
      const checkoutContainer = document.querySelector('[class*="space-y-4"]');
      if (!checkoutContainer) {
        throw new Error('Componente StripeCheckout não encontrado na página');
      }
      
      console.log('✅ Componente StripeCheckout encontrado');
      
      // Procurar pelo botão "Tem um cupom de desconto?"
      console.log('🔍 Procurando botão de cupom...');
      const couponButton = await waitForElement('button:has(svg + span):contains("Tem um cupom")', 3000)
        .catch(() => {
          // Tentar seletor alternativo
          return document.querySelector('button[class*="ghost"]:has([class*="mr-2"])');
        });
      
      if (!couponButton) {
        throw new Error('Botão "Tem um cupom de desconto?" não encontrado');
      }
      
      console.log('✅ Botão de cupom encontrado, clicando...');
      simulateClick(couponButton);
      
      // Aguardar campo de input aparecer
      console.log('⏳ Aguardando campo de input aparecer...');
      const couponInput = await waitForElement('input[placeholder*="DESCONTO10"]', 3000);
      
      console.log('✅ Campo de input encontrado, digitando TESTA100...');
      simulateTyping(couponInput, 'TESTA100');
      
      // Aguardar um pouco para o onBlur ser processado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Procurar pelo botão "Aplicar"
      console.log('🔍 Procurando botão "Aplicar"...');
      const applyButton = await waitForElement('button:contains("Aplicar")', 3000)
        .catch(() => {
          // Tentar seletor alternativo
          return document.querySelector('button[class*="outline"]:not([disabled])');
        });
      
      if (applyButton) {
        console.log('✅ Botão "Aplicar" encontrado, clicando...');
        simulateClick(applyButton);
      }
      
      // Aguardar resultado da validação
      console.log('⏳ Aguardando resultado da validação...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verificar se o cupom foi aplicado com sucesso
      const successElement = document.querySelector('[class*="bg-green-50"]');
      const errorElement = document.querySelector('[class*="text-red-600"]');
      
      if (successElement) {
        console.log('🎉 SUCESSO! Cupom TESTA100 aplicado com sucesso!');
        console.log('📋 Detalhes:', successElement.textContent);
        
        // Verificar se o desconto aparece no resumo
        const discountElement = document.querySelector('[class*="text-green-600"]:contains("Desconto")');
        if (discountElement) {
          console.log('💰 Desconto aplicado:', discountElement.textContent);
        }
        
        // Verificar preço total
        const totalElement = document.querySelector('[class*="font-bold"]:contains("Total")');
        if (totalElement) {
          console.log('💵 Preço total:', totalElement.textContent);
        }
        
        return { success: true, message: 'Cupom aplicado com sucesso' };
      } else if (errorElement) {
        console.log('❌ ERRO! Cupom não foi aplicado');
        console.log('📋 Erro:', errorElement.textContent);
        return { success: false, error: errorElement.textContent };
      } else {
        console.log('⚠️ Status indefinido - verificar manualmente');
        return { success: false, error: 'Status indefinido' };
      }
      
    } catch (error) {
      console.error('❌ Erro durante o teste:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  return runTest();
})();

// Para executar o teste, cole este código no console do navegador
// na página que contém o StripeCheckout e execute:
// testTESTA100Coupon().then(result => console.log('Resultado final:', result));