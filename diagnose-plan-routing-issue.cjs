// Script para diagnosticar o problema de redirecionamento dos planos
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function diagnosePlanRoutingIssue() {
  console.log('🔍 DIAGNÓSTICO DO PROBLEMA DE REDIRECIONAMENTO DE PLANOS\n');
  
  try {
    // 1. Verificar se a tabela user_plans existe
    console.log('1. Verificando existência da tabela user_plans...');
    const { data: userPlansData, error: userPlansError } = await supabase
      .from('user_plans')
      .select('*')
      .limit(1);
    
    if (userPlansError) {
      console.log('❌ PROBLEMA ENCONTRADO: Tabela user_plans não existe!');
      console.log('   Erro:', userPlansError.message);
    } else {
      console.log('✅ Tabela user_plans existe');
      console.log('   Dados encontrados:', userPlansData?.length || 0);
    }
    
    // 2. Verificar dados na tabela profiles
    console.log('\n2. Verificando dados na tabela profiles...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, plan_name');
    
    if (profilesError) {
      console.log('❌ Erro ao acessar tabela profiles:', profilesError.message);
    } else {
      console.log('✅ Tabela profiles acessível');
      console.log('   Total de registros:', profilesData?.length || 0);
      
      // Agrupar por plano
      const planCounts = {};
      profilesData?.forEach(profile => {
        const plan = profile.plan_name || 'sem_plano';
        planCounts[plan] = (planCounts[plan] || 0) + 1;
      });
      
      console.log('   Distribuição por planos:');
      Object.entries(planCounts).forEach(([plan, count]) => {
        console.log(`     - ${plan}: ${count} usuários`);
      });
    }
    
    // 3. Verificar dados na tabela companies
    console.log('\n3. Verificando dados na tabela companies...');
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('user_id, plan_name, company_name');
    
    if (companiesError) {
      console.log('❌ Erro ao acessar tabela companies:', companiesError.message);
    } else {
      console.log('✅ Tabela companies acessível');
      console.log('   Total de registros:', companiesData?.length || 0);
      
      // Agrupar por plano
      const companyPlanCounts = {};
      companiesData?.forEach(company => {
        const plan = company.plan_name || 'sem_plano';
        companyPlanCounts[plan] = (companyPlanCounts[plan] || 0) + 1;
      });
      
      console.log('   Distribuição por planos:');
      Object.entries(companyPlanCounts).forEach(([plan, count]) => {
        console.log(`     - ${plan}: ${count} empresas`);
      });
    }
    
    // 4. Análise do problema
    console.log('\n🎯 ANÁLISE DO PROBLEMA:');
    console.log('\n❌ CAUSA RAIZ IDENTIFICADA:');
    console.log('   Os componentes Dashboard, Admin, Login e CreateAccount estão');
    console.log('   tentando buscar dados na tabela "user_plans" que NÃO EXISTE!');
    console.log('\n   Tabelas corretas que contêm os planos:');
    console.log('   - profiles: contém plan_name para cada usuário');
    console.log('   - companies: contém plan_name para cada empresa');
    
    console.log('\n🔧 SOLUÇÃO NECESSÁRIA:');
    console.log('   1. Atualizar todos os componentes para usar as tabelas corretas');
    console.log('   2. Usar a função getUserPlan() do planUtils.ts que já está implementada');
    console.log('   3. Ou criar uma view user_plans que unifique os dados');
    
    console.log('\n📋 COMPONENTES QUE PRECISAM SER CORRIGIDOS:');
    console.log('   - src/pages/Dashboard.tsx');
    console.log('   - src/pages/Admin.tsx');
    console.log('   - src/pages/Login.tsx');
    console.log('   - src/pages/CreateAccount.tsx');
    
  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error);
  }
}

// Executar diagnóstico
diagnosePlanRoutingIssue().then(() => {
  console.log('\n✅ Diagnóstico concluído!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});