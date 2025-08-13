const fs = require('fs');
const path = require('path');

// Lista de arquivos que contêm chaves hardcoded
const filesToFix = [
  'apply_rls_fix.cjs',
  'apply_rls_service_role.cjs',
  'check_table_structure.cjs',
  'debug_plan_issue.cjs',
  'execute_fix.cjs',
  'fix_profile_creation.cjs',
  'test_complete_auth.cjs',
  'test_database_after_fix.cjs',
  'test_final_fix.cjs',
  'test_questions_column.cjs',
  'test_rls_auth.cjs',
  'test_survey_creation.cjs',
  'test_survey_response.cjs',
  'test_surveys_error.cjs',
  'verify_database_schema.cjs',
  'test-existing-data.js',
  'test-logout-issue.js',
  'test-robust-logout.js',
  'test-improved-logout.js'
];

// Template para verificação de variáveis de ambiente
const envCheckTemplate = `
// Verificação de variáveis de ambiente
if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
  console.error('❌ SUPABASE_URL não encontrada nas variáveis de ambiente');
  console.log('💡 Certifique-se de que o arquivo .env.local existe e contém VITE_SUPABASE_URL');
  process.exit(1);
}

if (!process.env.SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY não encontrada nas variáveis de ambiente');
  console.log('💡 Certifique-se de que o arquivo .env.local existe e contém VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}
`;

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Substituir URLs do Supabase hardcoded
    const urlRegex = /https:\/\/[a-zA-Z0-9-]+\.supabase\.co/g;
    if (urlRegex.test(content)) {
      content = content.replace(urlRegex, '${process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL}');
      modified = true;
    }
    
    // Substituir chaves JWT hardcoded (começam com eyJ)
    const jwtRegex = /['"]eyJ[a-zA-Z0-9_.-]+['"]/g;
    if (jwtRegex.test(content)) {
      content = content.replace(jwtRegex, 'process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY');
      modified = true;
    }
    
    // Substituir declarações de variáveis com URLs
    const urlVarRegex = /const\s+supabaseUrl\s*=\s*['"]https:\/\/[a-zA-Z0-9-]+\.supabase\.co['"]/g;
    if (urlVarRegex.test(content)) {
      content = content.replace(urlVarRegex, 'const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL');
      modified = true;
    }
    
    // Substituir declarações de variáveis com chaves
    const keyVarRegex = /const\s+supabaseKey\s*=\s*['"]eyJ[a-zA-Z0-9_.-]+['"]/g;
    if (keyVarRegex.test(content)) {
      content = content.replace(keyVarRegex, 'const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY');
      modified = true;
    }
    
    // Substituir em createClient direto
    const createClientRegex = /createClient\(\s*['"]https:\/\/[a-zA-Z0-9-]+\.supabase\.co['"]/g;
    if (createClientRegex.test(content)) {
      content = content.replace(createClientRegex, 'createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL');
      modified = true;
    }
    
    const createClientKeyRegex = /createClient\([^,]+,\s*['"]eyJ[a-zA-Z0-9_.-]+['"]/g;
    if (createClientKeyRegex.test(content)) {
      content = content.replace(createClientKeyRegex, (match) => {
        const parts = match.split(',');
        return parts[0] + ', process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY';
      });
      modified = true;
    }
    
    // Adicionar verificação de ambiente se não existir e foi modificado
    if (modified && !content.includes('Verificação de variáveis de ambiente')) {
      // Encontrar onde inserir a verificação (após requires/imports)
      const lines = content.split('\n');
      let insertIndex = 0;
      
      // Procurar a última linha de require/import
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('require(') || lines[i].includes('import ')) {
          insertIndex = i + 1;
        }
      }
      
      lines.splice(insertIndex, 0, envCheckTemplate);
      content = lines.join('\n');
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Iniciando correção avançada de chaves hardcoded...\n');
  
  let fixedCount = 0;
  let errorCount = 0;
  
  filesToFix.forEach(fileName => {
    const filePath = path.join(__dirname, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Arquivo não encontrado: ${fileName}`);
      return;
    }
    
    console.log(`🔍 Processando: ${fileName}`);
    
    // Mostrar conteúdo antes da correção para debug
    const contentBefore = fs.readFileSync(filePath, 'utf8');
    const hasHardcodedKey = /eyJ[a-zA-Z0-9_.-]+/.test(contentBefore);
    const hasHardcodedUrl = /https:\/\/[a-zA-Z0-9-]+\.supabase\.co/.test(contentBefore);
    
    if (hasHardcodedKey || hasHardcodedUrl) {
      console.log(`   🔍 Detectado: ${hasHardcodedKey ? 'Chave JWT' : ''} ${hasHardcodedUrl ? 'URL' : ''}`);
    }
    
    if (fixFile(filePath)) {
      console.log(`✅ Corrigido: ${fileName}`);
      fixedCount++;
    } else {
      console.log(`ℹ️ Nenhuma alteração necessária: ${fileName}`);
    }
  });
  
  console.log('\n📊 RELATÓRIO DE CORREÇÃO AVANÇADA');
  console.log('==================================');
  console.log(`📁 Arquivos processados: ${filesToFix.length}`);
  console.log(`✅ Arquivos corrigidos: ${fixedCount}`);
  console.log(`❌ Erros encontrados: ${errorCount}`);
  
  if (fixedCount > 0) {
    console.log('\n🎉 Correções aplicadas com sucesso!');
    console.log('💡 Recomendações:');
    console.log('   1. Execute os testes para verificar se tudo funciona');
    console.log('   2. Certifique-se de que o arquivo .env.local existe');
    console.log('   3. Execute novamente o security-audit.cjs para verificar');
  } else {
    console.log('\nℹ️ Nenhuma correção foi necessária.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixFile };