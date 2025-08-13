/**
 * Script de Auditoria de Segurança - Sentiment CX
 * Verifica chaves hardcoded e vulnerabilidades de segurança
 */

const fs = require('fs');
const path = require('path');

// Configurações
const ANON_KEY_PATTERN = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const SERVICE_ROLE_PATTERN = /service_role.*eyJ[A-Za-z0-9_-]+/g;

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
      content,
      size: content.length
    };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

// Função principal de auditoria
function runSecurityAudit() {
  log('🔒 INICIANDO AUDITORIA DE SEGURANÇA', 'cyan');
  log('=====================================', 'cyan');

  const results = {
    totalFiles: 0,
    filesWithIssues: 0,
    anonKeysFound: 0,
    serviceRoleKeysFound: 0,
    errors: [],
    secureFiles: 0
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
      log(`      └─ Tamanho do arquivo: ${check.size} bytes`, 'yellow');
    } else {
      results.secureFiles++;
      log(`   ✅ ${fileName} - Seguro (${check.size} bytes)`, 'green');
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

  // Verificar configuração do cliente Supabase
  log('\n🔧 Verificando configuração do cliente Supabase...', 'blue');
  const clientPath = path.join(__dirname, 'src', 'integrations', 'supabase', 'client.ts');
  if (fs.existsSync(clientPath)) {
    const clientContent = fs.readFileSync(clientPath, 'utf8');
    if (clientContent.includes('persistSession: true')) {
      log('   ✅ Persistência de sessão habilitada', 'green');
    }
    if (clientContent.includes('autoRefreshToken: true')) {
      log('   ✅ Auto-refresh de token habilitado', 'green');
    }
    if (clientContent.includes('localStorage')) {
      log('   ✅ Armazenamento local configurado', 'green');
    }
  } else {
    log('   ⚠️ Arquivo de configuração do cliente não encontrado', 'yellow');
  }

  // Verificar função de logout robusto
  log('\n🚪 Verificando implementação de logout...', 'blue');
  const authUtilsPath = path.join(__dirname, 'src', 'lib', 'authUtils.ts');
  if (fs.existsSync(authUtilsPath)) {
    const authContent = fs.readFileSync(authUtilsPath, 'utf8');
    if (authContent.includes('robustLogout')) {
      log('   ✅ Função robustLogout implementada', 'green');
    }
    if (authContent.includes('clearAuthStorage')) {
      log('   ✅ Limpeza de armazenamento implementada', 'green');
    }
    if (authContent.includes('timeout')) {
      log('   ✅ Timeout de logout configurado', 'green');
    }
  } else {
    log('   ⚠️ Arquivo authUtils.ts não encontrado', 'yellow');
  }

  // Relatório final
  log('\n📊 RELATÓRIO DE AUDITORIA', 'cyan');
  log('========================', 'cyan');
  log(`📁 Arquivos verificados: ${results.totalFiles}`, 'blue');
  log(`✅ Arquivos seguros: ${results.secureFiles}`, 'green');
  log(`🔴 Arquivos com vulnerabilidades: ${results.filesWithIssues}`, results.filesWithIssues > 0 ? 'red' : 'green');
  log(`🔑 Chaves anônimas encontradas: ${results.anonKeysFound}`, results.anonKeysFound > 0 ? 'red' : 'green');
  log(`🔐 Service role keys encontradas: ${results.serviceRoleKeysFound}`, results.serviceRoleKeysFound > 0 ? 'red' : 'green');
  log(`❌ Erros encontrados: ${results.errors.length}`, results.errors.length > 0 ? 'red' : 'green');

  if (results.errors.length > 0) {
    log('\n❌ ERROS DETALHADOS:', 'red');
    results.errors.forEach(error => {
      log(`   • ${error.file}: ${error.error}`, 'red');
    });
  }

  // Análise de risco
  log('\n🎯 ANÁLISE DE RISCO:', 'magenta');
  if (results.filesWithIssues === 0) {
    log('   ✅ RISCO BAIXO - Nenhuma chave hardcoded encontrada', 'green');
  } else if (results.filesWithIssues <= 3) {
    log('   ⚠️ RISCO MÉDIO - Poucas chaves hardcoded (principalmente em testes)', 'yellow');
  } else {
    log('   🔴 RISCO ALTO - Muitas chaves hardcoded encontradas', 'red');
  }

  // Recomendações
  log('\n💡 RECOMENDAÇÕES:', 'magenta');
  if (results.filesWithIssues > 0) {
    log('   1. ⚠️ Remover chaves hardcoded dos arquivos de teste', 'yellow');
    log('   2. 🔧 Usar variáveis de ambiente em todos os scripts', 'yellow');
    log('   3. 📝 Adicionar verificação de env no início dos scripts', 'yellow');
    log('   4. 🔒 Considerar usar .env.example para documentar variáveis', 'yellow');
  } else {
    log('   ✅ Excelente! Nenhuma vulnerabilidade crítica encontrada', 'green');
    log('   📋 Manter boas práticas de segurança', 'green');
    log('   🔄 Executar auditoria regularmente', 'green');
  }

  // Status final
  const riskLevel = results.filesWithIssues === 0 ? 'BAIXO' : 
                   results.filesWithIssues <= 3 ? 'MÉDIO' : 'ALTO';
  const statusColor = riskLevel === 'BAIXO' ? 'green' : 
                     riskLevel === 'MÉDIO' ? 'yellow' : 'red';
  
  log(`\n🎯 NÍVEL DE RISCO: ${riskLevel}`, statusColor);
  log(`🛡️ STATUS DE SEGURANÇA: ${riskLevel === 'BAIXO' ? '✅ APROVADO' : '⚠️ REQUER ATENÇÃO'}`, statusColor);

  return results;
}

// Executar auditoria
if (require.main === module) {
  try {
    const results = runSecurityAudit();
    process.exit(results.filesWithIssues > 5 ? 1 : 0); // Exit code 1 apenas para risco alto
  } catch (error) {
    log(`❌ Erro fatal: ${error.message}`, 'red');
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { runSecurityAudit };