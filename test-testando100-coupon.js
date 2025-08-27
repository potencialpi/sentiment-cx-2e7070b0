// Script de teste para o cupom TESTANDO100 (100% desconto)
// Execute este script no console do navegador na página /checkout-guest

console.log('🧪 Iniciando teste do cupom TESTANDO100 (100% desconto)...');

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
async function testCupomTESTANDO100() {
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
    
    // Capturar preço original antes da aplicação
    const precoElements = document.querySelectorAll('[class*="price"], [class*="total"], [class*="valor"]');
    const precoTexts = Array.from(precoElements).map(el => el.textContent);
    console.log('💰 Preços ANTES da aplicação:', precoTexts);
    
    // Clicar no botão de cupom
    console.log('👆 Clicando no botão de cupom...');
    cupomButton.click();
    
    // Aguardar campo de input aparecer
    console.log('⏳ Aguardando campo de input aparecer...');
    const cupomInput = await waitForElement('input[placeholder*="cupom"], input[placeholder*="código"], input[type="text"]');
    console.log('✅ Campo de input encontrado');

    // Digitar o cupom TESTANDO100
    console.log('⌨️ Digitando cupom TESTANDO100...');
    typeText(cupomInput, 'TESTANDO100');
    
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
    console.log('💰 Preços APÓS aplicação:', precoTextsAfter);
    
    // Verificar se o cupom foi aplicado (procurar por elementos que mostram cupom aplicado)
    const cupomAplicado = document.querySelector('[class*="coupon"], [class*="cupom"], [class*="discount"]');
    if (cupomAplicado) {
      console.log('✅ Cupom aplicado encontrado:', cupomAplicado.textContent);
    } else {
      console.log('❌ Nenhum indicador de cupom aplicado encontrado');
    }

    // Verificação específica para 100% de desconto
    console.log('\n🎯 VERIFICAÇÃO ESPECIAL - 100% DESCONTO:');
    const totalElements = document.querySelectorAll('[class*="total"], [class*="final"], [class*="pay"]');
    let foundZeroValue = false;
    
    totalElements.forEach(el => {
      const text = el.textContent.toLowerCase();
      if (text.includes('r$ 0') || text.includes('0,00') || text.includes('grátis') || text.includes('free')) {
        console.log('✅ VALOR ZERO ENCONTRADO:', el.textContent);
        foundZeroValue = true;
      }
    });
    
    if (!foundZeroValue) {
      console.log('⚠️  ATENÇÃO: Não foi encontrado valor zero após aplicar cupom de 100%');
    }

    // Verificar erros de console capturados
    if (errors.length > 0) {
      console.log('🚨 Erros de console capturados:', errors);
    } else {
      console.log('✅ Nenhum erro de console detectado');
    }

    // Restaurar console.error original
    console.error = originalConsoleError;

    console.log('\n🏁 Teste do cupom TESTANDO100 concluído!');
    console.log('\n⚠️  LEMBRE-SE: Este cupom oferece 100% de desconto - o valor final deve ser R$ 0,00');
    
  } catch (error) {
    console.error('💥 Erro durante o teste:', error);
  }
}

// Executar o teste
testCupomTESTANDO100();

console.log('📝 Para executar novamente, digite: testCupomTESTANDO100()');