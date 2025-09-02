#!/usr/bin/env node

/**
 * Script para Execução de Testes End-to-End
 * 
 * Este script automatiza a execução dos testes end-to-end,
 * incluindo verificações de pré-requisitos e relatórios de resultados.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurações
const CONFIG = {
  testFile: 'tests/e2e-complete-flow.test.js',
  setupFile: 'tests/setup.js',
  timeout: 300000, // 5 minutos
  retries: 2,
  verbose: process.argv.includes('--verbose') || process.env.VERBOSE_TESTS === 'true'
};

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utilitários de log
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}🔄${colors.reset} ${msg}`),
  result: (msg) => console.log(`${colors.magenta}📊${colors.reset} ${msg}`)
};

// Verificar pré-requisitos
async function checkPrerequisites() {
  log.step('Verificando pré-requisitos...');
  
  const checks = [
    {
      name: 'Arquivo de teste principal',
      check: () => fs.existsSync(CONFIG.testFile),
      error: `Arquivo de teste não encontrado: ${CONFIG.testFile}`
    },
    {
      name: 'Arquivo de setup',
      check: () => fs.existsSync(CONFIG.setupFile),
      error: `Arquivo de setup não encontrado: ${CONFIG.setupFile}`
    },
    {
      name: 'Node.js',
      check: () => process.version,
      error: 'Node.js não está instalado'
    },
    {
      name: 'Dependências do projeto',
      check: () => fs.existsSync('node_modules'),
      error: 'Dependências não instaladas. Execute: npm install'
    }
  ];
  
  for (const check of checks) {
    try {
      const result = check.check();
      if (!result) {
        log.error(`${check.name}: ${check.error}`);
        return false;
      }
      log.success(`${check.name}: OK`);
    } catch (error) {
      log.error(`${check.name}: ${check.error}`);
      return false;
    }
  }
  
  return true;
}

// Executar testes
async function runTests(attempt = 1) {
  return new Promise((resolve, reject) => {
    log.step(`Executando testes end-to-end (tentativa ${attempt}/${CONFIG.retries + 1})...`);
    
    const startTime = Date.now();
    
    // Configurar comando de teste
    const isWindows = process.platform === 'win32';
    const testCommand = isWindows ? 'cmd' : 'npm';
    const testArgs = isWindows ? ['/c', 'npm', 'test', '--', CONFIG.testFile] : ['test', '--', CONFIG.testFile];
    
    if (CONFIG.verbose) {
      testArgs.push('--reporter=verbose');
    }
    
    // Configurar variáveis de ambiente
    const env = {
      ...process.env,
      NODE_ENV: 'test',
      VERBOSE_TESTS: CONFIG.verbose ? 'true' : 'false'
    };
    
    // Executar teste
    const testProcess = spawn(testCommand, testArgs, {
      stdio: CONFIG.verbose ? 'inherit' : 'pipe',
      env: env,
      cwd: process.cwd()
    });
    
    let output = '';
    let errorOutput = '';
    
    if (!CONFIG.verbose) {
      testProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      testProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
    }
    
    // Timeout
    const timeout = setTimeout(() => {
      testProcess.kill('SIGTERM');
      reject(new Error(`Teste excedeu o timeout de ${CONFIG.timeout}ms`));
    }, CONFIG.timeout);
    
    testProcess.on('close', (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      
      if (code === 0) {
        log.success(`Testes concluídos com sucesso em ${duration}ms`);
        resolve({ success: true, duration, output, errorOutput });
      } else {
        log.error(`Testes falharam com código de saída: ${code}`);
        if (!CONFIG.verbose && output) {
          console.log('\n--- Output ---');
          console.log(output);
        }
        if (!CONFIG.verbose && errorOutput) {
          console.log('\n--- Error Output ---');
          console.log(errorOutput);
        }
        resolve({ success: false, duration, output, errorOutput, exitCode: code });
      }
    });
    
    testProcess.on('error', (error) => {
      clearTimeout(timeout);
      log.error(`Erro ao executar testes: ${error.message}`);
      reject(error);
    });
  });
}

// Gerar relatório
function generateReport(results) {
  log.result('\n=== RELATÓRIO DE TESTES END-TO-END ===');
  
  const totalAttempts = results.length;
  const successfulAttempts = results.filter(r => r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  log.result(`Total de tentativas: ${totalAttempts}`);
  log.result(`Tentativas bem-sucedidas: ${successfulAttempts}`);
  log.result(`Taxa de sucesso: ${((successfulAttempts / totalAttempts) * 100).toFixed(1)}%`);
  log.result(`Duração total: ${totalDuration}ms`);
  log.result(`Duração média: ${(totalDuration / totalAttempts).toFixed(0)}ms`);
  
  if (successfulAttempts > 0) {
    log.success('\n🎉 Pelo menos uma execução foi bem-sucedida!');
  } else {
    log.error('\n💥 Todas as execuções falharam!');
  }
  
  // Detalhes por tentativa
  results.forEach((result, index) => {
    const status = result.success ? '✅ SUCESSO' : '❌ FALHA';
    log.result(`\nTentativa ${index + 1}: ${status} (${result.duration}ms)`);
    if (!result.success && result.exitCode) {
      log.result(`  Código de saída: ${result.exitCode}`);
    }
  });
}

// Função principal
async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    TESTES END-TO-END                        ║');
  console.log('║              Plataforma de Pesquisas CX                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);
  
  try {
    // Verificar pré-requisitos
    const prerequisitesOk = await checkPrerequisites();
    if (!prerequisitesOk) {
      log.error('Pré-requisitos não atendidos. Abortando execução.');
      process.exit(1);
    }
    
    log.success('Todos os pré-requisitos foram atendidos.\n');
    
    // Executar testes com retry
    const results = [];
    let lastResult = null;
    
    for (let attempt = 1; attempt <= CONFIG.retries + 1; attempt++) {
      try {
        const result = await runTests(attempt);
        results.push(result);
        lastResult = result;
        
        if (result.success) {
          log.success('Testes executados com sucesso!');
          break;
        } else if (attempt < CONFIG.retries + 1) {
          log.warning(`Tentativa ${attempt} falhou. Tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        log.error(`Erro na tentativa ${attempt}: ${error.message}`);
        results.push({ success: false, duration: 0, error: error.message });
        
        if (attempt < CONFIG.retries + 1) {
          log.warning('Tentando novamente...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    // Gerar relatório
    generateReport(results);
    
    // Determinar código de saída
    const hasSuccess = results.some(r => r.success);
    process.exit(hasSuccess ? 0 : 1);
    
  } catch (error) {
    log.error(`Erro fatal: ${error.message}`);
    process.exit(1);
  }
}

// Executar sempre quando chamado diretamente
main().catch(error => {
  log.error(`Erro não tratado: ${error.message}`);
  process.exit(1);
});

export { main, runTests, checkPrerequisites };