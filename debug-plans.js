// Script para debugar os planos salvos no banco de dados
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPlans() {
  try {
    console.log('=== DEBUG: Verificando planos no banco de dados ===');
    
    // Buscar todos os perfis com seus planos
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id, plan_name')
      .limit(10);
    
    if (error) {
      console.error('Erro ao buscar perfis:', error);
      return;
    }
    
    console.log('Perfis encontrados:');
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. User ID: ${profile.user_id}`);
      console.log(`   Plan Name: "${profile.plan_name}"`);
      console.log(`   Tem underscore: ${profile.plan_name?.includes('_')}`);
      console.log(`   Tem hífen: ${profile.plan_name?.includes('-')}`);
      console.log('---');
    });
    
    // Verificar se há planos com underscore
    const { data: underscorePlans, error: underscoreError } = await supabase
      .from('profiles')
      .select('user_id, plan_name')
      .or('plan_name.like.*_*');
    
    if (!underscoreError && underscorePlans.length > 0) {
      console.log('\n=== PLANOS COM UNDERSCORE ENCONTRADOS ===');
      underscorePlans.forEach((profile, index) => {
        console.log(`${index + 1}. User: ${profile.user_id} - Plan: "${profile.plan_name}"`);
      });
    }
    
    // Verificar se há planos com hífen
    const { data: hyphenPlans, error: hyphenError } = await supabase
      .from('profiles')
      .select('user_id, plan_name')
      .or('plan_name.like.*-*');
    
    if (!hyphenError && hyphenPlans.length > 0) {
      console.log('\n=== PLANOS COM HÍFEN ENCONTRADOS ===');
      hyphenPlans.forEach((profile, index) => {
        console.log(`${index + 1}. User: ${profile.user_id} - Plan: "${profile.plan_name}"`);
      });
    }
    
  } catch (error) {
    console.error('Erro inesperado:', error);
  }
}

// Executar o debug
debugPlans();

// Função para testar a normalização
function testNormalization() {
  console.log('\n=== TESTE DE NORMALIZAÇÃO ===');
  
  const testCases = [
    'start_quantico',
    'start-quantico', 
    'vortex_neural',
    'vortex-neural',
    'nexus_infinito',
    'nexus-infinito',
    null,
    undefined,
    ''
  ];
  
  // Simular a função de normalização
  function normalizePlanCode(planCode) {
    if (!planCode) return 'start-quantico';
    
    const normalized = planCode.replace(/_/g, '-');
    
    const validPlans = ['start-quantico', 'vortex-neural', 'nexus-infinito'];
    if (validPlans.includes(normalized)) {
      return normalized;
    }
    
    return 'start-quantico';
  }
  
  testCases.forEach(testCase => {
    const result = normalizePlanCode(testCase);
    console.log(`Input: "${testCase}" -> Output: "${result}"`);
  });
}

testNormalization();