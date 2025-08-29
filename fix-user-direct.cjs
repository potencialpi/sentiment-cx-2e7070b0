const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const USER_ID = 'c1d9c62f-f181-4a97-8fe7-d357d740f599';
const USER_EMAIL = 'anderson@potencialpi.com.br';

async function fixUserMetadataDirectly() {
  console.log('🔧 Correção Direta dos Metadados do Usuário');
  console.log('=' .repeat(50));
  
  try {
    // 1. Buscar dados atuais
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(USER_ID);
    
    if (userError) {
      console.error('❌ Erro ao buscar usuário:', userError.message);
      return;
    }
    
    const user = userData.user;
    console.log('✅ Usuário encontrado:', user.email);
    
    // 2. Verificar metadados atuais
    console.log('\n📋 Metadados atuais:');
    console.log(JSON.stringify(user.user_metadata, null, 2));
    
    // 3. Limpar metadados problemáticos
    const cleanMetadata = {
      plan_id: 'nexus-infinito',
      billing_type: 'yearly',
      company_name: user.user_metadata?.company_name || 'Caldo de cana zurita',
      phone_number: user.user_metadata?.phone_number || '11915946212',
      email_verified: true
      // Removendo original_password_hash completamente
    };
    
    console.log('\n🧹 Metadados limpos:');
    console.log(JSON.stringify(cleanMetadata, null, 2));
    
    // 4. Atualizar usuário com metadados limpos
    const { data: updateResult, error: updateError } = await supabase.auth.admin.updateUserById(USER_ID, {
      user_metadata: cleanMetadata
    });
    
    if (updateError) {
      console.error('❌ Erro ao atualizar metadados:', updateError.message);
      return;
    }
    
    console.log('✅ Metadados atualizados com sucesso!');
    
    // 5. Verificar resultado
    const { data: verifyData } = await supabase.auth.admin.getUserById(USER_ID);
    const updatedUser = verifyData.user;
    
    console.log('\n🔍 Verificação pós-correção:');
    console.log('✅ Email:', updatedUser.email);
    console.log('✅ Plano:', updatedUser.user_metadata?.plan_id);
    console.log('✅ Hash removido:', !updatedUser.user_metadata?.original_password_hash ? '✅ SIM' : '❌ NÃO');
    console.log('✅ Billing type:', updatedUser.user_metadata?.billing_type);
    
    // 6. Verificar/atualizar profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', USER_ID)
      .single();
    
    if (profile) {
      console.log('\n👤 Profile atual:');
      console.log('✅ Plano:', profile.plan_name);
      console.log('✅ Status:', profile.status);
      
      // Atualizar profile se necessário
      if (profile.plan_name !== 'nexus-infinito') {
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
    
    console.log('\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!');
    
  } catch (error) {
    console.error('❌ Erro durante correção:', error.message);
  }
}

async function analyzeUserSecurity() {
  console.log('🔒 Análise de Segurança do Usuário');
  console.log('=' .repeat(40));
  
  try {
    const { data: userData } = await supabase.auth.admin.getUserById(USER_ID);
    const user = userData.user;
    
    console.log('\n📊 ANÁLISE DE SEGURANÇA:');
    console.log('=' .repeat(30));
    
    // Verificar problemas de segurança
    const securityIssues = [];
    
    // 1. Hash de senha nos metadados
    if (user.user_metadata?.original_password_hash) {
      securityIssues.push({
        severity: 'CRÍTICO',
        issue: 'Hash de senha exposto nos metadados',
        field: 'user_metadata.original_password_hash',
        value: user.user_metadata.original_password_hash,
        risk: 'Exposição de credenciais sensíveis'
      });
    }
    
    // 2. Instance ID inválido
    if (user.instance_id === '00000000-0000-0000-0000-000000000000') {
      securityIssues.push({
        severity: 'MÉDIO',
        issue: 'Instance ID inválido',
        field: 'instance_id',
        value: user.instance_id,
        risk: 'Possível problema de autenticação'
      });
    }
    
    // 3. Tokens vazios
    const emptyTokens = [];
    if (user.confirmation_token === '') emptyTokens.push('confirmation_token');
    if (user.recovery_token === '') emptyTokens.push('recovery_token');
    if (user.email_change_token_new === '') emptyTokens.push('email_change_token_new');
    
    if (emptyTokens.length > 0) {
      securityIssues.push({
        severity: 'BAIXO',
        issue: 'Tokens como string vazia',
        field: emptyTokens.join(', '),
        value: 'empty string',
        risk: 'Inconsistência de dados'
      });
    }
    
    // Relatório
    if (securityIssues.length === 0) {
      console.log('✅ Nenhum problema de segurança encontrado!');
    } else {
      console.log(`❌ ${securityIssues.length} problema(s) de segurança encontrado(s):`);
      
      securityIssues.forEach((issue, index) => {
        console.log(`\n${index + 1}. [${issue.severity}] ${issue.issue}`);
        console.log(`   Campo: ${issue.field}`);
        console.log(`   Valor: ${issue.value}`);
        console.log(`   Risco: ${issue.risk}`);
      });
    }
    
    return securityIssues;
    
  } catch (error) {
    console.error('❌ Erro na análise:', error.message);
  }
}

async function generateSecurityReport() {
  const issues = await analyzeUserSecurity();
  
  const report = {
    timestamp: new Date().toISOString(),
    user_id: USER_ID,
    user_email: USER_EMAIL,
    security_analysis: {
      issues_found: issues?.length || 0,
      critical_issues: issues?.filter(i => i.severity === 'CRÍTICO').length || 0,
      medium_issues: issues?.filter(i => i.severity === 'MÉDIO').length || 0,
      low_issues: issues?.filter(i => i.severity === 'BAIXO').length || 0
    },
    issues: issues || [],
    recommendations: [
      'Remover imediatamente hash de senha dos metadados',
      'Corrigir instance_id inválido',
      'Converter tokens vazios para null',
      'Implementar validação de segurança na criação de usuários',
      'Auditar outros usuários com problemas similares'
    ],
    status: issues?.length === 0 ? 'SEGURO' : 'REQUER ATENÇÃO'
  };
  
  const fs = require('fs');
  fs.writeFileSync('security-analysis-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Relatório de segurança salvo em: security-analysis-report.json');
  
  return report;
}

// Execução principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'security';
  
  console.log('🛡️ Correção Direta de Segurança do Usuário');
  console.log('=' .repeat(50));
  
  switch (command) {
    case 'security':
      await analyzeUserSecurity();
      await generateSecurityReport();
      break;
      
    case 'fix':
      await fixUserMetadataDirectly();
      break;
      
    case 'all':
      await analyzeUserSecurity();
      await fixUserMetadataDirectly();
      await generateSecurityReport();
      break;
      
    default:
      console.log('Comandos disponíveis:');
      console.log('  node fix-user-direct.cjs security  - Análise de segurança');
      console.log('  node fix-user-direct.cjs fix       - Corrigir problemas');
      console.log('  node fix-user-direct.cjs all       - Análise + Correção');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  fixUserMetadataDirectly,
  analyzeUserSecurity,
  generateSecurityReport
};