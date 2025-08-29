const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Script para corrigir problemas críticos no JSON do usuário
 * anderson@potencialpi.com.br (ID: c1d9c62f-f181-4a97-8fe7-d357d740f599)
 */

const USER_ID = 'c1d9c62f-f181-4a97-8fe7-d357d740f599';
const USER_EMAIL = 'anderson@potencialpi.com.br';

async function analyzeUserIssues() {
  console.log('🔍 Analisando problemas do usuário...');
  
  try {
    // Buscar dados atuais do usuário
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(USER_ID);
    
    if (userError) {
      console.error('❌ Erro ao buscar usuário:', userError.message);
      return;
    }
    
    if (!userData.user) {
      console.error('❌ Usuário não encontrado');
      return;
    }
    
    const user = userData.user;
    console.log('✅ Usuário encontrado:', user.email);
    
    // Análise dos problemas
    const issues = [];
    
    // 1. Verificar instance_id inválido
    if (user.instance_id === '00000000-0000-0000-0000-000000000000') {
      issues.push({
        type: 'CRITICAL',
        field: 'instance_id',
        problem: 'UUID inválido (zeros)',
        current: user.instance_id,
        fix: 'Definir como null'
      });
    }
    
    // 2. Verificar hash de senha nos metadados
    if (user.user_metadata?.original_password_hash) {
      issues.push({
        type: 'SECURITY_CRITICAL',
        field: 'user_metadata.original_password_hash',
        problem: 'Hash de senha exposto nos metadados',
        current: user.user_metadata.original_password_hash,
        fix: 'Remover campo completamente'
      });
    }
    
    // 3. Verificar plano inválido
    if (user.user_metadata?.plan_id === 'nexus-premium') {
      issues.push({
        type: 'COMPATIBILITY',
        field: 'user_metadata.plan_id',
        problem: 'Plano incorreto no sistema',
        current: user.user_metadata.plan_id,
        fix: 'Alterar para nexus-infinito'
      });
    }
    
    // 4. Verificar tokens vazios (via SQL direto)
    const { data: rawUserData, error: sqlError } = await supabase
      .from('auth.users')
      .select('confirmation_token, recovery_token, email_change_token_new, phone_change_token, reauthentication_token')
      .eq('id', USER_ID)
      .single();
    
    if (!sqlError && rawUserData) {
      const emptyTokenFields = [];
      Object.entries(rawUserData).forEach(([key, value]) => {
        if (value === '') {
          emptyTokenFields.push(key);
        }
      });
      
      if (emptyTokenFields.length > 0) {
        issues.push({
          type: 'STRUCTURE',
          field: 'tokens',
          problem: 'Tokens como string vazia em vez de null',
          current: emptyTokenFields,
          fix: 'Converter para null'
        });
      }
    }
    
    // Relatório de problemas
    console.log('\n📊 PROBLEMAS IDENTIFICADOS:');
    console.log('=' .repeat(50));
    
    if (issues.length === 0) {
      console.log('✅ Nenhum problema encontrado!');
      return;
    }
    
    issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. [${issue.type}] ${issue.field}`);
      console.log(`   Problema: ${issue.problem}`);
      console.log(`   Atual: ${JSON.stringify(issue.current)}`);
      console.log(`   Correção: ${issue.fix}`);
    });
    
    return issues;
    
  } catch (error) {
    console.error('❌ Erro na análise:', error.message);
  }
}

async function fixUserIssues() {
  console.log('🛠️ Iniciando correção dos problemas...');
  
  try {
    const issues = await analyzeUserIssues();
    
    if (!issues || issues.length === 0) {
      console.log('✅ Nenhuma correção necessária');
      return;
    }
    
    console.log('\n🔧 APLICANDO CORREÇÕES:');
    console.log('=' .repeat(50));
    
    // 1. Corrigir metadados do usuário
    const { data: currentUser } = await supabase.auth.admin.getUserById(USER_ID);
    const user = currentUser.user;
    
    let updatedMetadata = { ...user.user_metadata };
    let hasMetadataChanges = false;
    
    // Remover hash de senha inseguro
    if (updatedMetadata.original_password_hash) {
      delete updatedMetadata.original_password_hash;
      hasMetadataChanges = true;
      console.log('✅ Removido hash de senha dos metadados');
    }
    
    // Corrigir plano inválido
    if (updatedMetadata.plan_id === 'nexus-premium') {
      updatedMetadata.plan_id = 'nexus-infinito';
      hasMetadataChanges = true;
      console.log('✅ Plano corrigido: nexus-premium → nexus-infinito');
    }
    
    // Aplicar mudanças nos metadados
    if (hasMetadataChanges) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(USER_ID, {
        user_metadata: updatedMetadata
      });
      
      if (updateError) {
        console.error('❌ Erro ao atualizar metadados:', updateError.message);
      } else {
        console.log('✅ Metadados atualizados com sucesso');
      }
    }
    
    // 2. Corrigir campos via SQL direto (tokens e instance_id)
    const sqlFixes = [];
    
    // Corrigir instance_id inválido
    sqlFixes.push(`
      UPDATE auth.users 
      SET instance_id = null 
      WHERE id = '${USER_ID}' AND instance_id = '00000000-0000-0000-0000-000000000000';
    `);
    
    // Corrigir tokens vazios
    sqlFixes.push(`
      UPDATE auth.users 
      SET 
        confirmation_token = CASE WHEN confirmation_token = '' THEN null ELSE confirmation_token END,
        recovery_token = CASE WHEN recovery_token = '' THEN null ELSE recovery_token END,
        email_change_token_new = CASE WHEN email_change_token_new = '' THEN null ELSE email_change_token_new END,
        phone_change_token = CASE WHEN phone_change_token = '' THEN null ELSE phone_change_token END,
        reauthentication_token = CASE WHEN reauthentication_token = '' THEN null ELSE reauthentication_token END
      WHERE id = '${USER_ID}';
    `);
    
    // Executar correções SQL
    for (const sql of sqlFixes) {
      const { error: sqlError } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (sqlError) {
        console.error('❌ Erro SQL:', sqlError.message);
      } else {
        console.log('✅ Correção SQL aplicada');
      }
    }
    
    // 3. Verificar/criar profile correspondente
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', USER_ID)
      .single();
    
    if (profileError && profileError.code === 'PGRST116') {
      // Profile não existe, criar
      console.log('⚠️ Profile não encontrado, criando...');
      
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          user_id: USER_ID,
          email: USER_EMAIL,
          plan_name: 'nexus-infinito',
          plan_type: 'nexus-infinito',
          billing_type: 'yearly',
          status: 'active',
          subscription_status: 'active'
        });
      
      if (createProfileError) {
        console.error('❌ Erro ao criar profile:', createProfileError.message);
      } else {
        console.log('✅ Profile criado com sucesso');
      }
    } else if (profile) {
      console.log('✅ Profile já existe');
      
      // Verificar se o profile precisa de correções
      if (profile.plan_name !== 'nexus-infinito' || profile.plan_type !== 'nexus-infinito') {
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({
            plan_name: 'nexus-infinito',
            plan_type: 'nexus-infinito',
            billing_type: 'yearly'
          })
          .eq('user_id', USER_ID);
        
        if (updateProfileError) {
          console.error('❌ Erro ao atualizar profile:', updateProfileError.message);
        } else {
          console.log('✅ Profile atualizado para nexus-infinito');
        }
      }
    }
    
    console.log('\n🎉 CORREÇÕES CONCLUÍDAS!');
    console.log('=' .repeat(50));
    
    // Verificação final
    await verifyFixes();
    
  } catch (error) {
    console.error('❌ Erro durante correção:', error.message);
  }
}

async function verifyFixes() {
  console.log('\n🔍 VERIFICAÇÃO FINAL:');
  console.log('=' .repeat(30));
  
  try {
    // Verificar usuário corrigido
    const { data: userData } = await supabase.auth.admin.getUserById(USER_ID);
    const user = userData.user;
    
    console.log('✅ Email:', user.email);
    console.log('✅ Instance ID:', user.instance_id || 'null (correto)');
    console.log('✅ Plano:', user.user_metadata?.plan_id || 'não definido');
    console.log('✅ Hash nos metadados:', user.user_metadata?.original_password_hash ? '❌ AINDA PRESENTE' : '✅ Removido');
    
    // Verificar profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', USER_ID)
      .single();
    
    if (profile) {
      console.log('✅ Profile existe');
      console.log('✅ Plano do profile:', profile.plan_name);
      console.log('✅ Status:', profile.status);
    } else {
      console.log('❌ Profile não encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error.message);
  }
}

// Função para gerar relatório JSON
async function generateReport() {
  const issues = await analyzeUserIssues();
  
  const report = {
    timestamp: new Date().toISOString(),
    user_id: USER_ID,
    user_email: USER_EMAIL,
    issues_found: issues?.length || 0,
    issues: issues || [],
    recommendations: [
      'Executar fix-user-json-issues.cjs para correção automática',
      'Verificar outros usuários com problemas similares',
      'Implementar validação para evitar problemas futuros',
      'Auditar sistema de criação de usuários'
    ]
  };
  
  fs.writeFileSync('user-analysis-report.json', JSON.stringify(report, null, 2));
  console.log('📄 Relatório salvo em: user-analysis-report.json');
}

// Execução principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'analyze';
  
  console.log('🚀 Script de Correção de Usuário');
  console.log('=' .repeat(40));
  
  switch (command) {
    case 'analyze':
      await analyzeUserIssues();
      await generateReport();
      break;
      
    case 'fix':
      await fixUserIssues();
      break;
      
    case 'verify':
      await verifyFixes();
      break;
      
    default:
      console.log('Comandos disponíveis:');
      console.log('  node fix-user-json-issues.cjs analyze  - Analisar problemas');
      console.log('  node fix-user-json-issues.cjs fix      - Corrigir problemas');
      console.log('  node fix-user-json-issues.cjs verify   - Verificar correções');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  analyzeUserIssues,
  fixUserIssues,
  verifyFixes
};