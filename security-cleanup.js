#!/usr/bin/env node
/**
 * Script de Limpeza de Segurança - Sentiment CX
 * Remove chaves hardcoded e implementa melhorias de segurança
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const SUPABASE_URL = 'https://mjuxvppexydaeuoernxa.supabase.co';
const ANON_KEY_PATTERN = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const SERVICE_ROLE_PATTERN = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.*service_role.*/g;

// Arquivos a serem verificados
const FILES_TO_CHECK = [
  'fix_profile_creation.cjs',
  'test_rls_auth.cjs',
  'test_database_after_fix.cjs',
  'verify_database_schema.cjs',
  'test_complete_auth.cjs',
  'check_table_structure.cjs',
  'apply_rls_fix.cjs',
  'execute_fix.cjs',
  'test_survey_creation.cjs',
  'test_survey_response.cjs',
  'test_final_fix.cjs',
  'test_surveys_error.cjs',
  'test_questions_column.cjs',
  'apply_rls_service_role.cjs',
  'debug_plan_issue.cjs',
  'test-existing-data.js',
  'test-logout-issue.js',
  'test-robust-logout.js',
  'test-improved-logout.js'
];

// Cores para output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Função para verificar se um arquivo contém chaves hardcoded
function checkFileForHardcodedKeys(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { exists: false };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const anonKeyMatches = content.match(ANON_KEY_PATTERN) || [];
    const serviceRoleMatches = content.match(SERVICE_ROLE_PATTERN) || [];

    return {
      exists: true,
      hasAnonKey: anonKeyMatches.length > 0,
      hasServiceRole: serviceRoleMatches.length > 0,
      anonKeyCount: anonKeyMatches.length,
      serviceRoleCount: serviceRoleMatches.length,
      content
    };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

// Função para criar versão segura do arquivo
function createSecureVersion(filePath, originalContent) {
  let secureContent = originalContent;

  // Substituir chaves anônimas hardcoded
  secureContent = secureContent.replace(
    ANON_KEY_PATTERN,
    "process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE'"
  );

  // Substituir service role keys
  secureContent = secureContent.replace(
    SERVICE_ROLE_PATTERN,
    "process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE'"
  );

  // Adicionar verificação de variáveis de ambiente no início
  const envCheck = `
// Verificação de segurança - variáveis de ambiente
if (!process.env.SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY não definida. Configure as variáveis de ambiente.');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY não definida para produção.');
}
`;

  // Inserir verificação após os imports
  const lines = secureContent.split('\n');
  let insertIndex = 0;
  
  // Encontrar onde inserir (após imports/requires)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('require(') || lines[i].includes('import ')) {
      insertIndex = i + 1;
    } else if (lines[i].trim() === '' && insertIndex > 0) {
      break;
    }
  }

  lines.splice(insertIndex, 0, envCheck);
  return lines.join('\n');
}

// Função principal de auditoria
async function runSecurityAudit() {
  log('🔒 INICIANDO AUDITORIA DE SEGURANÇA', 'cyan');
  log('=====================================', 'cyan');

  const results = {
    totalFiles: 0,
    filesWithIssues: 0,
    anonKeysFound: 0,
    serviceRoleKeysFound: 0,
    filesFixed: 0,
    errors: []
  };

  log('\n📁 Verificando arquivos...', 'blue');

  for (const fileName of FILES_TO_CHECK) {
    const filePath = path.join(__dirname, fileName);
    const check = checkFileForHardcodedKeys(filePath);

    if (!check.exists) {
      log(`   ⚪ ${fileName} - Não encontrado`, 'yellow');
      continue;
    }

    results.totalFiles++;

    if (check.error) {
      log(`   ❌ ${fileName} - Erro: ${check.error}`, 'red');
      results.errors.push({ file: fileName, error: check.error });
      continue;
    }

    if (check.hasAnonKey || check.hasServiceRole) {
      results.filesWithIssues++;
      results.anonKeysFound += check.anonKeyCount;
      results.serviceRoleKeysFound += check.serviceRoleCount;

      log(`   🔴 ${fileName} - VULNERABILIDADE ENCONTRADA`, 'red');
      if (check.hasAnonKey) {
        log(`      └─ ${check.anonKeyCount} chave(s) anônima(s) hardcoded`, 'red');
      }
      if (check.hasServiceRole) {
        log(`      └─ ${check.serviceRoleCount} service role key(s) hardcoded`, 'red');
      }

      // Criar versão segura
      try {
        const secureContent = createSecureVersion(filePath, check.content);
        const backupPath = `${filePath}.backup`;
        const securePath = `${filePath}.secure`;

        // Fazer backup
        fs.writeFileSync(backupPath, check.content);
        
        // Criar versão segura
        fs.writeFileSync(securePath, secureContent);
        
        results.filesFixed++;
        log(`      ✅ Versão segura criada: ${fileName}.secure`, 'green');
        log(`      📋 Backup salvo: ${fileName}.backup`, 'blue');
      } catch (error) {
        log(`      ❌ Erro ao criar versão segura: ${error.message}`, 'red');
        results.errors.push({ file: fileName, error: error.message });
      }
    } else {
      log(`   ✅ ${fileName} - Seguro`, 'green');
    }
  }

  // Verificar arquivo .env.local
  log('\n🔐 Verificando configuração de ambiente...', 'blue');
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    log('   ✅ .env.local encontrado', 'green');
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('VITE_SUPABASE_URL') && envContent.includes('VITE_SUPABASE_ANON_KEY')) {
      log('   ✅ Variáveis de ambiente configuradas', 'green');
    } else {
      log('   ⚠️ Variáveis de ambiente incompletas', 'yellow');
    }
  } else {
    log('   ⚠️ .env.local não encontrado', 'yellow');
  }

  // Relatório final
  log('\n📊 RELATÓRIO DE AUDITORIA', 'cyan');
  log('========================', 'cyan');
  log(`📁 Arquivos verificados: ${results.totalFiles}`, 'blue');
  log(`🔴 Arquivos com vulnerabilidades: ${results.filesWithIssues}`, results.filesWithIssues > 0 ? 'red' : 'green');
  log(`🔑 Chaves anônimas encontradas: ${results.anonKeysFound}`, results.anonKeysFound > 0 ? 'red' : 'green');
  log(`🔐 Service role keys encontradas: ${results.serviceRoleKeysFound}`, results.serviceRoleKeysFound > 0 ? 'red' : 'green');
  log(`✅ Arquivos corrigidos: ${results.filesFixed}`, 'green');
  log(`❌ Erros encontrados: ${results.errors.length}`, results.errors.length > 0 ? 'red' : 'green');

  if (results.errors.length > 0) {
    log('\n❌ ERROS DETALHADOS:', 'red');
    results.errors.forEach(error => {
      log(`   • ${error.file}: ${error.error}`, 'red');
    });
  }

  // Recomendações
  log('\n💡 RECOMENDAÇÕES:', 'magenta');
  if (results.filesWithIssues > 0) {
    log('   1. Revisar arquivos .secure criados', 'yellow');
    log('   2. Configurar variáveis de ambiente', 'yellow');
    log('   3. Substituir arquivos originais pelos seguros', 'yellow');
    log('   4. Adicionar .env.local ao .gitignore', 'yellow');
  } else {
    log('   ✅ Nenhuma ação necessária - sistema seguro!', 'green');
  }

  // Status final
  const isSecure = results.filesWithIssues === 0;
  log(`\n🎯 STATUS FINAL: ${isSecure ? '✅ SEGURO' : '⚠️ REQUER ATENÇÃO'}`, isSecure ? 'green' : 'yellow');

  return results;
}

// Executar auditoria
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityAudit()
    .then(results => {
      process.exit(results.filesWithIssues > 0 ? 1 : 0);
    })
    .catch(error => {
      log(`❌ Erro fatal: ${error.message}`, 'red');
      process.exit(1);
    });
}

export { runSecurityAudit };