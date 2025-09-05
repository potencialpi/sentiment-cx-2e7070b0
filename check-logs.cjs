const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRecentErrors() {
  console.log('🔍 Verificando erros recentes relacionados a planos...');
  
  try {
    // Verificar usuários sem planos
    console.log('\n📊 Verificando usuários e seus planos:');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, plan_name')
      .limit(10);
    
    if (profilesError) {
      console.error('❌ Erro ao buscar profiles:', profilesError);
    } else {
      console.log('Profiles encontrados:', profiles?.length || 0);
      profiles?.forEach(profile => {
        console.log(`- ${profile.email}: plano = ${profile.plan_name || 'NULL'}`);
      });
    }
    
    // Verificar audit logs recentes (requer service role)
    console.log('\n📋 Verificando logs de auditoria recentes:');
    if (!hasServiceRole) {
      console.log('⏩ Pulando: requer service_role (evitando erro 42501 permission denied).');
    } else {
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (auditError) {
        console.error('❌ Erro ao buscar audit logs:', auditError);
      } else {
        console.log('Audit logs encontrados:', auditLogs?.length || 0);
        auditLogs?.forEach(log => {
          const action = log.event_type || log.action || log.operation || 'N/A';
          console.log(`- ${log.created_at || 'N/A'}: ${action} por ${log.user_id || 'N/A'} na tabela ${log.table_name || 'N/A'}`);
        });
      }
    }
    
    // Verificar surveys recentes
    console.log('\n📝 Verificando surveys recentes:');
    const { data: surveys, error: surveysError } = await supabase
      .from('surveys')
      .select('id, title, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (surveysError) {
      console.error('❌ Erro ao buscar surveys:', surveysError);
    } else {
      console.log('Surveys encontradas:', surveys?.length || 0);
      surveys?.forEach(survey => {
        console.log(`- ${survey.title} (${survey.id}) por ${survey.user_id}`);
      });
    }
    
    // Verificar usuários autenticados (requer service role)
    console.log('\n🔐 Verificando usuários autenticados:');
    if (!hasServiceRole) {
      console.log('⏩ Pulando: requer service_role (evitando 403 not_admin).');
    } else {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('❌ Erro ao buscar usuários auth:', authError);
      } else {
        console.log('Usuários auth encontrados:', authUsers?.users?.length || 0);
        
        for (const user of authUsers.users || []) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('plan_name')
            .eq('id', user.id)
            .single();
          
          console.log(`- ${user.email}: auth_id=${user.id}, plano=${profile?.plan_name || 'NULL'}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkRecentErrors();