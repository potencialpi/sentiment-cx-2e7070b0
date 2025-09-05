import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkExistingSurveys() {
  console.log('🔍 Verificando surveys existentes...');
  
  const { data: surveys, error } = await supabase
    .from('surveys')
    .select('id, title, user_id')
    .limit(5);
    
  if (error) {
    console.error('❌ Erro ao buscar surveys:', error.message);
    return null;
  }
  
  console.log('📊 Surveys encontrados:', surveys?.length || 0);
  if (surveys && surveys.length > 0) {
    console.log('📋 Primeiro survey:', surveys[0]);
    return surveys[0].id;
  }
  
  return null;
}

async function createTestSurvey() {
  console.log('🆕 Criando survey de teste...');
  
  // Primeiro, vamos verificar se há um usuário/profile
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('user_id')
    .limit(1);
    
  if (profileError) {
    console.error('❌ Erro ao buscar profiles:', profileError.message);
    return null;
  }
  
  let userId;
  if (profiles && profiles.length > 0) {
    userId = profiles[0].user_id;
    console.log('👤 Usando usuário existente:', userId);
  } else {
    userId = crypto.randomUUID();
    console.log('👤 Usando usuário fictício:', userId);
  }
  
  const { data: survey, error } = await supabase
    .from('surveys')
    .insert({
      user_id: userId,
      title: 'Survey de Teste - Análise de Sentimento',
      description: 'Survey criado para testar a análise de sentimento',
      unique_link: `test-${Date.now()}`,
      status: 'active'
    })
    .select()
    .single();
    
  if (error) {
    console.error('❌ Erro ao criar survey:', error.message);
    return null;
  }
  
  console.log('✅ Survey criado:', survey.id);
  return survey.id;
}

async function main() {
  try {
    let surveyId = await checkExistingSurveys();
    
    if (!surveyId) {
      surveyId = await createTestSurvey();
    }
    
    if (surveyId) {
      console.log('🎯 Survey ID para usar nos testes:', surveyId);
    } else {
      console.log('❌ Não foi possível obter um survey ID válido');
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error.message);
  }
}

main();