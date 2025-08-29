const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://mjuxvppexydaeuoernxa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ0MDM2NiwiZXhwIjoyMDY5MDE2MzY2fQ._X2HsKnApncZhgPmsr0-VWrulAlmk_dogyuG2-OgMpY';

// Cliente com service role para acessar dados administrativos
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugAuthIssues() {
  console.log('🔍 Iniciando diagnóstico de problemas de autenticação...');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar usuários duplicados no Auth
    console.log('\n1. 📊 Verificando usuários duplicados no Supabase Auth...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erro ao buscar usuários do Auth:', authError.message);
    } else {
      const emailCounts = {};
      authUsers.users.forEach(user => {
        const email = user.email;
        emailCounts[email] = (emailCounts[email] || 0) + 1;
      });
      
      const duplicateEmails = Object.entries(emailCounts).filter(([email, count]) => count > 1);
      
      if (duplicateEmails.length > 0) {
        console.log('⚠️  Usuários duplicados encontrados no Auth:');
        duplicateEmails.forEach(([email, count]) => {
          console.log(`   - ${email}: ${count} usuários`);
        });
      } else {
        console.log('✅ Nenhum usuário duplicado encontrado no Auth');
      }
      
      console.log(`📈 Total de usuários no Auth: ${authUsers.users.length}`);
    }

    // 2. Analisar tabela checkout_sessions
    console.log('\n2. 🛒 Analisando tabela checkout_sessions...');
    const { data: checkoutSessions, error: checkoutError } = await supabase
      .from('checkout_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (checkoutError) {
      console.error('❌ Erro ao buscar checkout_sessions:', checkoutError.message);
    } else {
      console.log(`📊 Total de sessões de checkout: ${checkoutSessions.length}`);
      
      const statusCounts = {};
      const emailCounts = {};
      
      checkoutSessions.forEach(session => {
        // Contar por status
        statusCounts[session.status] = (statusCounts[session.status] || 0) + 1;
        
        // Contar emails duplicados
        if (session.email) {
          emailCounts[session.email] = (emailCounts[session.email] || 0) + 1;
        }
      });
      
      console.log('📈 Status das sessões:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   - ${status}: ${count}`);
      });
      
      const duplicateCheckoutEmails = Object.entries(emailCounts).filter(([email, count]) => count > 1);
      if (duplicateCheckoutEmails.length > 0) {
        console.log('⚠️  Emails duplicados em checkout_sessions:');
        duplicateCheckoutEmails.forEach(([email, count]) => {
          console.log(`   - ${email}: ${count} sessões`);
        });
      }
    }

    // 3. Analisar tabela profiles
    console.log('\n3. 👤 Analisando tabela profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (profilesError) {
      console.error('❌ Erro ao buscar profiles:', profilesError.message);
    } else {
      console.log(`📊 Total de perfis: ${profiles.length}`);
      
      const emailCounts = {};
      profiles.forEach(profile => {
        if (profile.email) {
          emailCounts[profile.email] = (emailCounts[profile.email] || 0) + 1;
        }
      });
      
      const duplicateProfileEmails = Object.entries(emailCounts).filter(([email, count]) => count > 1);
      if (duplicateProfileEmails.length > 0) {
        console.log('⚠️  Emails duplicados em profiles:');
        duplicateProfileEmails.forEach(([email, count]) => {
          console.log(`   - ${email}: ${count} perfis`);
        });
      }
    }

    // 4. Verificar inconsistências entre Auth e Profiles
    console.log('\n4. 🔄 Verificando inconsistências entre Auth e Profiles...');
    if (authUsers && profiles) {
      const authEmails = new Set(authUsers.users.map(u => u.email));
      const profileEmails = new Set(profiles.map(p => p.email));
      
      const authOnlyEmails = [...authEmails].filter(email => !profileEmails.has(email));
      const profileOnlyEmails = [...profileEmails].filter(email => !authEmails.has(email));
      
      if (authOnlyEmails.length > 0) {
        console.log('⚠️  Usuários no Auth sem perfil correspondente:');
        authOnlyEmails.forEach(email => console.log(`   - ${email}`));
      }
      
      if (profileOnlyEmails.length > 0) {
        console.log('⚠️  Perfis sem usuário correspondente no Auth:');
        profileOnlyEmails.forEach(email => console.log(`   - ${email}`));
      }
      
      if (authOnlyEmails.length === 0 && profileOnlyEmails.length === 0) {
        console.log('✅ Auth e Profiles estão sincronizados');
      }
    }

    // 5. Verificar sessões de checkout órfãs
    console.log('\n5. 🔍 Verificando sessões de checkout órfãs...');
    if (checkoutSessions && authUsers) {
      const authEmails = new Set(authUsers.users.map(u => u.email));
      const completedSessions = checkoutSessions.filter(s => s.status === 'completed');
      
      const orphanSessions = completedSessions.filter(session => 
        session.email && !authEmails.has(session.email)
      );
      
      if (orphanSessions.length > 0) {
        console.log('⚠️  Sessões de checkout completadas sem usuário correspondente:');
        orphanSessions.forEach(session => {
          console.log(`   - ${session.email} (ID: ${session.id}, Status: ${session.status})`);
        });
      } else {
        console.log('✅ Todas as sessões completadas têm usuários correspondentes');
      }
    }

    // 6. Relatório final e recomendações
    console.log('\n' + '='.repeat(60));
    console.log('📋 RELATÓRIO FINAL E RECOMENDAÇÕES');
    console.log('='.repeat(60));
    
    console.log('\n🔧 Possíveis causas do erro "A user with this email address has already been registered":');
    console.log('1. Tentativa de criar usuário que já existe no Supabase Auth');
    console.log('2. Sessões de checkout duplicadas para o mesmo email');
    console.log('3. Falha na sincronização entre checkout_sessions e criação de usuário');
    console.log('4. Problemas de concorrência na função Edge complete-account-creation');
    
    console.log('\n💡 Recomendações:');
    console.log('1. Verificar se o email já existe antes de tentar criar usuário');
    console.log('2. Implementar verificação de duplicatas em checkout_sessions');
    console.log('3. Adicionar logs detalhados na função complete-account-creation');
    console.log('4. Considerar usar transações para operações críticas');
    console.log('5. Implementar retry logic com backoff exponencial');
    
  } catch (error) {
    console.error('❌ Erro durante o diagnóstico:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Executar o diagnóstico
debugAuthIssues().then(() => {
  console.log('\n✅ Diagnóstico concluído!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error.message);
  process.exit(1);
});