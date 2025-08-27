// Script de teste detalhado para o cupom TESTA100
// Execute este script no console do navegador na página /checkout-guest

console.log('🧪 Iniciando teste detalhado do cupom TESTA100...');

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

// Função para simular digitação
function typeText(element, text) {
  element.focus();
  element.value = text;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// Função principal de teste
async function testCupomTESTA100() {
  try {
    console.log('📋 Verificando elementos da página...');
    
    // Verificar se estamos na página correta
    if (!window.location.pathname.includes('checkout-guest')) {
      console.error('❌ Não estamos na página checkout-guest');
      return;
    }

    // Capturar erros de console
    const originalConsoleError = console.error;
    const errors = [];
    console.error = function(...args) {
      errors.push(args.join(' '));
      originalConsoleError.apply(console, args);
    };

    // Verificar se há um plano selecionado
    const planInfo = document.querySelector('[data-testid="plan-info"], .plan-info, .selected-plan');
    if (!planInfo) {
      console.warn('⚠️ Nenhum plano parece estar selecionado. Tentando continuar...');
    }

    // Procurar pelo botão de cupom
    console.log('🔍 Procurando botão de cupom...');
    let cupomButton = document.querySelector('button');
    const buttons = Array.from(document.querySelectorAll('button'));
    cupomButton = buttons.find(btn => 
      btn.textContent.includes('cupom') || 
      btn.textContent.includes('desconto') ||
      btn.textContent.includes('Tem um cupom')
    );

    if (!cupomButton) {
      console.error('❌ Botão de cupom não encontrado');
      console.log('Botões disponíveis:', buttons.map(b => b.textContent));
      return;
    }

    console.log('✅ Botão de cupom encontrado:', cupomButton.textContent);
    
    // Clicar no botão de cupom
    console.log('👆 Clicando no botão de cupom...');
    cupomButton.click();
    
    // Aguardar campo de input aparecer
    console.log('⏳ Aguardando campo de input aparecer...');
    const cupomInput = await waitForElement('input[placeholder*="cupom"], input[placeholder*="código"], input[type="text"]');
    console.log('✅ Campo de input encontrado');

    // Digitar o cupom
    console.log('⌨️ Digitando cupom TESTA100...');
    typeText(cupomInput, 'TESTA100');
    
    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 500));

    // Procurar botão "Aplicar"
    console.log('🔍 Procurando botão Aplicar...');
    const aplicarButtons = Array.from(document.querySelectorAll('button'));
    const aplicarButton = aplicarButtons.find(btn => 
      btn.textContent.includes('Aplicar') || 
      btn.textContent.includes('Validar') ||
      btn.textContent.includes('Confirmar')
    );

    if (!aplicarButton) {
      console.error('❌ Botão Aplicar não encontrado');
      console.log('Botões disponíveis após input:', aplicarButtons.map(b => b.textContent));
      return;
    }

    console.log('✅ Botão Aplicar encontrado:', aplicarButton.textContent);
    
    // Capturar preço antes da aplicação
    const precoElements = document.querySelectorAll('[class*="price"], [class*="total"], [class*="valor"]');
    const precoTexts = Array.from(precoElements).map(el => el.textContent);
    console.log('💰 Preços antes da aplicação:', precoTexts);

    // Clicar em Aplicar
    console.log('👆 Clicando em Aplicar...');
    aplicarButton.click();
    
    // Aguardar resposta (3 segundos)
    console.log('⏳ Aguardando resposta da validação...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verificar se houve sucesso ou erro
    const successMessages = document.querySelectorAll('[class*="success"], [class*="toast"], [class*="alert"]');
    const errorMessages = document.querySelectorAll('[class*="error"], [class*="toast"], [class*="alert"]');
    
    console.log('📊 Resultados do teste:');
    console.log('✅ Mensagens de sucesso encontradas:', Array.from(successMessages).map(el => el.textContent));
    console.log('❌ Mensagens de erro encontradas:', Array.from(errorMessages).map(el => el.textContent));
    
    // Verificar preços após aplicação
    const precoElementsAfter = document.querySelectorAll('[class*="price"], [class*="total"], [class*="valor"]');
    const precoTextsAfter = Array.from(precoElementsAfter).map(el => el.textContent);
    console.log('💰 Preços após aplicação:', precoTextsAfter);
    
    // Verificar se o cupom foi aplicado (procurar por elementos que mostram cupom aplicado)
    const cupomAplicado = document.querySelector('[class*="coupon"], [class*="cupom"], [class*="discount"]');
    if (cupomAplicado) {
      console.log('✅ Cupom aplicado encontrado:', cupomAplicado.textContent);
    } else {
      console.log('❌ Nenhum indicador de cupom aplicado encontrado');
    }

    // Verificar erros de console capturados
    if (errors.length > 0) {
      console.log('🚨 Erros de console capturados:', errors);
    } else {
      console.log('✅ Nenhum erro de console detectado');
    }

    // Restaurar console.error original
    console.error = originalConsoleError;

    console.log('🏁 Teste concluído!');
    
  } catch (error) {
    console.error('💥 Erro durante o teste:', error);
  }
}

// Executar o teste
testCupomTESTA100();

console.log('📝 Para executar novamente, digite: testCupomTESTA100()');