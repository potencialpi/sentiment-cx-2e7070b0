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

async function forceCleanUserMetadata() {
  console.log('🧹 LIMPEZA FORÇADA DOS METADADOS');
  console.log('=' .repeat(40));
  
  try {
    // 1. Buscar usuário atual
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(USER_ID);
    
    if (userError) {
      console.error('❌ Erro ao buscar usuário:', userError.message);
      return;
    }
    
    const user = userData.user;
    console.log('✅ Usuário encontrado:', user.email);
    
    // 2. Mostrar metadados atuais
    console.log('\n📋 Metadados ANTES da limpeza:');
    console.log(JSON.stringify(user.user_metadata, null, 2));
    
    // 3. Criar metadados completamente novos (sem o campo problemático)
    const newMetadata = {
      plan_id: 'nexus-infinito',
      billing_type: 'yearly',
      company_name: 'Caldo de cana zurita',
      phone_number: '11915946212',
      email_verified: true
    };
    
    console.log('\n🆕 Metadados NOVOS (limpos):');
    console.log(JSON.stringify(newMetadata, null, 2));
    
    // 4. Substituir COMPLETAMENTE os metadados
    const { data: updateResult, error: updateError } = await supabase.auth.admin.updateUserById(USER_ID, {
      user_metadata: newMetadata
    });
    
    if (updateError) {
      console.error('❌ Erro ao atualizar:', updateError.message);
      console.error('Detalhes:', updateError);
      return;
    }
    
    console.log('✅ Metadados substituídos com sucesso!');
    
    // 5. Aguardar um momento para propagação
    console.log('⏳ Aguardando propagação...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 6. Verificar resultado final
    const { data: verifyData, error: verifyError } = await supabase.auth.admin.getUserById(USER_ID);
    
    if (verifyError) {
      console.error('❌ Erro na verificação:', verifyError.message);
      return;
    }
    
    const updatedUser = verifyData.user;
    
    console.log('\n🔍 VERIFICAÇÃO FINAL:');
    console.log('=' .repeat(30));
    console.log('✅ Email:', updatedUser.email);
    console.log('✅ Plano:', updatedUser.user_metadata?.plan_id);
    console.log('✅ Billing:', updatedUser.user_metadata?.billing_type);
    console.log('✅ Company:', updatedUser.user_metadata?.company_name);
    console.log('✅ Phone:', updatedUser.user_metadata?.phone_number);
    console.log('✅ Email verified:', updatedUser.user_metadata?.email_verified);
    
    // Verificação crítica do hash
    const hasPasswordHash = updatedUser.user_metadata?.original_password_hash !== undefined;
    console.log('\n🔒 VERIFICAÇÃO DE SEGURANÇA:');
    console.log('Hash de senha removido:', hasPasswordHash ? '❌ NÃO - AINDA PRESENTE!' : '✅ SIM - REMOVIDO COM SUCESSO!');
    
    if (hasPasswordHash) {
      console.log('⚠️ ATENÇÃO: O hash ainda está presente!');
      console.log('Valor atual:', updatedUser.user_metadata.original_password_hash);
      
      // Tentativa adicional de remoção
      console.log('\n🔄 Tentando remoção adicional...');
      
      const finalMetadata = { ...updatedUser.user_metadata };
      delete finalMetadata.original_password_hash;
      
      const { error: finalError } = await supabase.auth.admin.updateUserById(USER_ID, {
        user_metadata: finalMetadata
      });
      
      if (finalError) {
        console.error('❌ Erro na remoção final:', finalError.message);
      } else {
        console.log('✅ Tentativa adicional de remoção executada');
        
        // Verificação final final
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: finalVerify } = await supabase.auth.admin.getUserById(USER_ID);
        const finalUser = finalVerify.user;
        
        const stillHasHash = finalUser.user_metadata?.original_password_hash !== undefined;
        console.log('Status final:', stillHasHash ? '❌ HASH AINDA PRESENTE' : '✅ HASH REMOVIDO');
      }
    }
    
    console.log('\n📋 Metadados FINAIS:');
    const { data: finalData } = await supabase.auth.admin.getUserById(USER_ID);
    console.log(JSON.stringify(finalData.user.user_metadata, null, 2));
    
    console.log('\n🎉 LIMPEZA CONCLUÍDA!');
    
  } catch (error) {
    console.error('❌ Erro durante limpeza:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function validateUserSecurity() {
  console.log('\n🛡️ VALIDAÇÃO FINAL DE SEGURANÇA');
  console.log('=' .repeat(40));
  
  try {
    const { data: userData } = await supabase.auth.admin.getUserById(USER_ID);
    const user = userData.user;
    
    const securityChecks = {
      email_valid: user.email === 'anderson@potencialpi.com.br',
      plan_correct: user.user_metadata?.plan_id === 'nexus-infinito',
      no_password_hash: user.user_metadata?.original_password_hash === undefined,
      billing_type_set: user.user_metadata?.billing_type === 'yearly',
      company_name_set: !!user.user_metadata?.company_name,
      phone_number_set: !!user.user_metadata?.phone_number,
      email_verified: user.user_metadata?.email_verified === true
    };
    
    console.log('\n📊 CHECKLIST DE SEGURANÇA:');
    Object.entries(securityChecks).forEach(([check, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${check}: ${passed ? 'OK' : 'FALHOU'}`);
    });
    
    const allPassed = Object.values(securityChecks).every(check => check === true);
    
    console.log('\n🏆 RESULTADO FINAL:');
    console.log(allPassed ? '✅ TODOS OS CHECKS PASSARAM - USUÁRIO SEGURO!' : '❌ ALGUNS CHECKS FALHARAM - REQUER ATENÇÃO!');
    
    return allPassed;
    
  } catch (error) {
    console.error('❌ Erro na validação:', error.message);
    return false;
  }
}

// Execução principal
async function main() {
  console.log('🚀 CORREÇÃO FORÇADA DE METADADOS DO USUÁRIO');
  console.log('=' .repeat(50));
  console.log(`👤 Usuário: ${USER_ID}`);
  console.log(`📧 Email: anderson@potencialpi.com.br`);
  console.log('=' .repeat(50));
  
  await forceCleanUserMetadata();
  await validateUserSecurity();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  forceCleanUserMetadata,
  validateUserSecurity
};